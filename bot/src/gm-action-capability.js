/** Durable native AI-GM capability inspection. No model role, approval flag or simulation score grants execution. */
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {buildNarrativeContext} from './narrative-authority-context.js';
import {activeCityProxy} from './city-constraints.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {scenePresence,sceneAccess,RANGE_BANDS} from './scene-continuity.js';
import {conversationPrincipal} from './conversation-principal.js';
import {actorReferenceVisible} from './npc-cognition-projection.js';
import {typedRollProof} from './typed-roll-proof.js';
import {isPvpIntent} from './pvp-authority.js';
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {featureCostPlan} from './native-feature-windows.js';
import {compileNativeFeatures} from './native-feature-catalog.js';
import {inspectGroupFeatureChild,planNativeSpotlight,recordNativeSpotlight} from './native-group-features.js';
import {nativeActorControl} from './native-actor-control.js';
import {preRollFearOpportunity,commitPreRollFearCost} from './pre-roll-fear.js';

export function nativeReactionTarget(db,guild,origin,pc,actor,{maxRange='Close'}={}){
  const target=pc&&scenePresence(db,guild,'character',pc.id),npc=scenePresence(db,guild,'npc',actor),
    principal=pc&&conversationPrincipal(db,guild,pc.owner_user_id,pc.id),scope=origin.scope,binding=origin.binding||origin;
  const targetSource=target&&db.getWorldEvent(guild,target.source_event),npcSource=npc&&db.getWorldEvent(guild,npc.source_event),
    range=npc?.data.zone===target?.data.zone?'Melee':target?.data.range;
  if(pc?.guild_id!==guild||principal?.kind!=='owner'||target?.data.state!=='actually_present'||npc?.data.state!=='actually_present'
    ||target.location_key!==binding.location||npc.location_key!==binding.location||scope.mode==='private'&&pc.id!==scope.actorCharacterId
    ||targetSource?.status!=='active'||npcSource?.status!=='active'||!narrativeSourceVisible(db,guild,npcSource.event_key,scope)
    ||!narrativeSourceVisible(db,guild,targetSource.event_key,scope)
    ||!RANGE_BANDS.includes(range)||!RANGE_BANDS.includes(maxRange)||RANGE_BANDS.indexOf(range)>RANGE_BANDS.indexOf(maxRange)
    ||!sceneAccess(db,guild,{observer_type:'npc',observer_key:actor,target_type:'character',target_key:pc.id,sense:'sight'}))throw fail('reaction_owner_presence_range_audience');
  return {principal:principal.revision,target:hash(target),target_source:hash(targetSource),actor:hash(npc),actor_source:hash(npcSource)};
}

export function inspectNativeGmDecision(db,guild,key){return inspectDecision(db,guild,key,false);}
/** Immutable provenance for an ALREADY committed operation, not a permission to execute a new one.
 * Per-target current owner/source/scene checks remain in the consuming effect and publication adapters. */
