/** Shared governed intent pipeline: bound authority, closed contracts, atomic receipts and native domain adapters. */
import { createHash } from "node:crypto";
import { validateIntent, INTENT_PAYLOADS } from "./ai-intent-contracts.js";
import { requireCitySource } from "./city-core.js";
import { cityObject, cityInteger, cityAudit, indexWorldEvent } from "./city-calendar.js";
import { proposeGoalTransition, reviewGoalTransition } from "./simulation-motivation.js";
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const adapters=new Map();
export const FEATURE_FLAGS={goal:"emergent_goals",consequence:"consequences",scene:"scene_continuity",group:"emergent_groups",
  strategy:"strategies",arc:"personal_arcs",discovery:"discovery",project:"long_projects",mediation:"conflict_mediation",
  memory:"memory_consolidation",density:"activity_density"};
export const stateRevision=row=>row?hash(row):"absent";
export function registerIntentAdapter(feature,adapter){adapters.set(feature,adapter);}
export function delegationPolicy(db,guild){
  return db.getCityRecord(guild,"ai_delegation","campaign")?.data||{mode:"manual",revision:0,allow:[],max_operations:1,max_cost:0,expires_minute:null};
}
export function configureDelegation(db,guild,input,reviewer){
  cityObject(input);
  if(!reviewer||Object.keys(input).some(key=>!["mode","allow","max_operations","max_cost","expires_minute"].includes(key))) throw new Error("Invalid delegation configuration.");
  if(!["manual","suggest_only","routine_delegated"].includes(input.mode)||!Array.isArray(input.allow)||input.allow.length>40
    ||input.allow.some(op=>!Object.keys(INTENT_PAYLOADS).some(feature=>op.startsWith(`${feature}.`)
      &&INTENT_PAYLOADS[feature].properties.op.enum.includes(op.slice(feature.length+1))))) throw new Error("Explicit typed operation allowlist required.");
  cityInteger(input.max_operations,1,4);cityInteger(input.max_cost,0,20);
  if(input.expires_minute!==null) cityInteger(input.expires_minute,db.getSimulationClock(guild).minute+1,1000000000);
  if(input.mode==="routine_delegated"&&input.expires_minute===null) throw new Error("Delegation requires an explicit fictional-time expiry.");
  return db.transaction(()=>{
    const before=db.getCityRecord(guild,"ai_delegation","campaign");
    const revision=(before?.data.revision||0)+1;
    const source=indexWorldEvent(db,guild,{key:`ai-policy:${revision}`,title:"Explicit GM delegation configuration",source_id:reviewer},reviewer);
    const after=db.saveCityRecord(guild,{kind:"ai_delegation",key:"campaign",source_event:source.event_key,data:{...input,revision,configured_by:reviewer}});
    cityAudit(db,guild,"ai_delegation","campaign",before,after,reviewer);return after;
  });
}
function preflight(db,guild,intent,context){
  if(!validateIntent(intent)) throw new Error("Invalid closed versioned intent contract.");
  if(context.scope?.mode==="private"&&!['arc','project','discovery'].includes(intent.feature)) throw new Error("Private scope cannot alter shared world state.");
  if(db.getCityCalendar(guild).flags[FEATURE_FLAGS[intent.feature]]!==true) throw new Error("Feature is disabled.");
  if(db.isDirectorPaused(guild)) throw new Error("Director is paused.");
  for(const key of new Set([intent.payload.source_event,...intent.source_prerequisites])) requireCitySource(db,guild,key);
  const adapter=adapters.get(intent.feature);if(!adapter) throw new Error("Domain adapter is not available yet.");
  const before=adapter.current(db,guild,intent);
  if(stateRevision(before)!==intent.expected_revision) throw new Error("Stale target revision; propose again from current state.");
  const impact=adapter.impact(db,guild,intent,before,context);
  return {adapter,before,impact};
}
function decision(db,guild,intent,impact,used){
  const policy=delegationPolicy(db,guild),minute=db.getSimulationClock(guild).minute;
  if(policy.revision!==intent.policy_revision) return {status:"blocked",reason:"Delegation policy changed."};
  if(policy.mode==="manual") return {status:"blocked",reason:"AI execution is not delegated."};
  if(policy.mode==="suggest_only"||impact.review||!policy.allow.includes(`${intent.feature}.${intent.payload.op}`))
    return {status:"pending",reason:impact.reason||"Human review or explicit delegation required."};
  if(policy.expires_minute===null||minute>=policy.expires_minute) return {status:"blocked",reason:"Delegation expired."};
  if(used>=policy.max_operations||impact.cost>policy.max_cost) return {status:"blocked",reason:"Delegated budget exhausted."};
  return {status:"accepted",reason:"Routine operation explicitly delegated."};
}
function saveReceipt(db,guild,key,intent,status,reason,context,extra={}){
  const source=validateIntent(intent)&&db.getWorldEvent(guild,intent.payload.source_event)?intent.payload.source_event
    :indexWorldEvent(db,guild,{key:`receipt:${hash(key).slice(0,32)}`,title:"Rejected AI proposal",source_id:context.origin||"ai_policy"},"ai_policy").event_key;
  const row=db.saveCityRecord(guild,{kind:"ai_intent",key,status,source_event:source,
    data:{intent,reason,scope:context.scope||{mode:"party"},origin:context.origin||"",session_id:context.sessionId||null,...extra}});
  cityAudit(db,guild,"ai_intent",key,null,row,"ai_policy");return row;
}
export function dispatchAiIntents(db,guild,intents=[],context={}){
  if(!Array.isArray(intents)||intents.length>4) throw new Error("At most four AI intents per opportunity.");
  let used=0;
  return intents.map(intent=>{
    const key=`intent:${hash([guild,context.sessionId||null,context.origin||"",intent]).slice(0,48)}`;
    const previous=db.getCityRecord(guild,"ai_intent",key);if(previous) return previous;
    try{return db.transaction(()=>{
      const {adapter,before,impact}=preflight(db,guild,intent,context),verdict=decision(db,guild,intent,impact,used);
      const result=verdict.status==="accepted"?adapter.apply(db,guild,intent,key,"ai_policy",context):null;
      if(verdict.status==="accepted") used++;
      return saveReceipt(db,guild,key,intent,verdict.status,verdict.reason,context,{before,impact,result,policy_revision:delegationPolicy(db,guild).revision});
    });}catch(error){
      return saveReceipt(db,guild,key,validateIntent(intent)?intent:null,"blocked","Intent validation or domain prerequisites failed.",context,
        {diagnostic:String(error.message).slice(0,1000)});
    }
  });
}
export function reviewAiIntent(db,guild,{key,decision:response,expected_revision},reviewer){
  if(!reviewer||!["approve","reject"].includes(response)) throw new Error("Authenticated GM review required.");
  const row=db.getCityRecord(guild,"ai_intent",key);
  if(!row||!["pending","blocked"].includes(row.status)||!row.data.intent) throw new Error("Reviewable intent required.");
  if(stateRevision(row)!==expected_revision) throw new Error("Inbox item changed; refresh before reviewing.");
  return db.transaction(()=>{
    const context={scope:row.data.scope,sessionId:row.data.session_id,origin:row.data.origin},intent=row.data.intent;
    const {adapter,before,impact}=preflight(db,guild,intent,context);
    if(intent.policy_revision!==delegationPolicy(db,guild).revision) throw new Error("Policy changed; request a fresh proposal.");
    const result=response==="approve"?adapter.apply(db,guild,intent,key,reviewer,context):null;
    const after=db.saveCityRecord(guild,{...row,key,status:response==="approve"?"accepted":"rejected",
      data:{...row.data,before,impact,result,reviewed_by:reviewer}});
    cityAudit(db,guild,"ai_intent_review",key,row,after,reviewer);return after;
  });
}
export function intentContext(db,guild){
  return {policy:delegationPolicy(db,guild),flags:db.getCityCalendar(guild).flags,
    goal_targets:db.listNpcProfiles(guild,{limit:32}).flatMap(npc=>db.listNpcGoals(guild,npc.npc_key,{limit:8})
      .map(row=>({actor_type:"npc",actor_key:npc.npc_key,goal_key:row.goal_key,expected_revision:stateRevision(row),state:row}))).slice(0,32),
    receipts:db.listCityRecords(guild,{kind:"ai_intent",includeGM:true,limit:12}).map(row=>({...row,expected_revision:stateRevision(row)})),
    target_revision_rule:"Use the supplied state fingerprint; absent for a new target. Proposals are not effects."};
}
registerIntentAdapter("goal",{
  current:(db,guild,intent)=>intent.payload.actor_type==="npc"?db.getNpcGoal(guild,intent.payload.actor_key,intent.payload.goal_key)
    :db.listSimulationRecords(guild,{kind:"goal",entityKey:`${intent.payload.actor_type}:${intent.payload.actor_key}`,limit:1000})
      .find(row=>row.data.goal_key===intent.payload.goal_key)||null,
  impact:(db,guild,intent)=>({cost:0,review:["complete","abandon","supersede"].includes(intent.payload.op)
    ||intent.payload.acceptable_methods.some(method=>!["investigate","observe","research","prepare","protect"].includes(method)),
    reason:"Contested goal conclusions or non-routine methods require human review."}),
  apply:(db,guild,intent,key,principal)=>{
    const row=proposeGoalTransition(db,guild,{...intent.payload,key},principal);
    return reviewGoalTransition(db,guild,{key:row.record_key,decision:"approve"},principal);
  }
});
