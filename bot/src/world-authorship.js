/** Native provenance adapter. A classification/receipt is not a new execution capability. */
import {mintNarrativeAudience,revalidateNarrativeAudience} from './audience-native-v9.js';
import {sceneFictionHash as hash,sceneFictionFailure as fail,narrativeSourceVisible} from './scene-fiction-context.js';
import {factVisibleTo} from './disclosure-authority.js';
const issuer='native:narrative-authority';
const identityTokens=value=>(String(value||'').normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).join('\u0001');
/** Exact protected identity collision check at materialization, not merely in the writer projection. */
export function assertWorldIdentityNames(db,guild,definition){
  const session=db.getActiveSession(guild),protectedNames=[...db.listGuildCharacters(guild).flatMap(pc=>[pc.name,
    ...(Array.isArray(pc.data.aliases)?pc.data.aliases:[]),...(Array.isArray(pc.data.nicknames)?pc.data.nicknames:[])]),
    ...(session?db.listNpcProxies(session.id,{statuses:['active']}).flatMap(p=>[p.npc_name,p.npc_key]):[])].map(identityTokens);
  if([definition.key,definition.name,...definition.aliases].some(name=>protectedNames.includes(identityTokens(name))))
    throw fail('protected_character_or_proxy_identity');
}
/** Conservative identity-echo quarantine, NOT semantic interpretation or a grant.
 * An ordinary owner request may inspire a different GM invention; it cannot name a new fact into existence.
 */
export function assertIndependentWorldIdentity(definition,source){
  if(source?.kind!=='ai_gm_input')return;
  const text=`\u0001${identityTokens(source.details.text)}\u0001`;
  if([definition.key,definition.name,...(definition.aliases||[])].some(name=>{
    const phrase=identityTokens(name);return phrase&&text.includes(`\u0001${phrase}\u0001`);
  }))throw fail('owner_named_identity_requires_independent_authoring_source');
}
/** Only an actual registered server context can delegate GM-owned ordinary authoring. */
export function verifiedWorldAuthoringContext(db,guild,ctx){
  if(ctx?.db!==db||ctx.binding?.guild!==guild||!ctx.scope||!ctx.binding.scope
    ||hash(ctx.scope)!==hash(ctx.binding.scope))throw fail('native_world_authoring_context');
  const issued=mintNarrativeAudience(ctx),current=revalidateNarrativeAudience(db,guild,issued.proof,ctx.scope);
  return {context:current.ctx,audience_ref:current.proof.proof_ref};
}
export function worldIdentityOrigin(db,guild,row,scope){
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
