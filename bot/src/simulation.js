/** Fictional-time NPC/faction simulation. Models propose intent; bounded application rules resolve and persist outcomes. */
import { randomInt, randomUUID } from "node:crypto";
import { normalizeNpcKey, retrieveNpcCognition } from "./npc-cognition.js";
import { submitInstitutionAction, runInstitutionDirector, proposeCityOpportunity } from "./city-core.js";
import { assertNpcAvailability, npcAvailability, activeCityProxy } from "./city-constraints.js";
import { applyNpcServiceOutcome } from "./city-civic.js";
import { runMotivationCycle } from "./simulation-motivation.js";
import { coordinateConsequences } from "./city-consequences.js";
export { updateRelationshipDimensions } from "./relationship-state.js";

export const ACTION_TYPES=["investigate","travel","contact","recruit","observe","prepare","hide","acquire","spend_resource",
  "threaten","negotiate","attack","protect","repair","sabotage","research","spread_rumor","suppress_rumor","verify_rumor",
  "weaponize_rumor","request_favor","fulfill_obligation","betray","advance_project"];
export const MAJOR_IMPACTS=["major_npc_removal","major_location_destruction","faction_transformation","campaign_secret","supernatural_disaster"];
const RESOURCE_KEYS=["influence","materials","information","manpower","leverage","wounds","stress","favors"];
const DEFAULT_RESOURCES={influence:4,materials:4,information:2,manpower:2,leverage:1,wounds:0,stress:0,favors:0};
const COSTS={investigate:"information",research:"information",observe:"manpower",travel:"materials",contact:"influence",
  recruit:"influence",prepare:"materials",hide:"materials",acquire:"influence",spend_resource:"materials",threaten:"influence",
  negotiate:"influence",attack:"manpower",protect:"manpower",repair:"materials",sabotage:"materials",spread_rumor:"influence",
  suppress_rumor:"influence",verify_rumor:"information",weaponize_rumor:"influence",request_favor:"influence",
  fulfill_obligation:"materials",betray:"influence",advance_project:"materials"};
const keyOf=(type,key)=>`${type}:${key}`;
const bounded=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const text=(value)=>String(value||"").trim();
const tokens=value=>new Set(text(value).toLowerCase().match(/[a-z0-9]{3,}/g)||[]);
const intersects=(a,b)=>[...tokens(a)].some(word=>tokens(b).has(word));

function saveRecord(db,guildId,row,changes){
  return db.putSimulationRecord(guildId,{id:row.id,kind:row.kind,entityKey:row.entity_key,status:row.status,
    dueTick:row.due_tick,dueMinute:row.due_minute,data:row.data,...changes});
}

export function actorState(db,guildId,type,key){
  const row=db.getSimulationEntity(guildId,type,key);
  return {activity_tier:"supporting",location_key:"",preparation:0,position:0,traits:0,voice:{},personality:{},
    ...row?.state,resources:{...DEFAULT_RESOURCES,...row?.state?.resources}};
}

