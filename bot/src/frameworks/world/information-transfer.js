/** Original attributed native reports; no objective canon, PC knowledge or publication authority. */
import {inspectWorldSimulationReceipt} from './simulation-receipt-core.js';
import {worldNpcKnowledge} from './contracts/npc-knowledge-source.js';
import {worldNativeActorControl} from './contracts/actor-control.js';
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {indexWorldEvent,cityAudit} from './city-calendar.js';
const ownedKnowledgeSource=(...args)=>worldNpcKnowledge.ownedKnowledgeSource(...args);
const nativeActorControl=(...args)=>worldNativeActorControl.nativeActorControl(...args);
const issuer='native:world-information-transfer';
const key=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const held=reason=>({status:'held_source',reason,execution_authority:false,publication_authority:false});
const parse=value=>{try{return JSON.parse(value);}catch{return null;}};
function activeSource(db,guild,event,seen=new Set()){
  if(!event||event.status!=='active'||seen.has(event.event_key)||seen.size>=24)return false;
  seen.add(event.event_key);
  if(event.kind==='native_world_information_transfer'){
    const row=db.getCityRecord(guild,'world_information_transfer',event.details?.receipt_ref),d=row?.data,
      receipt=d&&inspectWorldSimulationReceipt(db,guild,d.action_id);
    if(row?.status!=='committed'||row.visibility!=='gm'||row.source_event!==event.event_key||d?.issuer!==issuer
      ||event.details.payload_hash!==hash(d)||receipt?.status!=='verified_native_receipt'||receipt.mutation_id!==d.mutation_id
      ||!db.mutationsForEntity(guild,row.record_key,20).some(m=>m.source_layer==='city'&&m.actor_id===issuer
        &&m.mutation_type==='world_information_transfer'&&hash(parse(m.after_json))===hash(row)))return false;
  }
  const parents=[event.details?.input_source,...(Array.isArray(event.details?.source_refs)?event.details.source_refs:[])].filter(Boolean);
  return parents.every(ref=>activeSource(db,guild,db.getWorldEvent(guild,ref),new Set(seen)));
}
function actor(db,guild,type,id){
  if(!['npc','faction'].includes(type)||!key(id))return null;
  const entity=db.getSimulationEntity(guild,type,id),control=nativeActorControl(db,guild,type,id);
  if(!entity||control.owner_control_type!=='ai_world'||entity.state.removed||['dead','removed'].includes(entity.state.status)
    ||['dead','removed','dormant'].includes(entity.state.activity_tier)||type==='npc'&&!db.getNpcProfile(guild,id))return null;
  return {type,key:id,control_hash:hash(control)};
}
function context(db,guild,actionId,{requireCapture=true}={}){
  const receipt=inspectWorldSimulationReceipt(db,guild,actionId),action=db.getSimulationRecord(guild,actionId),a=action?.data;
  if(receipt.status!=='verified_native_receipt'||!receipt.result.success||!['contact','negotiate','request_favor'].includes(receipt.operation)
    ||!key(a?.information_key))return null;
  const sender=actor(db,guild,a.actor_type,a.actor_key),recipient=actor(db,guild,a.target_type,a.target_key);
  if(!sender||!recipient||sender.type===recipient.type&&sender.key===recipient.key)return null;
  const known=sender.type==='npc'?db.getNpcKnowledge(guild,sender.key,a.information_key)
    :db.listSimulationRecords(guild,{kind:'awareness',entityKey:`faction:${sender.key}`,limit:1000})
      .find(r=>r.data.information_key===a.information_key)?.data;
  if(!known||known.belief_state==='unknown'||typeof known.content!=='string'||!known.content.trim()||known.content.length>4000)return null;
  const source=sender.type==='npc'?ownedKnowledgeSource(db,guild,sender.key,known):db.getWorldEvent(guild,known.source_ref),
    mutationSource=db.getWorldEvent(guild,receipt.source_ref),mutation=db.getMutation(guild,receipt.mutation_id);
  if(!activeSource(db,guild,source)||mutationSource?.status!=='active'||mutationSource.source_kind!=='mutation'
    ||mutationSource.source_id!==receipt.mutation_id)return null;
  // New transfers require the resolver's actual pre-completion input, never current future information.
  if(requireCapture&&!Object.hasOwn(a.result,'information_source'))return null;
  if(Object.hasOwn(a.result,'information_source')&&(!a.result.information_source
    ||a.result.information_source.content!==known.content||a.result.information_source.source_ref!==known.source_ref
    ||a.result.information_source.belief_state!==known.belief_state))return null;
  if(source.kind==='native_world_information_transfer'){
    const prior=db.getCityRecord(guild,'world_information_transfer',source.details?.receipt_ref),d=prior?.data;
    if(prior?.status!=='committed'||prior.source_event!==source.event_key||d?.recipient?.type!==sender.type
      ||d.recipient.key!==sender.key||d.information_key!==a.information_key||d.content!==known.content
      ||known.source_ref!==source.event_key||known.belief_state!==d.belief_state)return null;
  }
  const confidence=Math.max(0,Math.min(75,Number.isFinite(known.confidence)?known.confidence:70));
  return {version:1,issuer,action_id:actionId,action_hash:hash(action),mutation_id:receipt.mutation_id,mutation_hash:hash(mutation),
    sender,recipient,information_key:a.information_key,information_hash:hash(known),source_ref:source.event_key,source_hash:hash(source),
    content:known.content,confidence,belief_state:known.belief_state==='rumor'?'rumor':'suspected',
    source_type:sender.type==='npc'?'told_by_npc':'faction_report',subjective:true,execution_authority:false,publication_authority:false};
}
const receiptKey=(guild,actionId)=>`world-information-transfer:${hash([guild,actionId])}`;
function result(row){const d=row.data;return {status:'verified_native_transfer',receipt_ref:row.record_key,source_ref:row.source_event,
  report:{information_key:d.information_key,content:d.content,confidence:d.confidence,belief_state:d.belief_state,
    source_type:d.source_type,source_actor:`${d.sender.type}:${d.sender.key}`,source_ref:row.source_event,subjective:true},
  execution_authority:false,publication_authority:false};}

