/** Closed native renderers. Persisted text is never an authorization or a model-controlled template. */
import {createHash} from 'node:crypto';
import {personalCharacter} from './personal-continuity.js';
import {formatRollRequest} from './roll-requests.js';
import {formatSharedRoll,validateRollSharePreview,sourceConfirmedRollAttempt} from './roll-sharing.js';
import {pvpOwnerContext} from './narrative-pvp.js';
import {progressPvp,validatePvpRoundReceipt,validatePvpResolutionReceipt} from './pvp-rounds.js';
import {pvpProjection} from './pvp-authorship.js';
import {currentScene} from './scene-continuity.js';
import {typedRollProof} from './typed-roll-proof.js';
import {renderFearEffect,validateFearEffect} from './pvp-fear-moves.js';
export const noticeHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fail(){throw Object.assign(new Error('Native notice source, revision, owner or audience is stale.'),{code:'NATIVE_NOTICE'});}
export function renderNativeNotice(db,guild,d){
  const scene=currentScene(db,guild);
  if(scene.key!==d.scene||scene.session_id!==d.session)fail();
  if(d.user)personalCharacter(db,guild,d.user,d.character);
  if(d.kind==='roll_private'||d.kind==='roll_party'){
    const r=db.getCityRecord(guild,'roll_request',d.ref),source=r&&db.getWorldEvent(guild,r.source_event);
    if(!r||noticeHash([r.status,r.data])!==d.revision||!source||source.status!=='active'
      ||!db.ownerAuthoredSource(guild,source.event_key,r.data.owner_user_id)
      ||db.getCharacter(r.subject_key)?.owner_user_id!==r.data.owner_user_id
      ||r.data.session_id!==d.session||r.data.scene!==d.scene)fail();
    if(d.kind==='roll_party'){
      const s=db.getWorldEvent(guild,r.data.party_disclosure?.source_event),roll=db.getSavedRoll(guild,r.data.roll_id);
      if(d.user||!s||s.status!=='active'||s.visibility!=='party'||s.details.request!==r.record_key
        ||s.details.author!==r.data.owner_user_id||!db.ownerAuthoredSource(guild,s.event_key,r.data.owner_user_id)
        ||!roll||roll.session_id!==d.session||roll.payload.total!==r.data.result?.total
        ||roll.payload.duality!==r.data.result?.duality)fail();
      const selected=r.data.tag?.participants.find(p=>p.roll_id===r.data.roll_id),owner=selected?.user||r.data.owner_user_id,
        character=selected?.character||r.subject_key;
      const {request,revision,...savedResult}=roll.payload,{request:resultRequest,revision:resultRevision,...declaredResult}=r.data.result;
      if(request!==r.record_key||roll.discord_user_id!==owner||roll.character_id!==character
        ||db.getCharacter(character)?.owner_user_id!==owner||noticeHash(savedResult)!==noticeHash(declaredResult)
        ||resultRequest!==undefined&&resultRequest!==request||resultRevision!==undefined&&resultRevision!==revision)fail();
      if(r.data.input?.accepted_intent)typedRollProof(db,guild,r);
      if(r.data.party_disclosure.preview){
        const preview=validateRollSharePreview(db,guild,r,r.data.party_disclosure.preview);
        if(s.details.preview!==preview.record_key||r.data.party_disclosure.context!==preview.data.text)fail();
      }else if(r.data.party_disclosure.context)fail();
      return formatSharedRoll(r);
    }
    const own=r.data.owner_user_id===d.user&&r.subject_key===d.character;
    const participant=r.data.tag?.participants.some(p=>p.user===d.user&&p.character===d.character);
    const helper=r.data.helpers?.some(p=>p.user===d.user&&p.character===d.character);
    const disclosure=r.data.disclosures?.find(p=>p.user===d.user&&p.character===d.character);
    const ds=disclosure&&db.getWorldEvent(guild,disclosure.source_event);
    const shared=ds?.status==='active'&&ds.kind==='roll_disclosure'&&ds.visibility==='character'&&ds.subject_key===d.character
      &&ds.source_id===`player:${r.data.owner_user_id}`&&ds.details.author===r.data.owner_user_id
      &&ds.details.request===r.record_key&&ds.session_id===d.session&&ds.scene===d.scene
      &&db.ownerAuthoredSource(guild,ds.event_key,r.data.owner_user_id);
    const partner=r.status==='awaiting_partner'&&r.data.tag?.partner_user===d.user
      &&db.getCityRecord(guild,'roll_request',r.data.tag.partner_request)?.subject_key===d.character;
    if(!own&&!participant&&!helper&&!shared&&!partner)fail();
    if(shared&&disclosure.context&&(ds.details.attempt!==disclosure.context||sourceConfirmedRollAttempt(db,guild,r)!==disclosure.context))fail();
    return formatRollRequest(r,{user:d.user});
  }
  if(d.kind==='pvp_projection'){
    if(d.user)fail();return pvpProjection(db,guild,d.ref).data.text;
  }
  if(d.kind==='pvp_status'){
    const {proposal:p,terms}=pvpOwnerContext(db,guild,d.user,d.ref),progress=progressPvp(db,guild,d.user,d.ref);
    if(noticeHash([p.status,p.data,progress])!==d.revision)fail();
    if(progress.own)validatePvpRoundReceipt(db,guild,p,db.pvpRoundForRoll(guild,p.record_key,d.character,progress.own.roll_id));
    if(progress.resolution)validatePvpResolutionReceipt(db,guild,p,db.getCityRecord(guild,'pvp_resolution_receipt',progress.resolution.receipt));
    const t=terms.data.snapshot.terms;
    return [`**Private narrative PvP offer/status — ${p.record_key}**`,
      'Nonbinding terms/status only; this notice neither consents nor authors a PC response.',
      `Revision: ${p.data.terms_hash}; mode: ${t.mode}; objective: ${t.objective}`,
      ...t.stakes.map(s=>`${db.getCharacter(s.character).name}: best ${s.best}; worst ${s.worst}; tie ${s.tie}`),
      `Boundaries: ${t.boundaries.join('; ')}; audience: ${t.audience}; ownership: ${t.authorship}`,
      `Hope: ${t.hope_policy}; Fear: ${t.fear_policy}; stop: ${t.stop_policy}`,
      JSON.stringify(progress)].join('\n');
  }
  if(d.kind==='pvp_fear_effect'){
    const effect=validateFearEffect(db,guild,d.ref),trigger=db.getCityRecord(guild,'pvp_fear_trigger',effect.data.trigger);
    if(effect.data.proposal!==d.proposal||effect.data.terms_hash!==d.terms_hash
      ||effect.visibility!==d.visibility||effect.subject_key!==(d.character||null)
      ||d.user&&db.getCharacter(d.character)?.owner_user_id!==d.user
        ||!d.user&&effect.visibility!=='party'||trigger?.status!=='resolved')fail();
    return renderFearEffect(db,guild,effect.record_key,d.user?{mode:'private',actorUserId:d.user,actorCharacterId:d.character}:
      {mode:'party',actorUserId:null,actorCharacterId:null});
  }
  fail();
}
