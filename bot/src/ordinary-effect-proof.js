/** Read-only ordinary effect ancestry and final projection. No RNG, costs or effect executor. */
import {createHash} from 'node:crypto';
import {historicalActionSource,consentAction} from './action-consent.js';
import {conversationPrincipal} from './conversation-principal.js';
import {overlapsOwnerActionTerminal} from './owner-action-terminal.js';
import {typedRollProof} from './typed-roll-proof.js';
import {isPvpIntent} from './pvp-authority.js';
import {renderWorldObservation} from './world-observation.js';
import {scenePresence} from './scene-continuity.js';
import {validOrdinaryEffect} from './ordinary-effect-schema.js';
export const effectHash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const effectKey=(proposal,scope)=>`ordinary-effect:${effectHash([proposal,scope])}`;
export function effectFail(reason){throw Object.assign(new Error(`Ordinary effect held: ${reason}`),{code:'ORDINARY_EFFECT',expected:true,reason});}
export function ordinaryActionProof(db,guild,ref,scope){
  if(typeof ref!=='string'||!ref||ref.length>200||!scope||!['party','private'].includes(scope.mode)
    ||typeof scope.actorUserId!=='string'||typeof scope.actorCharacterId!=='string')effectFail('CURRENT_ACTION_AUTHORITY_REQUIRED');
  const row=db.getCityRecord(guild,'typed_intent',ref);let p;
  try{p=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);}catch(error){
    if(!['Active session required.','Select an authenticated current controlled role.','Controller attendance required.','Active campaign character required.'].includes(error.message))throw error;
    effectFail('CURRENT_ACTION_AUTHORITY_REQUIRED');
  }
  if(!row||p.kind!=='owner'||row.data.actor!==p.character_id||row.data.owner_user_id!==p.user
    ||!Number.isSafeInteger(row.data.start)||!Number.isSafeInteger(row.data.end)||row.data.start<0||row.data.end<=row.data.start
    ||row.data.actor_principal_revision!==p.revision||!['party','private'].includes(scope.mode)
    ||row.visibility==='character'&&(scope.mode!=='private'||row.subject_key!==p.character_id)
    ||row.data.gm_review_terminal||overlapsOwnerActionTerminal(db,guild,row.source_event,row.data.start,row.data.end)
    ||isPvpIntent(db,guild,row)||row.data.type==='roll'||row.data.framing!=='immediate')effectFail('CURRENT_ACTION_AUTHORITY_REQUIRED');
  const proof=row.status==='resolved'?historicalActionSource(db,guild,ref,{resolved:true}):consentAction(db,guild,ref);
  if(row.data.end>proof.source.details.raw_text.length)effectFail('EXACT_SOURCE_RANGE_REQUIRED');
  const pc=db.getCharacter(p.character_id),world=row.data.world_source_event&&db.getWorldEvent(guild,row.data.world_source_event);
  if((row.data.from_ref||null)!==(pc.data.location||null)||row.data.world_source_event&&(!world||world.status!=='active'
    ||world.details.character_id!==p.character_id||world.details.author!==p.user||world.details.revision!==p.revision
    ||world.kind!=='ai_gm_input'||world.session_id!==proof.scene.session_id||world.scene!==proof.scene.key
    ||world.details.private_scene!==(row.visibility==='character')||world.details.text!==proof.source.details.raw_text))effectFail('CURRENT_SOURCE_LOCATION_REQUIRED');
  return {...proof,principal:p,pc,world,scope:{mode:scope.mode,actorUserId:p.user,actorCharacterId:p.character_id}};
}
export function ordinaryPrerequisite(db,guild,p,proof){
  const a=proof.row,r=db.getCityRecord(guild,'action_outcome_receipt',a.data.outcome_receipt);
  if(!r||r.status!=='resolved'||a.status!=='resolved'||p.prerequisite_ref&&r.record_key!==p.prerequisite_ref
    ||r.source_event!==a.source_event||r.data.action_id!==a.record_key||r.data.actor_ref!==a.data.actor)effectFail('NATIVE_PREREQUISITE_PENDING_OR_MISMATCHED');
  // Accepted intent projection metadata can be refreshed on replay. The original native ruling cannot:
  // anchor new material follow-through to its saved location/context, never mutable from_ref alone.
  const ruling=db.getCityRecord(guild,'gm_action_ruling',`gm-ruling:${effectHash([a.record_key,1])}`),d=ruling?.data,
    evidence=d?.context_refs?.map(ref=>db.getWorldEvent(guild,ref));
  if(!ruling||ruling.source_event!==a.source_event||d.accepted_intent!==a.record_key||d.actor!==a.data.actor
    ||d.source_hash!==a.data.source_hash||d.principal_revision!==proof.principal.revision||d.session_id!==proof.scene.session_id
    ||d.scene!==proof.scene.key||d.location!==proof.pc.data.location||d.proposal.capability.kind!=='mundane'
    ||!evidence?.length||evidence.some(s=>s?.status!=='active')||effectHash(evidence)!==d.context_hash)
    effectFail('NATIVE_CAUSAL_LOCATION_OR_CONTEXT_REQUIRED');
  let native=null;
  if(r.data.outcome==='resolved_no_roll'){
    const adjudications=db.listCityRecords(guild,{kind:'native_adjudication',includeGM:true,limit:500});
    if(r.data.state_mutations.length||r.data.native_roll_refs.length||!adjudications.some(q=>q.source_event===a.source_event
      &&q.data.action_id===a.record_key&&q.status==='resolved'&&q.data.disposition==='resolved'
      &&q.data.roll_request_ref===null&&q.data.receipts.includes(r.record_key)))effectFail('NATIVE_NO_ROLL_PROOF_REQUIRED');
  }else{
    const request=db.getCityRecord(guild,'roll_request',r.data.request);
    native=typedRollProof(db,guild,request);
    if(native.accepted.record_key!==a.record_key||native.outcome!==r.data.outcome
      ||r.data.native_roll_refs.length!==1||r.data.native_roll_refs[0]!==native.roll.id
      ||r.data.total!==request.data.result.total||r.data.duality!==request.data.result.duality
      ||request.data.kind!=='action')effectFail('NATIVE_ACTION_RESULT_REQUIRED');
  }
  return {receipt:r,native};
}
export function effectTarget(db,guild,intent){
  const p=intent.payload;
  if(intent.feature==='goal')return db.getNpcGoal(guild,p.actor_key,p.goal_key);
  if(intent.feature==='scene')return scenePresence(db,guild,p.entity_type,p.entity_key);
  if(intent.feature==='consequence'){
    const consequence=db.getCityRecord(guild,'consequence',intent.target_key);
    return {consequence,infrastructure:consequence?db.getCityRecord(guild,'infrastructure',consequence.data.entity_key):null};
  }
  effectFail('UNSUPPORTED_NATIVE_ADAPTER');
}
export function effectVisibility(db,guild,proposal,payload,origin,prerequisite){
  if(proposal.adapter==='delegated'){
    if(['goal','consequence'].includes(payload.intent.feature))return 'gm';
    const target=effectTarget(db,guild,payload.intent);
    if(!target||target.visibility==='gm'||!['party','public','character'].includes(target.visibility))return 'gm';
    if(target.visibility==='character')return 'character';
  }
  return origin.mode==='private'||prerequisite.visibility==='character'?'character':'party';
}
/** Native child review must retain the original causal gate; human review cannot replace a PC outcome. */
export function assertOrdinaryBinding(db,guild,binding,intent,origin=''){
  if(!binding){
    if(String(origin||'').startsWith('ordinary-effect:'))effectFail('VERSIONED_NATIVE_CHILD_BINDING_REQUIRED');
    return;
  }
  if(!validOrdinaryEffect(binding.proposal)||!binding.scope||typeof binding.key!=='string')effectFail('VERSIONED_NATIVE_CHILD_BINDING_REQUIRED');
  const proof=ordinaryActionProof(db,guild,binding.proposal.accepted_intent_ref,binding.scope),pre=ordinaryPrerequisite(db,guild,binding.proposal,proof),
    payload=JSON.parse(binding.proposal.payload_json),r=pre.receipt;
  if(binding.key!==effectKey(binding.proposal,proof.scope)||effectHash(payload.intent)!==effectHash(intent)
    ||binding.source_hash!==effectHash(proof.source)||binding.world_hash!==effectHash(proof.world||null)
    ||binding.prerequisite_hash!==effectHash(r)
    ||(payload.when==='no_roll'?r.data.outcome!=='resolved_no_roll':payload.when==='success'?r.data.outcome!=='success'
      :payload.when==='failure_fear'?r.data.outcome!=='failure'||r.data.duality!=='Fear':true))effectFail('EXACT_NATIVE_CHILD_BINDING_REQUIRED');
}
export function effectObservation(db,guild,query,proof,scope){
  if(!query||Object.keys(query).sort().join(',')!=='operation,target,target_type'
    ||!['npc','location'].includes(query.target_type)||typeof query.target!=='string'||query.target.length>160
    ||!['appearance','clothing','activity'].includes(query.operation))effectFail('CLOSED_OBSERVATION_REQUIRED');
  let result;
  try{result=renderWorldObservation(db,guild,{...query,observer:proof.pc.id,scene:proof.scene.key,session:proof.scene.session_id},scope);}
  catch(error){if(error.code!=='WORLD_OBSERVATION')throw error;effectFail('ESTABLISHED_VISIBLE_FACT_REQUIRED');}
  if(!result.canSee||!result.proof_refs.length)effectFail('ESTABLISHED_VISIBLE_FACT_REQUIRED');
  const facts=result.proof_refs.map(ref=>db.getCityRecord(guild,'world_visible_fact',ref));
  return {text:result.text,hash:effectHash([result,facts,facts.map(r=>db.getWorldEvent(guild,r.source_event))])};
}
export function verifyOrdinaryEffect(db,guild,ref,scope){
  const row=db.getCityRecord(guild,'ordinary_effect_receipt',ref),d=row?.data;
  if(row?.status!=='applied'||d?.version!==1||ref!==effectKey(d.proposal,d.origin_scope)
    ||d.proposal.accepted_intent_ref!==d.action||effectHash(JSON.parse(d.proposal.payload_json))!==effectHash(d.payload)
    ||row.source_event!==d.source||row.subject_key!==d.actor&&row.visibility==='character'
    ||row.visibility==='character'&&(scope.mode!=='private'||scope.actorCharacterId!==d.actor))effectFail('CURRENT_EFFECT_AUDIENCE_REQUIRED');
  const proof=ordinaryActionProof(db,guild,d.action,scope),pre=ordinaryPrerequisite(db,guild,d.proposal,proof);
  const visibility=effectVisibility(db,guild,d.proposal,d.payload,d.origin_scope,pre.receipt);
  if(row.visibility!==visibility||(row.subject_key||null)!==(visibility==='character'?proof.pc.id:null))effectFail('IMMUTABLE_EFFECT_AUDIENCE_REQUIRED');
  if(d.owner!==proof.principal.user||d.principal_revision!==proof.principal.revision||d.scene!==proof.scene.key||d.session!==proof.scene.session_id
    ||d.source!==proof.row.source_event||d.prerequisite!==pre.receipt.record_key||d.prerequisite_hash!==effectHash(pre.receipt)
    ||d.source_hash!==effectHash(proof.source)||d.world_hash!==effectHash(proof.world||null))effectFail('CURRENT_EFFECT_ANCESTRY_REQUIRED');
  let text=d.text;
  if(d.proposal.adapter==='observation'){
    const result=effectObservation(db,guild,d.payload.query,proof,scope);
    if(result.hash!==d.result_hash||text!==result.text)effectFail('OBSERVATION_CHANGED');
  }else{
    const native=db.getCityRecord(guild,'ai_intent',d.native_ref),source=native&&db.getWorldEvent(guild,native.source_event);
    const evidence=[native?.source_event,...(d.payload.intent?.source_prerequisites||[])].map(ref=>db.getWorldEvent(guild,ref));
    if(native?.status!=='accepted'||effectHash(native)!==d.native_hash||source?.status!=='active'
      ||effectHash(native.data.intent)!==effectHash(d.payload.intent)||evidence.some(s=>s?.status!=='active')
      ||effectHash(evidence)!==d.native_evidence_hash
      ||effectHash(effectTarget(db,guild,d.payload.intent))!==d.result_hash)effectFail('NATIVE_EFFECT_CHANGED');
    if(!native.data.ordinary_effect)effectFail('NATIVE_CHILD_BINDING_REQUIRED');
    assertOrdinaryBinding(db,guild,native.data.ordinary_effect,d.payload.intent);
    text=`Native world consequence: ${JSON.stringify({adapter:d.payload.intent.feature,operation:d.payload.intent.payload.op,
      target:d.payload.intent.target_key,status:'applied'})}.`;
    if(text!==d.text)effectFail('EFFECT_PAYLOAD_CHANGED');
  }
  return {text,source:proof.source,revision:effectHash([row,pre.receipt,proof.source])};
}
export function ordinaryEffectProjection(db,guild,ref,scope){
  if(!['party','character'].includes(db.getCityRecord(guild,'ordinary_effect_receipt',ref)?.visibility))effectFail('CURRENT_EFFECT_AUDIENCE_REQUIRED');
  return verifyOrdinaryEffect(db,guild,ref,scope);
}