/** Called after the actual completion mutation inside the native action transaction. Does not write recipient knowledge. */
export function commitWorldInformationTransfer(db,guild,actionId){
  if(!key(guild)||!key(actionId))return held('invalid_transfer_identity');
  return db.transaction(()=>{
    const ref=receiptKey(guild,actionId),prior=db.getCityRecord(guild,'world_information_transfer',ref);
    if(prior)return inspectWorldInformationTransfer(db,guild,ref);
    const data=context(db,guild,actionId);if(!data)return held('missing_native_transfer_source');
    const event=indexWorldEvent(db,guild,{key:`${ref}:source`,kind:'native_world_information_transfer',title:'Attributed private native actor report',
      source_kind:'mutation',source_id:data.mutation_id,visibility:'gm',details:{receipt_ref:ref,payload_hash:hash(data),
        source_refs:[data.source_ref],subjective:true}},issuer);
    const row=db.saveCityRecord(guild,{kind:'world_information_transfer',key:ref,status:'committed',visibility:'gm',
      source_event:event.event_key,actor_key:`${data.sender.type}:${data.sender.key}`,data});
    cityAudit(db,guild,'world_information_transfer',ref,null,row,issuer);
    return inspectWorldInformationTransfer(db,guild,ref);
  });
}

/** Read-only current-use reader. Changed/revoked evidence holds without rewriting immutable report history. */
export function inspectWorldInformationTransfer(db,guild,ref,{recipientType,recipientKey,informationKey}={}){
  const row=key(ref)&&db.getCityRecord(guild,'world_information_transfer',ref),d=row?.data;
  if(row?.status!=='committed'||row.visibility!=='gm'||d?.issuer!==issuer||ref!==receiptKey(guild,d.action_id)
    ||recipientType!==undefined&&recipientType!==d.recipient?.type||recipientKey!==undefined&&recipientKey!==d.recipient?.key
    ||informationKey!==undefined&&informationKey!==d.information_key)return held('unverified_native_transfer');
  // Already committed, audited history remains readable; missing capture cannot mint a NEW transfer.
  const expected=context(db,guild,d.action_id,{requireCapture:false}),event=db.getWorldEvent(guild,row.source_event);
  if(!expected||hash(expected)!==hash(d)||row.source_event!==`${ref}:source`||event?.kind!=='native_world_information_transfer'
    ||event.visibility!=='gm'||event.source_kind!=='mutation'||event.source_id!==d.mutation_id||!activeSource(db,guild,event)
    ||hash(event.details)!==hash({receipt_ref:ref,payload_hash:hash(d),source_refs:[d.source_ref],subjective:true}))
    return held('changed_native_transfer_source');
  const audit=db.mutationsForEntity(guild,ref,20).filter(m=>m.source_layer==='city'&&m.actor_type==='system'
    &&m.actor_id===issuer&&m.visibility==='gm'&&m.mutation_type==='world_information_transfer'&&hash(parse(m.after_json))===hash(row));
  return audit.length===1?result(row):held('unverified_native_transfer_audit');
}