/** GM configuration is explicit; the AI cannot grant itself new resources. */
export function configureSimulationEntity(db,guildId,type,key,patch){
  if(!["npc","faction","location"].includes(type)||!text(key)) throw new Error("Use an npc, faction, or location with a nonempty key.");
  if(type!=="location") key=normalizeNpcKey(key);
  if(!key) throw new Error("Entity key must contain letters or numbers.");
  if(!patch||typeof patch!=="object"||Array.isArray(patch)) throw new Error("State must be a JSON object.");
  const old=type==="location"?(db.getSimulationEntity(guildId,type,key)?.state||{}):actorState(db,guildId,type,key);
  const next={...old,...patch};
  if(type!=="location"){
    if(!["active","supporting","background","dormant"].includes(next.activity_tier)) throw new Error("Invalid activity tier.");
    next.resources={...old.resources,...patch.resources};
    for(const resource of RESOURCE_KEYS){
      const value=next.resources[resource];
      if(!Number.isInteger(value)||value<0||value>100) throw new Error(`${resource} must be an integer from 0 to 100.`);
    }
    for(const resource of Object.keys(next.resources)) if(!RESOURCE_KEYS.includes(resource)) throw new Error(`Unknown resource: ${resource}`);
    for(const name of ["preparation","position","traits"]) next[name]=bounded(next[name],0,5);
  }
  return db.setSimulationEntity(guildId,type,key,next);
}

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
  const npcs=db.listNpcProfiles(guildId,{limit:500}).map(profile=>({type:"npc",key:profile.npc_key,profile}));
  const factions=db.listSimulationEntities(guildId,"faction").map(row=>({type:"faction",key:row.entity_key,profile:row.state}));
  return [...npcs,...factions].map(actor=>{
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
    const eligible=!(actor.type==="npc"&&activeCityProxy(db,guildId,actor.key))&&!state.removed&&state.activity_tier!=="dormant"&&goals.length&&
      (state.activity_tier==="active"||(state.activity_tier==="supporting"&&relevant)||layer==="downtime");
    return {...actor,state,goals,eligible};
  }).filter(actor=>actor.eligible).sort((a,b)=>Number(b.goals[0]?.priority||0)-Number(a.goals[0]?.priority||0)).slice(0,8).map(actor=>{
    const {state,goals}=actor;
    const awareness=db.listSimulationRecords(guildId,{kind:"awareness",entityKey:keyOf(actor.type,actor.key),limit:50});
    const knowledge=actor.type==="npc"?db.listNpcKnowledge(guildId,actor.key,{limit:50}):awareness.map(row=>row.data);
    const obligations=db.listSimulationRecords(guildId,{kind:"obligation",status:"active",limit:100})
      .filter(row=>[row.data.debtor,row.data.creditor].includes(keyOf(actor.type,actor.key)));
    return {...actor,state,goals,knowledge,awareness,obligations,memories:actorMemories(db,guildId,actor,query),
      availability:actor.type==="npc"?npcAvailability(db,guildId,actor.key):null,
      location:db.getSimulationEntity(guildId,"location",state.location_key)?.state||{},
      relationships:db.listSimulationEntities(guildId,"relationship").filter(row=>
        [row.state.from,row.state.to].includes(keyOf(actor.type,actor.key))).map(row=>row.state)};
  });
}

function remember(db,guildId,type,key,content,{source="witnessed",confidence=90,importance=60,subjectType="entity",subjectKey="",sourceRef=""}={}){
  if(type==="npc"){
    const row=db.addNpcMemory(guildId,{npcKey:key,content,sourceType:source,confidence,importance,subjectType,subjectKey,sourceRef});
    db.annotateNpcMemory(guildId,row.id,{sessionId:db.getActiveSession(guildId)?.id||null,
      scene:db.getActiveSession(guildId)?.id?db.getDirectorState(db.getActiveSession(guildId).id).scene_label||"":"",
      tick:db.getSimulationClock(guildId).tick});
    return row;
  }
  return db.putSimulationRecord(guildId,{kind:"memory",entityKey:keyOf(type,key),
    data:{content,source_type:source,confidence,importance,subject_type:subjectType,subject_key:subjectKey,source_ref:sourceRef,
      created_tick:db.getSimulationClock(guildId).tick}});
}

function knownInformation(db,guildId,type,key,informationKey){
  if(!informationKey) return null;
  if(type==="npc"){
    const knowledge=db.getNpcKnowledge(guildId,key,informationKey);
    if(knowledge&&knowledge.belief_state!=="unknown") return {content:knowledge.content,confidence:knowledge.confidence,belief_state:knowledge.belief_state};
  }
  return db.listSimulationRecords(guildId,{kind:"awareness",entityKey:keyOf(type,key),limit:1000})
    .find(row=>row.data.information_key===informationKey)?.data||null;
}

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
    const data=JSON.parse(update.data_json||"{}");
    const actorKey=normalizeNpcKey(update.actor_key);
    const entity=keyOf(update.actor_type||"npc",actorKey);
    const confidence=bounded(update.confidence??100,0,100);
    if(confidence<55) continue;
    const content=text(update.content);
    if(["faction_memory","faction_goal"].includes(update.kind)&&!db.getSimulationEntity(guildId,"faction",actorKey))
      configureSimulationEntity(db,guildId,"faction",actorKey,{activity_tier:"supporting"});
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

