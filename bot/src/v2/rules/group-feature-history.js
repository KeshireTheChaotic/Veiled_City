/** Historical execution proof only; current actions, effects and disclosure require their own native validators. */
import {createHash} from 'node:crypto';
import {inspectCommittedGmDecision} from './committed-gm-decision.js';
import {inspectNativeNpcReaction} from './npc-reaction-proof.js';
import {inspectMixedConditionClear} from './npc-condition-clear-history.js';
import {isGroupFeature} from './group-feature-rules.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>new Error(code);
const executionKey=key=>`group-feature:${hash(key)}`,effectKey=key=>`group-effect:${hash(key)}`;
function mixedTargets(n){return n.area.targets.map(target=>target.kind==='npc'?n.npc_targets.find(t=>t.key===target.key):target);}
export function inspectGroupFeature(db,guild,key){
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
          ||receipt.target.template_hash!==target.template_hash||(target.profile_hash
            ?receipt.version!==2||receipt.profile?.hash!==target.profile_hash||receipt.combatant_hash!==null
            :receipt.version!==1||receipt.combatant_hash!==hash(target.combatant_snapshot)))throw fail('group_mixed_npc_receipt');
      }
    }
    if(execution.status!=='preparing_effects'){
      const progress=db.getCityRecord(guild,'gm_group_feature_progress',key),conditions=progress?.data.npc_conditions;
      const expected=mixed.reactions.filter(r=>r.kind==='npc'&&!r.receipt.result.success).map(r=>{
        const binding={execution:key,cohort_hash:mixed.cohort_hash,target:r.target,proof:r.receipt.receipt_hash,outcome:'failure'};
        const ref=`mixed-condition:${hash(binding)}`,condition=db.getCityRecord(guild,'native_mixed_condition',ref),source=condition&&db.getWorldEvent(guild,condition.source_event);
        if(!['active','cleared'].includes(condition?.status)||hash(condition.data.binding)!==hash(binding)||source?.status!=='active'||source.kind!=='native_mixed_condition'||source.source_id!=='native:unified-gm'
          ||source.visibility!=='gm'||source.details.payload_hash!==hash(condition.data))throw fail('group_terminal_npc_condition');
        if(condition.status==='cleared')inspectMixedConditionClear(db,guild,condition);
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
