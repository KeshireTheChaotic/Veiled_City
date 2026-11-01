/** Shared condition persistence for inspected mixed-reaction failures.
 * Host capabilities retain actor/source/reaction authority and existing state writers.
 */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';

export function createMixedConditionRules({inspectCause,readTarget,writeTarget,indexWorldEvent,inspectNativeConditionClearAncestry,inspectClearCause}){
  if([inspectCause,readTarget,writeTarget,indexWorldEvent].some(fn=>typeof fn!=='function'))throw new TypeError('Native mixed condition capabilities required.');
  const keyFor=binding=>`mixed-condition:${hash(binding)}`;
  const recordKind=target=>target.kind==='character'?'pc_native_condition':'native_mixed_condition';
  const eventKind=target=>target.kind==='character'?'native_pc_condition':'native_mixed_condition';
  function rule(cause){
    if(!cause||typeof cause.feature!=='string'||!cause.feature||!cause.source_hash||!cause.template_hash||!cause.scene||!cause.session
      ||!['Restrained','Vulnerable'].includes(cause.condition)||!['until_freed','until_cleared'].includes(cause.expiry)
      ||typeof cause.spellcast_disadvantage!=='boolean'
      ||cause.spellcast_disadvantage&&(cause.condition!=='Restrained'||cause.expiry!=='until_freed'))throw fail('mixed_condition_source_rule');
    return cause;
  }
  function inspectMixedCondition(db,guild,key){
    const row=db.getCityRecord(guild,'pc_native_condition',key)||db.getCityRecord(guild,'native_mixed_condition',key),d=row?.data,event=row&&db.getWorldEvent(guild,row.source_event);
    if(!d?.target||!['character','npc'].includes(d.target.kind)||d.version!==(d.target.kind==='character'?2:1)
      ||row.kind!==recordKind(d.target)||key!==keyFor(d.binding)||!['active','cleared'].includes(row.status)||event?.status!=='active'
      ||event.kind!==eventKind(d.target)||event.source_id!=='native:unified-gm'||event.details.payload_hash!==hash(d)
      ||row.actor_key!==d.target.key||row.subject_key!==(d.target.kind==='character'?d.target.key:null)
      ||row.visibility!==(d.target.kind==='character'?'character':'gm')||event.visibility!==row.visibility||event.subject_key!==row.subject_key
      ||event.scene!==d.cause.scene||event.session_id!==d.cause.session)throw fail('mixed_condition_receipt');
    const cause=rule(inspectCause(db,guild,d.binding,d.target,{historical:true}));
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
        if(typeof inspectNativeConditionClearAncestry!=='function')throw fail('mixed_condition_release_host_unavailable');
        inspectNativeConditionClearAncestry(db,guild,row);
      }
    }
    return row;
  }
  function applyMixedCondition(db,guild,binding,target){
    if(!binding||binding.outcome!=='failure'||!binding.execution||!binding.cohort_hash||!binding.proof
      ||!['character','npc'].includes(target?.kind)||!target.key||target.kind==='character'&&!target.owner||binding.target!==`${target.kind}:${target.key}`)
      throw fail('mixed_condition_failure_source');
    return db.transaction(()=>{
      const key=keyFor(binding),prior=db.getCityRecord(guild,recordKind(target),key);
      if(prior)return inspectMixedCondition(db,guild,key);
      const cause=rule(inspectCause(db,guild,binding,target,{historical:false})),state=readTarget(db,guild,target),before=structuredClone(state.conditions||[]);
      if(!Array.isArray(before)||before.some(c=>(typeof c==='string'?c:c.name)===cause.condition&&c?.active!==false))
        throw fail('mixed_condition_existing_source_requires_reconciliation');
      const marker=target.kind==='character'?{name:cause.condition,native_ref:key,active:true}:cause.condition,after=[...before,marker],
        visibility=target.kind==='character'?'character':'gm',subject=target.kind==='character'?target.key:null;
      writeTarget(db,guild,target,state,after);
      const mutation=db.recordMutation(guild,{actorType:'system',actorId:'native:unified-gm',sourceLayer:'native_condition',
        mutationType:'mixed_reaction_condition',entityKey:target.key,sessionId:cause.session,visibility,before,after});
      const data={version:target.kind==='character'?2:1,binding:structuredClone(binding),target:structuredClone(target),cause,before,after,mutation:mutation.id,
        ...(target.kind==='character'?{character:target.key,owner:target.owner,feature:cause.feature,condition:cause.condition,expiry:cause.expiry,scene:cause.scene}:{})};
      const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:eventKind(target),source_id:'native:unified-gm',title:'Native reaction condition',
        session_id:cause.session,scene:cause.scene,visibility,subject_key:subject,details:{payload_hash:hash(data)}},'native:unified-gm');
      db.saveCityRecord(guild,{kind:recordKind(target),key,status:'active',actor_key:target.key,visibility,subject_key:subject,source_event:source.event_key,data});
      return inspectMixedCondition(db,guild,key);
    });
  }
  const clearKey=condition=>`mixed-condition-clear:${hash(condition)}`;
  function clearProof(db,guild,binding,row,{historical=false}={}){
    if(typeof inspectClearCause!=='function'||row?.data.target.kind!=='npc'
      ||!binding||Object.keys(binding).sort().join()!=='condition,condition_hash,cost,decision'
      ||binding.condition!==row.record_key||binding.condition_hash!==hash(row.data)
      ||!binding.cost||!binding.decision)throw fail('mixed_condition_clear_source');
    const proof=inspectClearCause(db,guild,binding,row.data.target,{historical});
    if(proof?.actor!==row.actor_key||!proof.scene||!proof.session||!proof.source
      ||!proof.decision_hash||!proof.cost_hash||typeof proof.method!=='string'||!proof.method.trim())throw fail('mixed_condition_clear_source');
    return proof;
  }
  /** Immutable NPC release proof; the original condition validator calls this without recursive reinspection. */
  function inspectMixedConditionClear(db,guild,condition){
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
    if(hash(clearProof(db,guild,d.binding,row,{historical:true}))!==hash(d.proof))throw fail('mixed_condition_clear_ancestry');
    return receipt;
  }
  function clearMixedCondition(db,guild,binding){
    return db.transaction(()=>{
      const row=inspectMixedCondition(db,guild,binding?.condition);
      if(row.status==='cleared'){
        const prior=inspectMixedConditionClear(db,guild,row);
        if(hash(prior.data.binding)!==hash(binding))throw fail('mixed_condition_clear_replay_changed');
        return prior;
      }
      const proof=clearProof(db,guild,binding,row),state=readTarget(db,guild,row.data.target,{clearing:true}),before=structuredClone(state.conditions||[]);
      if(before.filter(c=>c===row.data.cause.condition).length!==1)throw fail('mixed_condition_clear_exact_current_marker');
      const after=before.filter(c=>c!==row.data.cause.condition),key=clearKey(row.record_key);
      writeTarget(db,guild,row.data.target,state,after);
      const mutation=db.recordMutation(guild,{actorType:'system',actorId:'native:unified-gm',sourceLayer:'native_condition',
        mutationType:'npc_spotlight_condition_clear',entityKey:row.actor_key,sessionId:proof.session,visibility:'gm',before,after}),
        data={version:1,binding:structuredClone(binding),proof,before,after,mutation:mutation.id},
        source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_mixed_condition_clear',source_id:'native:unified-gm',
          title:'Native NPC condition ended by its spotlight action',scene:proof.scene,session_id:proof.session,visibility:'gm',subject_key:null,
          details:{input_source:proof.source,payload_hash:hash(data)}},'native:unified-gm');
      db.saveCityRecord(guild,{kind:'native_mixed_condition_clear',key,status:'resolved',actor_key:row.actor_key,visibility:'gm',subject_key:null,source_event:source.event_key,data});
      const cleared=db.saveCityRecord(guild,{...row,key:row.record_key,status:'cleared'});
      return inspectMixedConditionClear(db,guild,cleared);
    });
  }
  return Object.freeze({applyMixedCondition,inspectMixedCondition,clearMixedCondition,inspectMixedConditionClear});
}
