/** Native scoped mundane-identity persistence. Never creates canon allegations, actors, powers or execution permission. */
import {verifiedWorldAuthoringContext} from './authorship-service.js';
import {worldIdentityOrigin} from './identity-origin.js';
import {worldNarrativeSources} from './contracts/narrative-sources.js';
function canonicalInterestEvidence(...args){return worldNarrativeSources.canonicalInterestEvidence(...args);}function nativeSalienceAvailable(...args){return worldNarrativeSources.nativeSalienceAvailable(...args);}
function buildNarrativeContext(...args){return worldNarrativeSources.buildNarrativeContext(...args);}
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {sceneFictionFailure as fail} from '../../kernel/scene-fiction-failure.js';
function factVisibleTo(...args){return worldKnowledgeSources.factVisibleTo(...args);}
import {indexWorldEvent} from './city-calendar.js';
import {worldKnowledgeSources} from './contracts/knowledge-records.js';
import {worldNarrativeAuthorship} from './contracts/narrative-authorship.js';
function narrativeSourceVisible(...args){return worldNarrativeAuthorship.narrativeSourceVisible(...args);}
function listNarrativeRecords(...args){return worldKnowledgeSources.listNarrativeRecords(...args);}
const issuer='native:world-identity-persistence';
export function verifiedIdentityPersistence(db,guild,key,scope){
  const row=db.getCityRecord(guild,'world_identity_promotion',key),d=row?.data,event=row&&db.getWorldEvent(guild,row.source_event);
  if(row?.status!=='canonical_identity'||d?.version!==1||d.issuer!==issuer||d.canonical_scope!=='mundane_identity_only'
    ||d.execution_authority!==false||d.publication_authority!==false||!factVisibleTo({...row,subject_character_id:row.subject_key},scope)
    ||row.visibility==='character'&&db.getCharacter(row.subject_key)?.owner_user_id!==scope.actorUserId
    ||event?.status!=='active'||event.kind!=='native_world_identity_promotion'||event.source_id!==issuer||event.event_key!==`${key}:source`
    ||event.details.payload_hash!==hash(d)||!narrativeSourceVisible(db,guild,event.event_key,scope))return null;
  const identity=db.getCityRecord(guild,'autonomous_entity',d.identity_ref),origin=worldIdentityOrigin(db,guild,identity,scope);
  return origin?.version===1&&origin.identity_hash===d.identity_hash&&identity.source_event===d.birth_source?row:null;
}
/** Requires a live registered GM scope; persisted JSON never revives its authoring capability. */
export function promoteWorldIdentity(db,guild,context,identityRef){
  return db.transaction(()=>{
    const verified=verifiedWorldAuthoringContext(db,guild,context),ctx=verified.context,scope=ctx.scope,
      identity=db.getCityRecord(guild,'autonomous_entity',identityRef),origin=worldIdentityOrigin(db,guild,identity,scope);
    if(!nativeSalienceAvailable(db,guild)||db.isDirectorPaused(guild)
      ||(db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode||'autonomous')!=='autonomous'
      ||origin?.version!==1)return null;
    const visibility=scope.mode==='private'?'character':'party',subject=scope.mode==='private'?scope.actorCharacterId:null,
      previous=listNarrativeRecords(db,guild,'world_identity_promotion').filter(r=>r.data.identity_ref===identityRef
        &&r.visibility===visibility&&(r.subject_key||null)===subject);
    const current=previous.find(r=>verifiedIdentityPersistence(db,guild,r.record_key,scope));if(current)return current;
    const evidence=canonicalInterestEvidence(db,guild,identityRef,scope);let score=0;const sources=[];
    for(const item of evidence){score+=item.weight;sources.push(item.source);if(score>=20)break;}
    if(score<20)return null;
    const key=`world-identity-promotion:${hash([identityRef,origin.identity_hash,visibility,subject,[...new Set(sources)].sort()])}`,
      prior=db.getCityRecord(guild,'world_identity_promotion',key);
    if(prior)throw fail('identity_persistence_requires_source_reconciliation');
    const data={version:1,issuer,identity_ref:identityRef,identity_hash:origin.identity_hash,birth_source:identity.source_event,
      canonical_scope:'mundane_identity_only',score_at_commit:score,evidence_sources:[...new Set(sources)].sort(),
      authoring_ref:verified.audience_ref,execution_authority:false,publication_authority:false,previous:previous[0]?.record_key||null};
    const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_world_identity_promotion',title:'Scoped mundane identity persistence',
      source_id:issuer,session_id:ctx.binding.session,scene:ctx.binding.scene,visibility,subject_key:subject,
      details:{input_source:ctx.binding.source,source_refs:[identity.source_event,...data.evidence_sources],payload_hash:hash(data)}},issuer);
    return db.saveCityRecord(guild,{kind:'world_identity_promotion',key,status:'canonical_identity',visibility,subject_key:subject,source_event:event.event_key,data});
  });
}
/** Automatic transition uses only native evidence. An unavailable optional scope cannot veto independent gameplay. */
export function maintainIdentityPersistence(db,guild,entity,scope,sourceRef){
  if(canonicalInterestEvidence(db,guild,entity,scope).reduce((sum,e)=>sum+e.weight,0)<20)return;
  if((db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode||'autonomous')!=='autonomous')return;
  const flags=db.getCityCalendar(guild).flags;if(!flags.narrative_authority||!flags.playable_narration)return;
  try{return promoteWorldIdentity(db,guild,buildNarrativeContext(db,guild,scope,sourceRef),entity);}
  catch(error){
    if(error.code!=='SCENE_FICTION')throw error;
    db.saveCityRecord(guild,{kind:'world_identity_persistence_review',key:`world-persistence-review:${hash([entity,sourceRef,scope])}`,
      status:'held_source',visibility:'gm',source_event:sourceRef,data:{version:1,identity_ref:entity,reason:error.diagnostic?.category||'native_scope_unavailable'}});
    return null;
  }
}