function validateAction(db,guildId,action){
  if(!ACTION_TYPES.includes(action.type)||!["npc","faction"].includes(action.actor_type)) throw new Error("Unknown autonomous action/actor type.");
  const key=normalizeNpcKey(action.actor_key);
  if(action.actor_type==="npc"&&!db.getNpcProfile(guildId,key)) throw new Error("Autonomous NPC profile is missing.");
  if(action.actor_type==="npc") assertNpcAvailability(db,guildId,key,action);
  if(action.actor_type==="faction"&&!db.getSimulationEntity(guildId,"faction",key)) throw new Error("Autonomous faction is missing.");
  if(!["routine",...MAJOR_IMPACTS].includes(action.significance||"routine")) throw new Error("Invalid action significance.");
  for(const field of ["delay_ticks","delay_minutes"]){
    if(!Number.isSafeInteger(action[field]??0)||(action[field]??0)<0||(action[field]??0)>525600) throw new Error("Invalid fictional delay.");
  }
  const factionGoal=action.actor_type==="faction"?db.getSimulationRecord(guildId,action.goal_key):null;
  const goal=action.actor_type==="npc"?db.getNpcGoal(guildId,key,action.goal_key):factionGoal?.kind==="goal"
    &&factionGoal.entity_key===keyOf("faction",key)?{...factionGoal.data,goal_key:factionGoal.id,status:factionGoal.status}:null;
  if(!goal||goal.status!=="active") throw new Error("Autonomous action requires an active goal.");
  const dependenciesComplete=(goal.dependencies||[]).every(dependency=>action.actor_type==="npc"
    ?db.getNpcGoal(guildId,key,dependency)?.status==="completed"
    :db.getSimulationRecord(guildId,dependency)?.status==="completed");
  if(!dependenciesComplete) throw new Error("Goal dependencies are not completed.");
  const methods=(goal.acceptable_methods||[]).filter(method=>ACTION_TYPES.includes(method));
  if(methods.length&&!methods.includes(action.type)) throw new Error("Action violates the goal's acceptable methods.");
  const state=actorState(db,guildId,action.actor_type,key);
  const profile=action.actor_type==="npc"?db.getNpcProfile(guildId,key):{};
  const personality={...profile.decision_profile,...state.personality};
  if(state.removed) throw new Error("Removed actors cannot take autonomous actions.");
  if(["attack","sabotage","betray"].includes(action.type)&&Number(personality.violence_threshold??50)<60)
    throw new Error("NPC decision profile does not permit this aggressive action.");
  if(action.type==="betray"&&Number(personality.loyalty??50)>=70) throw new Error("Action conflicts with established loyalty.");
  if(action.information_key&&!knownInformation(db,guildId,action.actor_type,key,action.information_key))
    throw new Error("NPC cannot act on information it has not learned.");
  if(["spread_rumor","suppress_rumor","verify_rumor","weaponize_rumor"].includes(action.type)){
    const rumor=db.getSimulationRecord(guildId,action.rumor_id);
    if(!rumor||rumor.kind!=="rumor"||!rumor.data.holders?.includes(keyOf(action.actor_type,key))) throw new Error("Actor has not heard that rumor.");
  }
  if(action.obligation_id){
    const obligation=db.getSimulationRecord(guildId,action.obligation_id);
    if(!obligation||obligation.kind!=="obligation"||obligation.status!=="active"||
      ![obligation.data.debtor,obligation.data.creditor].includes(keyOf(action.actor_type,key))) throw new Error("Actor is not party to an active obligation.");
  }
  if(action.type==="fulfill_obligation"&&!action.obligation_id) throw new Error("Fulfilling an obligation requires its ID.");
  if(action.target_type==="character") throw new Error("Autonomous actions cannot choose PC actions or resolve attacks against PCs.");
  if(action.target_type===action.actor_type&&action.target_key===key) throw new Error("An opposed action cannot target its own actor.");
  if(action.target_type==="npc"&&!db.getNpcProfile(guildId,action.target_key)) throw new Error("Target NPC is missing.");
  if(action.target_type==="npc"&&actorState(db,guildId,"npc",action.target_key).removed) throw new Error("Target NPC has been removed from play.");
  if(action.target_type==="faction"&&!db.getSimulationEntity(guildId,"faction",action.target_key)) throw new Error("Target faction is missing.");
  if(action.private_user_id&&!db.getPlayer(guildId,action.private_user_id)) throw new Error("Private hook recipient is not a campaign player.");
  if(["investigate","observe","sabotage","repair"].includes(action.type)&&action.location_key!==state.location_key)
    throw new Error("Actor must reach the location before acting there.");
  if(["attack","sabotage"].includes(action.type)&&Number(personality.risk_tolerance??50)<30)
    throw new Error("Action violates the NPC's established risk tolerance.");
  if(["sabotage","betray"].includes(action.type)&&Number(personality.lawfulness??50)>=80)
    throw new Error("Action violates the NPC's established lawfulness.");
  const location=db.getSimulationEntity(guildId,"location",action.location_key||state.location_key)?.state||{};
  if(action.type==="attack"&&Number(personality.collateral_aversion??50)>=80&&(location.witnesses||[]).length)
    throw new Error("Action conflicts with the NPC's collateral-damage boundary in an occupied location.");
  return {key,state,goal,personality};
}

