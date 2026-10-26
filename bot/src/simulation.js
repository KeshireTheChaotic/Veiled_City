/** Fictional-time NPC/faction simulation. Models propose intent; bounded application rules resolve and persist outcomes. */
import { randomUUID } from "node:crypto";
import {ACTION_TYPES,MAJOR_IMPACTS} from './frameworks/world/action-catalog.js';
import {retrieveNpcCognition} from './npc-cognition.js';
import {normalizeEntityKey as normalizeNpcKey} from './kernel/entity-key.js';
import { submitInstitutionAction, runInstitutionDirector, proposeCityOpportunity } from "./city-core.js";
import { npcAvailability, activeCityProxy, assertQueuedCompatibility, worldActorControl } from "./city-constraints.js";
import { applyNpcServiceOutcome } from "./city-civic.js";
import { assertServiceAccess } from "./supply-dependencies.js";
import { runMotivationCycle } from "./simulation-motivation.js";
import { coordinateConsequences } from "./city-consequences.js";
import { runStrategyOpportunity } from "./simulation-strategy.js";
import { proposeContactGroup } from "./city-groups.js";
import { clusterContext } from "./memory-clusters.js";
import { delegateConsequence, delegateWorldGoal, maintainMemory, continueLongProjects, dispatchAiIntents } from "./ai-intents.js";
import { pacingAdvice } from "./story-continuity.js";
import {worldResolutionContext,bindWorldResolutionCycle,finishWorldResolutionCycle} from './world-resolution.js';
import {inspectWorldSimulationReceipt} from './frameworks/world/public.js';
import {nativeWorldStrategyAllowed} from './native-world-operations.js';
export { updateRelationshipDimensions } from "./relationship-state.js";

export {ACTION_TYPES,MAJOR_IMPACTS};
import {ACTION_COSTS as COSTS} from './frameworks/world/public.js';
export {ACTION_COSTS} from './frameworks/world/public.js';

const keyOf=(type,key)=>`${type}:${key}`;
const bounded=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const text=(value)=>String(value||"").trim();
const tokens=value=>new Set(text(value).toLowerCase().match(/[a-z0-9]{3,}/g)||[]);
const intersects=(a,b)=>[...tokens(a)].some(word=>tokens(b).has(word));


import {actorState,configureSimulationEntity} from './frameworks/world/public.js';
export {actorState,configureSimulationEntity} from './frameworks/world/public.js';

function actorMemories(db,guildId,actor,query){
  if(actor.type==="npc") return retrieveNpcCognition(db,guildId,{query,npcKey:actor.key,maxNpcs:1,recordRecall:false})
    .find(packet=>packet.npc_key===actor.key)?.memories||[];
  const tick=db.getSimulationClock(guildId).tick;
  const rank=row=>{
    const importance=Number(row.data.importance||50);
    const recency=Math.max(0,20-Math.max(0,tick-Number(row.data.created_tick||0))*(importance>=80?0.05:0.5));
    return importance+recency+Math.min(10,Number(row.data.recall_count||0)*1.5)+(intersects(query,row.data.content)?50:0);
  };
  return db.listSimulationRecords(guildId,{kind:"memory",entityKey:keyOf(actor.type,actor.key),status:"active",limit:100})
    .sort((a,b)=>rank(b)-rank(a)).slice(0,10).map(row=>({...row.data,id:row.id}));
}

function goalsFor(db,guildId,type,key){
  if(type==="npc") return db.listNpcGoals(guildId,key,{status:"active",limit:30});
  return db.listSimulationRecords(guildId,{kind:"goal",entityKey:keyOf(type,key),status:"active",limit:30})
    .map(row=>({...row.data,goal_key:row.id})).sort((a,b)=>Number(b.priority||0)-Number(a.priority||0));
}

