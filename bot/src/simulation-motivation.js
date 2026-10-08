/** Sourced actor motivation transitions; proposals are subjective, bounded and private, never PC control or canon. */
import { createHash } from "node:crypto";
import { cityObject, cityKey, cityInteger, cityAudit } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { activeCityProxy, assertNpcAvailability } from "./city-constraints.js";
import { UserInputError, StateConflictError } from "./errors.js";
export const motivationKey=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,32);

export function actorSource(db,guildId,{actor_type,actor_key,information_key,source_event},{requireResources=true}={}){
  const event=requireCitySource(db,guildId,source_event);cityKey(actor_key);cityKey(information_key);
  let evidence,state;
  if(actor_type==="npc"){
    if(!db.getNpcProfile(guildId,actor_key)||activeCityProxy(db,guildId,actor_key)) throw new StateConflictError("Existing non-proxied NPC required.");
    state=db.getSimulationEntity(guildId,"npc",actor_key)?.state||{};
    assertNpcAvailability(db,guildId,actor_key,{type:"investigate",location_key:state.location_key});
    evidence=db.getNpcKnowledge(guildId,actor_key,information_key);
  }else if(actor_type==="faction"){
    state=db.getSimulationEntity(guildId,"faction",actor_key)?.state;
    evidence=db.listSimulationRecords(guildId,{kind:"awareness",entityKey:`faction:${actor_key}`,limit:1000})
      .find(row=>row.data.information_key===information_key)?.data;
  }else if(actor_type==="institution"){
    const institution=db.getCityRecord(guildId,"institution",actor_key);
    state=institution?.status==="active"?{resources:{information:institution.data.capacity},procedures:institution.data.procedures}:null;
    const report=db.getCityRecord(guildId,"report",information_key);
    if(report?.status==="active"&&report.actor_key===actor_key) evidence={...report.data,source_ref:report.source_event};
  }else throw new UserInputError("Only NPC, faction and institution motivations are supported; never PCs.");
  if(!state||state.removed||["dormant","dead","removed"].includes(state.activity_tier)||["dead","removed"].includes(state.status))
    throw new StateConflictError("Actor is unavailable.");
  if(!evidence||evidence.belief_state==="unknown"||![event.event_key,event.source_id].includes(evidence.source_ref))
    throw new StateConflictError("Actor has no legitimately acquired evidence for this source event.");
  if(requireResources&&(state.resources?.information??2)<1) throw new StateConflictError("Actor lacks feasible investigative resources.");
  return {event,evidence,state};
}
function currentGoal(db,guildId,type,key,goalKey){
  if(type==="npc") return db.getNpcGoal(guildId,key,goalKey);
  return db.listSimulationRecords(guildId,{kind:"goal",entityKey:`${type}:${key}`,limit:1000})
    .find(row=>row.data.goal_key===goalKey);
}
export function proposeGoalTransition(db,guildId,input,actorId="human_gm"){
  cityObject(input);
  if(db.getCityCalendar(guildId).flags.emergent_goals!==true) throw new StateConflictError("Emergent goals are opt-in.");
  const key=cityKey(input.key),prior=db.getCityRecord(guildId,"goal_transition",key);if(prior) return prior;
  const context=actorSource(db,guildId,input),op=input.op||"propose";cityKey(input.goal_key);
  if(!["propose","reprioritize","pause","supersede","abandon","complete","resume"].includes(op)) throw new UserInputError("Unknown goal operation.");
  const previous=currentGoal(db,guildId,input.actor_type,input.actor_key,input.goal_key);
  if(op==="propose"?!!previous:!previous) throw new StateConflictError("Goal existence does not match the requested transition.");
  const previousStatus=previous?.status;
  if(op==="resume"&&previousStatus!=="paused"||op==="pause"&&previousStatus!=="active"
    ||op==="reprioritize"&&!["active","paused"].includes(previousStatus)) throw new StateConflictError("Goal lifecycle does not permit this operation.");
  if(op==="propose"||op==="supersede"){
    if(typeof input.objective!=="string"||!input.objective.trim()||input.objective.length>1000) throw new UserInputError("Bounded objective required.");
    if(op==="supersede"&&(!input.new_goal_key||currentGoal(db,guildId,input.actor_type,input.actor_key,input.new_goal_key)))
      throw new StateConflictError("Supersession requires a new unused goal key.");
  }
  cityInteger(input.priority??50,0,100);cityInteger(input.confidence??context.evidence.confidence??50,0,100);
  for(const field of ["dependencies","acceptable_methods","conflicts"]) if(input[field]!==undefined
    &&(!Array.isArray(input[field])||input[field].length>20||input[field].some(value=>typeof value!=="string"||value.length>160)))
    throw new UserInputError("Bounded goal constraints required.");
  if(input.horizon&&!['near','long','immediate'].includes(input.horizon)) throw new UserInputError("Invalid goal horizon.");
  const profile=input.actor_type==="npc"?db.getNpcProfile(guildId,input.actor_key):null;
  if(input.reason!==undefined&&(typeof input.reason!=="string"||input.reason.length>1000)) throw new UserInputError("Bounded goal reason required.");
  if((input.acceptable_methods||[]).some(method=>["attack","sabotage","betray"].includes(method))
    &&(Number(profile?.decision_profile.violence_threshold??50)<60||Number(profile?.decision_profile.lawfulness??50)>=80))
    throw new StateConflictError("Goal methods conflict with established actor constraints.");
  return db.transaction(()=>{
    const after=db.saveCityRecord(guildId,{kind:"goal_transition",key,status:"pending",source_event:input.source_event,
      actor_key:`${input.actor_type}:${input.actor_key}`,data:{...input,op,before:previous,
        source_belief:context.evidence.belief_state||"reported",source_confidence:context.evidence.confidence??50,
        constraints:{personality:profile?.decision_profile||{},commitments_preserved:true,resources:context.state.resources||{}},
        reason:input.reason||"Sourced change in actor circumstances",created_by:actorId}});
    cityAudit(db,guildId,"goal_proposed",key,null,after,actorId);return after;
  });
}
export function reviewGoalTransition(db,guildId,input,actorId="human_gm"){
  const before=db.getCityRecord(guildId,"goal_transition",cityKey(input.key));
  if(!before) throw new StateConflictError("Goal transition not found.");
  if(before.status!=="pending") return before;
  if(!["approve","reject"].includes(input.decision)) throw new UserInputError("Explicit approve/reject required.");
  return db.transaction(()=>{
    const data=before.data,previous=currentGoal(db,guildId,data.actor_type,data.actor_key,data.goal_key);
    if(input.decision==="approve"){
      actorSource(db,guildId,data);
      if(JSON.stringify(previous)!==JSON.stringify(data.before)) throw new StateConflictError("Goal changed since proposal; create a fresh transition.");
      for(const dependency of data.dependencies||[]) if(!currentGoal(db,guildId,data.actor_type,data.actor_key,dependency))
        throw new StateConflictError("Goal dependency not found.");
      const status={propose:"active",reprioritize:previous?.status||"active",pause:"paused",supersede:"superseded",abandon:"abandoned",complete:"completed",resume:"active"}[data.op];
      const write=(goalKey,goalStatus,original)=>{
        const base=original?.data||original||{};
        if(data.actor_type==="npc") db.upsertNpcGoal(guildId,{npcKey:data.actor_key,goalKey,title:base.title||"Emergent agenda",
          objective:data.op==="supersede"&&goalKey===data.goal_key?base.objective:data.objective||base.objective,
          priority:data.priority??base.priority??50,status:goalStatus==="paused"?"active":goalStatus==="superseded"?"abandoned":goalStatus,progress:base.progress||0,
          horizon:data.horizon||base.horizon||"near",dependencies:data.dependencies||base.dependencies||[],
          acceptableMethods:data.acceptable_methods||base.acceptable_methods||[],rationale:base.rationale||data.reason,source:base.source||"sourced_goal_transition"});
        else db.putSimulationRecord(guildId,{...(original?{id:original.id}:{}),kind:"goal",entityKey:`${data.actor_type}:${data.actor_key}`,status:goalStatus,
          data:{...base,goal_key:goalKey,objective:data.op==="supersede"&&goalKey===data.goal_key?base.objective:data.objective||base.objective,
            priority:data.priority??base.priority??50,dependencies:data.dependencies||base.dependencies||[],source_event:data.source_event}});
        db.saveCityRecord(guildId,{kind:"goal_state",key:JSON.stringify([data.actor_type,data.actor_key,goalKey]),source_event:data.source_event,
          data:{status:goalStatus,transition:before.record_key}});
      };
      write(data.goal_key,status,previous);
      if(data.op==="supersede"){
        if(currentGoal(db,guildId,data.actor_type,data.actor_key,data.new_goal_key)) throw new StateConflictError("Superseding goal now exists.");
        write(data.new_goal_key,"active",null);
      }
    }
    const after=db.saveCityRecord(guildId,{...before,key:before.record_key,status:input.decision==="approve"?"approved":"rejected",
      data:{...before.data,reviewed_by:actorId}});
    cityAudit(db,guildId,"goal_review",before.record_key,before,after,actorId);return after;
  });
}