/** Application-generated opposed results, including resource, position, and preparation constraints. */
export function executeNpcAction(db,guildId,record,{approved=false,roll=()=>randomInt(1,21)}={}){
  return db.transaction(()=>{
    const current=db.getSimulationRecord(guildId,record.id);
    if(!current||current.kind!=="action") throw new Error("Action not found.");
    if(["completed","failed","rejected"].includes(current.status)) return current;
    if(current.status==="pending"&&!approved) return current;
    const action=current.data;
    const {key,state,goal}=validateAction(db,guildId,action);
    if(action.significance!=="routine"&&!approved) return saveRecord(db,guildId,current,{status:"pending"});
    const clock=db.getSimulationClock(guildId);
    if((current.due_tick!==null&&current.due_tick>clock.tick)||(current.due_minute!==null&&current.due_minute>clock.minute))
      return saveRecord(db,guildId,current,{status:"scheduled"});
    const resource=COSTS[action.type];
    if(state.resources[resource]<1) return saveRecord(db,guildId,current,{status:"failed",data:{...action,failure:"Insufficient resources"}});
    const target=["npc","faction"].includes(action.target_type)?actorState(db,guildId,action.target_type,action.target_key):null;
    const attackRoll=roll(),defenseRoll=target?roll():10;
    if(![attackRoll,defenseRoll].every(n=>Number.isInteger(n)&&n>=1&&n<=20)) throw new Error("Resolution dice must be from 1 to 20.");
    const conditionPenalty=actor=>Math.min(10,Math.floor((actor.resources.wounds+actor.resources.stress)/2));
    const attack=attackRoll+Math.min(5,state.resources[resource])+Number(state.preparation||0)+Number(state.position||0)+Number(state.traits||0)-conditionPenalty(state);
    const defense=defenseRoll+(target?Math.min(5,target.resources[resource])+Number(target.preparation||0)+Number(target.position||0)+Number(target.traits||0)-conditionPenalty(target):0);
    const success=attack>=defense;
    state.resources[resource]--;
    state.resources.stress=bounded(state.resources.stress+(success?0:1),0,100);
    if(action.type==="travel"&&success) state.location_key=action.location_key||action.target_key;
    if(action.type==="prepare"&&success) state.preparation=bounded(state.preparation+1,0,5);
    if(action.type==="acquire"&&success) state.resources.materials=bounded(state.resources.materials+1,0,100);
    if(action.type==="recruit"&&success) state.resources.manpower=bounded(state.resources.manpower+1,0,100);
    if(action.type==="hide"&&success) state.position=bounded(state.position+1,0,5);
    db.setSimulationEntity(guildId,action.actor_type,key,state);
    const result={success,attack_roll:attackRoll,defense_roll:defenseRoll,attack,defense,resource_cost:{[resource]:1}};
    const content=`${action.type} ${action.target_key||action.location_key||""}: ${success?"succeeded":"did not succeed"}. ${action.rationale||""}`;
    remember(db,guildId,action.actor_type,key,content,{sourceRef:current.id,subjectType:action.target_type||"entity",subjectKey:action.target_key||""});
    if(target&&["attack","protect","threaten","negotiate","contact"].includes(action.type))
      remember(db,guildId,action.target_type,action.target_key,content,{sourceRef:current.id,subjectType:action.actor_type,subjectKey:key});
    if(success){
      applyActionConsequences(db,guildId,action,{key,state,target,goal,content,actionId:current.id});
      if(approved&&action.significance!=="routine") applyConsequentialAction(db,guildId,action,current.id);
      if(action.actor_type==="npc") db.upsertNpcGoal(guildId,{npcKey:key,goalKey:goal.goal_key,title:goal.title,objective:goal.objective,
        horizon:goal.horizon,priority:goal.priority,progress:bounded(goal.progress+10,0,100),status:goal.progress>=90?"completed":"active",
        dependencies:goal.dependencies,acceptableMethods:goal.acceptable_methods,rationale:content,source:"npc_director"});
      else {
        const old=db.getSimulationRecord(guildId,goal.goal_key);
        saveRecord(db,guildId,old,{status:Number(goal.progress||0)>=90?"completed":"active",data:{...old.data,progress:bounded(Number(goal.progress||0)+10,0,100)}});
      }
      // A durable hook is delivered only through the normal publishing boundary.
      if(action.public_hook) db.putSimulationRecord(guildId,{kind:"hook",entityKey:current.id,status:"ready",
        data:{content:action.public_hook,target_user_id:action.private_user_id||"",visibility:action.private_user_id?"player":"party",action_id:current.id}});
    }
    const completed=saveRecord(db,guildId,current,{status:"completed",data:{...action,result}});
    const mutation=db.recordMutation(guildId,{actorType:"ai",actorId:key,sourceLayer:"npc_director",mutationType:`npc_action:${action.type}`,
      entityKey:current.id,visibility:"gm",before:current,after:completed,rationale:content,payload:result});
    if(success) applyNpcServiceOutcome(db,guildId,action,mutation);
    return completed;
  });
}

