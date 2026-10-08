/** Opt-in constraints on native world actions, not an economy or PC modifier. */
import { createHash } from "node:crypto";
import { requireCitySource, requireCityRecord, cityStrings, INSTITUTION_ACTIONS } from "./city-core.js";
import { cityInteger, cityAudit, cityObject } from "./city-calendar.js";
import { actorSource } from "./simulation-motivation.js";
import { assertNpcAvailability, activeCityProxy } from "./city-constraints.js";

export const supplyRevision=row=>createHash("sha256").update(JSON.stringify(row)).digest("hex");
export function validateServiceAccess(db,guild,data){
  if(!["npc","faction","location","institution"].includes(data.consumer_type)) throw new Error("Supply consumers cannot be PCs.");
  if(data.consumer_type==="institution") requireCityRecord(db,guild,"institution",data.consumer_key);
  else if(!db.getSimulationEntity(guild,data.consumer_type,data.consumer_key)) throw new Error("Established supply consumer required.");
  requireCityRecord(db,guild,"infrastructure",data.service_key);
  const actions=cityStrings(data.actions,12);
  if(!actions.length||actions.some(type=>!["repair","research","investigate","travel","prepare",...INSTITUTION_ACTIONS].includes(type)))
    throw new Error("Supply constraints require specific eligible native actions.");
  cityInteger(data.threshold,1,100);
  if(typeof data.access!=="boolean") throw new Error("Explicit service access required.");
}
export function assertServiceAccess(db,guild,{actor_type,actor_key,type,location_key=""}){
  if(db.getCityCalendar(guild).flags.supply_dependencies!==true) return;
  const consumers=[`${actor_type}:${actor_key}`,...(location_key?[`location:${location_key}`]:[])];
  for(const consumer of new Set(consumers)){
    const rows=db.listCityRecords(guild,{kind:"service_access",actor:consumer,status:"active",includeGM:true,limit:100});
    if(rows.length>=100) throw new Error("Service access coverage limit reached; GM review required.");
    for(const row of rows){
      if(!row.data.actions.includes(type)) continue;
      requireCitySource(db,guild,row.source_event);
      const service=requireCityRecord(db,guild,"infrastructure",row.data.service_key);
      requireCitySource(db,guild,service.source_event);
      if(!row.data.access||service.data.effective_condition<row.data.threshold)
        throw new Error("Established supply/service access blocks this world action before costs; consult GM for alternatives.");
    }
  }
}
/** Human command boundary only: source attests an already adjudicated NPC-to-NPC material delivery. */
export function transferSupply(db,guild,input,actorId){
  cityObject(input);
  if(Object.keys(input).some(key=>!["op","source_event","from","to","amount","information_key","from_revision","to_revision"].includes(key)))
    throw new Error("Unsupported supply transfer field.");
  if(input.op!=="transfer"||db.getCityCalendar(guild).flags.supply_dependencies!==true) throw new Error("Supply transfers are opt-in.");
  cityInteger(input.amount,1,5);
  const source=requireCitySource(db,guild,input.source_event),proof=source.details?.resource_transfer;
  if(!proof||proof.from!==input.from||proof.to!==input.to||proof.amount!==input.amount||proof.resource!=="materials"||proof.human_reviewed!==true)
    throw new Error("Exact human-adjudicated material delivery source required.");
  const key=supplyRevision([source.event_key]);
  const prior=db.getCityRecord(guild,"supply_transfer",key);
  if(prior) return prior;
  if(input.from===input.to) throw new Error("Distinct NPC participants required.");
  actorSource(db,guild,{actor_type:"npc",actor_key:input.from,information_key:input.information_key,source_event:input.source_event},{requireResources:false});
  const from=db.getSimulationEntity(guild,"npc",input.from),to=db.getSimulationEntity(guild,"npc",input.to);
  if(!from||!to||!db.getNpcProfile(guild,input.to)||activeCityProxy(db,guild,input.to)) throw new Error("Established non-proxied NPC participants required.");
  assertNpcAvailability(db,guild,input.to,{type:"prepare",location_key:to.state.location_key});
  if(!from.state.location_key||from.state.location_key!==to.state.location_key) throw new Error("Actual co-located delivery required.");
  if(supplyRevision(from)!==input.from_revision||supplyRevision(to)!==input.to_revision) throw new Error("Supply balances changed; refresh revisions.");
  const a=from.state.resources?.materials,b=to.state.resources?.materials;
  if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<input.amount||b+input.amount>100) throw new Error("Finite material balances cannot fund this transfer.");
  return db.transaction(()=>{
    db.setSimulationEntity(guild,"npc",input.from,{...from.state,resources:{...from.state.resources,materials:a-input.amount}});
    db.setSimulationEntity(guild,"npc",input.to,{...to.state,resources:{...to.state.resources,materials:b+input.amount}});
    const result=db.saveCityRecord(guild,{kind:"supply_transfer",key,source_event:source.event_key,actor_key:`npc:${input.from}`,data:{from:input.from,to:input.to,amount:input.amount,resource:"materials",before:[a,b],after:[a-input.amount,b+input.amount],reviewed_by:actorId}});
    cityAudit(db,guild,"supply_transfer",key,null,result,actorId);return result;
  });
}
