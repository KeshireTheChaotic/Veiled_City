/** Native condition cleanup from an exact already-resolved owner action; no prose, dice or new costs. */
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {ordinaryActionProof,ordinaryPrerequisite} from './ordinary-effect-proof.js';
import {validateNativeCondition} from './native-group-features.js';
import {assertPcCanAct} from './pc-native-eligibility.js';
import {indexWorldEvent} from './city-calendar.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';

const CLEARABLE=new Set(['adversary:aster-vale-contractor:flashbang']);
const clearKey=condition=>`native-condition-clear:${hash(condition)}`;
const actionHash=action=>hash({key:action.record_key,source:action.source_event,type:action.data.type,
  actor:action.data.actor,owner:action.data.owner_user_id,principal:action.data.actor_principal_revision,
  scene:action.data.scene,session:action.data.session_id,source_hash:action.data.source_hash,
  start:action.data.start,end:action.data.end,framing:action.data.framing,
  operation:action.data.operation,target:action.data.target_key});
function actionProof(db,guild,condition,input,scope){
  const proof=ordinaryActionProof(db,guild,input.accepted_intent,scope),action=proof.row,
    result=ordinaryPrerequisite(db,guild,{prerequisite_ref:input.prerequisite},proof).receipt;
  if(condition.subject_key!==proof.pc.id||condition.data.owner!==proof.principal.user
    ||condition.data.scene!==proof.scene.key||!CLEARABLE.has(condition.data.feature)
    ||condition.data.condition!=='Vulnerable'||condition.data.expiry!=='until_cleared'
    ||action.data.type!=='interact'||action.data.operation!=='clear_condition'||action.data.target_key!==condition.record_key
    ||!['resolved_no_roll','success'].includes(result.data.outcome))throw fail('condition_clear_exact_native_owner_action');
  return {proof,action,result};
}
/** Necessary ancestry check used AFTER the original condition/effect validator; never an independent effect grant. */
export function inspectNativeConditionClearAncestry(db,guild,condition){
  const actual=condition&&db.getCityRecord(guild,'pc_native_condition',condition.record_key),
    receipt=actual&&db.getCityRecord(guild,'pc_native_condition_clear',clearKey(actual.record_key)),d=receipt?.data,
    source=receipt&&db.getWorldEvent(guild,receipt.source_event),mutation=d&&db.getMutation(guild,d.mutation);
  if(!actual||hash(actual)!==hash(condition)||actual.status!=='cleared'||receipt?.status!=='resolved'
    ||receipt.visibility!=='character'||receipt.subject_key!==actual.subject_key||d?.version!==1
    ||d.condition!==actual.record_key||d.condition_hash!==hash(actual.data)||d.owner!==actual.data.owner
    ||source?.status!=='active'||source.kind!=='native_condition_clear'||source.source_id!=='native:unified-gm'
    ||source.visibility!=='character'||source.subject_key!==actual.subject_key||source.scene!==d.scene||source.session_id!==d.session
    ||source.details.payload_hash!==hash(d)||source.details.input_source!==d.action_source
    ||mutation?.source_layer!=='native_condition'||mutation.mutation_type!=='owner_action_condition_clear'
    ||mutation.actor_type!=='system'||mutation.actor_id!=='native:unified-gm'
    ||mutation.entity_key!==actual.subject_key||mutation.session_id!==d.session||mutation.visibility!=='character'
    ||hash(JSON.parse(mutation.before_json))!==hash(d.before)||hash(JSON.parse(mutation.after_json))!==hash(d.after)
    ||hash(d.after)!==hash(d.before.map(c=>c.native_ref===actual.record_key?{...c,active:false}:c)))
    throw fail('native_condition_clear_immutable_ancestry');
  const {proof,action,result}=actionProof(db,guild,actual,{accepted_intent:d.action,prerequisite:d.prerequisite},d.scope);
  if(d.principal!==proof.principal.revision||d.character!==proof.pc.id||d.action_source!==action.source_event
    ||d.action_hash!==actionHash(action)||d.prerequisite_hash!==hash(result)||d.scene!==proof.scene.key||d.session!==proof.scene.session_id)
    throw fail('native_condition_clear_current_source_owner_result');
  return receipt;
}
export function clearNativeConditionFromOutcome(db,guild,input,scope){
  if(!input||Object.keys(input).sort().join()!=='accepted_intent,condition,prerequisite'
    ||[input.condition,input.accepted_intent,input.prerequisite].some(v=>typeof v!=='string'||!v||v.length>200))
    throw fail('condition_clear_closed_source_locators');
  return db.transaction(()=>{
    const condition=validateNativeCondition(db,guild,input.condition);
    if(condition.status==='cleared'){
      const prior=inspectNativeConditionClearAncestry(db,guild,condition);
      // A saved private receipt is not a public replay capability. Reauthenticate the caller's
      // actual scope instead of accepting the original scope stored in its ancestry.
      actionProof(db,guild,condition,input,scope);
      if(prior.data.action!==input.accepted_intent||prior.data.prerequisite!==input.prerequisite
        ||scope?.actorUserId!==prior.data.owner||scope.actorCharacterId!==prior.data.character)
        throw fail('condition_clear_replay_cannot_replace_owner_action');
      return prior;
    }
    if(condition.status!=='active')throw fail('condition_clear_current_active_condition');
    const {proof,action,result}=actionProof(db,guild,condition,input,scope);assertPcCanAct(proof.pc,db,guild);
    const before=structuredClone(proof.pc.data.conditions||[]),matches=before.filter(c=>c.native_ref===condition.record_key&&c.active===true);
    if(matches.length!==1||matches[0].name!==condition.data.condition)throw fail('condition_clear_exact_current_sheet_marker');
    const after=before.map(c=>c.native_ref===condition.record_key?{...c,active:false}:c),key=clearKey(condition.record_key);
    db.updateCharacterData(proof.pc.id,data=>{data.conditions=after;});
    const mutation=db.recordMutation(guild,{actorType:'system',actorId:'native:unified-gm',sourceLayer:'native_condition',
      mutationType:'owner_action_condition_clear',entityKey:proof.pc.id,sessionId:proof.scene.session_id,visibility:'character',before,after});
    const data={version:1,condition:condition.record_key,condition_hash:hash(condition.data),character:proof.pc.id,
      owner:proof.principal.user,principal:proof.principal.revision,scene:proof.scene.key,session:proof.scene.session_id,
      action:action.record_key,action_hash:actionHash(action),action_source:action.source_event,prerequisite:result.record_key,
      prerequisite_hash:hash(result),scope:proof.scope,before,after,mutation:mutation.id};
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_condition_clear',source_id:'native:unified-gm',
      title:'Native condition ended by its owner-authored resolved action',visibility:'character',subject_key:proof.pc.id,
      session_id:proof.scene.session_id,scene:proof.scene.key,details:{input_source:action.source_event,payload_hash:hash(data)}},'native:unified-gm');
    const receipt=db.saveCityRecord(guild,{kind:'pc_native_condition_clear',key,status:'resolved',source_event:source.event_key,
      visibility:'character',subject_key:proof.pc.id,data});
    const cleared=db.saveCityRecord(guild,{...condition,key:condition.record_key,status:'cleared'});
    inspectNativeConditionClearAncestry(db,guild,cleared);return receipt;
  });
}