function applyActionConsequences(db,guildId,action,{key,state,target,goal,content,actionId}){
  const actor=keyOf(action.actor_type,key);
  if(action.information_key&&action.target_key&&["contact","negotiate","request_favor"].includes(action.type))
    shareInformation(db,guildId,{fromType:action.actor_type,fromKey:key,toType:action.target_type,toKey:action.target_key,informationKey:action.information_key});
  if(target&&["attack","protect","threaten","negotiate","betray","contact"].includes(action.type)){
    if(action.type==="attack") target.resources.wounds=bounded(target.resources.wounds+1,0,100);
    if(action.type==="protect") target.position=bounded(target.position+1,0,5);
    db.setSimulationEntity(guildId,action.target_type,action.target_key,target);
    const dimension={attack:"fear",threaten:"fear",betray:"suspicion",protect:"trust",negotiate:"trust",contact:"trust"}[action.type];
    const existing=db.findRelationship(guildId,{fromType:action.target_type,fromKey:action.target_key,toType:action.actor_type,toKey:key,relationshipType:dimension});
    db.upsertRelationship(guildId,{fromType:action.target_type,fromKey:action.target_key,toType:action.actor_type,toKey:key,
      relationshipType:dimension,score:bounded(Number(existing?.score||0)+1,-5,5),visibility:"gm",note:content,source:"npc_director"});
  }
  if(["investigate","observe"].includes(action.type)){
    const location=action.location_key||state.location_key;
    const residues=db.listSimulationRecords(guildId,{kind:"residue",entityKey:location,status:"active",limit:30});
    for(const residue of residues.slice(0,3)) for(const evidence of residue.data.evidence.slice(0,3)){
      if(typeof evidence!=="string") continue;
      const informationKey=`residue:${residue.id}:${normalizeNpcKey(evidence).slice(0,60)}`;
      db.putSimulationRecord(guildId,{kind:"awareness",entityKey:actor,
        data:{information_key:informationKey,content:evidence,confidence:85,source_type:"witnessed",source_ref:residue.id}});
      if(action.actor_type==="npc") db.upsertNpcKnowledge(guildId,{npcKey:key,knowledgeKey:informationKey,content:evidence,
        beliefState:"suspected",confidence:85,sourceType:"witnessed",sourceRef:residue.id,isSecret:true});
    }
    db.upsertThread(guildId,{id:`npc-investigation:${actor}:${goal.goal_key}`,label:goal.objective,status:"active",visibility:"gm",
      notes:`NPC investigation; player knowledge is separate. ${content}`});
  }
  if(action.hypothesis&&action.actor_type==="npc"&&["investigate","observe","research"].includes(action.type)){
    const supported=action.information_key||db.listSimulationRecords(guildId,{kind:"awareness",entityKey:actor,limit:100})
      .some(row=>row.data.source_type==="witnessed");
    if(supported) db.upsertNpcKnowledge(guildId,{npcKey:key,knowledgeKey:`hypothesis:${actionId}`,content:text(action.hypothesis).slice(0,1000),
      beliefState:"suspected",confidence:60,sourceType:"inferred",sourceRef:actionId,isSecret:true});
  }
  if(["repair","sabotage"].includes(action.type)&&action.location_key){
    const location=db.getSimulationEntity(guildId,"location",action.location_key)?.state||{};
    db.setSimulationEntity(guildId,"location",action.location_key,{...location,
      incidents:[...(location.incidents||[]).slice(-19),{action_id:actionId,type:action.type,content}],
      minor_damage:bounded(Number(location.minor_damage||0)+(action.type==="repair"?-1:1),0,5)});
  }
  if(action.obligation_id&&["fulfill_obligation","request_favor"].includes(action.type)){
    const obligation=db.getSimulationRecord(guildId,action.obligation_id);
    if(action.type==="fulfill_obligation"&&obligation.data.debtor!==actor) throw new Error("Only the debtor can fulfill this obligation.");
    if(action.type==="request_favor"&&obligation.data.creditor!==actor) throw new Error("Only the creditor can call in this obligation.");
    saveRecord(db,guildId,obligation,{status:action.type==="fulfill_obligation"?"fulfilled":"active",
      data:{...obligation.data,lifecycle:action.type==="fulfill_obligation"?"fulfilled":"called_in"}});
  }
  if(action.rumor_id){
    const rumor=db.getSimulationRecord(guildId,action.rumor_id);
    const data={...rumor.data,holders:[...rumor.data.holders]};
    if(action.type==="suppress_rumor") data.credibility=bounded(data.credibility-15,0,100);
    if(action.type==="verify_rumor"){
      const evidence=knownInformation(db,guildId,action.actor_type,key,action.information_key||data.subject);
      const corroborated=evidence?.belief_state==="known"&&text(evidence.content).toLowerCase()===text(data.content).toLowerCase();
      data.verification={status:corroborated?"subjectively_corroborated":"unresolved",source_key:action.information_key||data.subject,
        actor,action_id:actionId};
      if(corroborated) data.credibility=Math.min(95,Math.max(data.credibility,evidence.confidence));
    }
    if(["spread_rumor","weaponize_rumor"].includes(action.type)&&action.target_key){
      const holder=keyOf(action.target_type,action.target_key);
      if(!data.holders.includes(holder)) data.holders.push(holder);
      data.distortion=bounded(data.distortion+1,0,100);
      data.credibility=bounded(data.credibility-5,0,100);
      if(action.target_type==="npc") db.upsertNpcKnowledge(guildId,{npcKey:action.target_key,knowledgeKey:`rumor:${rumor.id}`,
        content:data.content,beliefState:"rumor",confidence:data.credibility,sourceType:"rumor",sourceRef:actor,isSecret:true});
      if(action.target_type==="npc") remember(db,guildId,"npc",action.target_key,`Heard a rumor: ${data.content}`,
        {source:"rumor",confidence:data.credibility,importance:40,sourceRef:actor});
      if(action.type==="weaponize_rumor") data.weaponizations=[...(data.weaponizations||[]),{actor,target:holder,action_id:actionId}];
    }
    saveRecord(db,guildId,rumor,{data});
  }
}

