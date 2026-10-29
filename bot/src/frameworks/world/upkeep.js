/** Original agreed upkeep records; no automatic resource spending. */
import {cityObject,cityKey,cityInteger,cityAudit,scheduleCityEvent,indexWorldEvent} from './city-calendar.js';
import {requireCitySource,requireCityRecord} from './city-source.js';
import {addWorldLink} from './civic-service-source.js';
import {requireWorldFeature as flag} from './feature-enabled.js';
function actor(db,guildId,endpoint){
  const [type,...parts]=cityKey(endpoint).split(":"),key=parts.join(":");
  if(type==="character"){
    const row=db.getCharacter(key);if(row?.guild_id!==guildId) throw new Error("PC is not in this campaign.");return row;
  }
  if(type==="npc"){if(!db.getNpcProfile(guildId,key)) throw new Error("NPC actor not found.");}
  else if(type==="institution") requireCityRecord(db,guildId,"institution",key);
  else if(type==="faction"){if(!db.getSimulationEntity(guildId,"faction",key)) throw new Error("Faction actor not found.");}
  else throw new Error("An established named obligation party is required.");
  return null;
}
export function recordCityUpkeep(db,guildId,input,actorId){
  cityObject(input);flag(db,guildId,"economy");const key=cityKey(input.key),before=db.getCityRecord(guildId,"upkeep",key);
  if(input.op==="settle"){
    if(!before) throw new Error("Established upkeep not found.");
    if(before.status!=="active") return before;
    requireCitySource(db,guildId,input.source_event);
    if(!["paid","waived","disputed"].includes(input.resolution)) throw new Error("Explicit settlement resolution required.");
    const debtor=actor(db,guildId,before.data.debtor);
    if(debtor&&input.resolution==="paid"&&input.accepted_by!==debtor.owner_user_id) throw new Error("Recording a PC payment requires explicit owner confirmation.");
    return db.transaction(()=>{
      const obligation=db.getSimulationRecord(guildId,before.data.obligation_id);
      if(!obligation||obligation.kind!=="obligation") throw new Error("Linked obligation no longer exists.");
      db.putSimulationRecord(guildId,{id:obligation.id,kind:"obligation",entityKey:obligation.entity_key,
        status:input.resolution==="paid"?"fulfilled":input.resolution==="waived"?"forgiven":"active",
        data:{...obligation.data,history:[...(obligation.data.history||[]),{status:input.resolution,source:input.source_event,actor:actorId}]}});
      const after=db.saveCityRecord(guildId,{...before,key,status:input.resolution==="disputed"?"active":"resolved",
        source_event:input.source_event,data:{...before.data,resolution:input.resolution,no_automatic_spending:true}});
      const ledger=cityAudit(db,guildId,"upkeep_settlement",key,before,after,actorId);
      const event=indexWorldEvent(db,guildId,{key:`settlement:${key}:${ledger.id}`,kind:"upkeep_settlement",title:`Settlement: ${before.data.terms}`.slice(0,160),
        source_kind:"mutation",source_id:ledger.id,details:{resolution:input.resolution,upkeep:key}});
      const due=db.getWorldEvent(guildId,`schedule:upkeep:${key}`);
      if(due&&input.resolution!=="disputed") addWorldLink(db,guildId,{from:due.event_key,to:event.event_key,relation:"resolved_by"},actorId);
      const scheduled=db.getCitySchedule(guildId,`upkeep:${key}`);
      if(scheduled?.status==="scheduled"&&input.resolution!=="disputed") scheduleCityEvent(db,guildId,{key:scheduled.schedule_key,op:"cancel"},actorId);
      return after;
    });
  }
  if(before) return before;
  requireCitySource(db,guildId,input.source_event);const debtor=actor(db,guildId,input.debtor);actor(db,guildId,input.creditor);
  if(input.agreed!==true) throw new Error("Upkeep must arise from explicitly agreed, established terms.");
  if(debtor&&(!debtor.owner_user_id||input.accepted_by!==debtor.owner_user_id)) throw new Error("PC upkeep requires explicit owner opt-in, never inferred living expenses.");
  cityKey(input.terms);cityInteger(input.due_minute);
  if(typeof input.cost_description!=="string"||!input.cost_description.trim()||input.cost_description.length>500) throw new Error("Established narrative cost description required; no new wealth currency is created.");
  if(input.income_project&&!db.getCityIncomeProject(guildId,input.income_project)) throw new Error("Income project does not belong to this campaign.");
  let obligation=input.obligation_id?db.getSimulationRecord(guildId,input.obligation_id):null;
  if(input.obligation_id&&(!obligation||obligation.kind!=="obligation"||obligation.status!=="active"||obligation.data.debtor!==input.debtor
    ||obligation.data.creditor!==input.creditor||obligation.data.content!==input.terms)) throw new Error("Existing obligation does not match the agreed parties and terms.");
  return db.transaction(()=>{
    if(!obligation) obligation=db.putSimulationRecord(guildId,{kind:"obligation",entityKey:input.debtor,
      data:{content:input.terms,debtor:input.debtor,creditor:input.creditor,accepted_by:input.accepted_by||null,source_event:input.source_event,history:[]}});
    scheduleCityEvent(db,guildId,{key:`upkeep:${key}`,title:input.terms,due_minute:input.due_minute});
    const after=db.saveCityRecord(guildId,{kind:"upkeep",key,actor_key:input.debtor,source_event:input.source_event,
      data:{terms:input.terms,debtor:input.debtor,creditor:input.creditor,cost_description:input.cost_description,due_minute:input.due_minute,
        obligation_id:obligation.id,income_project:input.income_project||null,accepted_by:input.accepted_by||null,no_automatic_spending:true}});
    cityAudit(db,guildId,"established_upkeep",key,null,after,actorId);return after;
  });
}
