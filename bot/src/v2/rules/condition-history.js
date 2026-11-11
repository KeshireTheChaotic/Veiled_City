/** Original committed condition/effect ancestry only. Current actions and disclosure need separate authority. */
import {createHash} from 'node:crypto';
import {inspectGroupFeature} from './group-feature-history.js';
import {inspectMixedConditionClear} from './npc-condition-clear-history.js';
import {inspectNativeConditionClearAncestry} from './condition-clear-history.js';
import {inspectNativeConditionExpiryAncestry} from './condition-expiry-history.js';
import {FLASH,REGENT,groupFeaturePolicies as policies,groupReactionOptions} from './group-feature-rules.js';
import {groupFeatureOutcome} from './group-feature-outcomes.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>new Error(code);
const effectKey=key=>`group-effect:${hash(key)}`,keyFor=binding=>`mixed-condition:${hash(binding)}`;
const recordKind=target=>target.kind==='character'?'pc_native_condition':'native_mixed_condition';
const eventKind=target=>target.kind==='character'?'native_pc_condition':'native_mixed_condition';
function mixedTargets(n){return n.area.targets.map(target=>target.kind==='npc'?n.npc_targets.find(t=>t.key===target.key):target);}
export function createHistoricalConditionReader(db){
  if(['getCityRecord','getWorldEvent','getMutation','getSavedRoll','ownerAuthoredSource','withValidationSnapshot'].some(k=>typeof db?.[k]!=='function'))throw new TypeError('Complete native historical source repository required');
  const path=new Set();
  function guard(kind,guild,key,inspect){
    const ref=JSON.stringify([kind,guild,key]);
    if(path.has(ref)||path.size>=256)throw fail('native_condition_history_cycle_or_depth');
    path.add(ref);try{return inspect();}finally{path.delete(ref);}
  }
function areaOwnerReactionProof(db,guild,execution,target){
  if(target?.kind!=='character'||!target.owner)throw fail('group_area_owner_target');
  const child=execution.data.children.find(c=>c.character===target.key),row=child&&db.getCityRecord(guild,'gm_arbitration_decision',child.decision),
    n=row?.data.native,terminal=row&&db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([row.record_key,target.owner])}`),
    source=terminal&&db.getWorldEvent(guild,terminal.source_event),request=terminal&&db.getCityRecord(guild,'roll_request',terminal.data.request),
    roll=request&&db.getSavedRoll(guild,request.data.roll_id),requestSource=request&&db.getWorldEvent(guild,request.source_event),policy=n&&policies[n.feature];
  if(!row||n.owner!==target.owner||n.character!==target.key||terminal?.status!=='resolved'||terminal.visibility!=='character'||terminal.subject_key!==target.key
    ||terminal.data.owner!==target.owner||terminal.data.invitation!==row.record_key||terminal.data.invitation_hash!==hash(row.data)
    ||source?.status!=='active'||!db.ownerAuthoredSource(guild,source.event_key,target.owner)||requestSource?.status!=='active'
    ||!roll||request?.status!=='resolved'||request.data.kind!=='reaction'||request.data.input.gm_invitation!==row.record_key
    ||request.subject_key!==target.key||request.data.owner_user_id!==target.owner||request.data.breakdown.trait!==policy.trait
    ||request.data.breakdown.difficulty!==policy.difficulty||!Number.isSafeInteger(request.data.result?.total))throw fail('group_area_actual_owner_reaction');
  const proof={difficulty:policy.difficulty,outcome:request.data.result.duality==='Critical'||request.data.result.total>=policy.difficulty?'success':'failure'};
  if(proof.difficulty!==policy.difficulty||!['success','failure'].includes(proof.outcome))throw fail('group_area_native_owner_outcome');
  return {outcome:proof.outcome,receipt_hash:hash({request:hash(request),roll:hash(roll),terminal:hash(terminal),source:hash(source),request_source:hash(requestSource)}),request};
}
function areaPcBinding(execution,target,proof){return {execution:execution.record_key,cohort_hash:execution.data.mixed.cohort_hash,
  target:`character:${target.key}`,proof:proof.receipt_hash,outcome:proof.outcome};}
function inspectCause(db,guild,binding,target){
    const {execution,parent}=inspectGroupFeature(db,guild,binding.execution),n=parent.data.native,policy=policies[n.feature];
    if(!policy?.area||!n.area||!execution.data.mixed)throw fail('group_mixed_condition_source_family');
    const index=mixedTargets(n).findIndex(t=>t.kind===target.kind&&t.key===target.key),reaction=execution.data.mixed.reactions[index];
    if(index<0||hash(mixedTargets(n)[index])!==hash(target)||binding.cohort_hash!==execution.data.mixed.cohort_hash
      ||binding.target!==`${target.kind}:${target.key}`||binding.outcome!=='failure')throw fail('group_mixed_condition_cause');
    if(target.kind==='npc'){
      if(reaction?.receipt?.result.success!==false||binding.proof!==reaction.receipt.receipt_hash)throw fail('group_mixed_condition_cause');
    }else{
      const proof=areaOwnerReactionProof(db,guild,execution,target);
      if(proof.outcome!=='failure'||proof.receipt_hash!==binding.proof)throw fail('group_mixed_condition_owner_cause');
    }
    return {feature:n.feature,source_hash:n.feature_definition.source_hash,template_hash:n.template_hash,scene:parent.data.origin.scene,
      session:parent.data.origin.session,condition:policy.condition,expiry:policy.expiry,spellcast_disadvantage:policy.spellcast_disadvantage===true};
  }
  function rule(cause){
    if(!cause||typeof cause.feature!=='string'||!cause.feature||!cause.source_hash||!cause.template_hash||!cause.scene||!cause.session
      ||!['Restrained','Vulnerable'].includes(cause.condition)||!['until_freed','until_cleared'].includes(cause.expiry)
      ||typeof cause.spellcast_disadvantage!=='boolean'
      ||cause.spellcast_disadvantage&&(cause.condition!=='Restrained'||cause.expiry!=='until_freed'))throw fail('mixed_condition_source_rule');
    return cause;
  }
  function inspectMixedCondition(db,guild,key){
  return guard('mixed',guild,key,()=>{
    const row=db.getCityRecord(guild,'pc_native_condition',key)||db.getCityRecord(guild,'native_mixed_condition',key),d=row?.data,event=row&&db.getWorldEvent(guild,row.source_event);
    if(!d?.target||!['character','npc'].includes(d.target.kind)||d.version!==(d.target.kind==='character'?2:1)
      ||row.kind!==recordKind(d.target)||key!==keyFor(d.binding)||!['active','cleared'].includes(row.status)||event?.status!=='active'
      ||event.kind!==eventKind(d.target)||event.source_id!=='native:unified-gm'||event.details.payload_hash!==hash(d)
      ||row.actor_key!==d.target.key||row.subject_key!==(d.target.kind==='character'?d.target.key:null)
      ||row.visibility!==(d.target.kind==='character'?'character':'gm')||event.visibility!==row.visibility||event.subject_key!==row.subject_key
      ||event.scene!==d.cause.scene||event.session_id!==d.cause.session)throw fail('mixed_condition_receipt');
    const cause=rule(inspectCause(db,guild,d.binding,d.target));
    if(d.target.kind==='character'&&(!d.target.owner||d.owner!==d.target.owner||d.character!==d.target.key
      ||d.feature!==cause.feature||d.condition!==cause.condition||d.expiry!==cause.expiry||d.scene!==cause.scene))throw fail('mixed_condition_pc_contract');
    const mutation=db.getMutation(guild,d.mutation);
    if(hash(cause)!==hash(d.cause)||d.binding.outcome!=='failure'||d.binding.target!==`${d.target.kind}:${d.target.key}`
      ||mutation?.source_layer!=='native_condition'||mutation.mutation_type!=='mixed_reaction_condition'
      ||mutation.actor_type!=='system'||mutation.actor_id!=='native:unified-gm'||mutation.entity_key!==d.target.key
      ||mutation.session_id!==cause.session||mutation.visibility!==row.visibility
      ||hash(JSON.parse(mutation.before_json))!==hash(d.before)||hash(JSON.parse(mutation.after_json))!==hash(d.after))throw fail('mixed_condition_mutation_source');
    const marker=d.target.kind==='character'?{name:cause.condition,native_ref:key,active:true}:cause.condition;
    if(hash([...d.before,marker])!==hash(d.after))throw fail('mixed_condition_exact_effect');
    if(row.status==='cleared'){
      if(d.target.kind==='npc')inspectMixedConditionClear(db,guild,row);
      else{
        inspectNativeConditionClearAncestry(db,guild,row);
      }
    }
    return row;

  });
}
function validateAreaGroupReactionEffect(db,guild,row,decision){
  const v=row.data,n=decision.data.native,{execution,parent}=inspectGroupFeature(db,guild,n.execution),
    target=mixedTargets(parent.data.native).find(t=>t.kind==='character'&&t.key===v.character),
    proof=areaOwnerReactionProof(db,guild,execution,target),event=db.getWorldEvent(guild,row.source_event),binding=areaPcBinding(execution,target,proof);
  if(v.feature!==n.feature||v.feature_hash!==n.feature_hash||v.parent!==n.parent||v.owner!==target.owner||v.decision!==decision.record_key
    ||row.record_key!==effectKey(decision.record_key)||v.request!==proof.request.record_key||v.request_hash!==hash(proof.request)
    ||v.roll!==proof.request.data.roll_id||v.roll_hash!==hash(db.getSavedRoll(guild,v.roll))||v.proof_hash!==proof.receipt_hash
    ||v.success!==(proof.outcome==='success')||v.stress!==0||v.condition_reused!==false||event?.status!=='active'
    ||event.kind!=='native_group_feature_effect'||event.source_id!=='native:unified-gm'||event.details.payload_hash!==hash(v)
    ||event.visibility!=='character'||event.subject_key!==target.key||event.details.owner_source!==proof.request.source_event)
    throw fail('group_area_owner_effect_source');
  if(proof.outcome==='failure'){
    if(v.condition!==`mixed-condition:${hash(binding)}`)throw fail('group_area_owner_condition_source');
    inspectMixedCondition(db,guild,v.condition);
  }else if(v.condition!==null)throw fail('group_area_success_has_condition');
  return row;
}
function validateGroupReactionEffect(db,guild,key){
  return guard('effect',guild,key,()=>{
  const row=db.getCityRecord(guild,'gm_group_feature_effect',key),v=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    decision=v&&db.getCityRecord(guild,'gm_arbitration_decision',v.decision),n=decision?.data.native,policy=n&&policies[n.feature];
  if(!v||row.status!=='resolved'||row.visibility!=='character'||row.subject_key!==v.character||!decision||!policy)throw fail('group_effect_identity');
  if(v.version===4&&policy.area)return validateAreaGroupReactionEffect(db,guild,row,decision);
  inspectGroupFeature(db,guild,n.execution);
  const request=db.getCityRecord(guild,'roll_request',v.request),
    requestSource=request&&db.getWorldEvent(guild,request.source_event),roll=request&&db.getSavedRoll(guild,request.data.roll_id);
  // A sealed, already verified reaction is read-only history after duration expiry. It
  // never grants a new action/consent or lets an old recipient receive a new notice.
  if(hash(request)!==v.request_hash||hash(roll)!==v.roll_hash||requestSource?.status!=='active'||hash(requestSource)!==v.request_source_hash)
    throw fail('group_effect_immutable_reaction_snapshot');
  const proof={difficulty:request.data.breakdown.difficulty,outcome:request.data.result.duality==='Critical'||request.data.result.total>=request.data.breakdown.difficulty?'success':'failure'},
    terminal=db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([decision.record_key,n.owner])}`),mutation=db.getMutation(guild,v.mutation),expected=structuredClone(v.before);
  if(v.stress)expected.resources.stress.current+=v.stress;
  if(v.hope)expected.resources.hope-=v.hope;
  if(v.condition&&!v.condition_reused)expected.conditions=[...(expected.conditions||[]),{name:policy.condition,native_ref:v.condition,active:true}];
  if(v.condition_reused){
    const existing=validateNativeCondition(db,guild,v.condition);
    if(existing.data.condition!==policy.condition||existing.subject_key!==v.character||!(v.before.conditions||[]).some(c=>c.native_ref===v.condition&&c.active))
      throw fail('group_condition_reuse_source');
  }
  const critical=v.version===3&&n.feature===FLASH&&request.data.result.duality==='Critical',
    {required_choice:requiredChoice,stress,hope,condition}=groupFeatureOutcome(n.feature,{success:v.success,critical,choice:v.choice}),
    choice=v.choice_source&&db.getWorldEvent(guild,v.choice_source);
  if(event?.status!=='active'||event.kind!=='native_group_feature_effect'||event.source_id!=='native:unified-gm'||event.visibility!=='character'||event.subject_key!==v.character
    ||event.details.payload_hash!==hash(v)||event.details.owner_source!==request.source_event||key!==effectKey(v.decision)||v.character!==n.character||v.owner!==n.owner
    ||v.feature!==n.feature||v.feature_hash!==n.feature_hash||v.parent!==n.parent||v.roll!==request.data.roll_id||request.data.input.gm_invitation!==v.decision
    ||request.subject_key!==v.character||request.data.owner_user_id!==v.owner||request.data.kind!=='reaction'||proof.difficulty!==policy.difficulty||proof.outcome==='needs_review'
    ||v.success!==(proof.outcome==='success')||terminal?.status!=='resolved'||terminal.data.request!==v.request||terminal.data.invitation_hash!==hash(decision.data)
    ||hash(v.before.resources)!==n.resources_hash||v.stress!==stress||!!v.condition!==condition||typeof v.condition_reused!=='boolean'
    ||v.condition&&!v.condition_reused&&v.condition!==`${key}:condition`||v.condition_reused&&!v.condition
    ||hash(v.after)!==hash(expected)||stress&&v.before.resources.stress.current+stress>v.before.resources.stress.max
    ||(n.feature===REGENT?v.version!==2||v.hope!==hope:v.version===3?!critical||v.hope!==undefined:v.version!==1||v.hope!==undefined)
    ||hope&&(!Number.isSafeInteger(v.before.resources.hope)||v.before.resources.hope<hope)
    ||requiredChoice&&(!groupReactionOptions(n.feature).filter(c=>c!=='command').includes(v.choice)||choice?.status!=='active'||choice.kind!=='native_group_feature_choice'
      ||choice.source_id!==`player:${v.owner}`||choice.visibility!=='character'||choice.subject_key!==v.character||choice.details.choice!==v.choice||choice.details.decision!==v.decision
      ||choice.session_id!==decision.data.origin.session||choice.scene!==decision.data.origin.scene||choice.details.revision!==hash(decision.data)
      ||hash(JSON.parse(choice.details.authored_text))!==hash({op:'gm-reaction-choice',request:v.decision,revision:hash(decision.data),choice:v.choice})
      ||!db.ownerAuthoredSource(guild,choice.event_key,v.owner))||!requiredChoice&&(v.choice!==null||v.choice_source!==null)
    ||mutation?.source_layer!=='native_feature'||mutation.entity_key!==v.character||hash(JSON.parse(mutation.before_json))!==hash(v.before)
    ||hash(JSON.parse(mutation.after_json))!==hash(v.after))throw fail('group_effect_native_ancestry');
  return row;

  });
}
function validateNativeCondition(db,guild,key){
  return guard('condition',guild,key,()=>{
  const candidate=db.getCityRecord(guild,'pc_native_condition',key);
  if(candidate?.data.version===2){
    const inspected=inspectMixedCondition(db,guild,key);
    if(inspected?.kind!=='pc_native_condition'||hash(inspected)!==hash(candidate))throw fail('native_condition_mixed_reader_source');
    return inspected;
  }
  const row=db.getCityRecord(guild,'pc_native_condition',key),v=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    // The condition's original effect is already committed history, not permission for another NPC action.
    effect=v&&validateGroupReactionEffect(db,guild,v.effect),child=effect&&db.getCityRecord(guild,'gm_arbitration_decision',effect.data.decision),
    parent=child&&inspectGroupFeature(db,guild,child.data.native.execution),policy=v&&policies[v.feature];
  if(v?.version!==1||!policy||!['active','expired','cleared'].includes(row.status)||row.visibility!=='character'||row.subject_key!==v.character
    ||event?.status!=='active'||event.kind!=='native_pc_condition'||event.source_id!=='native:unified-gm'||event.details.payload_hash!==hash(v)
    ||effect.data.condition!==key||v.character!==effect.data.character||v.owner!==effect.data.owner||v.feature!==effect.data.feature
    ||v.condition!==policy.condition||v.expiry!==policy.expiry||v.actor!==parent.entry.actor.key||v.scene!==parent.parent.data.origin.scene
    ||v.cast_spotlight!==parent.cost.data.spotlight?.index)throw fail('native_condition_effect_source');
  if(row.status==='cleared')inspectNativeConditionClearAncestry(db,guild,row);
  if(row.status==='expired')inspectNativeConditionExpiryAncestry(db,guild,row);
  return row;

  });
}
  return Object.freeze({
    inspectPcCondition(guild,key){return db.withValidationSnapshot(()=>validateNativeCondition(db,guild,key));},
    inspectMixedCondition(guild,key){return db.withValidationSnapshot(()=>inspectMixedCondition(db,guild,key));},
    inspectReactionEffect(guild,key){return db.withValidationSnapshot(()=>validateGroupReactionEffect(db,guild,key));}
  });
}
