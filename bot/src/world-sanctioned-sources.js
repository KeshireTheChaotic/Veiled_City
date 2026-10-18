/** Server-only GM import provenance. A private seed is neither world establishment nor publication authority. */
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {indexWorldEvent} from './city-calendar.js';
import {listNarrativeRecords} from './narrative-records.js';
const issuer='native:world-sanctioned-source';
function terms(db,guild,hook){
  const pc=hook&&db.getCharacter(hook.character_id);
  return hook?.guild_id===guild&&pc?.guild_id===guild?[hook.id,hook.character_id,pc.owner_user_id,hook.hook_key,hook.title,
    hook.hook_type,hook.premise,hook.permission,hook.suggested_entry,hook.payload,hook.source,hook.status]:null;
}
function authenticatedImport(db,interaction,authorize){
  // Called with the server's Discord interaction, not a model-supplied role label or actor string.
  if(typeof interaction?.user?.id!=='string'||!interaction.user.id||typeof interaction.id!=='string'||!interaction.id
    ||typeof authorize!=='function'||authorize(db,interaction)!==true)
    throw Object.assign(new Error('Authenticated native GM import interaction required.'),{code:'WORLD_SANCTIONED_SOURCE'});
}
/** This adapter reuses the existing GM import transaction; JSON cannot supply its native callback. */
export function importSanctionedGmHooks(db,interaction,character,packet,authorize){
  authenticatedImport(db,interaction,authorize);const guild=interaction.guildId;
  return db.transaction(()=>db.importCharacterGmHooks(guild,character,packet,{onHookImported:hook=>{
    if(hook.status!=='active'||hook.hook_type==='canon_suggestion')return;
    const target=terms(db,guild,hook);if(!target)throw new Error('Current campaign hook required.');
    const key=`world-authoring-seed:${hash([hook.id,hash(target)])}`,prior=db.getCityRecord(guild,'world_authoring_seed',key);
    if(prior){if(!verifiedSeed(db,guild,prior,hook))throw new Error('Existing GM seed requires source reconciliation.');return;}
    const data={version:1,issuer,origin:'gm_private_hook',hook_id:hook.id,character_id:hook.character_id,
      owner_user_id:db.getCharacter(hook.character_id).owner_user_id,hook_hash:hash(target),authorized_by:interaction.user.id,source_interaction:interaction.id,
      execution_authority:false,publication_authority:false};
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_gm_hook_seed',title:'Authenticated private GM hook seed',
      source_id:issuer,visibility:'gm',details:{payload_hash:hash(data)}},issuer);
    db.saveCityRecord(guild,{kind:'world_authoring_seed',key,status:'private_seed',visibility:'gm',source_event:source.event_key,data});
  }}));
}
function verifiedSeed(db,guild,row,hook){
  const d=row?.data,target=terms(db,guild,hook),event=row&&db.getWorldEvent(guild,row.source_event);
  return !!(target&&hook.status==='active'&&hook.hook_type!=='canon_suggestion'&&row.visibility==='gm'&&row.status==='private_seed'
    &&d?.version===1&&d.issuer===issuer&&d.origin==='gm_private_hook'&&d.hook_id===hook.id&&d.character_id===hook.character_id
    &&d.owner_user_id===db.getCharacter(hook.character_id)?.owner_user_id&&d.hook_hash===hash(target)
    &&d.execution_authority===false&&d.publication_authority===false&&typeof d.authorized_by==='string'&&d.authorized_by
    &&typeof d.source_interaction==='string'&&d.source_interaction&&row.record_key===`world-authoring-seed:${hash([hook.id,hash(target)])}`
    &&event?.status==='active'&&event.kind==='native_gm_hook_seed'&&event.source_id===issuer&&event.visibility==='gm'
    &&event.event_key===`${row.record_key}:source`&&event.details.payload_hash===hash(d));
}
/** GM planner metadata only. No raw private premise is returned by this classifier or sent to a player writer. */
export function worldHookSeedForGm(db,guild,hookId){
  const hook=db.getCharacterGmHook(hookId),rows=listNarrativeRecords(db,guild,'world_authoring_seed').filter(row=>row.data.hook_id===hookId),
    verified=rows.find(row=>verifiedSeed(db,guild,row,hook));
  return {origin:'gm_private_hook',status:verified?'verified_private_seed':rows.length?'held_source':'legacy_unverified_proposal',
    source_ref:verified?.source_event||null,execution_authority:false,publication_authority:false,
    disposition:'GM-private proposal/premise only; independent native materialization and disclosure are required.'};
}