export function inspectCommittedGmDecision(db,guild,key){return inspectDecision(db,guild,key,true);}
function inspectDecision(db,guild,key,committed){
  const row=db.getCityRecord(guild,'gm_arbitration_decision',key),d=row?.data,source=row&&db.getWorldEvent(guild,row.source_event),
    board=d&&db.getCityRecord(guild,'scene_intent_board',d.board),boardSource=board&&db.getWorldEvent(guild,board.source_event);
  if(!d||row.visibility!=='gm'||source?.status!=='active'||source.kind!=='native_gm_arbitration'||source.source_id!=='native:unified-gm'
    ||source.details.payload_hash!==hash(d)||boardSource?.status!=='active'||boardSource.kind!=='native_scene_intent_board'
    ||boardSource.source_id!=='native:unified-gm'||boardSource.details.payload_hash!==hash(board.data)
    ||d.proposal_hash!==hash(d.proposal)||!committed&&(db.getCityCalendar(guild).flags.gm_discretion!==true
    ||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual'))throw fail('native_decision_provenance');
  const entry=board.data.entries.find(e=>e.intent_ref===d.entry);
  if(!entry||d.entry_hash!==hash(entry)||hash(board.data.origin)!==hash(d.origin))throw fail('decision_entry_provenance');
  if(board.data.version===2&&entry.actor.owner_control_type!==(entry.actor.type==='npc'?'ai_world':'player'))throw fail('decision_actor_control_class');
  if(!committed&&d.native?.operation==='request_group_feature_reaction'){
    inspectGroupFeatureChild(db,guild,row);return {row,entry,board};
  }
  if(committed){
    const proposalSource=db.getWorldEvent(guild,entry.source_ref),{source_ref:ignoredRef,source_hash:ignoredHash,...material}=entry;
    if(entry.actor.type!=='npc'||proposalSource?.status!=='active'||proposalSource.kind!=='native_npc_scene_intent'
      ||proposalSource.source_id!=='native:unified-gm'||hash(proposalSource.details)!==entry.source_hash
      ||proposalSource.details.entry_hash!==hash(material)||proposalSource.details.input_source!==d.origin.source
      ||db.getWorldEvent(guild,d.origin.source)?.status!=='active')throw fail('committed_npc_source_provenance');
    return {row,entry,board};
  }
  const current=buildNarrativeContext(db,guild,d.scope,d.origin.source);
  if(!entry||d.entry_hash!==hash(entry)||hash(current.binding)!==hash(d.origin))throw fail('decision_source_scene_or_owner');
  if(entry.actor.type==='npc'&&(nativeActorControl(db,guild,'npc',entry.actor.key).owner_control_type!=='ai_world'
    ||entry.actor.owner_control_type!==undefined&&entry.actor.owner_control_type!=='ai_world'
    ||activeCityProxy(db,guild,entry.actor.key)||db.getSimulationEntity(guild,'npc',entry.actor.key)?.state.location_key!==d.origin.location))throw fail('npc_control_or_locality');
  if(entry.actor.type==='npc'){
    const proposalSource=db.getWorldEvent(guild,entry.source_ref),{source_ref:ignoredRef,source_hash:ignoredHash,...material}=entry;
    if(proposalSource?.status!=='active'||proposalSource.kind!=='native_npc_scene_intent'||proposalSource.source_id!=='native:unified-gm'
      ||hash(proposalSource.details)!==entry.source_hash||proposalSource.details.entry_hash!==hash(material)||proposalSource.details.input_source!==d.origin.source)throw fail('native_npc_intent_source');
    const npc=current.packet.npcs.find(n=>n.key===entry.actor.key),snapshot=hash([db.getSimulationEntity(guild,'npc',entry.actor.key),db.getNpcProfile(guild,entry.actor.key),
      scenePresence(db,guild,'npc',entry.actor.key),db.listNpcProxies(d.origin.session)]);
    if(!npc||npc.human_controlled||snapshot!==entry.snapshot||entry.knowledge_refs.some(ref=>!actorReferenceVisible(db,guild,entry.actor.key,ref,d.scope))
      ||entry.objective_ref&&!db.listNpcGoals(guild,entry.actor.key,{status:'active',limit:100}).some(g=>g.goal_key===entry.objective_ref))throw fail('npc_snapshot_objective_or_knowledge');
  }
  if(entry.actor.type==='character'){
    const accepted=db.getCityRecord(guild,'typed_intent',entry.intent_ref);
    (accepted?.status==='resolved'?historicalActionSource:consentAction)(db,guild,entry.intent_ref,{resolved:true});
  }
  if(['request_pc_reaction_roll','request_feature_reaction_roll'].includes(d.native?.operation)&&hash(nativeReactionTarget(db,guild,{...d.origin,scope:d.scope},db.getCharacter(d.native.character),entry.actor.key))!==hash(d.native.target_snapshot))
    throw fail('reaction_target_snapshot_changed');
  return {row,entry,board};
}
/** Exact authenticated looking-to-GM input is an opportunity, not an automatic attack or Fear spend. */
export function nativeGmOpportunity(db,guild,board){
  const interrupted=preRollFearOpportunity(db,guild,board);if(interrupted)return interrupted;
  const input=board.data.entries.find(e=>e.actor.type==='character'&&['describe_scene','current_situation','continuation'].includes(e.operation));
  if(input){
    const row=db.getCityRecord(guild,'typed_intent',input.intent_ref);
    if(row?.data.type==='other'&&row.data.framing==='immediate'&&row.data.resolution==='conversational'){
      (row.status==='resolved'?historicalActionSource:consentAction)(db,guild,row.record_key,{resolved:true});return {source:row.source_event,intent:row.record_key,key:`gm-opportunity:${hash([board.data.origin.source,board.data.origin.scene])}`};
    }
  }
  for(const request of db.listCityRecords(guild,{kind:'roll_request',includeGM:true,limit:100})){
    if(request.status!=='resolved'||request.data.kind==='reaction'||request.data.scene!==board.data.origin.scene||!request.data.input.accepted_intent)continue;
    const accepted=db.getCityRecord(guild,'typed_intent',request.data.input.accepted_intent),scope=board.data.origin.scope;
    if(!accepted||isPvpIntent(db,guild,accepted)||!narrativeSourceVisible(db,guild,accepted.source_event,scope))continue;
    let proof;
    try{proof=typedRollProof(db,guild,request);}catch(error){if(!['TYPED_ROLL_PROOF','SCENE_ACTION_WINDOW'].includes(error.code))throw error;continue;}
    if(proof.outcome==='needs_review'||request.data.result.duality!=='Fear'&&proof.outcome!=='failure')continue;
    const key=`gm-opportunity:roll:${request.data.roll_id}`,used=db.listCityRecords(guild,{kind:'gm_action_cost_receipt',includeGM:true,limit:200})
      .some(r=>r.data.opportunity===key&&db.getCityRecord(guild,'gm_arbitration_decision',r.data.decision)?.data.board!==board.record_key);
    if(!used)return {source:accepted.source_event,request:request.record_key,roll:request.data.roll_id,key};
  }
  throw fail('native_spotlight_opportunity_missing');
}
/** Called inside the attack's native transaction, after defense checks, before RNG. */
export function commitGmActionCost(db,guild,decisionKey){
  const {row,entry,board}=inspectNativeGmDecision(db,guild,decisionKey),n=row.data.native,opportunity=nativeGmOpportunity(db,guild,board);
  if(!['commit_adversary_attack','commit_adversary_volley','commit_group_feature','commit_exceptional_adversary_action','request_pc_reaction_roll'].includes(n?.operation)||hash(n.opportunity)!==hash(opportunity))throw fail('exact_spotlight_opportunity');
  const selected=new Set(db.listCityRecords(guild,{kind:'gm_arbitration_decision',includeGM:true,limit:200})
    .filter(r=>['gm_action_ready','pending_pc_reaction'].includes(r.status)&&r.data.board===board.record_key
      &&['commit_adversary_attack','commit_adversary_volley','commit_group_feature','commit_exceptional_adversary_action','request_pc_reaction_roll'].includes(r.data.native?.operation)).map(r=>r.data.entry));
  const order=board.data.entries.filter(e=>selected.has(e.intent_ref)&&e.actor.type==='npc'),ordinal=order.findIndex(e=>e.intent_ref===entry.intent_ref);
  if(ordinal<0)throw fail('attack_spotlight_slot');
  const spotlight=opportunity.pre_roll_fear?1:ordinal===0?0:1,experience=n.experience?1:0;
  if(opportunity.pre_roll_fear&&(order.length!==1||n.operation!=='commit_adversary_attack'||experience))throw fail('one_pre_roll_native_standard_attack');
  const descriptor=n.operation==='commit_group_feature'?compileNativeFeatures().find(f=>f.feature_key===n.feature):null;
  if(n.operation==='commit_group_feature'&&(!descriptor||hash(descriptor)!==n.feature_hash))throw fail('feature_cost_source_changed');
  const feature=n.operation==='commit_adversary_volley'?1:descriptor?.costs?.filter(c=>c.resource==='fear').reduce((v,c)=>v+c.amount,0)||0;
  const key=`gm-action-cost:${hash([decisionKey,opportunity.key])}`,prior=db.getCityRecord(guild,'gm_action_cost_receipt',key),amount=spotlight+experience+feature;
  if(prior){if(prior.source_event!==row.source_event||prior.data.amount!==amount||prior.data.decision!==decisionKey)throw fail('cost_receipt_changed');return prior;}
  const before=db.getCampaign(guild).fear;
  const combatant=descriptor&&db.listCombatants(db.getCurrentEncounter(row.data.origin.session)?.id).find(c=>c.id===n.combatant);
  if(descriptor&&(!combatant||hash(combatant)!==n.combatant_hash))throw fail('feature_cost_combatant_changed');
  const plan=featureCostPlan(descriptor||{costs:feature?[{resource:'fear',amount:feature}]:[]},{timing:'spotlight_action',additionalSpotlight:!!spotlight,experience:!!experience,
    fear:before,stress:combatant?.stress_current||0,stressMax:combatant?.stress_max||0});
  if(!Number.isSafeInteger(before)||before<amount||before>12)throw fail('insufficient_gm_fear');
  const after=opportunity.pre_roll_fear?commitPreRollFearCost(db,guild,opportunity.pre_roll_fear,decisionKey).after
    :amount?db.changeFear(guild,-amount):before;
  const stressed=combatant&&db.updateCombatant(combatant.id,{stress_current:combatant.stress_current+plan.npc_stress}),
    nativeSpotlight=planNativeSpotlight(db,guild,entry.actor.key,row.data.origin.scene,key),
    receipt=db.saveCityRecord(guild,{kind:'gm_action_cost_receipt',key,status:'committed',source_event:row.source_event,visibility:'gm',
      data:{decision:decisionKey,opportunity:opportunity.key,ordinal,amount,before,after,expenses:plan.expenses,spotlight:nativeSpotlight,
        ...(combatant?{npc_stress:{combatant:combatant.id,before:combatant.stress_current,after:stressed.stress_current}}:{})}});
  recordNativeSpotlight(db,guild,receipt);return receipt;
}
