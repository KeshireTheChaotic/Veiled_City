/** Printed nightclub acoustics: native recovery and odds ancestry, never PC narration or invented resources. */
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {ordinaryActionProof,ordinaryPrerequisite} from './ordinary-effect-proof.js';
import {historicalActionSource} from './action-consent.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {indexWorldEvent} from './city-calendar.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {captureCountdownActionAncestry,inspectCountdownActionAncestry} from './native-environment-countdown.js';
const FEATURE='environment:haunted-nightclub:too-loud-to-think',MEMORY_FEATURE='environment:storm-drain-shrine:local-memory',issuer='native:environment-noise';
const featureRules=Object.freeze({[FEATURE]:{handler:'nightclub_auditory_disadvantage',kind:'disadvantage'},
  [MEMORY_FEATURE]:{handler:'shrine_local_memory_advantage',kind:'advantage'}});
const keyFor=d=>`environment-noise-clear:${hash([d.session,d.scene,d.location,d.template_hash,d.scope])}`;
const actionHash=a=>hash({key:a.record_key,source:a.source_event,actor:a.data.actor,owner:a.data.owner_user_id,
  principal:a.data.actor_principal_revision,scene:a.data.scene,session:a.data.session_id,source_hash:a.data.source_hash,
  start:a.data.start,end:a.data.end,type:a.data.type,framing:a.data.framing,operation:a.data.operation,target:a.data.target_key});
function featureFor(profile,key=FEATURE){
  const expected=featureRules[key],disposition=featureDisposition(key),f=disposition.feature;
  if(!expected||disposition.status!=='supported'||f.native_handler!==expected.handler||f.template_hash!==profile.data.template_hash
    ||environmentProposalContract(f)?.handler!==expected.handler)
    throw fail('environment_noise_feature_not_qualified');
  return f;
}
/** Pure exact binding for source/context tests and the stateful native proof below. */
export function validateEnvironmentOddsProposal({feature,profile,entry,action,proposal,kind}){
  const expected=featureRules[feature?.feature_key];
  if(!expected||expected.kind!==kind||feature.status!=='supported'||feature.native_handler!==expected.handler
    ||feature.trigger_kind!=='passive'||feature.target_policy!=='none'
    ||feature.roll_protocol!==(kind==='advantage'?'native_pc_action_advantage':'native_pc_action_disadvantage')
    ||!Array.isArray(feature.costs)||feature.costs.length!==0||profile?.data?.template_hash!==feature.template_hash
    ||entry?.actor?.type!=='character'||entry?.intent_ref!==action?.record_key||entry?.actor?.key!==action?.data?.actor
    ||action?.data?.session_id!==profile?.data?.session||action?.data?.scene!==profile?.data?.scene
    ||proposal?.feature_ref!==feature.feature_key||proposal?.disposition!=='request_pc_action_roll'||proposal?.stakes_kind!=='attempt_only'
    ||proposal?.advantage!==(kind==='advantage')||proposal?.disadvantage!==(kind==='disadvantage')
    ||proposal?.experience_ref||!proposal?.reason?.trim()||!proposal?.rule_basis_refs?.includes('srd:action-rolls'))
    throw fail('environment_noise_exact_contextual_action_required');
  return {version:1,feature:feature.feature_key,feature_hash:hash(feature),environment:profile.record_key,environment_hash:hash(profile),
    action:action.record_key,applicability_ruling:proposal.reason,kind,amount:1};
}
/** Current owner/ruling/outcome must precede the material change. No accepted-only or high-roll shortcut. */
export function clearNativeEnvironmentNoise(db,guild,input,scope){
  if(!input||Object.keys(input).sort().join()!=='accepted_intent,environment,prerequisite'
    ||Object.values(input).some(v=>typeof v!=='string'||!v||v.length>200))throw fail('environment_noise_closed_owner_action');
  return db.transaction(()=>{
    const profile=inspectNativeEnvironmentInstance(db,guild,input.environment,scope),feature=featureFor(profile),
      proof=ordinaryActionProof(db,guild,input.accepted_intent,scope),action=proof.row,
      result=ordinaryPrerequisite(db,guild,{prerequisite_ref:input.prerequisite},proof).receipt;
    if(action.data.type!=='interact'||action.data.operation!=='quiet_environment'||action.data.target_key!==profile.record_key
      ||profile.data.location!==proof.pc.data.location||profile.data.scene!==proof.scene.key
      ||!['success','resolved_no_roll'].includes(result.data.outcome))throw fail('environment_noise_exact_successful_owner_action');
    const key=keyFor(profile.data),prior=db.getCityRecord(guild,'native_environment_noise_clear',key);
    if(prior){
      const actual=inspectNativeEnvironmentNoiseClear(db,guild,key,scope);
      if(actual.data.action!==action.record_key||actual.data.prerequisite!==result.record_key)
        throw fail('environment_noise_already_changed_no_replacement_action');
      return actual;
    }
    const data={version:2,issuer,feature:FEATURE,feature_hash:hash(feature),environment:profile.record_key,
      environment_hash:hash(profile),template_hash:profile.data.template_hash,scope:structuredClone(scope),
      session:proof.scene.session_id,scene:proof.scene.key,location:proof.pc.data.location,
      action:action.record_key,action_hash:actionHash(action),source:action.source_event,source_hash:hash(proof.source),
      world:proof.world?.event_key||null,world_hash:hash(proof.world||null),prerequisite:result.record_key,prerequisite_hash:hash(result),
      owner:proof.principal.user,character:proof.pc.id,principal:proof.principal.revision,state:'quiet',
      ancestry:captureCountdownActionAncestry(db,guild,action.record_key,scope),
      authority:'Only the source-defined acoustic disadvantage ends. No HP, Stress, Hope, Armor, dice, item or other condition changes.'};
    const mutation=db.recordMutation(guild,{sessionId:data.session,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_environment',
      mutationType:'quiet_environment_after_owner_outcome',entityKey:key,visibility:'gm',after:data});
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_environment_noise_clear',source_kind:'mutation',source_id:mutation.id,
      title:'Native acoustic condition changed after owner action',session_id:data.session,scene:data.scene,location_key:data.location,
      visibility:'gm',details:{input_source:data.source,payload_hash:hash(data)}},issuer);
    const row=db.saveCityRecord(guild,{kind:'native_environment_noise_clear',key,status:'resolved',source_event:source.event_key,
      visibility:'gm',location_key:data.location,data});
    inspectNativeEnvironmentNoiseClear(db,guild,key,scope);return row;
  });
}

