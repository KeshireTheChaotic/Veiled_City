/** Shared condition persistence for inspected mixed-reaction failures.
 * Host capabilities retain actor/source/reaction authority and existing state writers.
 */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';

export function createMixedConditionRules({inspectCause,readTarget,writeTarget,indexWorldEvent}){
  if([inspectCause,readTarget,writeTarget,indexWorldEvent].some(fn=>typeof fn!=='function'))throw new TypeError('Native mixed condition capabilities required.');
  const keyFor=binding=>`mixed-condition:${hash(binding)}`;
  function rule(cause){
    if(!cause||typeof cause.feature!=='string'||!cause.feature||!cause.source_hash||!cause.template_hash||!cause.scene||!cause.session
      ||!['Restrained','Vulnerable'].includes(cause.condition)||!['until_freed','until_cleared'].includes(cause.expiry)
      ||typeof cause.spellcast_disadvantage!=='boolean'
      ||cause.spellcast_disadvantage&&(cause.condition!=='Restrained'||cause.expiry!=='until_freed'))throw fail('mixed_condition_source_rule');
    return cause;
  }
  function inspectMixedCondition(db,guild,key){
    const row=db.getCityRecord(guild,'native_mixed_condition',key),d=row?.data,event=row&&db.getWorldEvent(guild,row.source_event);
    if(d?.version!==1||key!==keyFor(d.binding)||row.status!=='active'||event?.status!=='active'
      ||event.kind!=='native_mixed_condition'||event.source_id!=='native:unified-gm'||event.details.payload_hash!==hash(d)
      ||row.actor_key!==d.target.key||row.subject_key!==(d.target.kind==='character'?d.target.key:null)
      ||row.visibility!==(d.target.kind==='character'?'character':'gm')||event.visibility!==row.visibility||event.subject_key!==row.subject_key
      ||event.scene!==d.cause.scene||event.session_id!==d.cause.session)throw fail('mixed_condition_receipt');
    const cause=rule(inspectCause(db,guild,d.binding,d.target,{historical:true}));
    const mutation=db.getMutation(guild,d.mutation);
    if(hash(cause)!==hash(d.cause)||d.binding.outcome!=='failure'||d.binding.target!==`${d.target.kind}:${d.target.key}`
      ||mutation?.source_layer!=='native_condition'||mutation.mutation_type!=='mixed_reaction_condition'
      ||mutation.actor_type!=='system'||mutation.actor_id!=='native:unified-gm'||mutation.entity_key!==d.target.key
      ||mutation.session_id!==cause.session||mutation.visibility!==row.visibility
      ||hash(JSON.parse(mutation.before_json))!==hash(d.before)||hash(JSON.parse(mutation.after_json))!==hash(d.after))throw fail('mixed_condition_mutation_source');
    const marker=d.target.kind==='character'?{name:cause.condition,native_ref:key,active:true}:cause.condition;
    if(hash([...d.before,marker])!==hash(d.after))throw fail('mixed_condition_exact_effect');
    return row;
  }
  function applyMixedCondition(db,guild,binding,target){
    if(!binding||binding.outcome!=='failure'||!binding.execution||!binding.cohort_hash||!binding.proof
      ||!['character','npc'].includes(target?.kind)||!target.key||binding.target!==`${target.kind}:${target.key}`)
      throw fail('mixed_condition_failure_source');
    return db.transaction(()=>{
      const key=keyFor(binding),prior=db.getCityRecord(guild,'native_mixed_condition',key);
      if(prior)return inspectMixedCondition(db,guild,key);
      const cause=rule(inspectCause(db,guild,binding,target,{historical:false})),state=readTarget(db,guild,target),before=structuredClone(state.conditions||[]);
      if(!Array.isArray(before)||before.some(c=>(typeof c==='string'?c:c.name)===cause.condition&&c?.active!==false))
        throw fail('mixed_condition_existing_source_requires_reconciliation');
      const marker=target.kind==='character'?{name:cause.condition,native_ref:key,active:true}:cause.condition,after=[...before,marker],
        visibility=target.kind==='character'?'character':'gm',subject=target.kind==='character'?target.key:null;
      writeTarget(db,guild,target,state,after);
      const mutation=db.recordMutation(guild,{actorType:'system',actorId:'native:unified-gm',sourceLayer:'native_condition',
        mutationType:'mixed_reaction_condition',entityKey:target.key,sessionId:cause.session,visibility,before,after});
      const data={version:1,binding:structuredClone(binding),target:structuredClone(target),cause,before,after,mutation:mutation.id};
      const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_mixed_condition',source_id:'native:unified-gm',title:'Native reaction condition',
        session_id:cause.session,scene:cause.scene,visibility,subject_key:subject,details:{payload_hash:hash(data)}},'native:unified-gm');
      db.saveCityRecord(guild,{kind:'native_mixed_condition',key,status:'active',actor_key:target.key,visibility,subject_key:subject,source_event:source.event_key,data});
      return inspectMixedCondition(db,guild,key);
    });
  }
  return Object.freeze({applyMixedCondition,inspectMixedCondition});
}