/** Build bounded, actor-specific knowledge packets. Objective hidden facts are never injected here. */
export function simulationCandidates(db,guildId,{layer,query=""}={}){
  const density=db.getCityCalendar(guildId).flags.activity_density===true,selection=density?db.densityActorSelection(guildId,query):[];
  const npcs=(density?selection.filter(row=>row.type==="npc").map(row=>db.getNpcProfile(guildId,row.actor_key)):db.listNpcProfiles(guildId,{limit:500}))
    .map(profile=>({type:"npc",key:profile.npc_key,profile,wake:selection.some(row=>row.type==="npc"&&row.actor_key===profile.npc_key&&row.wake)}));
  const factions=(density?selection.filter(row=>row.type==="faction").map(row=>db.getSimulationEntity(guildId,"faction",row.actor_key))
    :db.listSimulationEntities(guildId,"faction")).map(row=>({type:"faction",key:row.entity_key,profile:row.state}));
  const packets=[...npcs,...factions].map(actor=>{
    const configured=db.getSimulationEntity(guildId,actor.type,actor.key)?.state;
    const state=actorState(db,guildId,actor.type,actor.key);
    state.activity_tier=configured?.activity_tier||actor.profile.activity_tier||state.activity_tier;
    state.personality={...actor.profile.decision_profile,...state.personality};
    const goals=goalsFor(db,guildId,actor.type,actor.key).filter(goal=>{
      const dependencies=goal.dependencies||[];
      return dependencies.every(dependency=>actor.type==="npc"
        ?db.listNpcGoals(guildId,actor.key,{limit:200}).some(g=>g.goal_key===dependency&&g.status==="completed")
        :db.getSimulationRecord(guildId,dependency)?.status==="completed");
    });
    const relevant=intersects(query,JSON.stringify([actor.key,goals,state.location_key]));
    const affordable=!density||goals.some(goal=>Object.entries(COSTS).some(([method,resource])=>state.resources[resource]>0
      &&(!(goal.acceptable_methods||[]).length||goal.acceptable_methods.includes(method))));
    const eligible=worldActorControl(db,guildId,actor.type,actor.key)==='ai_world'&&!(actor.type==="npc"&&activeCityProxy(db,guildId,actor.key))&&!state.removed&&(state.activity_tier!=="dormant"||actor.wake)&&goals.length&&affordable&&
      (actor.wake||state.activity_tier==="active"||(state.activity_tier==="supporting"&&relevant)||layer==="downtime");
    return {...actor,state,goals,eligible};
  }).filter(actor=>actor.eligible).sort((a,b)=>Number(b.goals[0]?.priority||0)-Number(a.goals[0]?.priority||0)).slice(0,8).map(actor=>{
    const {state,goals}=actor;
    const awareness=db.listSimulationRecords(guildId,{kind:"awareness",entityKey:keyOf(actor.type,actor.key),limit:50});
    const knowledge=actor.type==="npc"?db.listNpcKnowledge(guildId,actor.key,{limit:50}):awareness.map(row=>row.data);
    const obligations=db.listSimulationRecords(guildId,{kind:"obligation",status:"active",limit:100})
      .filter(row=>[row.data.debtor,row.data.creditor].includes(keyOf(actor.type,actor.key)));
    return {...actor,state,goals,knowledge,awareness,obligations,memories:actorMemories(db,guildId,actor,query),
      memory_clusters:clusterContext(db,guildId,actor.type,actor.key,query),
      availability:actor.type==="npc"?npcAvailability(db,guildId,actor.key):null,
      location:db.getSimulationEntity(guildId,"location",state.location_key)?.state||{},
      relationships:density?db.actorSimulationRelations(guildId,keyOf(actor.type,actor.key)):db.listSimulationEntities(guildId,"relationship").filter(row=>
        [row.state.from,row.state.to].includes(keyOf(actor.type,actor.key))).map(row=>row.state)};
  });
  if(!density) return packets;
  let size=2;
  return packets.filter(packet=>{const length=JSON.stringify(packet).length+1;if(length>12000||size+length>24000) return false;size+=length;return true;}).slice(0,4);
}


import {knownWorldInformation as knownInformation,validateNpcAction as validateAction} from './frameworks/world/public.js';

/** Native communication persists a subjective source, never upgrades hearsay into an established fact. */