export function submitNpcAction(db,guildId,action,{cycleKey="manual",approved=false,roll}={}){
  return db.transaction(()=>{
    const normalized={...action,actor_key:normalizeNpcKey(action.actor_key),significance:action.significance||"routine"};
    validateAction(db,guildId,normalized);
    const clock=db.getSimulationClock(guildId);
    const delayed=Boolean(action.delay_ticks||action.delay_minutes);
    const row=db.putSimulationRecord(guildId,{kind:"action",entityKey:keyOf(normalized.actor_type,normalized.actor_key),
      status:normalized.significance!=="routine"&&!approved?"pending":delayed?"scheduled":"ready",
      dueTick:action.delay_ticks?clock.tick+action.delay_ticks:null,dueMinute:action.delay_minutes?clock.minute+action.delay_minutes:null,
      data:{...normalized,cycle_key:cycleKey}});
    return executeNpcAction(db,guildId,row,{approved,roll});
  });
}

export function resolveNpcAction(db,guildId,id,{decision,patch={},roll,actorId="gm"}={}){
  return db.transaction(()=>{
    const row=db.getSimulationRecord(guildId,id);
    if(!row||row.kind!=="action"||!["pending","deferred"].includes(row.status)) throw new Error("Pending consequential action not found.");
    db.recordMutation(guildId,{actorType:"human_gm",actorId,sourceLayer:"npc_director_review",
      mutationType:`npc_review:${decision}`,entityKey:id,before:row,payload:{decision,patch}});
    if(decision==="reject") return saveRecord(db,guildId,row,{status:"rejected"});
    if(decision==="defer") return saveRecord(db,guildId,row,{status:"deferred"});
    if(!["approve","modify"].includes(decision)) throw new Error("Choose approve, modify, defer, or reject.");
    const modified={...row.data,...patch,approved:true,reviewed_by:actorId};
    if(modified.actor_key!==row.data.actor_key||modified.actor_type!==row.data.actor_type) throw new Error("Review cannot substitute a different actor.");
    validateAction(db,guildId,modified);
    const clock=db.getSimulationClock(guildId);
    saveRecord(db,guildId,row,{data:modified,status:"ready",
      dueTick:Object.hasOwn(patch,"delay_ticks")?(patch.delay_ticks?clock.tick+patch.delay_ticks:null):row.due_tick,
      dueMinute:Object.hasOwn(patch,"delay_minutes")?(patch.delay_minutes?clock.minute+patch.delay_minutes:null):row.due_minute});
    return executeNpcAction(db,guildId,row,{approved:true,roll});
  });
}

