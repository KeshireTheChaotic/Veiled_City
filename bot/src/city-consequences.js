/** Typed subscriptions to committed world sources; pending effects never spend, disclose, or fan out without review. */
import { cityObject, cityKey, cityInteger, cityAudit } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { changeCityService, transmitCityBelief } from "./city-civic.js";
import { actorSource, proposeGoalTransition, motivationKey } from "./simulation-motivation.js";
import { UserInputError, StateConflictError } from "./errors.js";
const handlers={
  goal:(db,guild,row,actor)=>proposeGoalTransition(db,guild,{...row.data.payload,key:row.record_key,source_event:row.source_event},actor),
  service:(db,guild,row,actor)=>{
    const service=db.getCityRecord(guild,"infrastructure",row.data.entity_key),event=requireCitySource(db,guild,row.source_event);
    if(!service||service.status!=="active"||!event.location_key||!service.data.locations.includes(event.location_key))
      throw new StateConflictError("Source has no established physical path to this service.");
    const delta=cityInteger(row.data.payload.delta,-10,10);
    if(!["infrastructure_damage","infrastructure_repair"].includes(event.kind)
      ||event.kind==="infrastructure_damage"&&delta>0||event.kind==="infrastructure_repair"&&delta<0)
      throw new StateConflictError("Consequence does not match its committed source class.");
    const result=changeCityService(db,guild,{key:service.record_key,source_event:row.source_event,
      condition:Math.max(0,Math.min(100,service.data.native_condition+delta))},actor);
    if(result.kind==="change") throw new StateConflictError("Significant service consequence requires dedicated civic review.");return result;
  },
  transmit:(db,guild,row,actor)=>{
    const payload=row.data.payload;
    if(["npc","institution"].includes(payload.from_type)) actorSource(db,guild,{actor_type:payload.from_type,actor_key:payload.from_key,
      information_key:payload.information_key,source_event:row.source_event});
    else{
      const message=db.getCityRecord(guild,"message",payload.information_key);
      if(message?.source_event!==row.source_event||message.actor_key!==`${payload.from_type}:${payload.from_key}`)
        throw new StateConflictError("Transmission source has no knowledge path from the causal event.");
    }
    return transmitCityBelief(db,guild,{...payload,key:row.record_key,source_event:row.source_event},actor);
  }
};
export function subscribeConsequence(db,guild,input,actorId){
  cityObject(input);const key=cityKey(input.key);requireCitySource(db,guild,input.source_event);
  const prior=db.getCityRecord(guild,"consequence_subscription",key);
  if(input.op==="unsubscribe"){
    if(!prior) throw new StateConflictError("Subscription not found.");
    return db.transaction(()=>{
      const after=db.saveCityRecord(guild,{...prior,key,status:"cancelled",data:{...prior.data,cancelled_by:actorId}});
      cityAudit(db,guild,"consequence_unsubscribe",key,prior,after,actorId);return after;
    });
  }
  if(!handlers[input.handler]||!Array.isArray(input.event_kinds)||!input.event_kinds.length||input.event_kinds.length>8)
    throw new UserInputError("Typed handler and bounded source event classes required.");
  input.event_kinds.forEach(cityKey);cityKey(input.entity_key);cityObject(input.payload);
  if(prior) throw new StateConflictError("Subscription already exists.");
  return db.transaction(()=>{
    const after=db.saveCityRecord(guild,{kind:"consequence_subscription",key,source_event:input.source_event,data:{...input,version:1}});
    cityAudit(db,guild,"consequence_subscription",key,null,after,actorId);return after;
  });
}
export function coordinateConsequences(db,guild,budget=2){
  if(db.isDirectorPaused(guild)||db.getCityCalendar(guild).flags.consequences!==true) return [];
  const results=[];
  return db.transaction(()=>{
    for(const subscription of db.listCityRecords(guild,{kind:"consequence_subscription",status:"active",includeGM:true,limit:20})){
      for(const event of db.listWorldEvents(guild,{includeGM:true,limit:50})){
        if(results.length>=Math.min(4,budget)) return results;
        if(event.status!=="active"||!subscription.data.event_kinds.includes(event.kind)
          ||subscription.data.location_key&&subscription.data.location_key!==event.location_key) continue;
        const key=`consequence:${motivationKey([guild,event.event_key,subscription.data.handler,subscription.data.entity_key,subscription.record_key,1])}`;
        if(db.getCityRecord(guild,"consequence",key)) continue;
        const after=db.saveCityRecord(guild,{kind:"consequence",key,status:"pending",source_event:event.event_key,
          data:{...subscription.data,subscription:subscription.record_key,causal_path:[event.event_key,subscription.record_key],
            review_class:"human_gm",privacy:"gm",not_actor_knowledge:true}});
        cityAudit(db,guild,"consequence_proposed",key,null,after,"consequence_coordinator");results.push(after);
      }
    }
    return results;
  });
}
export function reviewConsequence(db,guild,input,actorId){
  const before=db.getCityRecord(guild,"consequence",cityKey(input.key));
  if(!before) throw new StateConflictError("Consequence not found.");
  if(!["pending","blocked"].includes(before.status)) return before;
  if(!["approve","reject","defer"].includes(input.decision)) throw new UserInputError("Explicit consequence decision required.");
  try{return db.transaction(()=>{
    requireCitySource(db,guild,before.source_event);
    const result=input.decision==="approve"?handlers[before.data.handler](db,guild,before,actorId):null;
    const after=db.saveCityRecord(guild,{...before,key:before.record_key,status:{approve:"completed",reject:"rejected",defer:"pending"}[input.decision],
      data:{...before.data,result,reviewed_by:actorId}});
    cityAudit(db,guild,"consequence_review",before.record_key,before,after,actorId);return after;
  });}catch(error){
    const after=db.saveCityRecord(guild,{...before,key:before.record_key,status:"blocked",data:{...before.data,error:error.message}});
    cityAudit(db,guild,"consequence_blocked",before.record_key,before,after,actorId);return after;
  }
}