export function shareInformation(db,guildId,{fromType,fromKey,toType,toKey,informationKey,source="told_by_npc"}){
  const known=knownInformation(db,guildId,fromType,fromKey,informationKey);
  if(!known) throw new Error("The source actor has not learned that information.");
  if(!["npc","faction","character"].includes(toType)) throw new Error("Invalid information recipient.");
  if(toType==="npc"&&!db.getNpcProfile(guildId,toKey)) throw new Error("Recipient NPC does not exist.");
  if(toType==="faction"&&!db.getSimulationEntity(guildId,"faction",toKey)) throw new Error("Recipient faction does not exist.");
  if(toType==="character"&&db.getCharacter(toKey)?.guild_id!==guildId) throw new Error("Recipient character does not belong to this campaign.");
  const confidence=Math.min(known.confidence??70,source==="witnessed"?95:75);
  const data={...known,information_key:informationKey,confidence,source_type:source,source_actor:keyOf(fromType,fromKey)};
  if(toType==="character") db.addFact(guildId,{key:informationKey,category:known.belief_state==="rumor"?"rumor":"clue",
    content:known.content,visibility:"character",subjectCharacterId:toKey,source:"npc_report",confidence,
    provenance:{source_actor:keyOf(fromType,fromKey),source_type:source,subjective:true}});
  db.putSimulationRecord(guildId,{kind:"awareness",entityKey:keyOf(toType,toKey),data});
  if(toType==="npc") db.upsertNpcKnowledge(guildId,{npcKey:toKey,knowledgeKey:informationKey,content:known.content,
    beliefState:known.belief_state==="rumor"?"rumor":"suspected",confidence,sourceType:source,sourceRef:keyOf(fromType,fromKey),isSecret:true});
  return data;
}

