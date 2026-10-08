/** Durable bounded actor plans referencing existing goals; every step uses existing action/capacity/review resolvers, never direct PC or canon mutation. */
import { cityObject, cityKey, cityInteger, cityAudit } from "./city-calendar.js";
import { submitInstitutionAction, reviewInstitutionAction } from "./city-core.js";
import { actorSource, motivationKey } from "./simulation-motivation.js";
import { ACTION_TYPES, ACTION_COSTS, actorState, submitNpcAction } from "./simulation.js";
import { UserInputError, StateConflictError } from "./errors.js";
import { delegateStrategy } from "./ai-intents.js";
function objective(db,guild,input){
  if(input.actor_type==="npc") return db.getNpcGoal(guild,input.actor_key,input.goal_key);
  return db.listSimulationRecords(guild,{kind:"goal",entityKey:`${input.actor_type}:${input.actor_key}`,limit:1000})
    .find(row=>row.id===input.goal_key||row.data.goal_key===input.goal_key);
}
function validatePlan(db,guild,input){
  actorSource(db,guild,input,{requireResources:false});
  const goal=objective(db,guild,input);
  if(!goal||goal.status!=="active") throw new StateConflictError("Strategy needs an active actor-owned objective.");
  cityInteger(input.cost_ceiling,1,20);
  if(input.deadline_minute!==undefined) cityInteger(input.deadline_minute,0,1000000000);
  if(!Array.isArray(input.steps)||!input.steps.length||input.steps.length>12||input.steps.length>input.cost_ceiling) throw new UserInputError("One to twelve feasible steps within the cost ceiling required.");
  const seen=new Set();
  for(const step of input.steps){
    cityKey(step.key);cityObject(step.action);
    if(seen.has(step.key)||!Array.isArray(step.requires)||step.requires.some(key=>!seen.has(key))) throw new UserInputError("Steps require an ordered, acyclic prerequisite graph.");
    seen.add(step.key);
    if(["actor_type","actor_key","goal_key","institution","source_event","approved","reviewed_by"].some(field=>Object.hasOwn(step.action,field)))
      throw new UserInputError("Strategy step cannot substitute authority or self-approve effects.");
    if(input.actor_type!=="institution"&&!ACTION_TYPES.includes(step.action.type)) throw new UserInputError("Existing action type required.");
    if(step.action.target_type&&!["npc","faction","location","institution","district"].includes(step.action.target_type)) throw new UserInputError("No PC targets in autonomous plans.");
    if(step.action.public_hook||step.action.private_user_id) throw new UserInputError("Plan execution cannot invent disclosure or player hooks.");
  }
  for(const field of ["alternatives","risks"]) if(input[field]!==undefined&&(!Array.isArray(input[field])||input[field].length>8
    ||input[field].some(value=>typeof value!=="string"||value.length>300))) throw new UserInputError("Bounded subjective options/risks required.");
  return goal;
}
export function manageStrategy(db,guild,input,actorId){
  cityObject(input);if(db.getCityCalendar(guild).flags.strategies!==true) throw new StateConflictError("Strategies are opt-in.");
  const key=cityKey(input.key),before=db.getCityRecord(guild,"strategy",key),op=input.op||"propose";
  if(op==="propose"||op==="replan"){
    if(op==="propose"&&before) return before;
    if(op==="replan"&&(!before||!["active","blocked"].includes(before.status)||input.source_event===before.source_event))
      throw new StateConflictError("Replan requires a material new legitimately known source and an open plan.");
    if(op==="replan"&&before.data.steps.some(step=>step.status==="submitted"))
      throw new StateConflictError("Reconcile the submitted action before replanning; pause to cancel a queued action.");
    const next={...before?.data,...input};
    if(before&&(next.actor_type!==before.data.actor_type||next.actor_key!==before.data.actor_key||next.goal_key!==before.data.goal_key))
      throw new StateConflictError("Replan cannot substitute its owner or objective.");
    validatePlan(db,guild,next);
    const executed=new Set([...(before?.data.history||[]).flatMap(revision=>revision.steps||[]),...(before?.data.steps||[])]
      .filter(step=>step.action_id).map(step=>step.key));
    if(op==="replan"&&next.steps.some(step=>executed.has(step.key))) throw new StateConflictError("Replan cannot replay an already submitted step.");
    return db.transaction(()=>{
      const after=db.saveCityRecord(guild,{kind:"strategy",key,status:"pending",source_event:next.source_event,actor_key:`${next.actor_type}:${next.actor_key}`,
        data:{...next,revision:(before?.data.revision||0)+1,spent:before?.data.spent||0,steps:next.steps.map(step=>({...step,status:"ready"})),
          history:[...(before?.data.history||[]),...(before?[{source_event:before.source_event,revision:before.data.revision,steps:before.data.steps}]:[])],
          authority:"subjective_plan_not_guaranteed_outcome",current_owner:`${next.actor_type}:${next.actor_key}`}});
      cityAudit(db,guild,"strategy_proposed",key,before,after,actorId);return after;
    });
  }
  if(!before) throw new StateConflictError("Strategy not found.");
  if(op==="run") return executeStrategyStep(db,guild,key,{actorId});
  if(!["approve","reject","abandon","pause","resume"].includes(op)) throw new UserInputError("Unknown strategy operation.");
  if(["completed","abandoned","rejected"].includes(before.status)) return before;
  if(op==="approve"&&before.status!=="pending"||op==="resume"&&before.status!=="paused") throw new StateConflictError("Strategy lifecycle does not permit this operation.");
  if(["approve","resume"].includes(op)) validatePlan(db,guild,before.data);
  return db.transaction(()=>{
    const data={...before.data,steps:before.data.steps.map(step=>({...step})),reviewed_by:actorId};
    if(["pause","abandon","reject"].includes(op)) for(const step of data.steps.filter(step=>step.status==="submitted")){
      const action=data.actor_type==="institution"?db.getCityRecord(guild,"action",step.action_id):db.getSimulationRecord(guild,step.action_id);
      if(!action) throw new StateConflictError("Submitted action missing; restore before changing lifecycle.");
      if(["pending","deferred","proposed","ready","scheduled"].includes(action.status)){
        if(data.actor_type==="institution") reviewInstitutionAction(db,guild,{key:step.action_id,decision:"reject"},actorId);
        else db.putSimulationRecord(guild,{...action,entityKey:action.entity_key,status:"rejected",data:{...action.data,cancelled_by:actorId}});
        step.status="cancelled";
      }else{
        data.spent+=data.actor_type==="institution"&&action.status==="completed"?1:Object.values(action.data.result?.resource_cost||{}).reduce((a,b)=>a+b,0);
        step.status=action.status==="completed"&&(data.actor_type==="institution"||action.data.result?.success===true)?"completed":"failed";
      }
    }
    const after=db.saveCityRecord(guild,{...before,key,status:{approve:"active",reject:"rejected",abandon:"abandoned",pause:"paused",resume:"active"}[op],
      data});cityAudit(db,guild,`strategy_${op}`,key,before,after,actorId);return after;
  });
}
export function executeStrategyStep(db,guild,key,{actorId="strategy_opportunity",roll}={}){
  const before=db.getCityRecord(guild,"strategy",key);
  if(!before||before.status!=="active"||db.isDirectorPaused(guild)||db.getCityCalendar(guild).flags.strategies!==true) return before;
  try{return db.transaction(()=>{
    const data=before.data;
    const goal=objective(db,guild,data),steps=data.steps.map(step=>({...step}));
    let spent=data.spent,status="active";
    const submitted=steps.find(step=>step.status==="submitted");
    if(submitted){
      const action=data.actor_type==="institution"?db.getCityRecord(guild,"action",submitted.action_id):db.getSimulationRecord(guild,submitted.action_id);
      if(!action) throw new StateConflictError("Submitted action disappeared; restore or reconcile.");
      if(["completed","failed","rejected","blocked"].includes(action.status)){
        const success=action.status==="completed"&&(data.actor_type==="institution"||action.data.result?.success===true);
        submitted.status=success?"completed":"failed";
        spent+=data.actor_type==="institution"&&success?1:Object.values(action.data.result?.resource_cost||{}).reduce((a,b)=>a+b,0);
        if(!success) status="blocked";
      }
    }else{
      actorSource(db,guild,data,{requireResources:false});
      if(!goal||goal.status!=="active") throw new StateConflictError("Objective ended or paused; reconcile/abandon this plan.");
      if(data.deadline_minute!==undefined&&db.getSimulationClock(guild).minute>=data.deadline_minute)
        throw new StateConflictError("Fictional deadline reached; replan or abandon.");
      const next=steps.find(step=>step.status==="ready"&&step.requires.every(key=>steps.find(other=>other.key===key)?.status==="completed"));
      if(!next) status=steps.every(step=>step.status==="completed")?"completed":"blocked";
      else{
        if(spent+1>data.cost_ceiling) throw new StateConflictError("Strategy cost ceiling reached.");
        if(data.actor_type!=="institution"&&actorState(db,guild,data.actor_type,data.actor_key).resources[ACTION_COSTS[next.action.type]]<1)
          throw new StateConflictError("Resource shortage: replan, delay, retreat or abandon; no cost applied.");
        const action=data.actor_type==="institution"?submitInstitutionAction(db,guild,{...next.action,
          key:`step:${motivationKey([key,data.revision,next.key])}`,institution:data.actor_key,source_event:before.source_event},actorId)
          :submitNpcAction(db,guild,{...next.action,actor_type:data.actor_type,actor_key:data.actor_key,
            goal_key:data.actor_type==="npc"?data.goal_key:goal.id,information_key:data.information_key,strategy_key:key,strategy_revision:data.revision},
            {cycleKey:`strategy:${key}:${data.revision}:${next.key}`,roll});
        next.action_id=data.actor_type==="institution"?action.record_key:action.id;
        next.status="submitted";
      }
    }
    if(steps.every(step=>step.status==="completed")) status="completed";
    const after=db.saveCityRecord(guild,{...before,key,status,data:{...data,steps,spent}});
    cityAudit(db,guild,"strategy_step",key,before,after,actorId);return after;
  });}catch(error){
    const after=db.saveCityRecord(guild,{...before,key,status:"blocked",data:{...before.data,error:error.message}});
    cityAudit(db,guild,"strategy_blocked",key,before,after,actorId);return after;
  }
}
export function runStrategyOpportunity(db,guild,budget=1,{excludedActors=new Set()}={}){
  if(db.isDirectorPaused(guild)||db.getCityCalendar(guild).flags.strategies!==true) return [];
  const delegationBudget={operations:0,cost:0},seen=new Set(excludedActors);
  return db.listCityRecords(guild,{kind:"strategy",status:"active",includeGM:true,limit:20})
    .filter(row=>{if(seen.has(row.actor_key)) return false;seen.add(row.actor_key);return true;}).slice(0,Math.max(0,Math.min(4,budget)))
    .map(row=>row.data.reviewed_by==="ai_policy"?delegateStrategy(db,guild,row,delegationBudget):executeStrategyStep(db,guild,row.record_key));
}