/** Read-only proof. Use the original native causal location, not a new permission to act there. */
export function inspectNativeEnvironmentNoiseClear(db,guild,key,scope){
  const row=db.getCityRecord(guild,'native_environment_noise_clear',key),d=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    mutation=event&&db.getMutation(guild,event.source_id),source=d&&db.getWorldEvent(guild,d.source),world=d?.world&&db.getWorldEvent(guild,d.world);
  if(row?.status!=='resolved'||row.visibility!=='gm'||![1,2].includes(d?.version)||d.issuer!==issuer||key!==keyFor(d)||hash(d.scope)!==hash(scope)
    ||event?.status!=='active'||event.kind!=='native_environment_noise_clear'||event.source_kind!=='mutation'||event.visibility!=='gm'
    ||event.details.payload_hash!==hash(d)||event.details.input_source!==d.source||event.session_id!==d.session||event.scene!==d.scene
    ||event.location_key!==d.location||mutation?.actor_type!=='ai_gm'||mutation.actor_id!==issuer||mutation.source_layer!=='native_environment'
    ||mutation.mutation_type!=='quiet_environment_after_owner_outcome'||mutation.entity_key!==key||mutation.visibility!=='gm'
    ||hash(JSON.parse(mutation.after_json))!==hash(d)||source?.status!=='active'||hash(source)!==d.source_hash
    ||d.world&&(world?.status!=='active'||hash(world)!==d.world_hash)||d.state!=='quiet'||d.feature!==FEATURE)
    throw fail('environment_noise_clear_native_ancestry');
  const profile=inspectNativeEnvironmentInstance(db,guild,d.environment,scope,{historical:true}),feature=featureFor(profile),
    saved=d.version===2?inspectCountdownActionAncestry(db,guild,d.ancestry):null,
    action=saved?{row:saved.action,principal:{user:saved.owner,revision:saved.principal}}
      :historicalActionSource(db,guild,d.action,{resolved:true}),pc=db.getCharacter(d.character),
    // This private snapshot is ONLY for checking the already-committed mundane prerequisite.
    // It is never returned as a current owner/action proof or supplied to a new executor.
    originalProof={...action,pc:{...pc,data:{...pc.data,location:d.location}}},
    result=saved?saved.receipt:ordinaryPrerequisite(db,guild,{prerequisite_ref:d.prerequisite},originalProof).receipt;
  if(hash(profile)!==d.environment_hash||hash(feature)!==d.feature_hash||actionHash(action.row)!==d.action_hash
    ||action.row.data.actor!==d.character||action.principal.user!==d.owner||action.principal.revision!==d.principal
    ||action.row.source_event!==d.source||hash(result)!==d.prerequisite_hash||!['success','resolved_no_roll'].includes(result.data.outcome)
    ||profile.data.location!==d.location||profile.data.template_hash!==d.template_hash)
    throw fail('environment_noise_clear_original_outcome_changed');
  return row;
}

