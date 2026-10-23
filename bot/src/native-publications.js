/** Native disclosures share the transactional turn outbox, not a parallel best-effort sender. */
import {noticeHash,renderNativeNotice} from './native-notice.js';
import {prepareNativeNoticeOutput} from './pvp-output.js';
import {queueTurnPublications,deliverTurnOutbox} from './publication-outbox.js';
import {KeyedSerialQueue} from "./kernel/serial-queue.js";
import {currentScene} from './scene-continuity.js';
import {progressPvp} from './pvp-rounds.js';
import {validateFearEffect} from './pvp-fear-moves.js';
import {StateConflictError} from "./kernel/errors.js";
import {nativeGmNotice} from './gm-arbitration-output.js';
import {pvpAttackOwnerStatus} from './pvp-attacks.js';
import {pvpDamageOwnerStatus} from './pvp-damage.js';
const queues=new WeakMap();
/** Native affected-owner status/result only; model text and another target's mechanics are not accepted. */
function gmArbitrationSpec(db,guild,decision){
  const row=db.getCityRecord(guild,'gm_arbitration_decision',decision),n=row?.data.native;
  if(!['request_group_feature_reaction','environment_trace_choice'].includes(n?.operation)&&!n?.environment_trace_risk)throw new StateConflictError('Exact native owner result required.');
  const owner=n.owner||row.data.scope.actorUserId,character=n.character||row.data.scope.actorCharacterId;
  const projection=nativeGmNotice(db,guild,decision,{mode:'private',actorUserId:owner,actorCharacterId:character});
  if(!projection)throw new StateConflictError('Verified owned GM result required.');
  return {kind:'gm_arbitration_publication',key:`gm-notice:${noticeHash([decision,owner,projection.revision])}`,source:row.source_event,
    notice:{kind:'gm_arbitration_private',ref:decision,revision:projection.revision,user:owner,character}};
}
export function reserveGmArbitrationNotice(db,guild,decision){return reserveNativeNotice(db,guild,gmArbitrationSpec(db,guild,decision));}
export function publishGmArbitrationNotice(db,guild,decision,sendPrivate){
  const spec=gmArbitrationSpec(db,guild,decision),row=db.getCityRecord(guild,'gm_arbitration_decision',decision);
  return publishNativeNotice(db,guild,spec,r=>sendPrivate(spec.notice.user,r.payload,row.data.origin.session,spec.notice.character,{publication:r}));
}
/** Native transaction checkpoint only. It is a wake-up pointer, never publication/consent authority. */
export function reserveNativeNotice(db,guild,spec){
  const {kind,key,source,notice}=spec,prior=db.getCityRecord(guild,kind,key);
  return prior||db.saveCityRecord(guild,{kind,key,source_event:source,status:'queued',visibility:notice.user?'character':'party',
    subject_key:notice.character||null,data:{...notice,reservation_version:2,reservation_hash:noticeHash([kind,key,source,notice])}});
}
/** Synchronous enqueue before any fallible interaction response; no network and no mechanical work. */
export function queueNativeNotice(db,guild,{kind,key,source,notice}){
  const receipt=db.getCityRecord(guild,kind,key);
  if(receipt&&!(receipt.status==='queued'&&receipt.data.reservation_version===2&&!receipt.data.turn_id))return receipt;
  if(receipt&&receipt.data.reservation_hash!==noticeHash([kind,key,source,notice]))throw new StateConflictError('Reserved native notice identity changed.');
  return db.transaction(()=>{
    const scene=currentScene(db,guild),d={...notice,session:scene.session_id,scene:scene.key};
    renderNativeNotice(db,guild,d);
    const noticeKey=`native-notice:${noticeHash([kind,key,d])}`;
    const n=db.saveCityRecord(guild,{kind:'native_notice',key:noticeKey,status:'verified',source_event:source,
      visibility:d.user?'character':'party',subject_key:d.character||null,data:d});
    const scope=d.user?{mode:'private',actorUserId:d.user,actorCharacterId:d.character}:{mode:'party',actorUserId:null,actorCharacterId:null};
    const result=prepareNativeNoticeOutput(db,guild,n,scope);
    const turn=db.beginTurnAttempt({guildId:guild,sessionId:scene.session_id,messageId:`native-publication:${kind}:${key}`,
      actorPrincipal:d.user||'__native_publication__',audience:scope.mode});
    queueTurnPublications(db,{guild:{id:guild},session:{id:scene.session_id},result,scope,turnId:turn.turn_id});
    db.updateTurnAttempt(turn.turn_id,{stage:'committed',committed:'yes',nativeCommitId:noticeKey});
    return db.saveCityRecord(guild,{kind,key,status:'pending',source_event:source,visibility:n.visibility,subject_key:n.subject_key,
      data:{...notice,notice:noticeKey,turn_id:turn.turn_id}});
  });
}
export function publishNativeNotice(db,guild,{kind,key,source,notice},send){
  queueNativeNotice(db,guild,{kind,key,source,notice});
  if(!queues.has(db))queues.set(db,new KeyedSerialQueue());
  return queues.get(db).enqueue(`${guild}:${kind}:${key}`,async()=>{
    let receipt=db.getCityRecord(guild,kind,key);
    // Legacy acknowledged history remains history. Ambiguous old pending history is held, not upgraded/resubmitted.
    if(receipt?.status==='delivered')return false;
    if(receipt&&!receipt.data.turn_id)throw new StateConflictError('Legacy publication has no chunk receipts; GM reconciliation required. Retrieve /vc-roll pending.');
    const turn=receipt.data.turn_id;
    await deliverTurnOutbox(db,guild,turn,async row=>{
      db.saveCityRecord(guild,{...receipt,key,status:'delivering'});
      return send(row,receipt);
    });
    const parts=db.listTurnPublications(guild,turn),pending=parts.filter(p=>p.status!=='delivered');
    const status=pending.some(p=>p.status==='uncertain')?'uncertain':pending.length?'failed':'delivered';
    db.saveCityRecord(guild,{...receipt,key,status});
    db.updateTurnAttempt(turn,{stage:pending.length?'needs_recovery':'delivered',terminalCode:pending.length?'PUBLICATION_PENDING':null});
    if(pending.length)throw new StateConflictError('Native result remains committed; delivery needs reviewed recovery. Retrieve /vc-roll pending; do not reroll.');
    return true;
  });
}
function pvpSpecs(db,guild,proposal){
  const p=db.getCityRecord(guild,'pvp_proposal',proposal)||db.getCityRecord(guild,'pvp_encounter_contract',proposal);
  if(!p)throw new Error('Exact native proposal or PvP contract required.');
  const specs=p.data.participants.map(who=>{
    const revision=noticeHash(p.kind==='pvp_proposal'?[p.status,p.data,progressPvp(db,guild,who.user,proposal)]:[p.status,p.data]);
    return {kind:'pvp_status_publication',key:`pvp-status:${noticeHash([proposal,who.user,revision])}`,source:p.source_event,
      notice:{kind:p.kind==='pvp_proposal'?'pvp_status':'pvp_damage_status',ref:proposal,revision,user:who.user,character:who.character}};
  });
  const triggers=db.listCityRecords(guild,{kind:'pvp_fear_trigger',includeGM:true,limit:500}).filter(t=>t.data.proposal===proposal&&t.status==='resolved');
  for(const trigger of triggers){
    const effect=validateFearEffect(db,guild,trigger.data.effect),who=p.data.participants.find(row=>row.character===effect.subject_key);
    if(effect.visibility!=='party'&&!who)continue;
    const party=effect.visibility==='party',notice={kind:'pvp_fear_effect',ref:effect.record_key,proposal,terms_hash:p.data.terms_hash,
      visibility:effect.visibility,...(party?{}:{user:who.user,character:who.character})};
    specs.push({kind:'pvp_fear_publication',key:`pvp-fear-publication:${noticeHash([effect.record_key,party?'party':who.user])}`,
      source:effect.source_event,notice});
  }
  return specs;
}
export function reservePvpNotices(db,guild,proposal){return pvpSpecs(db,guild,proposal).map(s=>reserveNativeNotice(db,guild,s));}
export function reserveCampaignAttackNotices(db,guild,attack){
  const r=db.getCityRecord(guild,'pvp_attack_request',attack),o=r?.data.offer;
  if(!o||db.getCityRecord(guild,'pvp_encounter_contract',o.contract)?.data.version!==4)
    throw new StateConflictError('Exact native campaign request required.');
  return [[o.actor,o.snapshot.actor_owner],[o.target,o.snapshot.target_owner]].map(([character,user])=>{
    const projection=pvpAttackOwnerStatus(db,guild,user,attack),revision=noticeHash(projection);
    return reserveNativeNotice(db,guild,{kind:'pvp_attack_publication',key:`pvp-attack-notice:${noticeHash([attack,user,revision])}`,
      source:r.source_event,notice:{kind:'pvp_attack_status',ref:attack,revision,user,character}});
  });
}
export function reserveCampaignDamageNotice(db,guild,damage){
  const r=db.getCityRecord(guild,'pvp_damage_offer',damage),p=pvpDamageOwnerStatus(db,guild,r?.data.binding.owner,damage);
  if(!p.native_campaign)throw new StateConflictError('Exact native campaign damage choice required.');
  const revision=noticeHash(p);
  return reserveNativeNotice(db,guild,{kind:'pvp_damage_publication',key:`pvp-damage-notice:${noticeHash([damage,p.owner,revision])}`,
    source:r.source_event,notice:{kind:'pvp_damage_choice',ref:damage,revision,user:p.owner,character:p.character}});
}
/** Post-commit transport for the exact native request only. Never executes mechanics or scans foreign inboxes. */
export async function publishCampaignPvpNotices(db,guild,attack,sendPrivate){
  const request=db.getCityRecord(guild,'pvp_attack_request',attack),o=request?.data.offer;
  if(!o||db.getCityRecord(guild,'pvp_encounter_contract',o.contract)?.data.version!==4)return [];
  const jobs=reserveCampaignAttackNotices(db,guild,attack);
  if(request.data.damage){
    const membership=db.getCityRecord(guild,'pvp_damage_group_member',request.data.damage),
      damage=membership&&db.getCityRecord(guild,'pvp_damage_offer',membership.data.group);
    if(damage?.status==='awaiting_owner')jobs.push(reserveCampaignDamageNotice(db,guild,damage.record_key));
  }
  const results=await Promise.allSettled(jobs.map(job=>{
    const {kind,ref,revision,user,character}=job.data;
    return publishNativeNotice(db,guild,{kind:job.kind,key:job.record_key,source:job.source_event,
      notice:{kind,ref,revision,user,character}},publication=>
      sendPrivate(user,publication.payload,o.session,character,{publication}));
  }));
  const failed=results.find(result=>result.status==='rejected');
  if(failed)throw new StateConflictError('Campaign result saved; owner-private delivery needs reviewed recovery, not another roll.',{cause:failed.reason});
  return results;
}
export function reservePvpProjection(db,guild,row){return reserveNativeNotice(db,guild,{kind:'pvp_projection_publication',
  key:`pvp-share:${row.record_key}`,source:row.source_event,notice:{kind:'pvp_projection',ref:row.record_key}});}