/** No arbitrary simulation JSON is accepted from the model: every update has a typed handler. */
export function applySimulationUpdates(db,guildId,updates=[],{scope={mode:"party"},provenance={}}={}){
  const results=[];
  for(const update of updates){
    if(scope.mode==="private"){
      results.push({ok:false,blocked:true,type:"simulation",error:"Private scenes cannot mutate global simulation records.",draft:update});
      continue;
    }
    // Combined model patches are proposals, not native world-authoring/knowledge/capability receipts.
    // Typed ai_intents and their actual domain adapters remain the executable AI route. Historical
    // explicit GM maintenance callers are unchanged; a disabled legacy feature flag is not authority.
    if(provenance.actorType==='ai'){
      results.push({ok:false,blocked:true,type:'simulation',error:'Generated simulation patches require a source-verified native world adapter.',draft:update});
      continue;
    }
    const data=JSON.parse(update.data_json||"{}");
    if(update.kind==="faction_goal"&&db.getCityCalendar(guildId).flags.emergent_goals===true)
      throw new Error("Enabled emergent goals require sourced policy-governed ai_intents, not legacy faction_goal updates.");
    const actorKey=normalizeNpcKey(update.actor_key);
    const entity=keyOf(update.actor_type||"npc",actorKey);
    const confidence=bounded(update.confidence??100,0,100);
    if(confidence<55) continue;
    const content=text(update.content);
    if(["faction_memory","faction_goal"].includes(update.kind)&&!db.getSimulationEntity(guildId,"faction",actorKey))
      throw new Error('An established faction with separately authorized capacity is required; a memory/goal patch cannot create one.');
    let row;
    switch(update.kind){
      case "city_action":{
        row=submitInstitutionAction(db,guildId,{...data,key:update.key,confidence},"ai_gm");
        break;
      }
      case "voice":{
        if(!db.getNpcProfile(guildId,actorKey)) throw new Error("NPC profile not found for voice update.");
        const state=actorState(db,guildId,"npc",actorKey);
        row=db.setSimulationEntity(guildId,"npc",actorKey,{...state,voice:{...state.voice,...data}});
        break;
      }
      case "location":{
        if(!text(update.key)) throw new Error("Location update needs a location key.");
        const previous=db.getSimulationEntity(guildId,"location",update.key)?.state||{};
        const allowed=["wards","entrances","rituals","contamination","police_attention","control","witnesses","hazards","incidents"];
        if(Object.keys(data).some(key=>!allowed.includes(key))) throw new Error("Unsupported location state field.");
        row=db.setSimulationEntity(guildId,"location",update.key,{...previous,...data});
        break;
      }
      case "residue":{
        const fields=["participants","actions","witnesses","evidence","traces","casualties","damage","exposure","threats","escaped"];
        if(fields.some(field=>!Array.isArray(data[field]))) throw new Error("Scene residue requires every structured list.");
        row=db.putSimulationRecord(guildId,{kind:"residue",entityKey:update.key,
          data:{...data,source_session:provenance.sessionId||null,source_scene:provenance.scene||update.key,content,visibility:"gm"}});
        break;
      }
      case "obligation":{
        if(provenance.actorType==="ai")throw new Error("Binding obligations require native negotiated/owner-consented resolution, not an AI simulation patch.");
        const existing=update.key?db.getSimulationRecord(guildId,update.key):null;
        const status=update.status||"active";
        if(!["active","fulfilled","violated","transferred","called_in","forgiven"].includes(status)) throw new Error("Invalid obligation lifecycle.");
        if(existing&&existing.kind!=="obligation") throw new Error("Not an obligation.");
        if(!existing&&(!data.debtor||!data.creditor||!content)) throw new Error("Obligations require debtor, creditor, and explicit terms.");
        if(status==="transferred"&&!data.transferred_to) throw new Error("Transferred obligations require a recipient.");
        const merged={...existing?.data,...data,content:content||existing?.data.content};
        if(status==="transferred") merged.debtor=data.transferred_to;
        row=db.putSimulationRecord(guildId,{id:existing?.id,kind:"obligation",entityKey:merged.debtor,
          status:status==="transferred"||status==="called_in"?"active":status,data:{...merged,lifecycle:status,
            history:[...(existing?.data.history||[]),{status,source:provenance.messageId||provenance.interactionId||"gm"}]}});
        break;
      }
      case "rumor":{
        if(!content) throw new Error("Rumors require content.");
        row=db.putSimulationRecord(guildId,{kind:"rumor",entityKey:entity,data:{content,origin:entity,subject:update.key,
          holders:[entity],distortion:0,credibility:confidence}});
        break;
      }
      case "awareness":{
        if(!content||!update.key) throw new Error("Awareness requires information key and content.");
        row=db.putSimulationRecord(guildId,{kind:"awareness",entityKey:entity,
          data:{...data,content,information_key:update.key,confidence,source_type:update.source_type||"witnessed"}});
        break;
      }
      case "faction_memory":
        row=remember(db,guildId,"faction",actorKey,content,{source:update.source_type||"faction_report",confidence,importance:update.importance});
        break;
      case "faction_goal":{
        if(!content) throw new Error("Faction goal requires an objective.");
        const prior=update.key?db.getSimulationRecord(guildId,update.key):null;
        if(prior&&(prior.kind!=="goal"||prior.entity_key!==entity)) throw new Error("Faction goal identity mismatch.");
        row=db.putSimulationRecord(guildId,{id:prior?.id,kind:"goal",entityKey:entity,status:update.status||"active",
          data:{priority:50,progress:0,horizon:"near",dependencies:[],acceptable_methods:[],...prior?.data,...data,objective:content}});
        break;
      }
      case "reconcile_memory":{
        const old=db.getNpcMemory(update.key);
        if(!old||old.guild_id!==guildId||old.npc_key!==actorKey) throw new Error("Memory does not belong to this NPC/campaign.");
        if(!content||content===old.content) throw new Error("Memory reconciliation requires new evidence or a changed interpretation.");
        if(!["challenged","superseded"].includes(update.status)) throw new Error("Reconciliation must challenge or supersede a memory.");
        row=remember(db,guildId,"npc",actorKey,content,{source:update.source_type||"document",confidence,sourceRef:old.id});
        db.annotateNpcMemory(guildId,old.id,{sessionId:old.source_session,scene:old.source_scene,tick:old.created_tick,
          status:update.status,supersededBy:update.status==="superseded"?row.id:null});
        break;
      }
      default: throw new Error(`Unsupported simulation update: ${update.kind}`);
    }
    db.recordMutation(guildId,{actorType:provenance.actorType||"ai",actorId:provenance.actorId||"veilkeeper",
      sourceLayer:"simulation",sourceMessageId:provenance.messageId||null,sourceInteractionId:provenance.interactionId||null,
      mutationType:update.kind,entityKey:update.key||entity,visibility:"gm",confidence,after:row,payload:update});
    results.push({ok:true,row});
  }
  return results;
}