export function processSimulationEvents(db,guildId,{roll,maxActions=4}={}){
  return db.listDueSimulationActions(guildId).slice(0,maxActions)
    .map(row=>{
      try{return executeNpcAction(db,guildId,row,{approved:row.data.approved===true,roll});}
      catch(error){return saveRecord(db,guildId,row,{status:"failed",data:{...row.data,failure:error.message}});}
    });
}

function applyConsequentialAction(db,guildId,action,actionId){
  if(action.significance==="major_npc_removal"){
    if(action.target_type!=="npc") throw new Error("Named NPC removal requires an NPC target.");
    const state=actorState(db,guildId,"npc",action.target_key);
    db.setSimulationEntity(guildId,"npc",action.target_key,{...state,removed:true,removal_reason:action.rationale,reviewed_action:actionId});
  }else if(action.significance==="major_location_destruction"||action.significance==="supernatural_disaster"){
    if(!action.location_key) throw new Error("Major location consequences require a location key.");
    const state=db.getSimulationEntity(guildId,"location",action.location_key)?.state||{};
    db.setSimulationEntity(guildId,"location",action.location_key,{...state,
      [action.significance==="major_location_destruction"?"destroyed":"supernatural_disaster"]:true,reviewed_action:actionId});
  }else if(action.significance==="faction_transformation"){
    if(action.target_type!=="faction") throw new Error("Faction transformation requires a faction target.");
    const state=actorState(db,guildId,"faction",action.target_key);
    db.setSimulationEntity(guildId,"faction",action.target_key,{...state,policy:action.rationale,reviewed_action:actionId});
  }else if(action.significance==="campaign_secret"){
    const known=knownInformation(db,guildId,action.actor_type,action.actor_key,action.information_key);
    if(!known) throw new Error("Actor cannot reveal a secret they do not know.");
    db.addFact(guildId,{key:action.information_key,category:known.belief_state==="rumor"?"rumor":"clue",content:known.content,
      visibility:"party",source:"gm_approved_npc_report",confidence:known.confidence,provenance:{reviewed_action:actionId,subjective:true}});
  }
}

