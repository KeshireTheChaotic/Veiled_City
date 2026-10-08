/** Explicit fictional NPC contact, using existing goals, costs, mechanics, channels and subjective knowledge. */
import { cityObject, cityKey, cityAudit } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { activeCityProxy, assertNpcAvailability } from "./city-constraints.js";
import { actorState, submitNpcAction } from "./simulation.js";
import { ContextPlanner } from "./context-planner.js";
import { sceneAccess } from "./scene-continuity.js";
export function resolveNpcConversation(db,guildId,input,actorId,{roll}={}){
  cityObject(input);
  if(db.getCityCalendar(guildId).flags.conversations!==true) throw new Error("NPC conversations are opt-in.");
  const key=cityKey(input.key),prior=db.getCityRecord(guildId,"conversation",key);if(prior) return prior;
  requireCitySource(db,guildId,input.source_event);
  if(!["round","scene","downtime","manual"].includes(input.opportunity)) throw new Error("Explicit fictional opportunity required.");
  if(input.from===input.to) throw new Error("Two different NPCs are required.");
  const channel=db.cityEdges(guildId,"channel").find(edge=>edge.from_key===`npc:${input.from}`&&edge.to_key===`npc:${input.to}`);
  const physical=input.mode==="in_person"||db.getCityCalendar(guildId).flags.scene_continuity===true&&input.mode!=="remote";
  if(physical&&(!sceneAccess(db,guildId,{observer_type:"npc",observer_key:input.from,target_type:"npc",target_key:input.to,sense:"sound"})
    ||!sceneAccess(db,guildId,{observer_type:"npc",observer_key:input.to,target_type:"npc",target_key:input.from,sense:"sound"})))
    throw new Error("In-person conversation requires actual scene presence and an unobstructed sound path.");
  for(const npc of [input.from,input.to]){
    if(!db.getNpcProfile(guildId,npc)||activeCityProxy(db,guildId,npc)) throw new Error("Existing non-proxied NPC required.");
    const state=actorState(db,guildId,"npc",npc);
    if(state.removed||["dormant"].includes(state.activity_tier)||["dead","removed"].includes(state.status)) throw new Error("NPC unavailable.");
    assertNpcAvailability(db,guildId,npc,{type:"contact",location_key:state.location_key});
    const goal=db.getNpcGoal(guildId,npc,npc===input.from?input.from_goal:input.to_goal);
    if(!goal||goal.status!=="active"||goal.acceptable_methods.length&&!goal.acceptable_methods.some(m=>["contact","negotiate"].includes(m))) throw new Error("Both actors need a contact-compatible active goal.");
  }
  if(!channel) throw new Error("Established directed contact channel required.");
  if(input.mode==="remote"&&db.getCityCalendar(guildId).flags.scene_continuity===true
    &&!["telephone","radio","message","courier"].includes(channel.data?.mode)) throw new Error("Established remote communication mode required.");
  const tick=db.getSimulationClock(guildId).tick;
  if(db.listCityRecords(guildId,{kind:"conversation",includeGM:true,limit:100}).some(row=>row.tick===tick)) throw new Error("Conversation budget is one per fictional tick.");
  const profiles=[input.from,input.to].map(npc=>db.getNpcProfile(guildId,npc));
  const refusal=profiles.some(profile=>profile.decision_profile.conversation_policy==="refuse");
  if(input.information_key&&!db.getNpcKnowledge(guildId,input.from,input.information_key)) throw new Error("Offered information is unknown to its speaker.");
  if(input.lie!==undefined&&(typeof input.lie!=="string"||input.lie.length>500)) throw new Error("Lie must be bounded subjective speech.");
  const planner=new ContextPlanner(db),packets=[input.from,input.to].map(npc=>planner.plan(guildId,
    {actorType:"npc",actorKey:npc,maxTokens:600,query:input.information_key||""}));
  return db.transaction(()=>{
    const action=refusal?null:submitNpcAction(db,guildId,{actor_type:"npc",actor_key:input.from,type:"contact",goal_key:input.from_goal,
      target_type:"npc",target_key:input.to,location_key:actorState(db,guildId,"npc",input.from).location_key,rationale:"Established NPC conversation",
      information_key:input.lie?"":input.information_key||"",significance:"routine"},{cycleKey:`conversation:${key}`,roll});
    const data={participants:[input.from,input.to],positions:profiles.map(p=>({npc:p.npc_key,portrayal:p.portrayal,policy:p.decision_profile.conversation_policy||"consider"})),
      offered_information:input.information_key||null,unverified_speech:input.lie||null,commitments_proposed:[],
      outcome:refusal?"refused":action.data.result?.success?"contacted":"contact_failed",action_id:action?.id||null,
      actor_packets:packets,
      binding_agreement:false,visibility:"gm"};
    const after=db.saveCityRecord(guildId,{kind:"conversation",key,source_event:input.source_event,data});
    cityAudit(db,guildId,"npc_conversation",key,null,after,actorId);return after;
  });
}
