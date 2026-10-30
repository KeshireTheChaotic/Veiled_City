/** Native feature occurrence lifecycle; no prose can create a trigger, owner choice or effect. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
import {featureCostPlan,commitFeatureResources} from './feature-costs.js';
import {nativeFeatureTriggerEligible} from './feature-trigger-eligibility.js';
import {featureChoiceProposalIssue} from './feature-choice-policy.js';
export const FEATURE_PHASES=Object.freeze(['before_attack','after_hit','before_damage_applied','after_damage','on_pc_action','on_scene_event','spotlight_action']);
export const MAX_FEATURE_DEPTH=3;
export function createFeatureWindowRules({catalog,sources,mechanics}){
const {compileNativeFeatures,executableNativeFeatures,featureDisposition}=catalog||{};
const {currentScene,scenePresence,sceneAccess,activeCityProxy,indexWorldEvent,EncounterLibrary}=sources||{};
const {validateIncomingDamageApplication,incomingAttackEvidence,typedRollProof,isPvpIntent,inspectNativeGmDecision,nativeReactionTarget,historicalActionSource,assertPcCanAct}=mechanics||{};
if([compileNativeFeatures,executableNativeFeatures,featureDisposition,currentScene,scenePresence,sceneAccess,activeCityProxy,indexWorldEvent,EncounterLibrary,validateIncomingDamageApplication,incomingAttackEvidence,typedRollProof,isPvpIntent,inspectNativeGmDecision,nativeReactionTarget,historicalActionSource,assertPcCanAct].some(fn=>typeof fn!=='function'))throw new TypeError('Complete native feature window capabilities required.');
function actorFacts(db,guild,actor,templateHash,library){
  const scene=currentScene(db,guild),encounter=db.getCurrentEncounter(scene.session_id),binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id),
    bound=binding?.data.combatants?.find(c=>c.actor===actor),combatant=bound&&db.listCombatants(encounter.id).find(c=>c.id===bound.id),
    template=combatant&&library.findAdversary(combatant.base_name),presence=scenePresence(db,guild,'npc',actor),entity=db.getSimulationEntity(guild,'npc',actor);
  if(encounter?.status!=='active'||combatant?.status!=='active'||combatant.hp_current<=0||hash(template)!==templateHash
    ||db.getWorldEvent(guild,binding?.source_event)?.status!=='active'||activeCityProxy(db,guild,actor)
    ||presence?.data.state!=='actually_present'||presence.data.scene!==scene.key||entity?.state.location_key!==presence.location_key
    ||db.getWorldEvent(guild,presence.source_event)?.status!=='active')throw fail('feature_actor_binding_control_presence');
  return {scene,combatant,presence,control_hash:hash([entity,db.getNpcProfile(guild,actor),presence,db.listNpcProxies(scene.session_id)])};
}
function sourceProof(db,guild,kind,ref){
  if(kind==='pc_no_roll'){
    const receipt=db.getCityRecord(guild,'action_outcome_receipt',ref),accepted=receipt&&db.getCityRecord(guild,'typed_intent',receipt.data.action_id),
      adjudication=accepted&&db.listCityRecords(guild,{kind:'native_adjudication',includeGM:true,limit:100}).find(r=>r.data.action_id===accepted.record_key&&r.data.receipts?.includes(ref));
    if(receipt?.status!=='resolved'||receipt.data.outcome!=='resolved_no_roll'||accepted?.status!=='resolved'||accepted.data.outcome_receipt!==ref
      ||accepted.data.type!=='interact'||accepted.data.operation!=='use_device'||accepted.data.framing!=='immediate'
      ||receipt.source_event!==accepted.source_event||adjudication?.status!=='resolved'||adjudication.data.rule_basis?.kind==='provisional'
      ||receipt.data.native_roll_refs.length||receipt.data.state_mutations.length||!['party','public'].includes(receipt.visibility))throw fail('feature_actual_visible_device_use');
    historicalActionSource(db,guild,accepted.record_key,{resolved:true});
    const pc=db.getCharacter(accepted.data.actor),device=pc?.data.inventory?.find(i=>i?.id===accepted.data.target_key&&i.category==='electronic_device'&&i.equipped===true);
    if(!device||device.concealed===true||device.hidden===true)throw fail('feature_owned_visible_electronic_device');
    return {receipt,accepted,character:pc.id,source:receipt.source_event,phase:'on_pc_action',device,origin_source:accepted.data.world_source_event};
  }
  if(kind==='incoming_damage'){
    const receipt=validateIncomingDamageApplication(db,guild,ref),attack=incomingAttackEvidence(db,guild,receipt.data.roll.replace(/:roll$/u,''));
    return {receipt,actor:attack.offer.input.npc,character:receipt.subject_key,source:receipt.source_event,phase:'after_damage'};
  }
  if(kind==='pc_action'){
    const receipt=db.getCityRecord(guild,'action_outcome_receipt',ref),request=receipt?.data.request&&db.getCityRecord(guild,'roll_request',receipt.data.request),
      proof=request&&typedRollProof(db,guild,request);
    if(receipt?.status!=='resolved'||request?.status!=='resolved'||request.data.kind==='reaction'||proof?.outcome==='needs_review'
      ||proof.accepted.data.outcome_receipt!==ref||receipt.data.action_id!==proof.accepted.record_key
      ||receipt.source_event!==proof.accepted.source_event||!receipt.data.native_roll_refs.includes(request.data.roll_id))throw fail('feature_actual_pc_action_receipt');
    return {receipt,request,proof,character:proof.accepted.data.actor,source:receipt.source_event,phase:'on_pc_action'};
  }
  throw fail('feature_native_source_adapter_missing');
}
function capture(db,guild,kind,ref,{library=new EncounterLibrary('../content')}={}){
  const p=sourceProof(db,guild,kind,ref),scene=currentScene(db,guild),source=db.getWorldEvent(guild,p.source),result=[];
  if(source?.status!=='active'||source.session_id!==scene.session_id||source.scene!==scene.key)throw fail('feature_current_source');
  if((p.proof?.accepted||p.accepted)&&isPvpIntent(db,guild,p.proof?.accepted||p.accepted))return result;
  if(kind==='pc_action'&&!['party','public'].includes(p.receipt.visibility)){
    // A private numeric PC result is not NPC cognition or disclosure authority.
    return result;
  }
  const encounter=db.getCurrentEncounter(scene.session_id),binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id);
  for(const feature of executableNativeFeatures('adversary').filter(f=>nativeFeatureTriggerEligible(f,p))){
    for(const b of binding?.data.combatants||[]){
      if(p.actor&&b.actor!==p.actor)continue;
      const combatant=db.listCombatants(encounter.id).find(c=>c.id===b.id);
      if(combatant?.base_name!==feature.actor_name||activeCityProxy(db,guild,b.actor))continue;
      let a;
      try{a=actorFacts(db,guild,b.actor,feature.template_hash,library);}
      catch(error){
        if(error.code!=='GM_ARBITRATION')throw error;
        db.saveCityRecord(guild,{kind:'native_feature_trigger_review',key:`feature-review:${hash([ref,b.actor,feature.feature_key])}`,
          status:'held',source_event:p.source,visibility:'gm',data:{receipt:ref,actor:b.actor,feature:feature.feature_key,reason:error.message}});
        continue; // Optional/stale NPC feature cannot roll back an independently valid owner outcome.
      }
      const target=scenePresence(db,guild,'character',p.character);
      if(target?.data.state!=='actually_present'||target.location_key!==a.presence.location_key
        ||!sceneAccess(db,guild,{observer_type:'npc',observer_key:b.actor,target_type:'character',target_key:p.character,sense:'sight'}))continue;
      const data={version:1,scene:scene.key,session:scene.session_id,actor:b.actor,combatant:b.id,feature:feature.feature_key,
        feature_hash:hash(feature),template_hash:feature.template_hash,phase:p.phase,timing:'reaction',source_kind:kind,receipt:ref,
        receipt_hash:hash(p.receipt.data),source_hash:hash(source),target:p.character,target_owner:db.getCharacter(p.character)?.owner_user_id,
        target_presence:hash(target),actor_control:a.control_hash,location:a.presence.location_key,depth:0,parent:null,
        audience:{visibility:p.receipt.visibility,subject:p.receipt.subject_key||null},costs:feature.costs,
        authority:'Native occurrence only; no PC action, public disclosure, effect or ordinary spotlight is authorized.'};
      if(p.device){
        const range=a.presence.data.zone===target.data.zone?'Melee':target.data.range;
        if(!['Melee','Very Close','Close'].includes(range)||p.device.disabled_by)continue;
        Object.assign(data,{device_key:p.device.id,device_hash:hash(p.device),origin_source:p.origin_source});
      }
      const key=`feature-window:${hash([scene.key,b.actor,ref,feature.feature_key,p.phase])}`,prior=db.getCityRecord(guild,'native_feature_window',key);
      if(prior){if(hash(prior.data)!==hash(data))throw fail('immutable_feature_occurrence_changed');result.push(prior);continue;}
      const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_feature_trigger',source_id:'native:feature-gate',title:'Native feature trigger occurrence',
        session_id:scene.session_id,scene:scene.key,location_key:a.presence.location_key,visibility:'gm',details:{input_source:p.source,payload_hash:hash(data)}},'native:feature-gate');
      result.push(db.saveCityRecord(guild,{kind:'native_feature_window',key,status:'pending',source_event:event.event_key,visibility:'gm',data}));
    }
  }
  return result;
}
const captureIncomingFeatureWindows=(db,guild,ref,options)=>capture(db,guild,'incoming_damage',ref,options);
const captureActionFeatureWindows=(db,guild,ref,options)=>capture(db,guild,'pc_action',ref,options);
function captureNoRollFeatureWindows(db,guild,ref){
  const receipt=db.getCityRecord(guild,'action_outcome_receipt',ref),accepted=receipt&&db.getCityRecord(guild,'typed_intent',receipt.data.action_id);
  if(accepted?.data.type!=='interact'||accepted.data.operation!=='use_device'||!['party','public'].includes(receipt.visibility))return [];
  const device=db.getCharacter(accepted.data.actor)?.data.inventory?.find(i=>i?.id===accepted.data.target_key&&i.category==='electronic_device'&&i.equipped===true);
  if(!device||device.disabled_by||device.concealed===true||device.hidden===true)return [];
  return capture(db,guild,'pc_no_roll',ref);
}

function inspectFeatureWindow(db,guild,key,{library=new EncounterLibrary('../content')}={}){
  const row=db.getCityRecord(guild,'native_feature_window',key),v=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    feature=v&&compileNativeFeatures().find(f=>f.feature_key===v.feature);
  if(!v||row.visibility!=='gm'||!['pending','ready','resolving','hold_for_owner','resolved','held','cancelled'].includes(row.status)
    ||event?.status!=='active'||event.kind!=='native_feature_trigger'||event.source_id!=='native:feature-gate'||event.details.payload_hash!==hash(v)
    ||!feature||hash(feature)!==v.feature_hash||!Number.isSafeInteger(v.depth)||v.depth<0||v.depth>MAX_FEATURE_DEPTH||v.parent!==null
    ||!FEATURE_PHASES.includes(v.phase))throw fail('feature_window_provenance_depth');
  const p=sourceProof(db,guild,v.source_kind,v.receipt),a=actorFacts(db,guild,v.actor,v.template_hash,library),source=db.getWorldEvent(guild,p.source),
    pc=db.getCharacter(v.target),target=scenePresence(db,guild,'character',v.target);
  if(!nativeFeatureTriggerEligible(feature,p)||hash(p.receipt.data)!==v.receipt_hash||hash(source)!==v.source_hash||a.scene.key!==v.scene
    ||a.scene.session_id!==v.session||a.combatant.id!==v.combatant||a.control_hash!==v.actor_control
    ||hash(target)!==v.target_presence||pc?.owner_user_id!==v.target_owner||p.character!==v.target||p.phase!==v.phase
    ||p.actor&&p.actor!==v.actor||event.details.input_source!==p.source)throw fail('feature_window_source_target_or_control_changed');
  return row;
}
function pendingFeatureWindows(db,guild){
  const rows=[];
  // listCityRecords caps every page at 100. Terminal history must not hide a live occurrence.
  // Read synchronously before any writes; execution remains separately bounded by the native board.
  for(const status of ['pending','ready','hold_for_owner'])for(let offset=0;;offset+=100){
    const page=db.listCityRecords(guild,{kind:'native_feature_window',status,includeGM:true,limit:100,offset});
    rows.push(...page);if(page.length<100)break;
  }
  return rows.sort((a,b)=>FEATURE_PHASES.indexOf(a.data.phase)-FEATURE_PHASES.indexOf(b.data.phase)
    ||String(a.data.receipt).localeCompare(String(b.data.receipt))||a.record_key.localeCompare(b.record_key));
}
function featureWindowChoices(db,guild,scope){
  const result=[];
  for(const row of pendingFeatureWindows(db,guild)){
    // Old unsupported occurrences remain readable history, not executable Director choices.
    if(featureDisposition(row.data.feature).status!=='supported')continue;
    const audience=row.data.audience;
    if(!['party','public'].includes(audience.visibility)&&!(scope.mode==='private'&&audience.visibility==='character'&&audience.subject===scope.actorCharacterId
      &&db.getCharacter(audience.subject)?.owner_user_id===scope.actorUserId))continue;
    try{inspectFeatureWindow(db,guild,row.record_key);result.push({trigger_ref:row.record_key,actor_key:row.data.actor,feature_ref:row.data.feature,phase:row.data.phase});}
    catch(error){if(error.code!=='GM_ARBITRATION'&&error.code!=='PC_EFFECT_AUTHORITY')throw error;}
  }
  return result.slice(0,16); // No private numeric dice/resources/motives in the board projection.
}
function authorizeFeatureChoice(db,guild,origin,entry,p,feature,{library=new EncounterLibrary('../content')}={}){
  const disposition=featureDisposition(feature?.feature_key);
  if(disposition.status!=='supported'||hash(disposition.feature)!==hash(feature))
    throw fail('feature_choice_requires_qualified_native_descriptor');
  const issue=featureChoiceProposalIssue(feature,p,entry);if(issue)throw fail(issue);
  const window=inspectFeatureWindow(db,guild,p.trigger_ref,{library}),v=window.data,a=actorFacts(db,guild,entry.actor.key,feature.template_hash,library);
  if(window.status!=='pending'||v.feature!==feature.feature_key||v.actor!==entry.actor.key||v.scene!==origin.binding.scene
    ||entry.target_refs.length!==1||entry.target_refs[0]!==v.target||!featureWindowChoices(db,guild,origin.scope).some(w=>w.trigger_ref===window.record_key)
    )throw fail('feature_current_occurrence_target_audience');
  const cost=featureCostPlan(feature,{timing:'reaction',fear:db.getCampaign(guild).fear,stress:a.combatant.stress_current,stressMax:a.combatant.stress_max});
  if(feature.native_handler==='feedback'){
    const pc=db.getCharacter(v.target),device=pc.data.inventory.find(i=>i?.id===v.device_key),target_snapshot=nativeReactionTarget(db,guild,origin,pc,entry.actor.key);
    assertPcCanAct(pc,db,guild);
    if(p.trait!=='Instinct'||p.difficulty!==12||hash(device)!==v.device_hash||device.disabled_by
      ||!Number.isSafeInteger(pc.data.resources.stress.current)||pc.data.resources.stress.current>=pc.data.resources.stress.max)throw fail('feedback_fixed_terms_device_or_stress_capacity');
    return {operation:'request_feature_reaction_roll',feature:feature.feature_key,feature_hash:hash(feature),window:window.record_key,combatant:a.combatant.id,cost,
      character:pc.id,owner:pc.owner_user_id,principal:target_snapshot.principal,target_snapshot,resources_hash:hash(pc.data.resources),device_key:v.device_key};
  }
  if(p.difficulty!==null||p.trait!==null||a.combatant.stress_current<1)throw fail('blood_rush_recovery_terms');
  return {operation:'commit_adversary_feature',feature:feature.feature_key,feature_hash:hash(feature),window:window.record_key,
    combatant:a.combatant.id,cost,position_choice:'retain_current_position'};
}
function reserveFeatureWindow(db,guild,decisionKey){
  const {row}=inspectNativeGmDecision(db,guild,decisionKey),n=row.data.native;
  if(!n?.window||!n.feature)throw fail('native_feature_reservation');
  const w=inspectFeatureWindow(db,guild,n.window),key=`feature-reservation:${hash(n.window)}`,prior=db.getCityRecord(guild,'native_feature_reservation',key);
  if(prior){if(prior.data.decision!==decisionKey||prior.source_event!==row.source_event)throw fail('feature_occurrence_already_reserved');return prior;}
  if(w.status!=='pending')throw fail('feature_occurrence_not_pending');
  return db.saveCityRecord(guild,{kind:'native_feature_reservation',key,status:'reserved',source_event:row.source_event,visibility:'gm',data:{window:n.window,decision:decisionKey}});
}
function commitFeatureReactionCost(db,guild,decisionKey){
  return db.transaction(()=>{
    const {row,entry}=inspectNativeGmDecision(db,guild,decisionKey),n=row.data.native;
    if(n?.operation!=='request_feature_reaction_roll')throw fail('native_feature_reaction_cost');
    reserveFeatureWindow(db,guild,decisionKey);
    const key=`gm-feature-cost:${hash(decisionKey)}`,prior=db.getCityRecord(guild,'gm_action_cost_receipt',key);
    if(prior){if(prior.source_event!==row.source_event||prior.data.decision!==decisionKey||hash(prior.data.feature_cost)!==hash(n.cost))throw fail('feature_payment_changed');return prior;}
    const feature=compileNativeFeatures().find(f=>f.feature_key===n.feature),actual=authorizeFeatureChoice(db,guild,{binding:row.data.origin,scope:row.data.scope},entry,row.data.proposal,feature);
    if(hash(actual)!==hash(n))throw fail('feature_cost_state_changed');
    const combatant=db.listCombatants(db.getCurrentEncounter(row.data.origin.session).id).find(c=>c.id===n.combatant),before=db.getCampaign(guild).fear;
    const after=commitFeatureResources(db,guild,combatant,n.cost).combatant;
    const data={decision:decisionKey,
      opportunity:n.window,ordinal:null,amount:n.cost.fear,before,after:db.getCampaign(guild).fear,expenses:n.cost.expenses,feature_cost:n.cost,
      npc_stress:{combatant:combatant.id,before:combatant.stress_current,after:after.stress_current}};
    const payment=indexWorldEvent(db,guild,{key:`${key}:payment`,kind:'native_feature_payment',source_id:'native:unified-gm',title:'Native feature costs paid once',
      session_id:row.data.origin.session,scene:row.data.origin.scene,location_key:row.data.origin.location,visibility:'gm',
      details:{input_source:row.source_event,payload_hash:hash(data)}},'native:unified-gm');
    const receipt=db.saveCityRecord(guild,{kind:'gm_action_cost_receipt',key,status:'committed',source_event:row.source_event,visibility:'gm',data:{...data,payment_source:payment.event_key}});
    const window=db.getCityRecord(guild,'native_feature_window',n.window);db.saveCityRecord(guild,{...window,key:window.record_key,status:'hold_for_owner'});
    return receipt;
  });
}
function commitFeatureChoice(db,guild,decisionKey,{library=new EncounterLibrary('../content')}={}){
  return db.transaction(()=>{
    const {row,entry}=inspectNativeGmDecision(db,guild,decisionKey),n=row.data.native,key=`feature-use:${hash(decisionKey)}`,
      prior=db.getCityRecord(guild,'gm_feature_use_receipt',key);
    if(prior)return inspectFeatureUse(db,guild,key);
    const feature=compileNativeFeatures().find(f=>f.feature_key===n?.feature);
    const actual=feature&&authorizeFeatureChoice(db,guild,{binding:row.data.origin,scope:row.data.scope},entry,row.data.proposal,feature,{library});
    if(!actual||hash(actual)!==hash(n))throw fail('feature_execution_changed');
    const a=actorFacts(db,guild,entry.actor.key,feature.template_hash,library),before=a.combatant;
    // This bounded handler recovers one native NPC Stress and elects the current position.
    // It grants no PC effect, forced movement, ordinary spotlight, GM die or metacurrency.
    if(n.cost.fear!==0||n.cost.npc_stress!==0||n.position_choice!=='retain_current_position')throw fail('feature_handler_cost_or_position');
    const after=db.updateCombatant(before.id,{stress_current:before.stress_current-1});
    const mutation=db.recordMutation(guild,{sessionId:row.data.origin.session,actorType:'ai_gm',actorId:'native:unified-gm',sourceLayer:'gm_feature',
      mutationType:'blood_rush_recovery',entityKey:before.id,visibility:'gm',before,after,rationale:'Exact source-triggered native adversary reaction.',payload:{decision:decisionKey,window:n.window}});
    const data={version:1,decision:decisionKey,window:n.window,feature:n.feature,feature_hash:n.feature_hash,actor:entry.actor.key,
      combatant:before.id,before,after,cost:n.cost,position_choice:n.position_choice,mutation:mutation.id,trigger:row.data.proposal.trigger_ref};
    const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_feature_use',source_id:'native:unified-gm',title:'Native adversary reaction resolved',
      session_id:row.data.origin.session,scene:row.data.origin.scene,location_key:row.data.origin.location,visibility:'gm',
      details:{input_source:row.source_event,payload_hash:hash(data)}},'native:unified-gm');
    const receipt=db.saveCityRecord(guild,{kind:'gm_feature_use_receipt',key,status:'resolved',source_event:event.event_key,visibility:'gm',data});
    const window=db.getCityRecord(guild,'native_feature_window',n.window);db.saveCityRecord(guild,{...window,key:window.record_key,status:'resolved'});
    return receipt;
  });
}
function inspectFeatureUse(db,guild,key){
  const row=db.getCityRecord(guild,'gm_feature_use_receipt',key),v=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    decision=v&&inspectNativeGmDecision(db,guild,v.decision).row,window=v&&inspectFeatureWindow(db,guild,v.window),mutation=v&&db.getMutation(guild,v.mutation),n=decision?.data.native;
  if(row?.status!=='resolved'||row.visibility!=='gm'||event?.status!=='active'||event.kind!=='native_feature_use'||event.source_id!=='native:unified-gm'
    ||event.details.payload_hash!==hash(v)||event.details.input_source!==decision?.source_event||n?.operation!=='commit_adversary_feature'
    ||key!==`feature-use:${hash(v.decision)}`||n.window!==v.window||v.trigger!==v.window||n.feature!==v.feature||n.feature_hash!==v.feature_hash
    ||v.combatant!==n.combatant||v.actor!==window.data.actor||window.status!=='resolved'||hash(v.cost)!==hash(n.cost)
    ||v.cost.fear!==0||v.cost.npc_stress!==0||v.before.stress_current-v.after.stress_current!==1
    ||v.position_choice!=='retain_current_position'||mutation?.source_layer!=='gm_feature'||mutation.entity_key!==v.combatant
    ||hash(JSON.parse(mutation.before_json))!==hash(v.before)||hash(JSON.parse(mutation.after_json))!==hash(v.after))throw fail('native_feature_use_ancestry');
  return row;
}

return Object.freeze({captureIncomingFeatureWindows,captureActionFeatureWindows,captureNoRollFeatureWindows,inspectFeatureWindow,pendingFeatureWindows,featureWindowChoices,authorizeFeatureChoice,reserveFeatureWindow,commitFeatureReactionCost,commitFeatureChoice,inspectFeatureUse});
}
