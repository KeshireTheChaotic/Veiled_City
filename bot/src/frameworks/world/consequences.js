/** Source-bound consequence queue and transaction workflow. Domain handlers stay explicit capabilities. */
import {cityObject,cityKey,cityAudit,indexWorldEvent} from './city-calendar.js';
import {requireCitySource} from './city-source.js';
import {UserInputError,StateConflictError} from '../../kernel/errors.js';
export function createWorldConsequences({handlers,motivationKey,nativeWorldCoordinatorReady,nativeWorldOperationAllows}){
function subscribeConsequence(db,guild,input,actorId){
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
function coordinateConsequences(db,guild,budget=2,{onProposed=null}={}){
  if(db.isDirectorPaused(guild)||db.getCityCalendar(guild).flags.consequences!==true&&!nativeWorldCoordinatorReady(db,guild,'consequence','apply')) return [];
  if(budget<=0) return [];
  const results=[];
  return db.transaction(()=>{
    for(const subscription of db.listCityRecords(guild,{kind:"consequence_subscription",status:"active",includeGM:true,limit:20})){
      const cursor=db.getCityRecord(guild,"consequence_cursor",subscription.record_key);
      for(const event of db.worldEventsAfter(guild,{after:cursor?.data.after||0,limit:50})){
        if(results.length>=Math.min(4,budget)) return results;
        db.saveCityRecord(guild,{kind:"consequence_cursor",key:subscription.record_key,source_event:subscription.source_event,
          data:{after:event.sequence,subscription:subscription.record_key}});
        if(event.status!=="active"||!subscription.data.event_kinds.includes(event.kind)
          ||subscription.data.location_key&&subscription.data.location_key!==event.location_key) continue;
        const path=event.details.causal_path||[];
        if(!Array.isArray(path)||path.length>=4||path.includes(subscription.record_key)||db.consequenceSourceCount(guild,event.event_key)>=4) continue;
        const key=`consequence:${motivationKey([guild,event.event_key,subscription.data.handler,subscription.data.entity_key,subscription.record_key,1])}`;
        if(db.getCityRecord(guild,"consequence",key)) continue;
        const after=db.saveCityRecord(guild,{kind:"consequence",key,status:"pending",source_event:event.event_key,
          data:{...subscription.data,subscription:subscription.record_key,causal_path:[...path,subscription.record_key],
            review_class:"human_gm",privacy:"gm",not_actor_knowledge:true}});
        cityAudit(db,guild,"consequence_proposed",key,null,after,"consequence_coordinator");
        if(onProposed) onProposed(after);
        results.push(db.getCityRecord(guild,"consequence",key));
      }
    }
    return results;
  });
}
function reviewConsequence(db,guild,input,actorId,{nativeAuthority=null,nativePayload=null}={}){
  const before=db.getCityRecord(guild,"consequence",cityKey(input.key));
  if(!before) throw new StateConflictError("Consequence not found.");
  if(!["pending","blocked"].includes(before.status)) return before;
  if(!["approve","reject","defer"].includes(input.decision)) throw new UserInputError("Explicit consequence decision required.");
  try{return db.transaction(()=>{
    if(nativeAuthority&&!nativeWorldOperationAllows(db,guild,nativeAuthority,'consequence','apply',nativePayload))
      throw new StateConflictError('Native consequence authority/source/subscription changed.');
    if(input.decision==="approve") requireCitySource(db,guild,before.source_event);
    const result=input.decision==="approve"?handlers[before.data.handler](db,guild,before,actorId):null;
    if(input.decision==="approve") indexWorldEvent(db,guild,{key:`effect:${motivationKey(before.record_key)}`,kind:"consequence_applied",
      title:"Native causal consequence completed",source_kind:"event",source_id:before.source_event,
      location_key:db.getWorldEvent(guild,before.source_event).location_key,details:{causal_path:before.data.causal_path||[],
        consequence:before.record_key,root_source:before.source_event}},actorId);
    const after=db.saveCityRecord(guild,{...before,key:before.record_key,status:{approve:"completed",reject:"rejected",defer:"pending"}[input.decision],
      data:{...before.data,result,reviewed_by:actorId}});
    cityAudit(db,guild,"consequence_review",before.record_key,before,after,actorId);return after;
  });}catch(error){
    const after=db.saveCityRecord(guild,{...before,key:before.record_key,status:"blocked",data:{...before.data,error:error.message}});
    cityAudit(db,guild,"consequence_blocked",before.record_key,before,after,actorId);return after;
  }
}
return Object.freeze({subscribeConsequence,coordinateConsequences,reviewConsequence});
}