export function inspectNpcAction(db,guildId,id){
  const row=db.getSimulationRecord(guildId,id);
  if(!row||row.kind!=="action") throw new Error("Existing NPC action required.");
  assertQueuedCompatibility(db,guildId,row);
  const {state}=validateAction(db,guildId,row.data);
  if(state.resources[COSTS[row.data.type]]<1) throw new Error("Insufficient native action resources.");
  return {action_id:id,status:row.status,cost_resource:COSTS[row.data.type],cost:1,authority:"diagnostic_only_no_roll_or_spending"};
}

/** Called only by fictional round/scene/downtime triggers, with a stable retry key. */
function quietOpportunity(db,guild,query,engagement=null){
  if(db.getCityCalendar(guild).flags.narrative_relevance!==true) return false;
  const pacing=pacingAdvice(db,guild,query,engagement);
  return pacing.suggested_mode==="silence"||pacing.cues?.pause_background===true;
}
/** Ranking is read-only; actual native validators and resources are checked again at execution. */
export function rankDirectorActions(db,{guildId,candidates,proposed,query=""}){
  const tokens=new Set(String(query).toLowerCase().match(/[a-z0-9]{3,}/g)||[]);
  const recent=db.listSimulationRecords(guildId,{kind:"action",status:"completed",limit:32});
  return (proposed.actions||[]).slice(0,32).flatMap((action,index)=>{
    if(!candidates.some(row=>row.type===action.actor_type&&row.key===normalizeNpcKey(action.actor_key))) return [];
    try{
      const {state,goal}=validateAction(db,guildId,action);if(state.resources[COSTS[action.type]]<1) return [];
      const knowledge=action.actor_type==="npc"?db.getNpcKnowledge(guildId,normalizeNpcKey(action.actor_key),action.information_key):null;
      const source=knowledge?.source_ref?db.getWorldEvent(guildId,knowledge.source_ref):null;
      if(source&&source.status!=="active") return [];
      const grounding=`${goal.objective||goal.data?.objective||""} ${knowledge?.content||""}`.toLowerCase();
      const overlap=[...tokens].filter(token=>grounding.includes(token)).length;
      const repetition=recent.filter(row=>row.entity_key===keyOf(action.actor_type,normalizeNpcKey(action.actor_key))
        &&row.data.type===action.type&&row.data.target_key===action.target_key&&row.data.information_key===action.information_key).length;
      const sourceProximity=source&&source.session_id===db.getActiveSession(guildId)?.id?4:0;
      const score=overlap*10+sourceProximity+Math.min(5,Number(goal.priority||0)/20)-repetition*8;
      return [{action,score,index,reason:{known_source:source?.event_key||null,overlap,repetition,source_proximity:sourceProximity}}];
    }catch{return [];}
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
}
export async function prepareNpcDirector({db,gm,guildId,layer,cycleKey,query="",minutes=0,engagement=null}={}){
  if(!["round","scene","downtime"].includes(layer)) throw new Error("NPC Director requires a fictional round, scene, or downtime trigger.");
  if(quietOpportunity(db,guildId,query,engagement)) return {quiet:true,guildId};
  if(db.isDirectorPaused(guildId)) return {paused:true,guildId};
  const cycleId=`simulation:${guildId}:${cycleKey}`;
  const prior=db.getSimulationRecord(guildId,cycleId);
  if(prior?.status==="completed") return {replayed:true,guildId};
  const candidates=simulationCandidates(db,guildId,{layer,query});
  const prepared=bindWorldResolutionCycle(db,guildId,{guildId,layer,cycleKey,minutes,cycleId,candidates,query,engagement});
  const proposed=candidates.length?await gm.planNpcActions({guildId,layer,query,candidates,cycleKey}):{actions:[]};
  return Object.assign(prepared,{proposed});
}

export function commitNpcDirector(db,prepared,{roll}={}){
  if(prepared.quiet||quietOpportunity(db,prepared.guildId,prepared.query,prepared.engagement)) return {quiet:true,actions:[],clock:db.getSimulationClock(prepared.guildId),
    telemetry:{used:0,institution_count:0,reason:"Quiet/OOC is a valid no-move; no time, work or provider request."}};
  if(prepared.paused||prepared.replayed) return {...prepared,actions:[]};
  const {guildId,layer,cycleKey,minutes,cycleId,candidates,proposed}=prepared;
  return db.transaction(()=>{
    // Recheck after awaiting generation in case another caller completed this cycle.
    if(db.getSimulationRecord(guildId,cycleId)?.status==="completed") return {replayed:true,actions:[]};
    if((proposed.ai_intents||[]).length||(proposed.actions||[]).length||db.listSimulationRecords(guildId,{kind:"action",status:"scheduled",limit:1}).length)
      db.snapshotCampaign(guildId,{label:"Pre-NPC Director",reason:`Before fictional ${layer} action cycle`,createdBy:"npc_director"});
    let budget=layer==="round"?1:layer==="scene"?3:4;
    db.advanceSimulationClock(guildId,{ticks:1,minutes});
    if(db.getCityCalendar(guildId).flags.activity_density===true||db.getCityCalendar(guildId).flags.narrative_relevance===true)
      return finishWorldResolutionCycle(db,guildId,prepared,commitFairOpportunity(db,prepared,{roll,budget}));
    const delegatedBudget={operations:0,cost:0};
    const intents=dispatchAiIntents(db,guildId,(proposed.ai_intents||[]).slice(0,budget),
      {origin:`npc-director:${cycleKey}`,scope:{mode:"party"},budget:delegatedBudget});
    const deferredIntents=dispatchAiIntents(db,guildId,(proposed.ai_intents||[]).slice(budget),
      {origin:`npc-director:${cycleKey}`,scope:{mode:"party"},deferred:true});
    budget-=intents.length;
    const actions=processSimulationEvents(db,guildId,{roll,maxActions:budget});
    const seen=new Set(actions.map(row=>row.entity_key));
    for(const action of (proposed.actions||[]).slice(0,budget)){
      if(actions.length>=budget) break;
      const actor=keyOf(action.actor_type,normalizeNpcKey(action.actor_key));
      const plan=db.listCityRecords(guildId,{kind:'strategy',actor,status:'active',includeGM:true,limit:1})[0];
      if(plan&&(db.getCityCalendar(guildId).flags.strategies===true||nativeWorldStrategyAllowed(db,guildId,plan)))continue;
      if(seen.has(actor)||!candidates.some(candidate=>keyOf(candidate.type,candidate.key)===actor)) continue;
      seen.add(actor);
      try{
        actions.push(db.transaction(()=>{
          const result=submitNpcAction(db,guildId,action,{cycleKey,roll});
          const candidate=candidates.find(packet=>keyOf(packet.type,packet.key)===actor);
          if(candidate.type==="npc") db.markNpcMemoriesRecalled(candidate.memories.map(memory=>memory.id));
          else for(const memory of candidate.memories){
            const record=db.getSimulationRecord(guildId,memory.id);
            saveRecord(db,guildId,record,{data:{...record.data,recall_count:Number(record.data.recall_count||0)+1,
              last_recalled_tick:db.getSimulationClock(guildId).tick}});
          }
          return result;
        }));
      }
      catch(error){actions.push({status:"blocked",error:error.message});}
    }
    db.putSimulationRecord(guildId,{id:cycleId,kind:"cycle",status:"completed",data:{layer,cycle_key:cycleKey,
      actions:actions.map(row=>row.id).filter(Boolean),blocked:actions.filter(row=>row.status==="blocked")}});
    runInstitutionDirector(db,guildId,cycleKey);
    const motivations=runMotivationCycle(db,guildId,Math.max(0,budget-actions.length),
      {onNativeProposal:payload=>delegateWorldGoal(db,guildId,payload,delegatedBudget)});
    const consequences=coordinateConsequences(db,guildId,Math.max(0,budget-actions.length-motivations.length),
      {onProposed:row=>delegateConsequence(db,guildId,row,delegatedBudget)});
    const strategies=runStrategyOpportunity(db,guildId,Math.max(0,budget-actions.length-motivations.length-consequences.length),
      {excludedActors:seen,delegationBudget:delegatedBudget});
    const group=actions.length+motivations.length+consequences.length+strategies.length<budget?proposeContactGroup(db,guildId):null;
    const remaining=budget-actions.length-motivations.length-consequences.length-strategies.length-(group?1:0);
    const memories=remaining>0?maintainMemory(db,guildId,delegatedBudget):[];
    if(remaining>memories.length) continueLongProjects(db,guildId,{limit:1,budget:delegatedBudget});
    proposeCityOpportunity(db,guildId,prepared.query||"","city_director");
    return finishWorldResolutionCycle(db,guildId,prepared,{clock:db.getSimulationClock(guildId),actions,intents:[...intents,...deferredIntents]});
  });
}
function commitFairOpportunity(db,prepared,{roll,budget}){
  const {guildId,layer,cycleKey,cycleId,candidates,proposed}=prepared,actions=[],seen=new Set(),work={};
  const ranked=db.getCityCalendar(guildId).flags.narrative_relevance===true?rankDirectorActions(db,prepared):null;
  const delegatedBudget={operations:0,cost:0};
  const handlers={
    ordinary:()=>{
      const due=db.listDueSimulationActions(guildId).find(row=>!seen.has(row.entity_key));
      if(due){seen.add(due.entity_key);try{const row=executeNpcAction(db,guildId,due,{approved:due.data.approved===true,roll});actions.push(row);return [row];}
        catch(error){const row=saveRecord(db,guildId,due,{status:"failed",data:{...due.data,failure:error.message}});actions.push(row);return [row];}}
      const action=(ranked?ranked.map(item=>item.action):proposed.actions||[]).find(item=>{
        const actor=keyOf(item.actor_type,normalizeNpcKey(item.actor_key));
        return !seen.has(actor)&&candidates.some(candidate=>keyOf(candidate.type,candidate.key)===actor)
          &&!db.listCityRecords(guildId,{kind:"strategy",actor,status:"active",includeGM:true,limit:1}).length;
      });
      if(!action) return [];
      seen.add(keyOf(action.actor_type,normalizeNpcKey(action.actor_key)));
      try{const row=submitNpcAction(db,guildId,action,{cycleKey,roll});actions.push(row);return [row];}
      catch(error){const row={status:"blocked",error:error.message};actions.push(row);return [row];}
    },
    motivation:()=>runMotivationCycle(db,guildId,1,{onNativeProposal:payload=>delegateWorldGoal(db,guildId,payload,delegatedBudget)}),
    consequence:()=>coordinateConsequences(db,guildId,1,{onProposed:row=>delegateConsequence(db,guildId,row,delegatedBudget)}),
    strategy:()=>{
      const rows=runStrategyOpportunity(db,guildId,1,{excludedActors:seen,delegationBudget:delegatedBudget});
      for(const row of rows){const actor=row.data?.result?.actor_key||row.actor_key;if(actor) seen.add(actor);}return rows;
    },
    group:()=>{const row=proposeContactGroup(db,guildId);return row?[row]:[];},
    memory:()=>maintainMemory(db,guildId,delegatedBudget),
    project:()=>continueLongProjects(db,guildId,{limit:1,budget:delegatedBudget})
  };
  if((proposed.ai_intents||[]).length) handlers.intents=()=>dispatchAiIntents(db,guildId,proposed.ai_intents.slice(0,1),
    {origin:`npc-director:${cycleKey}`,scope:{mode:"party"},budget:delegatedBudget});
  const names=Object.keys(handlers),start=db.getSimulationClock(guildId).tick%names.length;
  const order=names.slice(start).concat(names.slice(0,start));
  // Alternate relevance priority with the native rotating opportunity order; never starve other legal categories.
  if(ranked?.[0]?.score>0&&db.getSimulationClock(guildId).tick%2===0){order.splice(order.indexOf("ordinary"),1);order.unshift("ordinary");}
  let used=0;
  for(let i=0;i<names.length;i++){
    const name=order[i];
    if(used>=budget){work[name]={status:"deferred",reason:"fictional_opportunity_budget"};continue;}
    const rows=handlers[name]();used+=rows.length;work[name]={status:rows.length?"processed":"no_eligible_work",count:rows.length};
  }
  const deferredIntents=dispatchAiIntents(db,guildId,(proposed.ai_intents||[]).slice(work.intents?.status==="processed"?1:0),
    {origin:`npc-director:${cycleKey}`,scope:{mode:"party"},deferred:true});
  const institutions=runInstitutionDirector(db,guildId,cycleKey);
  const telemetry={layer,cycle_key:cycleKey,budget,used,work,institution_count:institutions.length,
    relevance:ranked?.slice(0,8).map(item=>({actor:item.action.actor_key,score:item.score,...item.reason}))||[],
    actor_count:candidates.length,packet_chars:JSON.stringify(candidates).length,rotation:start};
  db.putSimulationRecord(guildId,{id:cycleId,kind:"cycle",status:"completed",data:{...telemetry,actions:actions.map(row=>row.id).filter(Boolean)}});
  proposeCityOpportunity(db,guildId,prepared.query||"","city_director");
  return {clock:db.getSimulationClock(guildId),actions,telemetry,deferredIntents};
}

export async function runNpcDirector(options){
  return commitNpcDirector(options.db,await prepareNpcDirector(options),{roll:options.roll});
}

export function simulationOverview(db,guildId){
  return {clock:db.getSimulationClock(guildId),entities:db.listSimulationEntities(guildId),
    pending:db.listSimulationRecords(guildId,{kind:"action",status:"pending",limit:1000}),
    deferred:db.listSimulationRecords(guildId,{kind:"action",status:"deferred",limit:1000}),
    scheduled:db.listSimulationRecords(guildId,{kind:"action",status:"scheduled",limit:1000}),
    hooks:db.listSimulationRecords(guildId,{kind:"hook",status:"ready",limit:1000})};
}

/** Prompt packet stays bounded as the campaign grows; dashboard/export may inspect full state separately. */
export function simulationContext(db,guildId,query=""){
  const relevant=row=>intersects(query,`${row.entity_key} ${JSON.stringify(row.state||row.data)}`);
  const entities=db.listSimulationEntities(guildId).filter(relevant).slice(0,8);
  const records=kind=>db.listSimulationRecords(guildId,{kind,status:"active",limit:200}).filter(relevant).slice(0,12);
  return {clock:db.getSimulationClock(guildId),world_resolution:worldResolutionContext(db,guildId),
    native_outcomes:db.listSimulationRecords(guildId,{kind:'action',status:'completed',limit:8})
      .map(row=>inspectWorldSimulationReceipt(db,guildId,row.id)).filter(row=>row.status==='verified_native_receipt'),
    entities,obligations:records("obligation"),rumors:records("rumor"),residue:records("residue"),
    pending_count:db.listSimulationRecords(guildId,{kind:"action",status:"pending",limit:1000}).length};
}

export function acknowledgeSimulationHook(db,guildId,id){
  const row=db.getSimulationRecord(guildId,id);
  if(!row||row.kind!=="hook") throw new Error("Hook not found.");
  return saveRecord(db,guildId,row,{status:"delivered"});
}


import {saveNativeSimulationRecord as saveRecord,recordWorldActorMemory as remember,executeNpcAction,submitNpcAction,resolveNpcAction,processSimulationEvents} from './frameworks/world/public.js';
export {executeNpcAction,submitNpcAction,resolveNpcAction,processSimulationEvents} from './frameworks/world/public.js';

