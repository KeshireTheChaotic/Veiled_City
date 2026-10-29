/** World identity authorship and historical origin checks; native audience/source capabilities stay external. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {createWorldIdentityOrigin,WORLD_AUTHORSHIP_ISSUER as issuer} from './identity-origin.js';
export function createWorldAuthorshipRules({mintNarrativeAudience,revalidateNarrativeAudience,narrativeSourceVisible,factVisibleTo,worldHookSeedForGm,listNarrativeRecords,fail}){
const worldIdentityOrigin=createWorldIdentityOrigin({factVisibleTo,narrativeSourceVisible});
const seedContexts=new WeakMap();
function seedSource(db,guild,ref,character){
  const row=listNarrativeRecords(db,guild,'world_authoring_seed')
    .find(r=>r.source_event===ref&&r.data.character_id===character);
  if(!row||worldHookSeedForGm(db,guild,row.data.hook_id).source_ref!==ref)throw fail('current_sanctioned_seed_required');
  return row;
}
/** Native GM frame + authenticated import, never a JSON role/visibility label. This capability only creates hidden identities. */
function createSeededWorldContext(db,guild,frame,sourceRef){
  if(seedContexts.has(frame))throw fail('nested_seed_context');
  const current=verifiedWorldAuthoringContext(db,guild,frame),seed=seedSource(db,guild,sourceRef,current.context.scope.actorCharacterId),
    context={...current.context};
  seedContexts.set(context,{frame,sourceRef,seed_hash:hash(seed)});return context;
}
const identityTokens=value=>(String(value||'').normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).join('\u0001');
/** Exact protected identity collision check at materialization, not merely in the writer projection. */
function assertWorldIdentityNames(db,guild,definition){
  const session=db.getActiveSession(guild),protectedNames=[...db.listGuildCharacters(guild).flatMap(pc=>[pc.name,
    ...(Array.isArray(pc.data.aliases)?pc.data.aliases:[]),...(Array.isArray(pc.data.nicknames)?pc.data.nicknames:[])]),
    ...(session?db.listNpcProxies(session.id,{statuses:['active']}).flatMap(p=>[p.npc_name,p.npc_key]):[])].map(identityTokens).filter(Boolean);
  if([definition.key,definition.name,...definition.aliases].some(name=>identityTokens(name)&&protectedNames.includes(identityTokens(name))))
    throw fail('protected_character_or_proxy_identity');
}
/** Conservative identity-echo quarantine, NOT semantic interpretation or a grant.
 * An ordinary owner request may inspire a different GM invention; it cannot name a new fact into existence.
 */
function assertIndependentWorldIdentity(definition,source,{requestedPhrases=[]}={}){
  if(source?.kind!=='ai_gm_input')return;
  const text=`\u0001${identityTokens(source.details.text)}\u0001`;
  const requested=new Set(requestedPhrases.map(identityTokens).filter(Boolean));
  if([definition.key,definition.name].some(name=>{
    const phrase=identityTokens(name);return phrase&&text.includes(`\u0001${phrase}\u0001`);
  })||(definition.aliases||[]).some(name=>{
    const phrase=identityTokens(name);return phrase&&text.includes(`\u0001${phrase}\u0001`)&&!requested.has(phrase);
  }))throw fail('owner_named_identity_requires_independent_authoring_source');
}
/** Only an actual registered server context can delegate GM-owned ordinary authoring. */
function verifiedWorldAuthoringContext(db,guild,ctx){
  const seeded=seedContexts.get(ctx);
  if(seeded){
    const current=verifiedWorldAuthoringContext(db,guild,seeded.frame),seed=seedSource(db,guild,seeded.sourceRef,current.context.scope.actorCharacterId);
    if(hash(seed)!==seeded.seed_hash||hash(ctx.binding)!==hash(current.context.binding)||hash(ctx.scope)!==hash(current.context.scope))
      throw fail('private_seed_context_changed');
    return {...current,private_seed:{source_ref:seed.source_event,seed_hash:hash(seed),hook_id:seed.data.hook_id,
      character_id:seed.data.character_id,owner_user_id:seed.data.owner_user_id}};
  }
  if(ctx?.db!==db||ctx.binding?.guild!==guild||!ctx.scope||!ctx.binding.scope
    ||hash(ctx.scope)!==hash(ctx.binding.scope))throw fail('native_world_authoring_context');
  const issued=mintNarrativeAudience(ctx),current=revalidateNarrativeAudience(db,guild,issued.proof,ctx.scope);
  if(hash(ctx.binding)!==hash(current.ctx.binding))throw fail('native_world_authoring_scope_changed');
  return {context:current.ctx,audience_ref:current.proof.proof_ref};
}
/** GM-private historical identity proof only; never an audience, NPC knowledge or new effect grant. */
function privateWorldIdentityForGm(db,guild,row){
  const d=row?.data,event=d&&db.getWorldEvent(guild,d.authorship_ref),o=event?.details.authorship_origin,definition=event?.details.identity_definition;
  if(row?.kind!=='autonomous_entity'||row.status!=='active'||row.visibility!=='gm'||row.subject_key
    ||row.record_key!==`${d?.kind}:${d?.key}`||row.source_event!==d.authorship_ref||event?.status!=='active'
    ||event.kind!=='native_narrative_entity'||event.source_id!==issuer||event.visibility!=='gm'||event.subject_key
    ||event.details.authorship_version!==2||event.details.entity_type!==d.kind||event.details.entity_key!==d.key
    ||o?.version!==2||o.kind!=='gm_private_hook'||o.source_ref!==d.narrative_origin||event.details.input_source!==o.source_ref
    ||!definition||o.identity_hash!==hash(definition)||d.summary!==definition.summary
    ||event.event_key!==`narrative-entity:${hash([o.source_ref,d.kind,d.key]).slice(0,40)}`
    ||hash([definition.kind,definition.key,definition.name,definition.aliases])!==hash([d.kind,d.key,d.name,d.aliases])
    ||typeof o.frame_ref!=='string'||!/^[a-f0-9]{64}$/.test(o.frame_hash||'')||!o.audience_ref?.startsWith('audience-v9:'))return null;
  const frame=db.getWorldEvent(guild,o.frame_ref);
  if(frame?.status!=='active'||frame.kind!=='ai_gm_input'||frame.details.character_id!==o.character_id||frame.details.author!==o.owner_user_id
    ||!db.ownerAuthoredSource(guild,frame.event_key,o.owner_user_id))return null;
  let seed;try{seed=seedSource(db,guild,o.source_ref,o.character_id);}catch(error){if(error.code!=='SCENE_FICTION')throw error;return null;}
  if(hash(seed)!==o.seed_hash||seed.data.owner_user_id!==o.owner_user_id||seed.data.hook_id!==o.hook_id)return null;
  const entity=db.getSimulationEntity(guild,d.kind,d.key),profile=d.kind==='npc'&&db.getNpcProfile(guild,d.key);
  if(d.kind==='npc'&&(!profile||profile.display_name!==d.name||entity?.state.visibility!=='gm')
    ||d.kind==='location'&&(!entity||entity.state.name!==d.name||entity.state.visibility!=='gm'))return null;
  return {version:2,kind:'gm_private_hook',receipt:event.event_key,identity_hash:o.identity_hash,execution_authority:false,publication_authority:false};
}


return Object.freeze({createSeededWorldContext,assertWorldIdentityNames,assertIndependentWorldIdentity,verifiedWorldAuthoringContext,privateWorldIdentityForGm,worldIdentityOrigin});
}
