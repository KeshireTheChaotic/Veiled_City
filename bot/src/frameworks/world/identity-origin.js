/** Read-only native World origin proof; no fresh authoring, placement, consent or delivery grant. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {worldKnowledgeSources} from './contracts/knowledge-records.js';
import {worldNarrativeAuthorship} from './contracts/narrative-authorship.js';
export const WORLD_AUTHORSHIP_ISSUER='native:narrative-authority';
export function createWorldIdentityOrigin({factVisibleTo,narrativeSourceVisible}){
const issuer=WORLD_AUTHORSHIP_ISSUER;
function worldIdentityOrigin(db,guild,row,scope){
  const d=row?.data,creation=d&&db.getWorldEvent(guild,d.authorship_ref||row.source_event);
  if(row?.kind!=='autonomous_entity'||row.status!=='active'||!d||row.record_key!==`${d.kind}:${d.key}`
    ||!factVisibleTo({...row,subject_character_id:row.subject_key},scope)
    ||creation?.status!=='active'||creation.kind!=='native_narrative_entity'||creation.source_id!==issuer
    ||creation.details.entity_type!==d.kind||creation.details.entity_key!==d.key
    ||creation.details.input_source!==d.narrative_origin
    ||!narrativeSourceVisible(db,guild,row.source_event,scope)||!narrativeSourceVisible(db,guild,creation.event_key,scope))return null;
  const origin=creation.details.authorship_origin;
  // Historical committed native identities remain readable, but this path cannot mint a grant.
  if(!origin&&!d.authorship_ref&&creation.details.authorship_version===undefined)
    return {version:0,kind:'native_ai_gm',receipt:creation.event_key,execution_authority:false};
  const definition=creation.details.identity_definition;
  if(!origin||Object.keys(origin).sort().join()!=='audience_ref,identity_hash,kind,scope_hash,source_ref,version'
    ||creation.details.authorship_version!==1||origin.version!==1||origin.kind!=='native_ai_gm'||origin.source_ref!==d.narrative_origin
    ||typeof origin.audience_ref!=='string'||!origin.audience_ref.startsWith('audience-v9:')
    ||!/^[a-f0-9]{64}$/.test(origin.scope_hash)||!definition||origin.identity_hash!==hash(definition)
    ||hash([definition.kind,definition.key,definition.name,definition.aliases])!==hash([d.kind,d.key,d.name,d.aliases])
    ||d.authorship_ref!==creation.event_key)return null;
  const currentName=d.kind==='npc'?db.getNpcProfile(guild,d.key)?.display_name:db.getSimulationEntity(guild,d.kind,d.key)?.state.name;
  if(typeof currentName==='string'&&currentName.trim()!==d.name.trim()||d.kind==='npc'&&!currentName)return null;
  return {version:1,kind:'native_ai_gm',receipt:creation.event_key,identity_hash:origin.identity_hash,execution_authority:false};
}
return worldIdentityOrigin;
}
export const worldIdentityOrigin=createWorldIdentityOrigin({
  factVisibleTo:(...args)=>worldKnowledgeSources.factVisibleTo(...args),
  narrativeSourceVisible:(...args)=>worldNarrativeAuthorship.narrativeSourceVisible(...args)
});
