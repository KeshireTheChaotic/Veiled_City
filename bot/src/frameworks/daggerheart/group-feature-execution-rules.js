/** Complete native multi-owner feature/condition/spotlight policy, preserving private reactions and receipts. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
import {featureCostPlan} from './feature-costs.js';
import {incomingConditionOdds,movementConditionIssue} from './native-condition-rules.js';
import {LANES,FLASH,REGENT,groupFeaturePolicies as policies,isGroupFeature,groupReactionRules,groupNeedsChoice as needsChoice,groupReactionOptions,groupFeatureStakes,validateGroupFeatureProposal} from './group-feature-rules.js';
import {groupFeatureOutcome} from './group-feature-outcomes.js';
import {assertExactGroupCohort} from './group-target-rules.js';
import {prepareMixedReactionCohort,rollNativeNpcReaction,inspectNativeNpcReaction} from './mixed-reaction-rules.js';
import {createMixedConditionRules} from './mixed-condition-rules.js';
export function createGroupFeatureExecutionRules({capabilities}){
const {narrativeSourceVisible,compileNativeFeatures,inspectNativeGmDecision,inspectCommittedGmDecision,nativeReactionTarget,commitGmActionCost,currentScene,scenePresence,sceneAccess,activeCityProxy,conversationPrincipal,personalCharacter,indexWorldEvent,typedRollProof,EncounterLibrary,reserveGmArbitrationNotice,applyNativeStressPassive,inspectNativeConditionClearAncestry,RANGE_BANDS}=capabilities||{};
if([narrativeSourceVisible,compileNativeFeatures,inspectNativeGmDecision,inspectCommittedGmDecision,nativeReactionTarget,commitGmActionCost,currentScene,scenePresence,sceneAccess,activeCityProxy,conversationPrincipal,personalCharacter,indexWorldEvent,typedRollProof,EncounterLibrary,reserveGmArbitrationNotice,applyNativeStressPassive,inspectNativeConditionClearAncestry].some(fn=>typeof fn!=="function")||!Array.isArray(RANGE_BANDS))throw new TypeError("Complete native group-feature capabilities required.");
const executionKey=key=>`group-feature:${hash(key)}`,effectKey=key=>`group-effect:${hash(key)}`;
const mixedConditions=createMixedConditionRules({indexWorldEvent,inspectNativeConditionClearAncestry,
  inspectCause(db,guild,binding,target,{historical}){
    const {execution,parent}=inspectGroupFeature(db,guild,binding.execution),n=parent.data.native,policy=policies[n.feature];
    if(!policy?.area||!n.area||!execution.data.mixed)throw fail('group_mixed_condition_source_family');
    const index=mixedTargets(n).findIndex(t=>t.kind===target.kind&&t.key===target.key),reaction=execution.data.mixed.reactions[index];
    if(index<0||hash(mixedTargets(n)[index])!==hash(target)||binding.cohort_hash!==execution.data.mixed.cohort_hash
      ||binding.target!==`${target.kind}:${target.key}`||binding.outcome!=='failure')throw fail('group_mixed_condition_cause');
    if(target.kind==='npc'){
      if(reaction?.receipt?.result.success!==false||binding.proof!==reaction.receipt.receipt_hash)throw fail('group_mixed_condition_cause');
    }else{
      const proof=areaOwnerReactionProof(db,guild,execution,target,{historical});
      if(proof.outcome!=='failure'||proof.receipt_hash!==binding.proof)throw fail('group_mixed_condition_owner_cause');
    }
    if(!historical){
      const current=capabilities.planNativeAreaCohort(db,guild,{binding:parent.data.origin,scope:parent.data.scope},n.actor,n.area.area);
      if(hash(current)!==hash(n.area))throw fail('group_mixed_condition_current_cohort');
    }
    return {feature:n.feature,source_hash:n.feature_definition.source_hash,template_hash:n.template_hash,scene:parent.data.origin.scene,
      session:parent.data.origin.session,condition:policy.condition,expiry:policy.expiry,spellcast_disadvantage:policy.spellcast_disadvantage===true};
  },
  readTarget(db,guild,target){
    if(target.kind==='character'){
      const pc=personalCharacter(db,guild,target.owner,target.key);
      if(pc.owner_user_id!==target.owner)throw fail('group_mixed_condition_current_owner');
      return {...pc.data,id:pc.id};
    }
    const scene=currentScene(db,guild),encounter=db.getCurrentEncounter(scene.session_id),c=encounter&&db.listCombatants(encounter.id).find(c=>c.id===target.combatant);
    if(target.kind!=='npc'||c?.status!=='active'||c.hp_current<=0||c.base_name!==target.combatant_snapshot.base_name)throw fail('group_mixed_condition_current_npc');
    return c;
  },
  writeTarget(db,guild,target,before,conditions){
    if(target.kind==='character'){
      db.updateCharacterData(target.key,data=>{data.conditions=conditions;});
      if(hash(db.getCharacter(target.key).data.conditions)!==hash(conditions))throw fail('group_mixed_condition_writer');
      return;
    }
    const after=db.updateCombatant(target.combatant,{conditions});
    if(hash(after.conditions)!==hash(conditions))throw fail('group_mixed_condition_writer');
  }});
function areaOwnerReactionProof(db,guild,execution,target,{historical=false}={}){
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
  const proof=historical?{difficulty:policy.difficulty,outcome:request.data.result.duality==='Critical'||request.data.result.total>=policy.difficulty?'success':'failure'}:typedRollProof(db,guild,request);
  if(proof.difficulty!==policy.difficulty||!['success','failure'].includes(proof.outcome))throw fail('group_area_native_owner_outcome');
  return {outcome:proof.outcome,receipt_hash:hash({request:hash(request),roll:hash(roll),terminal:hash(terminal),source:hash(source),request_source:hash(requestSource)}),request};
}
function areaPcBinding(execution,target,proof){return {execution:execution.record_key,cohort_hash:execution.data.mixed.cohort_hash,
  target:`character:${target.key}`,proof:proof.receipt_hash,outcome:proof.outcome};}
function applyAreaGroupReactionOutcome(db,guild,row,request){
  return db.transaction(()=>{
    const {execution}=inspectGroupFeatureChild(db,guild,row),{parent}=inspectGroupFeature(db,guild,execution.record_key),
      target=mixedTargets(parent.data.native).find(t=>t.kind==='character'&&t.key===row.data.native.character),
      proof=areaOwnerReactionProof(db,guild,execution,target),binding=areaPcBinding(execution,target,proof),key=effectKey(row.record_key),
      prior=db.getCityRecord(guild,'gm_group_feature_effect',key);
    if(hash(request)!==hash(proof.request))throw fail('group_area_exact_saved_request');
    if(prior)return validateGroupReactionEffect(db,guild,key);
    const condition=proof.outcome==='failure'?mixedConditions.applyMixedCondition(db,guild,binding,target).record_key:null;
    const data={version:4,decision:row.record_key,parent:row.data.native.parent,feature:row.data.native.feature,feature_hash:row.data.native.feature_hash,
      character:target.key,owner:target.owner,request:request.record_key,request_hash:hash(request),roll:request.data.roll_id,
      roll_hash:hash(db.getSavedRoll(guild,request.data.roll_id)),success:proof.outcome==='success',proof_hash:proof.receipt_hash,
      condition,condition_reused:false,stress:0};
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_group_feature_effect',source_id:'native:unified-gm',title:'Native owner-specific area consequence',
      session_id:row.data.origin.session,scene:row.data.origin.scene,visibility:'character',subject_key:target.key,
      details:{payload_hash:hash(data),owner_source:request.source_event}},'native:unified-gm');
    const saved=db.saveCityRecord(guild,{kind:'gm_group_feature_effect',key,status:'resolved',source_event:source.event_key,visibility:'character',subject_key:target.key,data});
    settleGroupFeature(db,guild,execution.record_key);
    reserveGmArbitrationNotice(db,guild,row.record_key);return saved;
  });
}
function validateAreaGroupReactionEffect(db,guild,row,decision,{historical=false}={}){
  const v=row.data,n=decision.data.native,{execution,parent}=inspectGroupFeature(db,guild,n.execution),
    target=mixedTargets(parent.data.native).find(t=>t.kind==='character'&&t.key===v.character),
    proof=areaOwnerReactionProof(db,guild,execution,target,{historical}),event=db.getWorldEvent(guild,row.source_event),binding=areaPcBinding(execution,target,proof);
  if(!historical)inspectGroupFeatureChild(db,guild,decision);
  if(v.feature!==n.feature||v.feature_hash!==n.feature_hash||v.parent!==n.parent||v.owner!==target.owner||v.decision!==decision.record_key
    ||row.record_key!==effectKey(decision.record_key)||v.request!==proof.request.record_key||v.request_hash!==hash(proof.request)
    ||v.roll!==proof.request.data.roll_id||v.roll_hash!==hash(db.getSavedRoll(guild,v.roll))||v.proof_hash!==proof.receipt_hash
    ||v.success!==(proof.outcome==='success')||v.stress!==0||v.condition_reused!==false||event?.status!=='active'
    ||event.kind!=='native_group_feature_effect'||event.source_id!=='native:unified-gm'||event.details.payload_hash!==hash(v)
    ||event.visibility!=='character'||event.subject_key!==target.key||event.details.owner_source!==proof.request.source_event)
    throw fail('group_area_owner_effect_source');
  if(proof.outcome==='failure'){
    if(v.condition!==`mixed-condition:${hash(binding)}`)throw fail('group_area_owner_condition_source');
    mixedConditions.inspectMixedCondition(db,guild,v.condition);
  }else if(v.condition!==null)throw fail('group_area_success_has_condition');
  return row;
}
function settleAreaNpcConditions(db,guild,execution,{replay=false}={}){
  const {parent}=inspectGroupFeature(db,guild,execution.record_key),n=parent.data.native,targets=mixedTargets(n);
  for(const [i,reaction] of execution.data.mixed.reactions.entries()){
    if(reaction.kind!=='npc'||reaction.receipt.result.success)continue;
    const binding={execution:execution.record_key,cohort_hash:execution.data.mixed.cohort_hash,target:reaction.target,
      proof:reaction.receipt.receipt_hash,outcome:'failure'};
    if(replay)mixedConditions.inspectMixedCondition(db,guild,`mixed-condition:${hash(binding)}`);
    else mixedConditions.applyMixedCondition(db,guild,binding,targets[i]);
  }
  return execution;
}
function planGroupFeature(db,guild,o,entry,p,feature,{library,opportunity}={}){
  const policy=validateGroupFeatureProposal(entry,p,feature);
  const scene=currentScene(db,guild),encounter=db.getCurrentEncounter(scene.session_id),binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id),
    bound=binding?.data.combatants.find(b=>b.actor===entry.actor.key),c=bound&&db.listCombatants(encounter.id).find(c=>c.id===bound.id),
    template=c&&library.findAdversary(c.base_name),actor=scenePresence(db,guild,'npc',entry.actor.key);
  if(encounter?.status!=='active'||c?.status!=='active'||c.hp_current<=0||!template||hash(template)!==feature.template_hash
    ||activeCityProxy(db,guild,entry.actor.key)||actor?.data.state!=='actually_present'||actor.location_key!==o.binding.location
    ||db.getWorldEvent(guild,binding.source_event)?.status!=='active'||db.getWorldEvent(guild,actor.source_event)?.status!=='active')throw fail('group_feature_actor_source');
  if(policy.area){
    if(entry.target_refs.length!==1||typeof capabilities.planNativeAreaCohort!=='function')throw fail('group_feature_area_reference');
    const area=capabilities.planNativeAreaCohort(db,guild,o,entry.actor.key,entry.target_refs[0]),targets=[],npc_targets=[];
    if(!area.targets.length)throw fail('group_feature_empty_area');
    for(const target of area.targets){
      if(target.kind==='character'){
        const pc=personalCharacter(db,guild,target.owner,target.key),principal=conversationPrincipal(db,guild,target.owner,target.key),
          presence=scenePresence(db,guild,'character',target.key);
        if(principal.kind!=='owner'||pc.owner_user_id!==target.owner||hash(presence)!==target.presence_hash)throw fail('group_feature_area_owner');
        targets.push({character:pc.id,owner:target.owner,principal:principal.revision,
          target_snapshot:{target:target.presence_hash,principal:principal.revision,area:area.area_hash},resources_hash:hash(pc.data.resources)});
      }else{
        const matches=binding.data.combatants.filter(b=>b.actor===target.key),combatant=matches.length===1&&db.listCombatants(encounter.id).find(v=>v.id===matches[0].id),
          sourceTemplate=combatant&&library.findAdversary(combatant.base_name);
        if(!combatant||combatant.status!=='active'||combatant.hp_current<=0||!sourceTemplate)throw fail('group_feature_area_npc_source');
        npc_targets.push({...target,combatant:combatant.id,combatant_snapshot:combatant,template_hash:hash(sourceTemplate)});
      }
    }
    const costSource=policy.stress_when_tracked&&c.stress_max===0?{...feature,costs:feature.costs.filter(v=>v.resource!=='npc_stress')}:feature,
      cost=featureCostPlan(costSource,{timing:'spotlight_action',fear:db.getCampaign(guild).fear,stress:c.stress_current,stressMax:c.stress_max});
    return {operation:'commit_group_feature',feature:feature.feature_key,feature_hash:hash(feature),feature_definition:feature,template_hash:feature.template_hash,
      actor:entry.actor.key,combatant:c.id,actor_source:actor.source_event,combatant_hash:hash(c),targets,npc_targets,area,opportunity,cost};
  }
  const eligible=db.roster(scene.session_id).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence)).map(r=>db.getCharacter(r.character_id)).filter(pc=>{
    const target=scenePresence(db,guild,'character',pc.id),range=actor.data.zone===target?.data.zone?'Melee':target?.data.range;
    return target?.data.state==='actually_present'&&target.location_key===actor.location_key&&RANGE_BANDS.includes(range)
      &&narrativeSourceVisible(db,guild,target.source_event,o.scope)
      &&RANGE_BANDS.indexOf(range)<=RANGE_BANDS.indexOf(policy.range)
      &&sceneAccess(db,guild,{observer_type:'npc',observer_key:entry.actor.key,target_type:'character',target_key:pc.id,sense:'sight'});
  });
  assertExactGroupCohort(entry.target_refs,eligible.map(pc=>pc.id),{all:policy.all});
  const targets=entry.target_refs.map(id=>{
    const pc=eligible.find(pc=>pc.id===id),snapshot=nativeReactionTarget(db,guild,o,pc,entry.actor.key,{maxRange:policy.range});
    return {character:id,owner:pc.owner_user_id,principal:snapshot.principal,target_snapshot:snapshot,resources_hash:hash(pc.data.resources)};
  });
  const cost=featureCostPlan(feature,{timing:'spotlight_action',fear:db.getCampaign(guild).fear,stress:c.stress_current,stressMax:c.stress_max});
  return {operation:'commit_group_feature',feature:feature.feature_key,feature_hash:hash(feature),feature_definition:feature,template_hash:feature.template_hash,
    actor:entry.actor.key,combatant:c.id,actor_source:actor.source_event,combatant_hash:hash(c),targets,opportunity,cost};
}
function mixedTargets(n){return n.area.targets.map(target=>target.kind==='npc'?n.npc_targets.find(t=>t.key===target.key):target);}
function prepareGroupFeature(db,guild,key,{library=new EncounterLibrary('../content'),rng}={}){
  return db.transaction(()=>{
    const prior=db.getCityRecord(guild,'gm_group_feature_execution',executionKey(key));if(prior){
      const inspected=inspectGroupFeature(db,guild,prior.record_key);
      return inspected.parent.data.native.area?settleAreaNpcConditions(db,guild,inspected.execution,{replay:true}):inspected.execution;
    }
    const {row,entry}=inspectNativeGmDecision(db,guild,key),n=row.data.native,feature=compileNativeFeatures().find(f=>f.feature_key===n?.feature);
    if(n?.operation!=='commit_group_feature'||hash(planGroupFeature(db,guild,{binding:row.data.origin,scope:row.data.scope},entry,row.data.proposal,feature,{library,opportunity:n.opportunity}))!==hash(n))
      throw fail('group_feature_state_changed');
    const cost=commitGmActionCost(db,guild,key);
    const createChild=target=>{
      const childKey=`group-reaction:${hash([key,target.character])}`,proposal={...row.data.proposal,intent_ref:entry.intent_ref},
        data={...row.data,proposal,proposal_hash:hash(proposal),native:{operation:'request_group_feature_reaction',parent:key,execution:executionKey(key),
          feature:n.feature,feature_hash:n.feature_hash,...target},authority:'Exact native feature child. Only this owner may submit dice or choose a response.'};
      const source=indexWorldEvent(db,guild,{key:`${childKey}:source`,kind:'native_gm_arbitration',source_id:'native:unified-gm',title:'Owner-private feature reaction invitation',
        session_id:row.data.origin.session,scene:row.data.origin.scene,location_key:row.data.origin.location,visibility:'gm',details:{board:row.data.board,payload_hash:hash(data)}},'native:unified-gm');
      const child=db.saveCityRecord(guild,{kind:'gm_arbitration_decision',key:childKey,status:'pending_pc_reaction',source_event:source.event_key,visibility:'gm',data});
      return child;
    };
    const saveExecution=(children,mixed)=>{
    const data={version:1,decision:key,feature:n.feature,feature_hash:n.feature_hash,cost:cost.record_key,cost_hash:hash(cost),children,...(mixed?{mixed}:{})};
    const source=indexWorldEvent(db,guild,{key:`${executionKey(key)}:source`,kind:'native_group_feature',source_id:'native:unified-gm',title:'Committed native multi-owner feature',
      session_id:row.data.origin.session,scene:row.data.origin.scene,visibility:'gm',details:{payload_hash:hash(data),input_source:row.source_event}},'native:unified-gm');
    return db.saveCityRecord(guild,{kind:'gm_group_feature_execution',key:executionKey(key),status:n.area?'preparing_effects':'awaiting_owners',source_event:source.event_key,visibility:'gm',data});
    };
    if(n.area){
      const children=[];
      prepareMixedReactionCohort({transaction:fn=>db.transaction(fn),targets:mixedTargets(n),key:executionKey(key),
        readReceipt:k=>db.getCityRecord(guild,'gm_group_feature_execution',k)?.data.mixed,
        createPcInvitation:target=>{const child=createChild(n.targets.find(t=>t.character===target.key));
          children.push({decision:child.record_key,character:target.key,hash:hash(child.data)});return child;},
        inspectPcInvitation:k=>db.getCityRecord(guild,'gm_arbitration_decision',k),
        resolveNpcReaction:target=>rollNativeNpcReaction({target,combatant:target.combatant_snapshot,
          template:library.findAdversary(target.combatant_snapshot.base_name),difficulty:policies[n.feature].difficulty,rng}),
        writeNpcReceipt:(target,receipt)=>{
          const reactionKey=`group-npc-reaction:${hash([key,target.key])}`,event=indexWorldEvent(db,guild,{key:`${reactionKey}:source`,
            kind:'native_npc_reaction',source_id:'native:unified-gm',title:'Native area reaction',session_id:row.data.origin.session,
            scene:row.data.origin.scene,visibility:'gm',details:{execution:executionKey(key),payload_hash:hash(receipt)}},'native:unified-gm');
          return db.saveCityRecord(guild,{kind:'native_npc_reaction',key:reactionKey,status:'resolved',actor_key:target.key,
            visibility:'gm',source_event:event.event_key,data:receipt});
        },writeExecution:mixed=>saveExecution(children,mixed).data.mixed});
      const execution=settleAreaNpcConditions(db,guild,db.getCityRecord(guild,'gm_group_feature_execution',executionKey(key)));
      return settleGroupFeature(db,guild,execution.record_key);
    }
    return saveExecution(n.targets.map(target=>{const child=createChild(target);return {decision:child.record_key,character:target.character,hash:hash(child.data)};}));
  });
}
function inspectGroupFeature(db,guild,key){
  const execution=db.getCityRecord(guild,'gm_group_feature_execution',key),v=execution?.data,event=execution&&db.getWorldEvent(guild,execution.source_event),
    parent=v&&inspectCommittedGmDecision(db,guild,v.decision),n=parent?.row.data.native,cost=v&&db.getCityRecord(guild,'gm_action_cost_receipt',v.cost);
  if(v?.version!==1||execution.visibility!=='gm'||!parent||key!==executionKey(v.decision)||!isGroupFeature(v.feature)
    ||event?.status!=='active'||event.kind!=='native_group_feature'||event.source_id!=='native:unified-gm'||event.details.payload_hash!==hash(v)
    ||event.details.input_source!==parent.row.source_event||n?.operation!=='commit_group_feature'||n.feature!==v.feature||n.feature_hash!==v.feature_hash
    ||hash(n.feature_definition)!==v.feature_hash||cost?.status!=='committed'||cost.source_event!==parent.row.source_event||hash(cost)!==v.cost_hash
    ||cost.data.decision!==v.decision||db.getWorldEvent(guild,n.actor_source)?.status!=='active'||v.children.length!==n.targets.length)throw fail('group_feature_execution_ancestry');
  for(const [i,c] of v.children.entries()){
    const row=db.getCityRecord(guild,'gm_arbitration_decision',c.decision),source=row&&db.getWorldEvent(guild,row.source_event),target=n.targets[i];
    if(row?.status!=='pending_pc_reaction'||row.visibility!=='gm'||c.character!==target.character||hash(row.data)!==c.hash
      ||row.data.native.parent!==v.decision||row.data.native.execution!==key||row.data.native.character!==target.character
      ||!source||source.kind!=='native_gm_arbitration'||source.source_id!=='native:unified-gm'||source.details.payload_hash!==hash(row.data))throw fail('group_feature_child_ancestry');
  }
  if(n.area){
    const targets=mixedTargets(n),mixed=v.mixed;
    if(mixed?.version!==1||mixed.key!==key||mixed.cohort_hash!==hash(targets)||!Array.isArray(mixed.reactions)||mixed.reactions.length!==targets.length)throw fail('group_mixed_execution_source');
    for(const [i,reaction] of mixed.reactions.entries()){
      const target=targets[i];if(reaction.kind!==target.kind||reaction.target!==`${target.kind}:${target.key}`)throw fail('group_mixed_target_source');
      if(target.kind==='character'){
        const child=v.children.find(c=>c.character===target.key);
        if(!child||reaction.invitation!==child.decision||reaction.invitation_hash!==child.hash)throw fail('group_mixed_owner_invitation');
      }else{
        const receipt=inspectNativeNpcReaction(reaction.receipt),stored=db.getCityRecord(guild,'native_npc_reaction',`group-npc-reaction:${hash([v.decision,target.key])}`),
          source=stored&&db.getWorldEvent(guild,stored.source_event);
        if(stored?.status!=='resolved'||stored.visibility!=='gm'||stored.actor_key!==target.key||hash(stored.data)!==hash(receipt)
          ||source?.status!=='active'||source.kind!=='native_npc_reaction'||source.source_id!=='native:unified-gm'||source.visibility!=='gm'
          ||source.session_id!==parent.row.data.origin.session||source.scene!==parent.row.data.origin.scene
          ||source.details.execution!==key||source.details.payload_hash!==hash(receipt)||receipt.target.key!==target.key
          ||receipt.target.presence_hash!==target.presence_hash||receipt.target.control_hash!==target.control_hash
          ||receipt.target.template_hash!==target.template_hash||receipt.combatant_hash!==hash(target.combatant_snapshot))throw fail('group_mixed_npc_receipt');
      }
    }
    if(execution.status!=='preparing_effects'){
      const progress=db.getCityRecord(guild,'gm_group_feature_progress',key),conditions=progress?.data.npc_conditions;
      const expected=mixed.reactions.filter(r=>r.kind==='npc'&&!r.receipt.result.success).map(r=>{
        const binding={execution:key,cohort_hash:mixed.cohort_hash,target:r.target,proof:r.receipt.receipt_hash,outcome:'failure'};
        const ref=`mixed-condition:${hash(binding)}`,condition=db.getCityRecord(guild,'native_mixed_condition',ref),source=condition&&db.getWorldEvent(guild,condition.source_event);
        if(condition?.status!=='active'||hash(condition.data.binding)!==hash(binding)||source?.status!=='active'||source.kind!=='native_mixed_condition'||source.source_id!=='native:unified-gm'
          ||source.visibility!=='gm'||source.details.payload_hash!==hash(condition.data))throw fail('group_terminal_npc_condition');
        return {ref,hash:hash(condition.data)};
      });
      if(execution.status==='resolved'&&hash(conditions)!==hash(expected))throw fail('group_terminal_npc_conditions');
    }
  }
  if(execution.status==='resolved'){
    const progress=db.getCityRecord(guild,'gm_group_feature_progress',key),source=progress&&db.getWorldEvent(guild,progress.source_event);
    if(progress?.status!=='resolved'||progress.visibility!=='gm'||source?.status!=='active'||source.kind!=='native_group_progress'
      ||source.source_id!=='native:unified-gm'||source.details.payload_hash!==hash(progress.data)||progress.data.execution!==key
      ||progress.data.execution_hash!==hash(v)||progress.data.children.length!==v.children.length)throw fail('group_terminal_native_progress');
    for(const [i,p] of progress.data.children.entries()){
      const child=db.getCityRecord(guild,'gm_arbitration_decision',v.children[i].decision),n=child.data.native;
      if(p.decision!==child.record_key||p.character!==n.character||!['resolved','withdrawn'].includes(p.status))throw fail('group_terminal_child_disposition');
      if(p.status==='resolved'){
        const effect=db.getCityRecord(guild,'gm_group_feature_effect',p.proof),e=effect&&db.getWorldEvent(guild,effect.source_event),request=effect&&db.getCityRecord(guild,'roll_request',effect.data.request),
          roll=request&&db.getSavedRoll(guild,request.data.roll_id);
        if(p.proof!==effectKey(child.record_key)||effect?.status!=='resolved'||effect.subject_key!==n.character||effect.data.owner!==n.owner
          ||effect.data.decision!==child.record_key||e?.status!=='active'||e.kind!=='native_group_feature_effect'||e.source_id!=='native:unified-gm'
          ||e.details.payload_hash!==hash(effect.data)||hash(request)!==effect.data.request_hash||hash(roll)!==effect.data.roll_hash)
          throw fail('group_terminal_actual_effect');
      }else{
        const terminal=db.getCityRecord(guild,'gm_reaction_submission',p.proof),e=terminal&&db.getWorldEvent(guild,terminal.source_event);
        if(p.proof!==`gm-reaction-submit:${hash([child.record_key,n.owner])}`||terminal?.status!=='withdrawn'||terminal.subject_key!==n.character
          ||terminal.data.owner!==n.owner||terminal.data.invitation_hash!==hash(child.data)||e?.status!=='active'||e.kind!=='native_gm_reaction_withdrawal'
          ||e.subject_key!==n.character||e.source_id!==`player:${n.owner}`||e.details.invitation!==child.record_key||e.details.revision!==hash(child.data)
          ||!db.ownerAuthoredSource(guild,e.event_key,n.owner))throw fail('group_terminal_actual_withdrawal');
      }
    }
  }
  return {execution,parent:parent.row,entry:parent.entry,cost};
}
/** Current child recipient proof, independent of the triggering player's later resources/ownership. */
function inspectGroupFeatureChild(db,guild,row){
  const n=row.data.native,{execution,parent}=inspectGroupFeature(db,guild,n.execution),scene=currentScene(db,guild),pc=db.getCharacter(n.character);
  if(pc?.owner_user_id!==n.owner)throw fail('group_feature_current_recipient_source');
  let principal;
  try{principal=conversationPrincipal(db,guild,n.owner,pc.id);}
  catch(error){if(!['Active session required.','Select an authenticated current controlled role.','Controller attendance required.','Active campaign character required.'].includes(error.message))throw error;
    throw fail('group_feature_owner_control_unavailable');}
  const presence=scenePresence(db,guild,'character',pc.id);
  if(!execution.data.children.some(c=>c.decision===row.record_key&&c.hash===hash(row.data))||n.parent!==parent.record_key
    ||pc?.owner_user_id!==n.owner||principal?.kind!=='owner'||principal.revision!==n.principal||scene.key!==row.data.origin.scene||scene.session_id!==row.data.origin.session
    ||hash(presence)!==n.target_snapshot.target||db.getWorldEvent(guild,presence?.source_event)?.status!=='active'
    ||db.getWorldEvent(guild,row.source_event)?.status!=='active')throw fail('group_feature_current_recipient_source');
  return {execution,parent,pc};
}
function groupReactionState(db,guild,row,terminal){
  const {pc}=inspectGroupFeatureChild(db,guild,row),effect=db.getCityRecord(guild,'gm_group_feature_effect',effectKey(row.record_key));
  if(effect){validateGroupReactionEffect(db,guild,effect.record_key);return effect.status;}
  const review=db.getCityRecord(guild,'gm_group_feature_review',effectKey(row.record_key));
  if(review)return 'needs_rules_review';
  const choice=db.getCityRecord(guild,'gm_group_feature_choice',effectKey(row.record_key));
  if(choice){
    const request=terminal?.status==='resolved'&&db.getCityRecord(guild,'roll_request',terminal.data.request);
    if(request?.data?.result?.duality==='Critical'&&row.data.native.feature===FLASH)return 'needs_rules_review'; // Historical pending choice: never charge or silently rewrite it.
    if(!request||!needsChoice(row.data.native.feature,typedRollProof(db,guild,request).outcome==='success',request.data.result.duality==='Critical')
      ||choice.status!=='awaiting_owner'||choice.visibility!=='character'||choice.subject_key!==pc.id
      ||choice.source_event!==row.source_event||choice.data.decision!==row.record_key||choice.data.request!==request?.record_key
      ||hash(choice.data.options)!==hash(groupReactionOptions(row.data.native.feature)))throw fail('group_choice_pending_proof');
    return 'awaiting_owner';
  }
  if(!terminal&&hash(pc.data.resources)!==row.data.native.resources_hash)throw fail('group_feature_pending_resources_changed');
  return terminal?.status||'pending';
}
function applyGroupReactionOutcome(db,guild,row,request,choiceSource=null,choice=null){
  if(policies[row.data.native.feature]?.area)return applyAreaGroupReactionOutcome(db,guild,row,request);
  const result=db.transaction(()=>{
  const result=db.transaction(()=>{
    const n=row.data.native,{pc,cost}= {...inspectGroupFeatureChild(db,guild,row),...inspectGroupFeature(db,guild,n.execution)},key=effectKey(row.record_key),
      prior=db.getCityRecord(guild,'gm_group_feature_effect',key),proof=typedRollProof(db,guild,request),policy=policies[n.feature],success=proof.outcome==='success',critical=request.data.result.duality==='Critical';
    if(prior)return validateGroupReactionEffect(db,guild,key);
    if(request.data.kind!=='reaction'||request.data.input.gm_invitation!==row.record_key||request.subject_key!==pc.id
      ||request.data.owner_user_id!==n.owner||proof.difficulty!==policy.difficulty||proof.outcome==='needs_review')throw fail('group_actual_owner_reaction');
    const terminal=db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([row.record_key,n.owner])}`),
      submission=terminal&&db.getWorldEvent(guild,terminal.source_event);
    if(terminal?.status!=='resolved'||terminal.data.request!==request.record_key||terminal.data.owner!==n.owner||terminal.data.invitation_hash!==hash(row.data)
      ||submission?.status!=='active'||!db.ownerAuthoredSource(guild,submission.event_key,n.owner))throw fail('group_actual_owner_submission');
    if(choice||choiceSource){
      const source=db.getWorldEvent(guild,choiceSource);
      if(!needsChoice(n.feature,success,critical)||!groupReactionOptions(n.feature).includes(choice)||source?.status!=='active'||source.kind!=='native_group_feature_choice'
        ||source.source_id!==`player:${n.owner}`||source.visibility!=='character'||source.subject_key!==pc.id||source.session_id!==row.data.origin.session
        ||source.scene!==row.data.origin.scene||source.details.author!==n.owner||source.details.decision!==row.record_key||source.details.revision!==hash(row.data)
        ||source.details.choice!==choice||!db.ownerAuthoredSource(guild,source.event_key,n.owner)
        ||hash(JSON.parse(source.details.authored_text))!==hash({op:'gm-reaction-choice',request:row.record_key,revision:hash(row.data),choice}))throw fail('group_choice_native_owner_source');
    }
    if(critical&&n.feature===FLASH&&db.getCityRecord(guild,'gm_group_feature_choice',key))return db.saveCityRecord(guild,{kind:'gm_group_feature_review',key,status:'needs_rules_review',
      source_event:row.source_event,visibility:'character',subject_key:pc.id,data:{decision:row.record_key,request:request.record_key,
        reason:'Historical Critical-success choice requires scoped reconciliation. No new cost, condition, dice or historical outcome rewrite.'}});
    if(needsChoice(n.feature,success,critical)&&!choice)return db.saveCityRecord(guild,{kind:'gm_group_feature_choice',key,status:'awaiting_owner',source_event:row.source_event,
      visibility:'character',subject_key:pc.id,data:{decision:row.record_key,request:request.record_key,options:groupReactionOptions(n.feature)}});
    if(n.feature===REGENT&&choice==='command')return db.saveCityRecord(guild,{kind:'gm_group_feature_review',key,status:'needs_rules_review',
      source_event:row.source_event,visibility:'character',subject_key:pc.id,data:{decision:row.record_key,request:request.record_key,choice_source:choiceSource,
        reason:'A communicated bounded non-suicidal command and exact supported owner declaration/effect are required. No compliance, surrender, speech or resource change was inferred.'}});
    const {stress,hope,condition}=groupFeatureOutcome(n.feature,{success,critical,choice}),
      before=structuredClone(pc.data),after=structuredClone(before);
    if(hash(before.resources)!==n.resources_hash||stress&&before.resources.stress.current+stress>before.resources.stress.max
      ||hope&&(!Number.isSafeInteger(before.resources.hope)||before.resources.hope<hope))
      return db.saveCityRecord(guild,{kind:'gm_group_feature_review',key,status:'needs_rules_review',source_event:row.source_event,visibility:'character',subject_key:pc.id,
        data:{decision:row.record_key,request:request.record_key,reason:'Current resources, insufficient Hope or native Stress-overflow adapter need review; committed owner dice are preserved.'}});
    if(stress)after.resources.stress.current+=stress;
    if(hope)after.resources.hope-=hope;
    const existing=condition&&(before.conditions||[]).find(c=>(typeof c==='string'?c:c.name)===policy.condition&&c.active!==false);
    if(existing&&!existing.native_ref)return db.saveCityRecord(guild,{kind:'gm_group_feature_review',key,status:'needs_rules_review',source_event:row.source_event,
      visibility:'character',subject_key:pc.id,data:{decision:row.record_key,request:request.record_key,reason:'Existing condition has no verified native duration/source; no stacking or replacement.'}});
    if(existing)validateNativeCondition(db,guild,existing.native_ref);
    const conditionKey=condition?(existing?.native_ref||`${key}:condition`):null,condition_reused=!!existing;
    if(condition&&!existing){after.conditions=[...(after.conditions||[]),{name:policy.condition,native_ref:conditionKey,active:true}];}
    db.updateCharacterData(pc.id,data=>Object.assign(data,after));
    const mutation=db.recordMutation(guild,{sessionId:row.data.origin.session,actorType:'ai_gm',actorId:'native:unified-gm',sourceLayer:'native_feature',mutationType:'verified_group_feature',
      entityKey:pc.id,visibility:'character',before,after,rationale:'Verified owner reaction and optional exact owner choice.',payload:{decision:row.record_key,request:request.record_key}});
    const data={version:n.feature===REGENT?2:critical&&n.feature===FLASH?3:1,...(n.feature===REGENT?{hope}:{}),decision:row.record_key,parent:n.parent,feature:n.feature,feature_hash:n.feature_hash,character:pc.id,owner:n.owner,request:request.record_key,
      roll:request.data.roll_id,request_hash:hash(request),roll_hash:hash(db.getSavedRoll(guild,request.data.roll_id)),request_source_hash:hash(submission),
      success,choice,choice_source:choiceSource,before,after,stress,condition:conditionKey,condition_reused,mutation:mutation.id,cost:cost.record_key};
    const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_group_feature_effect',source_id:'native:unified-gm',title:'Native owner-specific feature consequence',
      session_id:row.data.origin.session,scene:row.data.origin.scene,visibility:'character',subject_key:pc.id,details:{payload_hash:hash(data),owner_source:request.source_event}},'native:unified-gm');
    const effect=db.saveCityRecord(guild,{kind:'gm_group_feature_effect',key,status:'resolved',source_event:event.event_key,visibility:'character',subject_key:pc.id,data});
    if(condition&&!existing){const v={version:1,effect:key,character:pc.id,owner:n.owner,actor:inspectGroupFeature(db,guild,n.execution).entry.actor.key,
      feature:n.feature,condition:policy.condition,expiry:policy.expiry,scene:row.data.origin.scene,cast_spotlight:cost.data.spotlight?.index??null};
      const source=indexWorldEvent(db,guild,{key:`${conditionKey}:source`,kind:'native_pc_condition',source_id:'native:unified-gm',title:'Native sourced temporary condition',
        session_id:row.data.origin.session,scene:v.scene,visibility:'character',subject_key:pc.id,details:{payload_hash:hash(v)}},'native:unified-gm');
      db.saveCityRecord(guild,{kind:'pc_native_condition',key:conditionKey,actor_key:pc.id,status:'active',source_event:source.event_key,visibility:'character',subject_key:pc.id,data:v});}
    return effect;
  });
  settleGroupFeature(db,guild,row.data.native.execution);
  reserveGmArbitrationNotice(db,guild,row.record_key);
  return result;
  });
  if(result?.kind==='gm_group_feature_effect'&&result.data.stress>0)
    applyNativeStressPassive(db,guild,'group',result.record_key);
  return result;
}
/** Per-target progress only; no inferred failure, consent, public disclosure or mechanical execution. */
function settleGroupFeature(db,guild,key){
  const {execution,parent}=inspectGroupFeature(db,guild,key),children=execution.data.children.map(c=>{
    const row=db.getCityRecord(guild,'gm_arbitration_decision',c.decision),n=row.data.native,
      terminal=db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([row.record_key,n.owner])}`);
    let status='pending',proof=null;
    try{
      if(terminal){const source=db.getWorldEvent(guild,terminal.source_event);
        if(terminal.subject_key!==n.character||terminal.visibility!=='character'||terminal.data.owner!==n.owner||terminal.data.invitation_hash!==hash(row.data)
          ||source?.status!=='active'||!db.ownerAuthoredSource(guild,source.event_key,n.owner))throw fail('group_progress_owner_source');
        if(terminal.status==='withdrawn'){
          if(terminal.record_key!==`gm-reaction-submit:${hash([row.record_key,n.owner])}`||terminal.data.invitation!==row.record_key
            ||source.kind!=='native_gm_reaction_withdrawal'||source.source_id!==`player:${n.owner}`||source.visibility!=='character'
            ||source.subject_key!==n.character||source.session_id!==row.data.origin.session||source.scene!==row.data.origin.scene
            ||source.details.author!==n.owner||source.details.character_id!==n.character||source.details.invitation!==row.record_key
            ||source.details.revision!==hash(row.data)||!db.ownerAuthoredSource(guild,source.event_key,n.owner))throw fail('group_progress_exact_withdrawal');
          // Withdrawal is an immutable owner-authored terminal disposition. A later
          // reassignment must not turn it into an unresolved current-recipient check.
          status='withdrawn';proof=terminal.record_key;return {decision:c.decision,character:c.character,status,proof};
        }
        if(!['resolved','withdrawn'].includes(terminal.status))throw fail('group_progress_native_terminal');
        proof=terminal.record_key;
      }
      const effect=terminal?.status==='resolved'&&db.getCityRecord(guild,'gm_group_feature_effect',effectKey(row.record_key));
      if(effect){const verified=validateGroupReactionEffect(db,guild,effect.record_key,{historical:true});status=verified.status;proof=verified.record_key;}
      else status=groupReactionState(db,guild,row,terminal);
      if(status==='resolved'&&!effect){const verified=validateGroupReactionEffect(db,guild,effectKey(row.record_key));proof=verified.record_key;}
    }catch(error){if(!['GM_ARBITRATION','TYPED_ROLL_PROOF','SCENE_ACTION_WINDOW'].includes(error.code))throw error;status='needs_review';}
    return {decision:c.decision,character:c.character,status,proof};
  });
  let npc_conditions;
  if(parent.data.native.area){
    settleAreaNpcConditions(db,guild,execution,{replay:true});
    npc_conditions=execution.data.mixed.reactions.filter(r=>r.kind==='npc'&&!r.receipt.result.success).map(r=>{
      const binding={execution:key,cohort_hash:execution.data.mixed.cohort_hash,target:r.target,proof:r.receipt.receipt_hash,outcome:'failure'},
        ref=`mixed-condition:${hash(binding)}`;
      return {ref,hash:hash(db.getCityRecord(guild,'native_mixed_condition',ref).data)};
    });
  }
  const status=children.every(c=>['resolved','withdrawn'].includes(c.status))?'resolved':'awaiting_owners',
    data={version:1,execution:key,execution_hash:hash(execution.data),children,...(npc_conditions?{npc_conditions}:{})},
    source=indexWorldEvent(db,guild,{key:`group-progress:${hash(data)}`,kind:'native_group_progress',source_id:'native:unified-gm',
      title:'Verified per-owner group disposition',session_id:parent.data.origin.session,scene:parent.data.origin.scene,
      visibility:'gm',details:{payload_hash:hash(data)}},'native:unified-gm');
  db.saveCityRecord(guild,{kind:'gm_group_feature_progress',key,status,source_event:source.event_key,visibility:'gm',data});
  return db.saveCityRecord(guild,{...execution,key,status});
}
function groupReactionDetails(db,guild,row){
  const effect=db.getCityRecord(guild,'gm_group_feature_effect',effectKey(row.record_key));if(!effect)return null;
  validateGroupReactionEffect(db,guild,effect.record_key);
  return {ref:effect.record_key,revision:hash(effect.data),success:effect.data.success,stress_marked:effect.data.stress,
    ...(effect.data.feature===REGENT?{hope_spent:effect.data.hope}:{}),
    condition:effect.data.condition?policies[effect.data.feature].condition:null,condition_reused:effect.data.condition_reused};
}
function validateGroupReactionEffect(db,guild,key,{historical=false}={}){
  const row=db.getCityRecord(guild,'gm_group_feature_effect',key),v=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    decision=v&&db.getCityRecord(guild,'gm_arbitration_decision',v.decision),n=decision?.data.native,policy=n&&policies[n.feature];
  if(!v||row.status!=='resolved'||row.visibility!=='character'||row.subject_key!==v.character||!decision||!policy)throw fail('group_effect_identity');
  if(v.version===4&&policy.area)return validateAreaGroupReactionEffect(db,guild,row,decision,{historical});
  if(historical)inspectGroupFeature(db,guild,n.execution);else inspectGroupFeatureChild(db,guild,decision);
  const request=db.getCityRecord(guild,'roll_request',v.request),
    requestSource=request&&db.getWorldEvent(guild,request.source_event),roll=request&&db.getSavedRoll(guild,request.data.roll_id);
  // A sealed, already verified reaction is read-only history after duration expiry. It
  // never grants a new action/consent or lets an old recipient receive a new notice.
  if(hash(request)!==v.request_hash||hash(roll)!==v.roll_hash||requestSource?.status!=='active'||hash(requestSource)!==v.request_source_hash)
    throw fail('group_effect_immutable_reaction_snapshot');
  const proof=historical?{difficulty:request.data.breakdown.difficulty,outcome:request.data.result.duality==='Critical'||request.data.result.total>=request.data.breakdown.difficulty?'success':'failure'}:
    typedRollProof(db,guild,request),
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
}
function chooseGroupReactionOutcome(db,guild,user,input,{interactionId,authoredText}={}){
  if(!interactionId||typeof authoredText!=='string'||Object.keys(input).sort().join()!=='choice,op,request,revision'||input.op!=='gm-reaction-choice'
      ||hash(JSON.parse(authoredText))!==hash(input)||!['stress','vulnerable','hope','command'].includes(input.choice))throw fail('exact_group_owner_choice');
  return db.transaction(()=>{
    const row=db.getCityRecord(guild,'gm_arbitration_decision',input.request),n=row?.data.native;
    if(!row||!groupReactionOptions(n?.feature).includes(input.choice)||n.operation!=='request_group_feature_reaction'
      ||n.owner!==user||input.revision!==hash(row.data))throw fail('group_choice_owner_revision');
    personalCharacter(db,guild,user,n.character);inspectGroupFeatureChild(db,guild,row);
    const terminal=db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([row.record_key,user])}`),
      request=terminal?.status==='resolved'&&db.getCityRecord(guild,'roll_request',terminal.data.request),prior=db.getCityRecord(guild,'gm_group_feature_effect',effectKey(row.record_key));
    if(prior){const effect=validateGroupReactionEffect(db,guild,prior.record_key);if(effect.data.choice!==input.choice)throw fail('committed_group_choice_changed');return effect;}
    if(!request||!needsChoice(n.feature,typedRollProof(db,guild,request).outcome==='success',request.data.result.duality==='Critical'))throw fail('group_choice_actual_success');
    const source=indexWorldEvent(db,guild,{key:`${effectKey(row.record_key)}:choice${n.feature===REGENT?':'+hash([input.choice,interactionId]):''}`,kind:'native_group_feature_choice',source_id:`player:${user}`,
      title:'Affected owner selects exactly one native feature consequence',session_id:row.data.origin.session,scene:row.data.origin.scene,visibility:'character',subject_key:n.character,
      details:{author:user,decision:row.record_key,revision:input.revision,choice:input.choice,authored_text:authoredText,interaction:interactionId}},user);
    if(source.status!=='active')throw fail('group_choice_source_revoked');
    return applyGroupReactionOutcome(db,guild,row,request,source.event_key,input.choice);
  });
}
const cursorKey=(actor,scene)=>`gm-spotlight:${hash([actor,scene])}`;
function spotlightCursor(db,guild,actor,scene){
  const row=db.getCityRecord(guild,'native_gm_spotlight_cursor',cursorKey(actor,scene));
  if(!row)return null;
  const source=db.getWorldEvent(guild,row.source_event);
  if(source?.status!=='active'||source.kind!=='native_gm_spotlight'||source.source_id!=='native:unified-gm'
    ||source.details.payload_hash!==hash(row.data)||row.data.actor!==actor||row.data.scene!==scene||!Number.isSafeInteger(row.data.index)||row.data.index<1)
    throw fail('native_spotlight_cursor_ancestry');
  return row;
}
function planNativeSpotlight(db,guild,actor,scene,cost){
  return {actor,scene,index:(spotlightCursor(db,guild,actor,scene)?.data.index||0)+1,cost};
}
/** Called by the existing native cost commit, not model JSON. Reaction features never enter this path. */
function recordNativeSpotlight(db,guild,cost){
  const stored=db.getCityRecord(guild,'gm_action_cost_receipt',cost.record_key),{row,entry}=inspectCommittedGmDecision(db,guild,cost.data.decision),v=cost.data.spotlight,
    current=spotlightCursor(db,guild,entry.actor.key,row.data.origin.scene);
  if(current?.data.cost===cost.record_key)return current;
  if(!v||hash(stored)!==hash(cost)||cost.status!=='committed'||cost.source_event!==row.source_event||v.actor!==entry.actor.key||v.scene!==row.data.origin.scene
    ||v.cost!==cost.record_key||v.index!==(current?.data.index||0)+1)throw fail('native_spotlight_cost_source');
  const source=indexWorldEvent(db,guild,{key:`${cost.record_key}:spotlight`,kind:'native_gm_spotlight',source_id:'native:unified-gm',title:'Native GM actor spotlight',
    session_id:row.data.origin.session,scene:v.scene,visibility:'gm',details:{payload_hash:hash(v),cost_hash:hash(cost)}},'native:unified-gm');
  const pointer=db.saveCityRecord(guild,{kind:'native_gm_spotlight_cursor',key:cursorKey(v.actor,v.scene),status:'active',source_event:source.event_key,visibility:'gm',data:v});
  const conditions=[];for(let offset=0;;offset+=100){const page=db.listCityRecords(guild,{kind:'pc_native_condition',status:'active',includeGM:true,limit:100,offset});
    conditions.push(...page);if(page.length<100)break;}
  for(const condition of conditions.filter(c=>c.data.expiry==='next_spotlight'&&c.data.actor===v.actor&&c.data.scene===v.scene&&c.data.cast_spotlight<v.index)){
    try{
      validateNativeCondition(db,guild,condition.record_key);
      const pc=db.getCharacter(condition.subject_key),before=structuredClone(pc.data.conditions||[]),after=before.map(c=>c.native_ref===condition.record_key?{...c,active:false}:c);
      db.updateCharacterData(pc.id,data=>{data.conditions=after;});
      const data={condition:condition.record_key,condition_hash:hash(condition.data),spotlight:source.event_key,spotlight_hash:hash(v),character:pc.id,before,after,
        before_pc:hash(pc.data),after_pc:hash({...pc.data,conditions:after})};
      const expiry=indexWorldEvent(db,guild,{key:`${condition.record_key}:expiry`,kind:'native_condition_expiry',source_id:'native:unified-gm',title:'Feature-defined condition duration ends',
        session_id:row.data.origin.session,scene:v.scene,visibility:'character',subject_key:pc.id,details:data},'native:unified-gm');
      db.saveCityRecord(guild,{kind:'pc_native_condition_expiry',key:condition.record_key,actor_key:pc.id,status:'resolved',source_event:expiry.event_key,visibility:'character',subject_key:pc.id,data});
      db.saveCityRecord(guild,{...condition,key:condition.record_key,status:'expired'});
    }catch(error){if(!['GM_ARBITRATION','TYPED_ROLL_PROOF','SCENE_ACTION_WINDOW'].includes(error.code))throw error;
      db.saveCityRecord(guild,{kind:'native_condition_review',key:condition.record_key,status:'needs_review',source_event:condition.source_event,visibility:'gm',
        data:{condition:condition.record_key,reason:error.message,authority:'Hold this unverified condition only; independent native spotlight remains committed.'}});}
  }
  return pointer;
}
function validateNativeCondition(db,guild,key){
  const candidate=db.getCityRecord(guild,'pc_native_condition',key);
  if(candidate?.data.version===2){
    const inspected=(capabilities.inspectMixedCondition||mixedConditions.inspectMixedCondition)(db,guild,key);
    if(inspected?.kind!=='pc_native_condition'||hash(inspected)!==hash(candidate))throw fail('native_condition_mixed_reader_source');
    return inspected;
  }
  const row=db.getCityRecord(guild,'pc_native_condition',key),v=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    // The condition's original effect is already committed history, not permission for another NPC action.
    effect=v&&validateGroupReactionEffect(db,guild,v.effect,{historical:true}),child=effect&&db.getCityRecord(guild,'gm_arbitration_decision',effect.data.decision),
    parent=child&&inspectGroupFeature(db,guild,child.data.native.execution),policy=v&&policies[v.feature];
  if(v?.version!==1||!policy||!['active','expired','cleared'].includes(row.status)||row.visibility!=='character'||row.subject_key!==v.character
    ||event?.status!=='active'||event.kind!=='native_pc_condition'||event.source_id!=='native:unified-gm'||event.details.payload_hash!==hash(v)
    ||effect.data.condition!==key||v.character!==effect.data.character||v.owner!==effect.data.owner||v.feature!==effect.data.feature
    ||v.condition!==policy.condition||v.expiry!==policy.expiry||v.actor!==parent.entry.actor.key||v.scene!==parent.parent.data.origin.scene
    ||v.cast_spotlight!==parent.cost.data.spotlight?.index)throw fail('native_condition_effect_source');
  if(row.status==='cleared')inspectNativeConditionClearAncestry(db,guild,row);
  if(row.status==='expired'){
    const r=db.getCityRecord(guild,'pc_native_condition_expiry',key),source=r&&db.getWorldEvent(guild,r.source_event),spotlight=r&&db.getWorldEvent(guild,r.data.spotlight);
    if(r?.status!=='resolved'||source?.status!=='active'||source.kind!=='native_condition_expiry'||source.source_id!=='native:unified-gm'||hash(source.details)!==hash(r.data)
      ||r.data.condition_hash!==hash(v)||spotlight?.status!=='active'||spotlight.kind!=='native_gm_spotlight'||spotlight.source_id!=='native:unified-gm'
      ||spotlight.details.payload_hash!==r.data.spotlight_hash||v.expiry!=='next_spotlight'||r.data.condition!==key||r.data.character!==v.character
      ||r.visibility!=='character'||r.subject_key!==v.character||source.visibility!=='character'||source.subject_key!==v.character
      ||hash(r.data.after)!==hash(r.data.before.map(c=>c.native_ref===key?{...c,active:false}:c)))throw fail('native_condition_expiry_source');
    const cost=db.getCityRecord(guild,'gm_action_cost_receipt',spotlight.event_key.slice(0,-10)),sv=cost?.data.spotlight;
    if(!cost||hash(sv)!==r.data.spotlight_hash||hash(cost)!==spotlight.details.cost_hash||sv.actor!==v.actor||sv.scene!==v.scene
      ||sv.index<=v.cast_spotlight||cost.status!=='committed')throw fail('native_condition_expiry_spotlight_cost');
  }
  return row;
}
function activeNativeConditions(db,guild,character,{kind='character'}={}){
  if(!['character','npc'].includes(kind))throw fail('native_condition_actor_kind');
  const rows=[];for(let offset=0;;offset+=100){const page=db.listCityRecords(guild,{kind:kind==='npc'?'native_mixed_condition':'pc_native_condition',actor:character,includeGM:true,limit:100,offset});
    rows.push(...page);if(page.length<100)break;}
  return rows.map(r=>kind==='npc'?mixedConditions.inspectMixedCondition(db,guild,r.record_key):validateNativeCondition(db,guild,r.record_key)).filter(r=>r.status==='active');
}
/** Only sealed native conditions affect odds. A model/sheet string named Vulnerable grants nothing. */
function nativeIncomingConditions(db,guild,character){
  return activeNativeConditions(db,guild,character).filter(r=>r.data.condition==='Vulnerable')
    .map(r=>({ref:r.record_key,fingerprint:hash(r.data),condition:'Vulnerable'}));
}
function validateIncomingConditions(db,guild,character,proofs,{current=false}={}){
  if(!Array.isArray(proofs)||proofs.length>1)throw fail('native_condition_nonstacking');
  for(const proof of proofs){const row=validateNativeCondition(db,guild,proof.ref);
    if(row.subject_key!==character||row.data.condition!=='Vulnerable'||proof.condition!=='Vulnerable'||hash(row.data)!==proof.fingerprint)
      throw fail('incoming_condition_exact_source');}
  // Historical odds remain part of their saved roll. New dice must not use a condition
  // that has since ended, nor omit a newly established native condition.
  if(current&&hash(proofs)!==hash(nativeIncomingConditions(db,guild,character)))throw fail('incoming_condition_current_state_changed');
}
/** Source records are validated here; only current native conditions are handed to Daggerheart. */
function nativeMovementConditionIssue(db,guild,character,{range=null,kind='character'}={}){
  return movementConditionIssue(activeNativeConditions(db,guild,character,{kind}),{range,rangeBands:RANGE_BANDS});
}
/** Only the condition-only change made by THIS attack's native spotlight may advance its PC CAS.
 * No general stale-offer waiver, owner refresh, resource drift or odds-changing condition is admitted. */
function nativeAttackExpiryRevision(db,guild,character,before,after,costRef){
  if(before===after)return true;
  const rows=[];for(let offset=0;;offset+=100){const page=db.listCityRecords(guild,{kind:'pc_native_condition_expiry',actor:character,includeGM:true,limit:100,offset});
    rows.push(...page);if(page.length<100)break;}
  let cursor=before;
  for(let i=0;i<16&&cursor!==after;i++){
    const row=rows.find(r=>r.data.before_pc===cursor&&r.data.spotlight===`${costRef}:spotlight`);
    if(!row)return false;
    const condition=validateNativeCondition(db,guild,row.record_key);
    if(condition.status!=='expired'||condition.data.feature!==LANES||row.data.after_pc===cursor)return false;
    cursor=row.data.after_pc;
  }
  return cursor===after;
}

return Object.freeze({planGroupFeature,prepareGroupFeature,inspectGroupFeature,inspectGroupFeatureChild,groupReactionState,applyGroupReactionOutcome,settleGroupFeature,groupReactionDetails,validateGroupReactionEffect,chooseGroupReactionOutcome,planNativeSpotlight,recordNativeSpotlight,validateNativeCondition,activeNativeConditions,nativeIncomingConditions,validateIncomingConditions,nativeMovementConditionIssue,nativeAttackExpiryRevision});
}
