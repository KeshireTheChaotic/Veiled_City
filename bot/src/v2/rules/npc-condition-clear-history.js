/** Read-only historical NPC clear proof, after original condition validation; never a new clear grant. */
import {createHash} from 'node:crypto';
import {inspectCommittedGmDecision} from './committed-gm-decision.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>new Error(code);
function inspectClearCause(db,guild,binding,target){
  const {row,entry}=inspectCommittedGmDecision(db,guild,binding.decision),n=row.data.native,
    cost=db.getCityRecord(guild,'gm_action_cost_receipt',binding.cost),spotlight=cost?.data.spotlight,
    event=cost&&db.getWorldEvent(guild,`${cost.record_key}:spotlight`);
  if(n?.operation!=='commit_npc_condition_clear'||entry.actor.type!=='npc'||entry.actor.key!==target.key||n.actor!==target.key
    ||n.condition.ref!==binding.condition||n.condition.hash!==binding.condition_hash||cost?.status!=='committed'
    ||cost.source_event!==row.source_event||cost.data.decision!==row.record_key||cost.data.opportunity!==n.opportunity.key
    ||spotlight?.actor!==target.key||spotlight.scene!==row.data.origin.scene||spotlight.cost!==cost.record_key
    ||!Number.isSafeInteger(spotlight.index)||spotlight.index<1||event?.status!=='active'||event.kind!=='native_gm_spotlight'
    ||event.source_id!=='native:unified-gm'||event.visibility!=='gm'||event.details.payload_hash!==hash(spotlight)
    ||event.details.cost_hash!==hash(cost))throw fail('npc_condition_clear_paid_spotlight_source');
  return {actor:target.key,scene:row.data.origin.scene,session:row.data.origin.session,source:row.source_event,
    method:n.method,decision_hash:hash(row),cost_hash:hash(cost)};
}
const clearKey=condition=>`mixed-condition-clear:${hash(condition)}`;
function clearProof(db,guild,binding,row){
  if(row?.data.target.kind!=='npc'
    ||!binding||Object.keys(binding).sort().join()!=='condition,condition_hash,cost,decision'
    ||binding.condition!==row.record_key||binding.condition_hash!==hash(row.data)
    ||!binding.cost||!binding.decision)throw fail('mixed_condition_clear_source');
  const proof=inspectClearCause(db,guild,binding,row.data.target);
  if(proof?.actor!==row.actor_key||!proof.scene||!proof.session||!proof.source
    ||!proof.decision_hash||!proof.cost_hash||typeof proof.method!=='string'||!proof.method.trim())throw fail('mixed_condition_clear_source');
  return proof;
}
/** Immutable NPC release proof; the original condition validator calls this without recursive reinspection. */
export function inspectMixedConditionClear(db,guild,condition){
  const row=condition&&db.getCityRecord(guild,'native_mixed_condition',condition.record_key),
    receipt=row&&db.getCityRecord(guild,'native_mixed_condition_clear',clearKey(row.record_key)),d=receipt?.data,
    event=receipt&&db.getWorldEvent(guild,receipt.source_event),mutation=d&&db.getMutation(guild,d.mutation);
  if(!row||hash(row)!==hash(condition)||row.status!=='cleared'||receipt?.status!=='resolved'||receipt.visibility!=='gm'
    ||receipt.actor_key!==row.actor_key||receipt.subject_key!==null||d?.version!==1
    ||event?.status!=='active'||event.kind!=='native_mixed_condition_clear'||event.source_id!=='native:unified-gm'
    ||event.visibility!=='gm'||event.subject_key!==null||event.details.payload_hash!==hash(d)
    ||event.scene!==d.proof.scene||event.session_id!==d.proof.session||event.details.input_source!==d.proof.source
    ||mutation?.source_layer!=='native_condition'||mutation.mutation_type!=='npc_spotlight_condition_clear'
    ||mutation.actor_type!=='system'||mutation.actor_id!=='native:unified-gm'||mutation.entity_key!==row.actor_key
    ||mutation.visibility!=='gm'||mutation.session_id!==d.proof.session
    ||hash(JSON.parse(mutation.before_json))!==hash(d.before)||hash(JSON.parse(mutation.after_json))!==hash(d.after)
    ||!Array.isArray(d.before)||d.before.filter(c=>c===row.data.cause.condition).length!==1
    ||hash(d.after)!==hash(d.before.filter(c=>c!==row.data.cause.condition)))throw fail('mixed_condition_clear_receipt');
  if(hash(clearProof(db,guild,d.binding,row))!==hash(d.proof))throw fail('mixed_condition_clear_ancestry');
  return receipt;
}
