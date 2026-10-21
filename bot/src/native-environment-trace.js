/** Everything Logs / HR14: exact failed-action trace, owner-only optional payment, no inferred spending. */
import {inspectArbitrationOrigin,createArbitrationOrigin} from './scene-intent-board.js';
import {buildNarrativeContext} from './narrative-authority-context.js';
import {inspectNativeEnvironmentInstance,nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeHouseErratum} from './native-house-errata.js';
import {historicalActionSource,consentAction} from './action-consent.js';
import {ordinaryActionProof,ordinaryPrerequisite} from './ordinary-effect-proof.js';
import {typedRollProof} from './typed-roll-proof.js';
import {conversationPrincipal} from './conversation-principal.js';
import {assertPcCanAct,hopeCap} from './pc-native-eligibility.js';
import {indexWorldEvent} from './city-calendar.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {reserveGmArbitrationNotice} from './native-publications.js';
import {captureCountdownActionAncestry,inspectCountdownActionAncestry} from './native-environment-countdown.js';
const FEATURE='environment:aster-vale-predictive-lab:everything-logs',issuer='native:environment-trace';
const actionHash=row=>hash({ref:row.record_key,source:row.source_event,owner:row.data.owner_user_id,actor:row.data.actor,
  principal:row.data.actor_principal_revision,session:row.data.session_id,scene:row.data.scene,source_hash:row.data.source_hash,
  start:row.data.start,end:row.data.end,type:row.data.type,operation:row.data.operation,target:row.data.target_key,framing:row.data.framing});
const rollHash=row=>hash({ref:row.record_key,source:row.source_event,owner:row.data.owner_user_id,character:row.subject_key,
  kind:row.data.kind,session:row.data.session_id,scene:row.data.scene,action:row.data.input.accepted_intent,
  breakdown:row.data.breakdown,roll:row.data.roll_id,result:row.data.result,outcome_review:row.data.outcome_review||null});