/** Reconstruct only native reference jobs; stale jobs are held, never converted into new effects. */
export function materializeNativeNotices(db,guild){
  const kinds=['roll_publication','roll_party_publication','pvp_status_publication','pvp_attack_publication','pvp_damage_publication','pvp_projection_publication','pvp_fear_publication','gm_arbitration_publication','pre_roll_fear_publication'];
  const jobs=db.reservedNativeNotices(guild,kinds);
  for(const r of jobs){
    const {reservation_version,reservation_hash,...notice}=r.data;
    if(reservation_version!==2)continue;
    try{queueNativeNotice(db,guild,{kind:r.kind,key:r.record_key,source:r.source_event,notice});}
    catch(error){
      if(!['NATIVE_NOTICE','NARRATIVE_PVP','PC_EFFECT_AUTHORITY','PC_NATIVE_ELIGIBILITY','STATE_CONFLICT','CHARACTER_OBSERVATION','WORLD_OBSERVATION','GM_ARBITRATION','TYPED_ROLL_PROOF','SCENE_ACTION_WINDOW','PERMISSION_DENIED','PRE_ROLL_FEAR'].includes(error.code))throw error;
      db.saveCityRecord(guild,{...r,key:r.record_key,status:'needs_review',data:{...r.data,hold_code:error.code}});
    }
  }
  return jobs.length;
}
export function resyncNativeNotice(db,guild,kind,key,{gm=false,actor=null}={}){
  if(!gm||!actor)throw new StateConflictError('Authenticated GM resynchronization required.');
  if(!['roll_publication','roll_party_publication','pvp_status_publication','pvp_attack_publication','pvp_damage_publication','pvp_projection_publication','pvp_fear_publication','gm_arbitration_publication','pre_roll_fear_publication'].includes(kind))throw new StateConflictError('Native publication kind required.');
  const r=db.getCityRecord(guild,kind,key);if(!r)throw new StateConflictError('Exact native notice identity required.');
  if(r.data.turn_id)return r;
  const {reservation_version,reservation_hash,hold_code,...notice}=r.data;
  if(reservation_version!==2||reservation_hash!==noticeHash([kind,key,r.source_event,notice]))
    throw new StateConflictError('Legacy notice has no verifiable reservation. Inspect read-only native results, never fabricate delivery.');
  // Renderer must pass before any status reset; a GM cannot waive stale intent/audience or alter native references.
  const scene=currentScene(db,guild);renderNativeNotice(db,guild,{...notice,session:scene.session_id,scene:scene.key});
  return db.transaction(()=>{
    db.saveCityRecord(guild,{...r,key,status:'queued',data:{...notice,reservation_version,reservation_hash}});
    return queueNativeNotice(db,guild,{kind,key,source:r.source_event,notice});
  });
}
export async function publishPvpNotices(db,guild,proposal,sendPrivate,sendParty,{projection=null}={}){
  const p=db.getCityRecord(guild,'pvp_proposal',proposal)||db.getCityRecord(guild,'pvp_encounter_contract',proposal);
  if(!p)throw new Error('Exact native proposal or contract required.');
  const jobs=[];
  for(const spec of pvpSpecs(db,guild,proposal)){
    if(spec.notice.kind==='pvp_fear_effect'&&!spec.notice.user)
      jobs.push(publishNativeNotice(db,guild,spec,row=>sendParty(row.payload,p.data.session_id,{publication:row})));
    else jobs.push(publishNativeNotice(db,guild,spec,
      row=>sendPrivate(spec.notice.user,row.payload,p.data.session_id,spec.notice.character,{publication:row})));
  }
  if(projection)jobs.push(publishNativeNotice(db,guild,{kind:'pvp_projection_publication',key:`pvp-share:${projection}`,
    source:db.getCityRecord(guild,'pvp_public_projection',projection)?.source_event,
    notice:{kind:'pvp_projection',ref:projection}},row=>sendParty(row.payload,p.data.session_id,{publication:row})));
  const results=await Promise.allSettled(jobs),errors=results.filter(r=>r.status==='rejected');
  if(errors.length)throw new StateConflictError(`${errors.length} native PvP notice(s) need reviewed delivery recovery; mechanics and owner choices remain saved.`,{cause:errors[0].reason});
}