/** Called only by fictional round/scene/downtime triggers, with a stable retry key. */
export async function prepareNpcDirector({db,gm,guildId,layer,cycleKey,query="",minutes=0}={}){
  if(!["round","scene","downtime"].includes(layer)) throw new Error("NPC Director requires a fictional round, scene, or downtime trigger.");
  if(db.isDirectorPaused(guildId)) return {paused:true,guildId};
  const cycleId=`simulation:${guildId}:${cycleKey}`;
  const prior=db.getSimulationRecord(guildId,cycleId);
  if(prior?.status==="completed") return {replayed:true,guildId};
  const candidates=simulationCandidates(db,guildId,{layer,query});
  const proposed=candidates.length?await gm.planNpcActions({guildId,layer,query,candidates}):{actions:[]};
  return {guildId,layer,cycleKey,minutes,cycleId,candidates,proposed,query};
}

export function commitNpcDirector(db,prepared,{roll}={}){
  if(prepared.paused||prepared.replayed) return {...prepared,actions:[]};
  const {guildId,layer,cycleKey,minutes,cycleId,candidates,proposed}=prepared;
  return db.transaction(()=>{
    // Recheck after awaiting generation in case another caller completed this cycle.
    if(db.getSimulationRecord(guildId,cycleId)?.status==="completed") return {replayed:true,actions:[]};
    if((proposed.actions||[]).length||db.listSimulationRecords(guildId,{kind:"action",status:"scheduled",limit:1}).length)
      db.snapshotCampaign(guildId,{label:"Pre-NPC Director",reason:`Before fictional ${layer} action cycle`,createdBy:"npc_director"});
    const budget=layer==="round"?1:layer==="scene"?3:4;
    db.advanceSimulationClock(guildId,{ticks:1,minutes});
    const actions=processSimulationEvents(db,guildId,{roll,maxActions:budget});
    const seen=new Set(actions.map(row=>row.entity_key));
    for(const action of (proposed.actions||[]).slice(0,budget)){
      if(actions.length>=budget) break;
      const actor=keyOf(action.actor_type,normalizeNpcKey(action.actor_key));
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
    const motivations=runMotivationCycle(db,guildId,Math.max(0,budget-actions.length));
    coordinateConsequences(db,guildId,Math.max(0,budget-actions.length-motivations.length));
    proposeCityOpportunity(db,guildId,prepared.query||"","city_director");
    return {clock:db.getSimulationClock(guildId),actions};
  });
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
  return {clock:db.getSimulationClock(guildId),entities,obligations:records("obligation"),rumors:records("rumor"),residue:records("residue"),
    pending_count:db.listSimulationRecords(guildId,{kind:"action",status:"pending",limit:1000}).length};
}

export function acknowledgeSimulationHook(db,guildId,id){
  const row=db.getSimulationRecord(guildId,id);
  if(!row||row.kind!=="hook") throw new Error("Hook not found.");
  return saveRecord(db,guildId,row,{status:"delivered"});
}