function rules(){
  const feature=featureDisposition(FEATURE),rule=nativeHouseErratum('HR14');
  if(feature.status!=='supported'||feature.feature.native_handler!=='intrusion_trace_owner_payment'
    ||rule?.authority_ref!=='owner:everything-logs-hope:v1'||rule.interpretation.hope_cost!==1
    ||rule.interpretation.payment_owner!=='affected_authenticated_pc_owner')throw fail('environment_trace_exact_qualified_rule');
  return {feature:feature.feature,rule};
}
function failedAction(db,guild,ref){
  const action=historicalActionSource(db,guild,ref,{resolved:true}),receipt=db.getCityRecord(guild,'action_outcome_receipt',action.row.data.outcome_receipt),
    request=receipt&&db.getCityRecord(guild,'roll_request',receipt.data.request),proof=request&&typedRollProof(db,guild,request);
  if(receipt?.status!=='resolved'||receipt.data.action_id!==ref||receipt.source_event!==action.row.source_event||request?.data.kind!=='action'
    ||proof?.accepted.record_key!==ref||proof.outcome!=='failure'||receipt.data.outcome!=='failure'
    ||receipt.data.native_roll_refs.length!==1||receipt.data.native_roll_refs[0]!==request.data.roll_id)throw fail('environment_trace_actual_failed_action');
  return {...action,receipt,request,proof};
}
/** Capture the contextual intrusion ruling BEFORE dice, not a post-hoc reclassification of a settled roll. */
export function registerEnvironmentTraceRisk(db,guild,origin,board,entry,proposal){
  const o=inspectArbitrationOrigin(db,guild,origin),{feature,rule}=rules(),action=consentAction(db,guild,entry.intent_ref),
    profileRef=nativeEnvironmentInstanceForScope(db,guild,o.scope,o.binding.location)?.instance,
    profile=profileRef&&inspectNativeEnvironmentInstance(db,guild,profileRef,o.scope);
  if(entry.actor.type!=='character'||entry.actor.key!==o.scope.actorCharacterId||action.principal.user!==o.scope.actorUserId
    ||proposal.feature_ref!==FEATURE||proposal.disposition!=='request_pc_action_roll'||proposal.stakes_kind!=='attempt_only'
    ||proposal.advantage||proposal.disadvantage||proposal.experience_ref||!proposal.reason?.trim()
    ||profile?.data.template_hash!==feature.template_hash||hash(board.data.origin)!==hash(o.binding)
    ||hash(db.getCityRecord(guild,board.kind,board.record_key)?.data)!==hash(board.data))throw fail('environment_trace_before_roll_ruling');
  const data={version:1,issuer,feature:FEATURE,feature_hash:hash(feature),rule_hash:hash(rule),action:entry.intent_ref,source:action.row.source_event,
    environment:profileRef,environment_hash:hash(profile),origin:o.binding,scope:o.scope,entry:structuredClone(entry),
    decision:`gm-decision:${hash([board.record_key,entry.intent_ref])}`,proposal:{...proposal,disposition:'native_feature_resolution',
      stakes_kind:'native_feature',trait:null,difficulty:null}},key=`environment-trace-risk:${hash(entry.intent_ref)}`;
  const prior=db.getCityRecord(guild,'native_environment_trace_risk',key);
  if(prior){if(hash(prior.data)!==hash(data))throw fail('environment_trace_risk_already_registered');return prior;}
  const mutation=db.recordMutation(guild,{sessionId:o.binding.session,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_environment',
    mutationType:'register_intrusion_trace_risk',entityKey:key,visibility:'gm',after:data});
  const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_environment_trace_risk',title:'Native pre-dice intrusion trace ruling',
    source_kind:'mutation',source_id:mutation.id,session_id:o.binding.session,scene:o.binding.scene,visibility:'gm',
    details:{input_source:action.row.source_event,payload_hash:hash(data)}},issuer);
  return db.saveCityRecord(guild,{kind:'native_environment_trace_risk',key,status:'active',visibility:'gm',source_event:source.event_key,data});
}
function inspectRisk(db,guild,key){
  const row=db.getCityRecord(guild,'native_environment_trace_risk',key),d=row?.data,source=row&&db.getWorldEvent(guild,row.source_event),
    mutation=source&&db.getMutation(guild,source.source_id);
  if(row?.status!=='active'||d?.issuer!==issuer||d.feature!==FEATURE||source?.status!=='active'||source.kind!=='native_environment_trace_risk'
    ||source.source_kind!=='mutation'||source.details.payload_hash!==hash(d)||mutation?.actor_id!==issuer||mutation.actor_type!=='ai_gm'
    ||mutation.mutation_type!=='register_intrusion_trace_risk'||mutation.entity_key!==key||hash(JSON.parse(mutation.after_json))!==hash(d))
    throw fail('environment_trace_risk_native_ancestry');
  return row;
}
/** Native roll-finalization hook. A stale optional feature cannot roll back another legitimate outcome. */
export function captureEnvironmentTrace(db,guild,actionRef){
  const key=`environment-trace-risk:${hash(actionRef)}`;
  if(!db.getCityRecord(guild,'native_environment_trace_risk',key))return null;
  const action=db.getCityRecord(guild,'typed_intent',actionRef),receipt=action&&db.getCityRecord(guild,'action_outcome_receipt',action.data.outcome_receipt);
  if(receipt?.status!=='resolved'||receipt.data.outcome!=='failure')return null;
  try{
    const risk=inspectRisk(db,guild,key),d=risk.data,origin=createArbitrationOrigin(db,guild,d.scope,d.origin.source),
      offer=prepareEnvironmentTrace(db,guild,origin,d.entry,d.proposal);
    reserveGmArbitrationNotice(db,guild,d.decision);return offer;
  }catch(error){
    if(!error.expected&&!['SCENE_ACTION_WINDOW','SCENE_FICTION','GM_ARBITRATION'].includes(error.code))throw error;
    return db.saveCityRecord(guild,{kind:'native_environment_trace_review',key:`${key}:review`,status:'needs_review',visibility:'gm',
      source_event:receipt.source_event,data:{action:actionRef,risk:key,reason:error.message,native_outcome_preserved:true}});
  }
}
export function traceOfferForRisk(db,guild,riskKey){
  const risk=inspectRisk(db,guild,riskKey),key=`environment-trace:${hash([risk.data.environment,risk.data.action])}`;
  return db.getCityRecord(guild,'native_environment_trace_offer',key)?inspectEnvironmentTrace(db,guild,key):null;
}
export function traceDecisionForOffer(db,guild,offerRef){
  const offer=inspectEnvironmentTrace(db,guild,offerRef),risk=inspectRisk(db,guild,`environment-trace-risk:${hash(offer.data.action)}`),
    decision=db.getCityRecord(guild,'gm_arbitration_decision',risk.data.decision);
  if(decision?.data.native?.environment_trace_risk!==risk.record_key||offer.data.environment!==risk.data.environment)
    throw fail('environment_trace_original_decision_required');
  return decision;
}
/** GM classification is a contextual ruling, not a claim of perfect semantic detection. */
export function prepareEnvironmentTrace(db,guild,origin,entry,proposal){
  const o=inspectArbitrationOrigin(db,guild,origin),{feature,rule}=rules(),action=failedAction(db,guild,entry.intent_ref),
    risk=inspectRisk(db,guild,`environment-trace-risk:${hash(entry.intent_ref)}`),
    profileRef=nativeEnvironmentInstanceForScope(db,guild,o.scope,o.binding.location)?.instance,
    profile=profileRef&&inspectNativeEnvironmentInstance(db,guild,profileRef,o.scope);
  if(entry.actor.type!=='character'||entry.actor.key!==action.row.data.actor||proposal.feature_ref!==FEATURE
    ||proposal.disposition!=='native_feature_resolution'||proposal.stakes_kind!=='native_feature'||proposal.trait!==null||proposal.difficulty!==null
    ||proposal.advantage||proposal.disadvantage||proposal.experience_ref||!proposal.reason?.trim()
    ||profile?.data.template_hash!==feature.template_hash||action.row.data.scene!==o.binding.scene
    ||o.scope.actorUserId!==action.row.data.owner_user_id||o.scope.actorCharacterId!==action.row.data.actor
    ||hash(risk.data.origin)!==hash(o.binding)||hash(risk.data.entry)!==hash(entry)||hash(risk.data.proposal)!==hash(proposal)
    ||risk.data.environment!==profileRef||risk.data.environment_hash!==hash(profile)
    ||risk.data.feature_hash!==hash(feature)||risk.data.rule_hash!==hash(rule))
    throw fail('environment_trace_current_owner_profile_ruling');
  const data={version:2,issuer,feature:FEATURE,feature_hash:hash(feature),rule_hash:hash(rule),environment:profileRef,environment_hash:hash(profile),
    scope:structuredClone(o.scope),origin:o.binding,action:entry.intent_ref,action_hash:actionHash(action.row),
    prerequisite:action.receipt.record_key,prerequisite_hash:hash(action.receipt.data),request:action.request.record_key,request_hash:rollHash(action.request),
    character:action.row.data.actor,owner:action.row.data.owner_user_id,principal:action.principal.revision,
    classification:proposal.reason,hope_cost:1,choices:['pay_hope','leave_trace','native_suppression'],
    ancestry:captureCountdownActionAncestry(db,guild,entry.intent_ref,o.scope)},
    key=`environment-trace:${hash([profileRef,entry.intent_ref])}`;
  const prior=db.getCityRecord(guild,'native_environment_trace_offer',key);
  if(prior){if(hash(prior.data)!==hash(data))throw fail('environment_trace_immutable_terms');return prior;}
  return db.transaction(()=>{
    const mutation=db.recordMutation(guild,{sessionId:o.binding.session,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_environment',
      mutationType:'offer_failed_intrusion_trace',entityKey:key,visibility:'gm',after:data});
    const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_environment_trace_offer',title:'Native optional intrusion trace response',
      source_kind:'mutation',source_id:mutation.id,session_id:o.binding.session,scene:o.binding.scene,location_key:o.binding.location,
      visibility:'gm',details:{input_source:action.row.source_event,payload_hash:hash(data)}},issuer);
    const offer=db.saveCityRecord(guild,{kind:'native_environment_trace_offer',key,status:'pending_owner_choice',visibility:'gm',source_event:event.event_key,data});
    db.saveCityRecord(guild,{kind:'native_environment_intrusion_trace',key:`${key}:trace`,status:'recorded',visibility:'gm',
      source_event:event.event_key,location_key:o.binding.location,data:{version:1,offer:key,result:null,environment:profileRef,
        failed_action:entry.intent_ref,outcome:action.receipt.record_key,character:data.character,trace:'recorded',
        knowledge_authorized:false,publication_authorized:false}});
    return offer;
  });
}
export function inspectEnvironmentTrace(db,guild,key,{historical=false}={}){
  const row=db.getCityRecord(guild,'native_environment_trace_offer',key),d=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    mutation=event&&db.getMutation(guild,event.source_id),{feature,rule}=rules();
  if(!['pending_owner_choice','resolved'].includes(row?.status)||row.visibility!=='gm'||d?.issuer!==issuer||![1,2].includes(d.version)||d.feature!==FEATURE
    ||hash(feature)!==d.feature_hash||hash(rule)!==d.rule_hash||d.hope_cost!==1||key!==`environment-trace:${hash([d.environment,d.action])}`
    ||event?.status!=='active'||event.kind!=='native_environment_trace_offer'||event.source_kind!=='mutation'||event.visibility!=='gm'
    ||event.details.payload_hash!==hash(d)||mutation?.actor_id!==issuer||mutation.actor_type!=='ai_gm'
    ||mutation.mutation_type!=='offer_failed_intrusion_trace'||mutation.source_layer!=='native_environment'||mutation.entity_key!==key
    ||hash(JSON.parse(mutation.after_json))!==hash(d))throw fail('environment_trace_native_ancestry');
  const saved=d.version===2?inspectCountdownActionAncestry(db,guild,d.ancestry):null,
    action=saved?{row:saved.action,receipt:saved.receipt,request:saved.request,principal:{user:saved.owner,revision:saved.principal}}
      :failedAction(db,guild,d.action),profile=inspectNativeEnvironmentInstance(db,guild,d.environment,d.scope,{historical});
  if(actionHash(action.row)!==d.action_hash||hash(action.receipt.data)!==d.prerequisite_hash||rollHash(action.request)!==d.request_hash
    ||hash(profile)!==d.environment_hash||action.principal.user!==d.owner||action.principal.revision!==d.principal
    ||db.getCharacter(d.character)?.owner_user_id!==d.owner)throw fail('environment_trace_saved_sources_changed');
  const trace=db.getCityRecord(guild,'native_environment_intrusion_trace',`${key}:trace`);
  if(!trace||trace.visibility!=='gm'||trace.data.offer!==key||trace.data.environment!==d.environment
    ||trace.data.failed_action!==d.action||trace.data.outcome!==d.prerequisite||trace.data.character!==d.character
    ||trace.data.knowledge_authorized!==false||trace.data.publication_authorized!==false
    ||trace.data.result===null&&(row.status!=='pending_owner_choice'||trace.status!=='recorded'||trace.source_event!==row.source_event)
    ||trace.data.result!==null&&(row.status!=='resolved'||trace.data.result!==`${key}:result`
      ||db.getCityRecord(guild,'native_environment_trace_result',trace.data.result)?.status!=='resolved'))throw fail('environment_trace_record_ancestry_changed');
  if(!historical&&hash(buildNarrativeContext(db,guild,d.scope,d.origin.source).binding)!==hash(d.origin))throw fail('environment_trace_current_context_changed');
  return row;
}
/** Called only by the authenticated native owner-command adapter; GM/model booleans have no role. */
export function chooseEnvironmentTrace(db,guild,user,input,{interactionId,authoredText}={}){
  if(!input||Object.keys(input).sort().join()!=='accepted_intent,choice,op,prerequisite,request,revision'||input.op!=='environment-trace-choice'
    ||!interactionId||typeof authoredText!=='string'||hash(JSON.parse(authoredText))!==hash(input)
    ||!['pay_hope','leave_trace','native_suppression'].includes(input.choice))throw fail('environment_trace_exact_owner_choice');
  return db.transaction(()=>{
    const offer=inspectEnvironmentTrace(db,guild,input.request),d=offer.data,principal=conversationPrincipal(db,guild,user,d.character),
      pc=db.getCharacter(d.character),key=`${offer.record_key}:result`;
    if(user!==d.owner||principal.kind!=='owner'||principal.revision!==d.principal||input.revision!==hash(d))throw fail('environment_trace_current_owner_terms');
    const prior=db.getCityRecord(guild,'native_environment_trace_result',key);
    if(prior){if(prior.data.choice!==input.choice)throw fail('environment_trace_choice_already_committed');return inspectEnvironmentTraceResult(db,guild,key,user);}
    assertPcCanAct(pc,db,guild);
    let suppression=null;
    if(input.choice==='native_suppression'){
      const proof=ordinaryActionProof(db,guild,input.accepted_intent,d.scope),result=ordinaryPrerequisite(db,guild,{prerequisite_ref:input.prerequisite},proof);
      if(proof.pc.id!==d.character||proof.row.data.operation!=='suppress_trace'||proof.row.data.target_key!==offer.record_key
        ||!['success','resolved_no_roll'].includes(result.receipt.data.outcome))throw fail('environment_trace_actual_suppression_required');
      suppression={action:proof.row.record_key,action_hash:actionHash(proof.row),receipt:result.receipt.record_key,receipt_hash:hash(result.receipt.data),
        ancestry:captureCountdownActionAncestry(db,guild,proof.row.record_key,d.scope)};
    }else if(input.accepted_intent!==''||input.prerequisite!=='')throw fail('environment_trace_no_borrowed_outcome');
    const before=structuredClone(pc.data.resources),amount=input.choice==='pay_hope'?1:0;
    if(!Number.isSafeInteger(before.hope)||before.hope<amount||before.hope>hopeCap(pc.data))throw fail('environment_trace_available_owner_hope');
    if(amount)db.updateCharacterData(pc.id,data=>{data.resources.hope-=amount;});
    const after=structuredClone(db.getCharacter(pc.id).data.resources),data={version:1,offer:offer.record_key,offer_hash:hash(d),owner:user,character:pc.id,
      choice:input.choice,hope_spent:amount,before,after,suppression,trace:input.choice==='leave_trace'?'recorded':'suppressed',interaction:interactionId};
    const mutation=db.recordMutation(guild,{sessionId:d.origin.session,actorType:'player',actorId:user,sourceLayer:'native_environment',
      sourceInteractionId:interactionId,mutationType:'resolve_intrusion_trace_choice',entityKey:key,visibility:'character',before,after:data,payload:{input}});
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_environment_trace_result',source_id:`player:${user}`,
      title:'Owner-authorized native trace response',session_id:d.origin.session,scene:d.origin.scene,visibility:'character',subject_key:pc.id,
      details:{author:user,character:pc.id,offer:offer.record_key,authored_text:authoredText,payload_hash:hash(data),mutation:mutation.id}},user);
    const result=db.saveCityRecord(guild,{kind:'native_environment_trace_result',key,status:'resolved',visibility:'character',subject_key:pc.id,source_event:source.event_key,data});
    // The actual log entry is GM-private. Its existence grants no NPC/faction knowledge,
    // PC identity disclosure, device control or public evidentiary custody.
    db.saveCityRecord(guild,{kind:'native_environment_intrusion_trace',key:`${offer.record_key}:trace`,status:data.trace,
      visibility:'gm',source_event:source.event_key,location_key:d.origin.location,
      data:{version:1,offer:offer.record_key,result:result.record_key,environment:d.environment,failed_action:d.action,
        outcome:d.prerequisite,character:d.character,trace:data.trace,knowledge_authorized:false,publication_authorized:false}});
    // Keep immutable terms/source while removing a completed optional response from
    // pending-owner inventories. The native result remains the authority for costs.
    db.saveCityRecord(guild,{kind:'native_environment_trace_offer',key:offer.record_key,status:'resolved',
      visibility:'gm',source_event:offer.source_event,data:d});
    return result;
  });
}
/** Saved receipt inspection never spends Hope or creates a trace again. */
export function inspectEnvironmentTraceResult(db,guild,key,user){
  const row=db.getCityRecord(guild,'native_environment_trace_result',key),d=row?.data,
    offer=d&&inspectEnvironmentTrace(db,guild,d.offer,{historical:true}),source=row&&db.getWorldEvent(guild,row.source_event),
    mutation=source&&db.getMutation(guild,source.details.mutation),expected=d&&structuredClone(d.before),
    authored=source&&JSON.parse(source.details.authored_text||'null');
  if(!d||!expected||!['pay_hope','leave_trace','native_suppression'].includes(d.choice))throw fail('environment_trace_result_required');
  expected.hope-=d.choice==='pay_hope'?1:0;
  if(row.status!=='resolved'||row.visibility!=='character'||row.subject_key!==d.character||d.owner!==user
    ||db.getCharacter(d.character)?.owner_user_id!==user||key!==`${d.offer}:result`||d.offer_hash!==hash(offer.data)
    ||d.character!==offer.data.character||d.hope_spent!==(d.choice==='pay_hope'?1:0)||hash(expected)!==hash(d.after)
    ||d.trace!==(d.choice==='leave_trace'?'recorded':'suppressed')||source?.status!=='active'||source.visibility!=='character'
    ||source.subject_key!==d.character||source.kind!=='native_environment_trace_result'||source.source_id!==`player:${user}`
    ||source.details.payload_hash!==hash(d)||source.details.author!==user||!db.ownerAuthoredSource(guild,source.event_key,user)
    ||authored?.op!=='environment-trace-choice'||authored.request!==d.offer||authored.revision!==d.offer_hash||authored.choice!==d.choice
    ||mutation?.actor_type!=='player'||mutation.actor_id!==user||mutation.source_layer!=='native_environment'
    ||mutation.mutation_type!=='resolve_intrusion_trace_choice'||mutation.source_interaction_id!==d.interaction||mutation.entity_key!==key
    ||hash(JSON.parse(mutation.before_json))!==hash(d.before)||hash(JSON.parse(mutation.after_json))!==hash(d))
    throw fail('environment_trace_result_ancestry_changed');
  if(d.choice==='native_suppression'){
    const saved=d.suppression?.ancestry?inspectCountdownActionAncestry(db,guild,d.suppression.ancestry):null,
      proof=saved?{row:saved.action,principal:{user:saved.owner,revision:saved.principal}}:historicalActionSource(db,guild,d.suppression?.action,{resolved:true}),pc=db.getCharacter(d.character),
      savedProof={...proof,pc:{...pc,data:{...pc.data,location:offer.data.origin.location}}},
      result=saved?saved.receipt:ordinaryPrerequisite(db,guild,{prerequisite_ref:d.suppression.receipt},savedProof).receipt;
    if(actionHash(proof.row)!==d.suppression.action_hash||hash(result.data)!==d.suppression.receipt_hash||proof.row.data.actor!==d.character
      ||proof.row.data.operation!=='suppress_trace'||proof.row.data.target_key!==d.offer||!['success','resolved_no_roll'].includes(result.data.outcome))
      throw fail('environment_trace_suppression_ancestry_changed');
  }else if(d.suppression!==null||authored.accepted_intent!==''||authored.prerequisite!=='')throw fail('environment_trace_unexpected_suppression');
  const trace=db.getCityRecord(guild,'native_environment_intrusion_trace',`${d.offer}:trace`);
  if(trace?.status!==d.trace||trace.visibility!=='gm'||trace.source_event!==source.event_key||trace.data.result!==key
    ||trace.data.environment!==offer.data.environment||trace.data.failed_action!==offer.data.action
    ||trace.data.knowledge_authorized!==false||trace.data.publication_authorized!==false)throw fail('environment_trace_native_record_changed');
  return row;
}
