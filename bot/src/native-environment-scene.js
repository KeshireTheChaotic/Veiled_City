/** Source-defined GM-owned scene changes. These never authorize a PC consequence. */
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeGmOpportunity} from './gm-action-capability.js';
import {featureCostPlan} from './native-feature-windows.js';
import {reservedCampaignFear} from './fear-reservations.js';
import {recordScenePresence,currentScene,scenePresence} from './scene-continuity.js';
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {indexWorldEvent} from './city-calendar.js';
import {assertEnvironmentAudience} from './native-environment-audience.js';
import {nativeEstablishedFact} from './native-established-fact.js';
import {nativeEnvironmentDoorChainSituation} from './native-environment-door-chain.js';
import {nativeEnvironmentImagingSituation} from './native-environment-imaging.js';
import {nativeEnvironmentProcedureSituation} from './native-environment-procedure.js';
import {nativeEnvironmentThinWallsSituation} from './native-environment-thin-walls.js';
import {nativeEnvironmentChainOfTitleSituation} from './native-environment-chain-of-title.js';
import {nativeEnvironmentNoConsensusSituation} from './native-environment-no-consensus.js';
import {nativeEnvironmentMetaphorPhysicsSituation} from './native-environment-metaphor-physics.js';
import {nativeEnvironmentNoOrdinarySignalSituation} from './native-environment-no-ordinary-signal.js';
import {nativeEnvironmentConsensusEngineSituation} from './native-environment-consensus-engine.js';
import {nativeEnvironmentGuestRightSituation} from './native-environment-guest-right.js';
import {nativeEnvironmentPrivateRoomSituation} from './native-environment-private-room.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
const issuer='native:environment-scene';
const rules=Object.freeze({
  'environment:after-hours-emergency-department:code-blue':{handler:'environment_code_blue',kind:'medical_emergency',fear:0},
  'environment:district-blackout:emergency-cascade':{handler:'environment_emergency_cascade',kind:'service_emergency',fear:0},
  'environment:veil-anchor-chamber:maintenance-memory':{handler:'environment_maintenance_memory',kind:'historical_memory',fear:0},
  'environment:veil-anchor-chamber:automatic-correction':{handler:'environment_mundane_correction',kind:'mundane_detail',fear:1}
});
const emergencies=Object.freeze(['hospital','traffic','fire','elevator','refrigeration','public_safety']);
const keyFor=(origin,environment,feature)=>`environment-scene:${hash([origin.source,origin.scope,environment,feature])}`;
function ruleFor(key){
  const rule=rules[key],d=featureDisposition(key);
  if(!rule||d.status!=='supported'||d.feature.native_handler!==rule.handler)throw fail('environment_scene_feature_not_qualified');
  return {rule,feature:d.feature};
}
function shape(p){
  if(!p||Object.keys(p).sort().join()!=='detail,environment,feature_ref,version'||p.version!==1
    ||typeof p.environment!=='string'||!p.environment||p.environment.length>200
    ||!p.detail||Object.keys(p.detail).sort().join()!=='category,kind,property,service,value'
    ||Object.values(p.detail).some(v=>typeof v!=='string'||v.length>160))throw fail('environment_scene_closed_proposal');
}
function detailProof(db,guild,p,location,rule,scope){
  const d=p.detail;
  if(d.kind!==rule.kind)throw fail('environment_scene_exact_printed_effect');
  if(d.kind==='historical_memory'){
    if(d.category||d.service||d.value)throw fail('environment_memory_closed_source_shape');
    const proof=validateMaintenanceMemoryFact(db,guild,d.property,scope);
    return {kind:d.kind,fact_ref:d.property,fact_hash:proof.fact_hash,source_ref:proof.source_ref,
      source_hash:proof.source_hash,content:proof.content,pc_response:'unselected'};
  }
  if(d.kind==='medical_emergency'){
    if(d.category!=='medical'||d.property||d.value||d.service)throw fail('environment_medical_emergency_scope');
    return {kind:d.kind,staff_attention:'contested',pc_response:'unselected'};
  }
  if(d.kind==='service_emergency'){
    const s=db.getCityRecord(guild,'infrastructure',d.service),source=s&&db.getWorldEvent(guild,s.source_event);
    if(!emergencies.includes(d.category)||d.property||d.value||s?.status!=='active'||source?.status!=='active'
      ||!s.data.locations?.includes(location)||s.data.service!==d.category||!narrativeSourceVisible(db,guild,s.source_event,scope)
      ||!(['party','public'].includes(s.visibility)||scope.mode==='private'&&s.visibility==='character'&&s.subject_key===scope.actorCharacterId))
      throw fail('environment_emergency_actual_local_service_required');
    // This establishes a sourced emergency, not an arbitrary numerical service loss.
    return {kind:d.kind,category:d.category,service:s.record_key,service_hash:hash(s),source:s.source_event,
      source_hash:hash(source),mechanical_service_delta:0,pc_response:'unselected'};
  }
  return validateMundaneEnvironmentDetail(d);
}
/** Open mundane property/value pairs are narrative proposals; this validator grants no mechanics. */
export function validateMundaneEnvironmentDetail(detail){
  if(!detail||Object.keys(detail).sort().join()!=='category,kind,property,service,value'||detail.kind!=='mundane_detail'
    ||detail.category||detail.service||typeof detail.property!=='string'||typeof detail.value!=='string'
    ||detail.property.length>160||detail.value.length>160||!detail.property.trim()||!detail.value.trim()
    ||/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(detail.property+detail.value))throw fail('environment_mundane_detail_shape');
  return {kind:detail.kind,property:detail.property,value:detail.value,pc_response:'unselected'};
}
/** Exact established truth anchor; selection can stage a memory but cannot mint canon. */
export function validateMaintenanceMemoryFact(db,guild,factRef,scope){
  if(typeof factRef!=='string'||!factRef.trim()||factRef.length>160)throw fail('environment_memory_fact_reference');
  const {fact,ruling}=nativeEstablishedFact(db,guild,factRef,scope);
  if(typeof fact.content!=='string'||!fact.content.trim())throw fail('environment_memory_established_content');
  return {fact_ref:factRef,fact_hash:hash(fact),source_ref:ruling.event_key,source_hash:hash(ruling),content:fact.content};
}
/** Sealed GM origin is the execution capability; fields supplied by a model are proposals only. */
export function applyEnvironmentSceneAction(db,guild,origin,board,input){
  shape(input);
  const o=inspectArbitrationOrigin(db,guild,origin),{rule,feature}=ruleFor(input.feature_ref),
    profile=inspectNativeEnvironmentInstance(db,guild,input.environment,o.scope),key=keyFor(o.binding,input.environment,input.feature_ref),
    prior=db.getCityRecord(guild,'native_environment_scene_effect',key);
  if(hash(board.data.origin)!==hash(o.binding)||hash(db.getCityRecord(guild,board.kind,board.record_key)?.data)!==hash(board.data)
    ||profile.data.template_hash!==feature.template_hash||profile.data.location!==o.binding.location)
    throw fail('environment_scene_current_native_board_and_profile');
  if(prior){const row=inspectEnvironmentSceneEffect(db,guild,key,o.scope);
    if(row.data.proposal_hash!==hash(input))throw fail('environment_scene_immutable_replay');return row;}
  const opportunity=nativeGmOpportunity(db,guild,board);
  if(opportunity.pre_roll_fear)throw fail('environment_scene_not_a_pre_roll_purchase');
  const effect=detailProof(db,guild,input,o.binding.location,rule,o.scope);
  return db.transaction(()=>{
    const before=db.getCampaign(guild).fear,available=before-reservedCampaignFear(db,guild),
      cost=featureCostPlan(feature,{timing:'spotlight_action',additionalSpotlight:false,experience:false,fear:available,stress:0,stressMax:0});
    if(cost.fear!==rule.fear||cost.npc_stress!==0)throw fail('environment_scene_exact_printed_cost');
    const visibility=o.scope.mode==='private'?'character':'party',subject=o.scope.mode==='private'?o.scope.actorCharacterId:null,
      terms={version:1,issuer,feature:input.feature_ref,feature_hash:hash(feature),environment:profile.record_key,
        environment_hash:hash(profile),scope:structuredClone(o.scope),origin:o.binding,proposal:structuredClone(input),
        proposal_hash:hash(input),opportunity,effect,cost,fear:{before,after:before-cost.fear,spent:cost.fear},visibility,subject},
      declaration=indexWorldEvent(db,guild,{key:`${key}:declaration`,kind:'native_environment_scene_declaration',source_id:issuer,
        title:'Native source-defined local scene change',session_id:o.binding.session,scene:o.binding.scene,location_key:o.binding.location,
        visibility,subject_key:subject,details:{input_source:o.binding.source,payload_hash:hash(terms)}},issuer);
    if(declaration.status!=='active'||declaration.details.payload_hash!==hash(terms))throw fail('environment_scene_original_declaration_changed');
    let presence=null;
    if(['medical_emergency','service_emergency'].includes(effect.kind))presence=recordScenePresence(db,guild,{entity_type:'hazard',entity_key:`environment-${hash(key)}`,
      location_key:o.binding.location,zone:'scene',state:'actually_present',visibility,subject_key:subject,source_event:declaration.event_key},issuer);
    if(cost.fear)db.changeFear(guild,-cost.fear);
    const data={...terms,declaration:declaration.event_key,declaration_hash:hash(declaration),presence:presence?.record_key||null,
      presence_snapshot:presence||null,authority:'GM-owned scene change only; no PC decision, damage, resources, knowledge, custody or forced relocation.'},
      mutation=db.recordMutation(guild,{sessionId:o.binding.session,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_environment',
        mutationType:'commit_source_defined_scene_effect',entityKey:key,visibility,before:null,after:data}),
      source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_environment_scene_effect',source_kind:'mutation',source_id:mutation.id,
        title:'Committed native environmental consequence',session_id:o.binding.session,scene:o.binding.scene,location_key:o.binding.location,
        visibility,subject_key:subject,details:{input_source:declaration.event_key,payload_hash:hash(data)}},issuer);
    return db.saveCityRecord(guild,{kind:'native_environment_scene_effect',key,status:'resolved',source_event:source.event_key,
      visibility,subject_key:subject,location_key:o.binding.location,data});
  });
}
/** Historical mechanics are read-only. Source revocation holds output rather than refunds/replays. */
export function inspectEnvironmentSceneEffect(db,guild,key,scope,{current=false}={}){
  const row=db.getCityRecord(guild,'native_environment_scene_effect',key),d=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    mutation=event&&db.getMutation(guild,event.source_id);
  if(row?.status!=='resolved'||d?.version!==1||d.issuer!==issuer
    ||key!==keyFor(d.origin,d.environment,d.feature)||row.visibility!==d.visibility||(row.subject_key||null)!==d.subject
    ||d.visibility!==(d.scope.mode==='private'?'character':'party')||d.subject!==(d.scope.mode==='private'?d.scope.actorCharacterId:null)
    ||hash(d.proposal)!==d.proposal_hash||d.proposal.feature_ref!==d.feature||d.proposal.environment!==d.environment
    ||event?.status!=='active'||event.kind!=='native_environment_scene_effect'||event.source_kind!=='mutation'
    ||event.visibility!==d.visibility||(event.subject_key||null)!==d.subject||event.details.input_source!==d.declaration
    ||event.details.payload_hash!==hash(d)||event.session_id!==d.origin.session||event.scene!==d.origin.scene||event.location_key!==d.origin.location
    ||mutation?.actor_type!=='ai_gm'||mutation.actor_id!==issuer||mutation.source_layer!=='native_environment'
    ||mutation.mutation_type!=='commit_source_defined_scene_effect'||mutation.entity_key!==key||hash(JSON.parse(mutation.after_json))!==hash(d))
    throw fail('environment_scene_saved_native_ancestry');
  assertEnvironmentAudience(db,guild,d.scope,scope,d.origin,{current});
  shape(d.proposal);
  // Context construction consumes these receipts. Do not recursively rebuild that
  // context through current-profile audience validation while projecting them.
  const {rule,feature}=ruleFor(d.feature),profile=inspectNativeEnvironmentInstance(db,guild,d.environment,d.scope,{historical:true}),
    declaration=db.getWorldEvent(guild,d.declaration),{declaration:ignored, declaration_hash:ignoredHash,presence:ignoredPresence,
      presence_snapshot:ignoredSnapshot,authority:ignoredAuthority,...terms}=d;
  if(hash(feature)!==d.feature_hash||hash(profile)!==d.environment_hash||profile.data.template_hash!==feature.template_hash
    ||profile.data.location!==d.origin.location||profile.data.scene!==d.origin.scene||profile.data.session!==d.origin.session
    ||declaration?.status!=='active'||hash(declaration)!==d.declaration_hash||declaration.kind!=='native_environment_scene_declaration'
    ||declaration.source_id!==issuer||declaration.details.input_source!==d.origin.source||declaration.details.payload_hash!==hash(terms)
    ||d.cost.fear!==rule.fear||d.cost.npc_stress!==0||d.fear.spent!==rule.fear||!Number.isSafeInteger(d.fear.before)
    ||d.fear.before<rule.fear||d.fear.before>12||d.fear.after!==d.fear.before-rule.fear
    ||!narrativeSourceVisible(db,guild,row.source_event,scope))throw fail('environment_scene_original_source_or_terms_changed');
  if(current){
    const scene=currentScene(db,guild),flags=db.getCityCalendar(guild).flags,location=db.getSimulationEntity(guild,'location',d.origin.location),
      pc=scope.actorCharacterId&&db.getCharacter(scope.actorCharacterId),p=pc&&scenePresence(db,guild,'character',pc.id);
    if(scene.key!==d.origin.scene||scene.session_id!==d.origin.session||!location||location.state.removed===true
      ||flags.gm_discretion!==true||flags.narrative_authority!==true||flags.playable_narration!==true
      ||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual'
      ||d.origin.viewpoint==='character'&&(pc?.data.location!==d.origin.location||p?.data.state!=='actually_present'
        ||p.location_key!==d.origin.location||db.getWorldEvent(guild,p.source_event)?.status!=='active'))
      throw fail('environment_scene_current_owner_scene_or_presence_changed');
  }
  if(['mundane_detail','historical_memory'].includes(d.effect.kind)){
    if(d.presence!==null||d.presence_snapshot!==null||hash(detailProof(db,guild,d.proposal,d.origin.location,rule,d.scope))!==hash(d.effect))
      throw fail('environment_scene_detail_receipt_changed');
    if(d.effect.kind==='mundane_detail'&&current&&db.listCityRecords(guild,{kind:'native_environment_scene_effect',includeGM:true,limit:100}).some(other=>{
      const e=db.getWorldEvent(guild,other.source_event),m=e&&db.getMutation(guild,e.source_id);
      return other.status==='resolved'&&other.record_key!==key&&other.data.origin?.scene===d.origin.scene
        &&other.data.origin?.location===d.origin.location&&hash(other.data.scope)===hash(d.scope)
        &&other.data.effect?.kind==='mundane_detail'&&other.data.effect.property===d.effect.property
        &&e?.status==='active'&&e.kind==='native_environment_scene_effect'&&m?.actor_id===issuer
        &&Number(m.id)>Number(mutation.id)&&hash(JSON.parse(m.after_json))===hash(other.data);
    }))throw fail('environment_scene_detail_superseded');
  }else{
    const p=d.presence_snapshot;
    if(!p||p.record_key!==d.presence||p.source_event!==d.declaration||p.visibility!==d.visibility
      ||p.location_key!==d.origin.location||p.data.entity_type!=='hazard'||p.data.state!=='actually_present'
      ||p.data.entity_key!==`environment-${hash(key)}`||p.data.scene!==d.origin.scene)throw fail('environment_scene_hazard_receipt_changed');
    // A later repaired service does not reverse a saved emergency. Its source must
    // remain valid, but mutable service condition is not historical authority.
    if(d.effect.kind==='service_emergency'&&hash(db.getWorldEvent(guild,d.effect.source))!==d.effect.source_hash)
      throw fail('environment_scene_service_source_changed');
    const actual=current&&scenePresence(db,guild,'hazard',p.data.entity_key);
    if(current&&(actual?.source_event!==d.declaration||actual.data.state!=='actually_present'))
      throw fail('environment_scene_hazard_no_longer_current');
  }
  return row;
}
export function environmentSceneProjection(db,guild,key,scope){
  const row=inspectEnvironmentSceneEffect(db,guild,key,scope,{current:true}),d=row.data,scene=currentScene(db,guild);
  if(d.origin.scene!==scene.key||d.origin.session!==scene.session_id)throw fail('environment_scene_publication_scene_changed');
  let text;
  if(d.effect.kind==='medical_emergency')text='A medical emergency competes for local staff attention. Helping, exploiting the distraction, or leaving it alone remains your choice.';
  else if(d.effect.kind==='service_emergency')text=`A local ${d.effect.category.replaceAll('_',' ')} emergency creates another immediate problem. No character response or mechanical injury is assumed.`;
  else if(d.effect.kind==='historical_memory')text=`A memory of the Anchor's creation gathers around an established truth: ${d.effect.content}`;
  else text=`The chamber changes one mundane environmental detail: ${d.effect.property.replaceAll('_',' ')} is now ${d.effect.value}. Your response remains yours.`;
  return {text,source:db.getWorldEvent(guild,row.source_event),revision:hash([row,d.declaration_hash])};
}
/** Entitled continuing context, not a new effect or NPC knowledge transfer. */
export function nativeEnvironmentSituation(db,guild,scope,location){
  const scene=currentScene(db,guild),result=[];
  for(const row of db.listCityRecords(guild,{kind:'native_environment_scene_effect',includeGM:true,limit:100})){
    const d=row.data;
    if(d.origin?.scene!==scene.key||d.origin.location!==location)continue;
    try{
      const view=environmentSceneProjection(db,guild,row.record_key,scope);
      result.push({receipt_kind:row.kind,receipt_ref:row.record_key,source_ref:view.source.event_key,text:view.text,
        authority:'Current native local scene state, not a PC reaction, a successful action, injury or automatic modifier.'});
    }catch(error){if(!['GM_ARBITRATION','SCENE_FICTION','STATE_CONFLICT'].includes(error.code))throw error;}
    if(result.length===6)break;
  }
  if(result.length<6)result.push(...nativeEnvironmentDoorChainSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentImagingSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentProcedureSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentThinWallsSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentChainOfTitleSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentNoConsensusSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentMetaphorPhysicsSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentNoOrdinarySignalSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentConsensusEngineSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentGuestRightSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentPrivateRoomSituation(db,guild,scope,location).slice(0,6-result.length));
  return result;
}
