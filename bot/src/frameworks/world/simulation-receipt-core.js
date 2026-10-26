/** Exact historical native result ancestry, read-only and GM-only; never an execution/disclosure capability. */
import {isDeepStrictEqual} from 'node:util';
import {ACTION_COSTS} from './action-costs.js';
const key=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const parse=value=>{try{return JSON.parse(value);}catch{return null;}};
const held=reason=>Object.freeze({status:'held_source',reason,execution_authority:false,publication_authority:false});
function matches(db,guild,current,mutation){
  if(!mutation||mutation.guild_id!==guild||mutation.entity_key!==current.id
    ||mutation.actor_type!=='ai'||mutation.source_layer!=='npc_director'||mutation.visibility!=='gm')return false;
  const before=parse(mutation.before_json),after=parse(mutation.after_json),payload=parse(mutation.payload_json),a=current.data,r=a?.result;
  if(!before||!after||!r||!isDeepStrictEqual(after,current)||!isDeepStrictEqual(payload,r)
    ||before.guild_id!==guild||before.id!==current.id||before.kind!=='action'
    ||!['ready','active','scheduled','pending','deferred'].includes(before.status)||before.data?.result
    ||mutation.mutation_type!==`npc_action:${a.type}`||mutation.actor_id!==a.actor_key
    ||!['npc','faction'].includes(a.actor_type)||!key(a.actor_key)||!ACTION_COSTS[a.type])return false;
  const {result,...intent}=a;
  if(!isDeepStrictEqual(before.data,intent)||before.entity_key!==current.entity_key
    ||before.due_tick!==current.due_tick||before.due_minute!==current.due_minute)return false;
  const opposed=['npc','faction'].includes(a.target_type);
  return typeof r.success==='boolean'&&[r.attack_roll,r.defense_roll].every(n=>Number.isInteger(n)&&n>=1&&n<=20)
    &&Number.isFinite(r.attack)&&Number.isFinite(r.defense)&&r.success===(r.attack>=r.defense)
    &&(opposed||r.defense_roll===10&&r.defense===10)
    &&isDeepStrictEqual(r.resource_cost,{[ACTION_COSTS[a.type]]:1});
}

/** Read-only exact current-record/committed-after comparison. Never rechecks historical resource eligibility. */
export function inspectWorldSimulationReceipt(db,guild,actionId){
  if(!key(guild)||!key(actionId))return held('invalid_identity');
  const current=db.getSimulationRecord(guild,actionId);
  if(current?.guild_id!==guild||current.kind!=='action'||current.status!=='completed')return held('no_completed_native_action');
  const receipts=db.mutationsForEntity(guild,actionId,20).filter(m=>matches(db,guild,current,m));
  if(receipts.length!==1)return held(receipts.length?'ambiguous_native_receipt':'missing_or_changed_native_receipt');
  const m=receipts[0],a=current.data,r=a.result;
  const entity=(type,id)=>key(id)&&['npc','faction','location'].includes(type)?db.getSimulationEntity(guild,type,id):null;
  const actor=entity(a.actor_type,a.actor_key),target=entity(a.target_type,a.target_key);
  return Object.freeze({status:'verified_native_receipt',visibility:'gm',action_id:actionId,mutation_id:m.id,
    source_ref:`mutation:${m.id}`,operation:a.type,
    actor:Object.freeze({type:a.actor_type,key:a.actor_key,current_native:!!actor,
      current_profile:a.actor_type==='npc'?!!db.getNpcProfile(guild,a.actor_key):null}),
    target:key(a.target_key)?Object.freeze({type:key(a.target_type)?a.target_type:null,key:a.target_key,current_native:!!target}):null,
    location_key:key(a.location_key)?a.location_key:a.type==='travel'&&key(a.target_key)?a.target_key:null,
    result:Object.freeze({success:r.success,attack_roll:r.attack_roll,defense_roll:r.defense_roll,attack:r.attack,defense:r.defense,
      resource_cost:Object.freeze({...r.resource_cost})}),execution_authority:false,publication_authority:false});
}