export function runMotivationCycle(db,guildId,budget=1){
  if(db.isDirectorPaused(guildId)||db.getCityCalendar(guildId).flags.emergent_goals!==true) return [];
  const results=[];
  const actors=[...db.listNpcProfiles(guildId,{limit:500}).map(row=>({type:"npc",key:row.npc_key})),
    ...db.listSimulationEntities(guildId,"faction").map(row=>({type:"faction",key:row.entity_key})),
    ...db.listCityRecords(guildId,{kind:"institution",status:"active",includeGM:true,limit:100}).map(row=>({type:"institution",key:row.record_key}))];
  for(const actor of actors){
    if(results.length>=Math.min(4,budget)) break;
    const knowledge=actor.type==="npc"?db.listNpcKnowledge(guildId,actor.key,{limit:20})
      :actor.type==="faction"?db.listSimulationRecords(guildId,{kind:"awareness",entityKey:`faction:${actor.key}`,limit:20}).map(row=>row.data)
      :db.listCityRecords(guildId,{kind:"report",actor:actor.key,status:"active",includeGM:true,limit:20})
        .map(row=>({...row.data,knowledge_key:row.record_key,source_ref:row.source_event}));
    for(const known of knowledge){
      if(results.length>=Math.min(4,budget)) break;
      if(known.belief_state==="unknown"||known.confidence<55) continue;
      const event=db.getWorldEvent(guildId,known.source_ref);if(!event||event.status!=="active") continue;
      const informationKey=known.knowledge_key||known.information_key;
      const key=`motivation:${motivationKey([actor.type,actor.key,informationKey,event.event_key])}`;
      if(db.getCityRecord(guildId,"goal_transition",key)) continue;
      try{results.push(proposeGoalTransition(db,guildId,{key,actor_type:actor.type,actor_key:actor.key,information_key:informationKey,
        source_event:event.event_key,goal_key:key,objective:`Investigate the report: ${known.content.slice(0,800)}`,op:"propose",
        acceptable_methods:["investigate","observe","research"],dependencies:[],priority:50,confidence:known.confidence,
        reason:"Known source creates an investigative opportunity; report remains subjective."},"motivation_director"));}
      catch{/* Unavailable/proxied actors and unverifiable sources cannot generate goals. */}
    }
  }
  return results;
}
