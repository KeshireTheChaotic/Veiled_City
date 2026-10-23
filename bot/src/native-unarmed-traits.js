/** One optional owner-selected trait switch for the closed native unarmed Strength/Finesse rule. */
import {StateConflictError} from "./kernel/errors.js";

const fail=()=>{throw Object.assign(new StateConflictError('A current owner-authored native unarmed trait choice is required.'),{code:'NATIVE_UNARMED_TRAIT'});};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function alternateNativeUnarmedTrait(db,guild,row,pc){
  const accepted=db.getCityRecord(guild,'typed_intent',row?.data?.input?.accepted_intent),source=db.getWorldEvent(guild,row?.data?.input?.attack_source),binding=source?.details?.binding;
  if(row?.status!=='pending'||row.data.kind!=='attack'||row.subject_key!==pc?.id||row.data.owner_user_id!==pc?.owner_user_id
    ||accepted?.data.operation!=='unarmed_attack'||source?.status!=='active'||source.kind!=='native_unarmed_attack'
    ||source.visibility!=='gm'||source.session_id!==row.data.session_id||source.scene!==row.data.scene
    ||!binding||binding.version!==1||binding.issuer!=='native:unarmed-attack'||binding.target?.npc!==accepted.data.target_key
    ||binding.declaration?.character!==pc.id||binding.declaration?.owner!==row.data.owner_user_id||binding.declaration?.principal!==accepted.data.actor_principal_revision
    ||row.data.tag||(row.data.experiences||[]).length||(row.data.helpers||[]).length||row.data.alternate_trait||row.data.result||row.data.roll_id
    ||!['Strength','Finesse'].includes(binding.target.trait))return null;
  const trait=binding.target.trait==='Strength'?'Finesse':'Strength',bonus=pc.data.traits?.[trait];
  if(!Number.isSafeInteger(bonus))return null;
  return {trait,bonus,source:source.event_key,from_trait:binding.target.trait};
}

/** Validate the saved choice against the actual owner operation and its immutable pre-roll snapshot. */
export function validateNativeUnarmedTraitOperation(db,guild,input,pc,baseEvent,binding){
  const key=input?.native_unarmed_trait_operation,operation=typeof key==='string'&&key?db.getCityRecord(guild,'roll_operation',key):null,
    q=operation&&db.getCityRecord(guild,'roll_request',operation.data.request),accepted=q&&db.getCityRecord(guild,'typed_intent',q.data.input?.accepted_intent),
    auth=operation?.data?.authorization,snapshot=operation?.data?.result,choice=snapshot?.data?.alternate_trait,
    trait=input?.trait,from=binding?.target?.trait;
  const invalid=[];const reject=(condition,label)=>{if(condition)invalid.push(label);};
  reject(!operation||operation.status!=='active'||operation.kind!=='roll_operation'||operation.visibility!=='character'||operation.subject_key!==pc.id,'operation_identity');
  reject(operation?.source_event!==q?.source_event||operation?.data?.user!==pc.owner_user_id||operation?.data?.request!==q?.record_key,'operation_owner_source');
  reject(operation?.data?.op!=='alternate-trait'||auth?.op!=='alternate-trait'||auth?.request!==q?.record_key||auth?.trait!==trait
    ||auth?.proof!==baseEvent.event_key||auth?.expected_revision!==choice?.expected_revision,'operation_authorization');
  reject(!q||q.subject_key!==pc.id||q.data.owner_user_id!==pc.owner_user_id||q.data.kind!=='attack'||q.status==='needs_review'
    ||q.data.input?.attack_source!==baseEvent.event_key||q.data.input?.native_unarmed_trait_operation!==key
    ||q.data.input?.trait!==trait||q.data.input?.accepted_intent!==accepted?.record_key,'current_request_binding');
  reject(accepted?.data.operation!=='unarmed_attack'||accepted.data.actor!==pc.id||accepted.data.owner_user_id!==pc.owner_user_id
    ||accepted.data.actor_principal_revision!==choice?.principal_revision,'accepted_owner_principal');
  reject(choice?.version!==1||choice.issuer!=='native:unarmed-traits'||choice.request!==q?.record_key||choice.source!==baseEvent.event_key
    ||choice.owner_user_id!==pc.owner_user_id||choice.character_id!==pc.id||choice.principal_revision!==accepted?.data.actor_principal_revision
    ||choice.from_trait!==from||choice.to_trait!==trait||!['Strength','Finesse'].includes(trait)||trait===from
    ||(trait==='Strength'?'Finesse':'Strength')!==from||choice.to_bonus!==snapshot?.data?.breakdown?.trait_bonus
    ||choice.from_bonus!==binding?.target?.trait_bonus||choice.operation_key!==key||choice.expected_revision!==auth?.expected_revision,'choice_snapshot');
  reject(snapshot?.record_key!==q?.record_key,'snapshot_key');
  reject(snapshot?.data?.input?.native_unarmed_trait_operation!==key,'snapshot_operation_key');
  reject(snapshot?.data?.input?.trait!==trait,'snapshot_trait');
  reject(snapshot?.status!=='pending'||snapshot?.data?.roll_id||snapshot?.data?.result||snapshot?.data?.tag
    ||(snapshot?.data?.experiences||[]).length||(snapshot?.data?.helpers||[]).length,'pre_roll_unpaid_snapshot');
  reject(snapshot?.data?.alternate_trait?.operation_key!==key,'snapshot_choice_operation');
  reject(snapshot?.data?.alternate_trait?.to_trait!==trait,'snapshot_choice_to');
  reject(snapshot?.data?.alternate_trait?.from_trait!==from,'snapshot_choice_from');
  reject(snapshot?.data?.alternate_trait?.source!==baseEvent.event_key,'snapshot_choice_source');
  reject(snapshot?.data?.alternate_trait?.to_bonus!==choice?.to_bonus,'snapshot_choice_bonus');
  reject(q?.data?.alternate_trait?.operation_key!==key,'current_choice_operation');
  reject(q?.data?.alternate_trait?.to_trait!==trait,'current_choice_to');
  reject(q?.data?.alternate_trait?.from_trait!==from,'current_choice_from');
  reject(q?.data?.alternate_trait?.source!==baseEvent.event_key,'current_choice_source');
  reject(!same(choice,q?.data?.alternate_trait),'current_choice_snapshot');
  const resourceDeltas=operation?.data?.resource_deltas||[],ownerDelta=resourceDeltas.find(delta=>delta.character===pc.id);
  reject(resourceDeltas.length!==1||!ownerDelta||ownerDelta.hope?.delta!==0||ownerDelta.stress?.delta!==0
    ||ownerDelta.hope?.before!==ownerDelta.hope?.after||ownerDelta.stress?.before!==ownerDelta.stress?.after,'zero_cost');
  if(invalid.length)fail();
  if(!Number.isSafeInteger(choice.to_bonus))fail();
  return {operation,choice,snapshot};
}