export function nativeEnvironmentNoiseState(db,guild,environment,scope){
  const profile=inspectNativeEnvironmentInstance(db,guild,environment,scope);featureFor(profile);
  const key=keyFor(profile.data),row=db.getCityRecord(guild,'native_environment_noise_clear',key);
  return row?{quiet:true,receipt:inspectNativeEnvironmentNoiseClear(db,guild,key,scope).record_key}:{quiet:false,receipt:null};
}

/** Native GM applicability ruling, not lexical classification or a claimed player outcome.
 * The GM may judge the exact declared investigation delicate/auditory/verbal; this judgment is
 * source-attributed, not a proof of universally correct natural-language interpretation.
 */
export function prepareEnvironmentNoiseOdds(db,guild,origin,entry,proposal){
  return prepareEnvironmentOdds(db,guild,origin,entry,proposal,FEATURE);
}
/** Exact player-declared offering/question and GM applicability ruling; one ordinary roll only. */
export function prepareEnvironmentMemoryOdds(db,guild,origin,entry,proposal){
  return prepareEnvironmentOdds(db,guild,origin,entry,proposal,MEMORY_FEATURE);
}
function prepareEnvironmentOdds(db,guild,origin,entry,proposal,featureKey){
  const expected=featureRules[featureKey];
  const o=inspectArbitrationOrigin(db,guild,origin),action=db.getCityRecord(guild,'typed_intent',entry.intent_ref),
    profileRef=nativeEnvironmentInstanceForScope(db,guild,o.scope,o.binding.location)?.instance;
  if(!expected||!profileRef)throw fail('environment_noise_exact_contextual_action_required');
  const profile=inspectNativeEnvironmentInstance(db,guild,profileRef,o.scope),feature=featureFor(profile,featureKey);
  const proof=validateEnvironmentOddsProposal({feature,profile,entry,action,proposal,kind:expected.kind});
  if(featureKey===FEATURE&&nativeEnvironmentNoiseState(db,guild,profileRef,o.scope).quiet)throw fail('environment_noise_has_already_changed');
  return {...proof,scope:structuredClone(o.scope),scene:o.binding.scene,session:o.binding.session};
}

/** A later legitimate quieting cannot change odds already recorded on a committed native roll. */
export function inspectEnvironmentNoiseOdds(db,guild,proof,action,{historical=false}={}){
  const expected=featureRules[proof?.feature];
  if(proof?.version!==1||!expected||proof.action!==action.record_key||proof.kind!==expected.kind||proof.amount!==1
    ||proof.scene!==action.data.scene||proof.session!==action.data.session_id||typeof proof.applicability_ruling!=='string'||!proof.applicability_ruling.trim())
    throw fail('environment_noise_odds_exact_native_action');
  const profile=inspectNativeEnvironmentInstance(db,guild,proof.environment,proof.scope,{historical}),feature=featureFor(profile,proof.feature);
  if(hash(profile)!==proof.environment_hash||hash(feature)!==proof.feature_hash
    ||proof.feature===FEATURE&&!historical&&nativeEnvironmentNoiseState(db,guild,profile.record_key,proof.scope).quiet)
    throw fail('environment_noise_odds_source_or_condition_changed');
  return proof;
}
