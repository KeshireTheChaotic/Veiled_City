/** Server-only GM import provenance. A private seed is neither world establishment nor publication authority. */
import {jsonHash as hash} from './kernel/json-hash.js';
import {indexWorldEvent} from './frameworks/world/public.js';
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
function nativeRecord(db,guild,kind,key){
  const row=kind==='canon'?db.currentCanon(guild,key):kind==='relationship'?db.getRelationship(key):null;
  return row?.guild_id===guild?row:null;
}
function recordTerms(db,guild,kind,key){
  const r=nativeRecord(db,guild,kind,key);if(!r)return null;
  if(kind==='canon')return r.status==='current'?[r.id,r.canon_key,r.value,r.visibility,r.source_type,r.source_id,r.provenance,r.supersedes_id]:null;
  if(r.evidence_active===false)return null;
  if([['from',r.from_type],['to',r.to_type]].some(([side,type])=>type==='character'&&db.getCharacter(r[`${side}_key`])?.guild_id!==guild))return null;
  return [r.id,r.from_type,r.from_key,r.from_label,r.to_type,r.to_key,r.to_label,r.relationship_type,r.score,r.visibility,r.note,
    r.source,r.source_character_id,r.provenance_json,
    r.from_type==='character'?db.getCharacter(r.from_key)?.owner_user_id:null,
    r.to_type==='character'?db.getCharacter(r.to_key)?.owner_user_id:null];
}
function verifiedRecordOrigin(db,guild,row,kind,key){
  const d=row?.data,target=recordTerms(db,guild,kind,key),event=row&&db.getWorldEvent(guild,row.source_event);
  return !!(target&&d?.version===1&&d.issuer===issuer&&d.record_kind===kind&&d.record_key===key&&d.record_hash===hash(target)
    &&d.origin===(kind==='canon'?'approved_canon':'authorized_relationship')
    &&d.effect_scope===(kind==='canon'?'canon_entry_only':'directional_connection_only')
    &&d.execution_authority===false&&d.publication_authority===false&&d.authorized_by&&d.source_interaction
    &&row.status==='verified_origin'&&row.record_key===`world-sanctioned-origin:${hash([kind,key,hash(target)])}`
    &&event?.status==='active'&&event.kind==='native_sanctioned_world_origin'&&event.source_id===issuer
    &&event.event_key===`${row.record_key}:source`&&event.visibility===row.visibility&&event.details.payload_hash===hash(d));
}
/** Only native command code supplies authorize/mutate callbacks. JSON booleans, labels and proposed results are not callable. */
export function sanctionedWorldMutation(db,interaction,authorize,kind,mutate){
  authenticatedImport(db,interaction,authorize);
  if(!['canon','relationship'].includes(kind)||typeof mutate!=='function')throw new Error('Closed native sanctioned operation required.');
  const guild=interaction.guildId;
  return db.transaction(()=>{
    const result=mutate();if(result?.then)throw new Error('Native sanctioned transaction must be synchronous.');
    const target=kind==='relationship'?result:result?.canon_key?result:['accepted','unchanged'].includes(result?.status)?result.event:null;
    if(!target)return result; // Rejection/conflict never certifies proposed truth.
    const ref=kind==='canon'?target.canon_key:target.id,current=nativeRecord(db,guild,kind,ref),snapshot=recordTerms(db,guild,kind,ref);
    if(!snapshot||current.id!==target.id)throw new Error('Current native sanctioned record required.');
    const key=`world-sanctioned-origin:${hash([kind,ref,hash(snapshot)])}`,prior=db.getCityRecord(guild,'world_sanctioned_origin',key);
    if(prior){if(!verifiedRecordOrigin(db,guild,prior,kind,ref))throw new Error('Sanctioned source reconciliation required.');return result;}
    const visibility=['party','public'].includes(current.visibility)?current.visibility:'gm',
      data={version:1,issuer,origin:kind==='canon'?'approved_canon':'authorized_relationship',record_kind:kind,record_key:ref,
        record_hash:hash(snapshot),authorized_by:interaction.user.id,source_interaction:interaction.id,
        effect_scope:kind==='canon'?'canon_entry_only':'directional_connection_only',execution_authority:false,publication_authority:false};
    const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_sanctioned_world_origin',title:'Native reviewed scoped world source',
      source_id:issuer,visibility,details:{payload_hash:hash(data)}},issuer);
    db.saveCityRecord(guild,{kind:'world_sanctioned_origin',key,status:'verified_origin',visibility,source_event:event.event_key,data});return result;
  });
}
/** Metadata for the private GM planner, not an endpoint, PC agency or disclosure grant. */
export function worldRecordOriginForGm(db,guild,kind,key){
  const rows=listNarrativeRecords(db,guild,'world_sanctioned_origin').filter(r=>r.data.record_kind===kind&&r.data.record_key===key),
    verified=rows.find(r=>verifiedRecordOrigin(db,guild,r,kind,key));
  return {origin:kind==='canon'?'approved_canon':'authorized_relationship',status:verified?'verified_native_source':rows.length?'held_source':'legacy_unverified_source',
    source_ref:verified?.source_event||null,effect_scope:kind==='canon'?'canon_entry_only':'directional_connection_only',
    execution_authority:false,publication_authority:false};
}
