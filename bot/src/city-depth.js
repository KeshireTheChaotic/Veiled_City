/** Opt-in depth: established upkeep obligations without auto-spending; demand-driven minor NPC drafts without unearned knowledge. */
import { cityObject, cityKey, cityInteger, cityAudit, scheduleCityEvent, indexWorldEvent } from "./city-calendar.js";
import { requireCitySource, requireCityRecord, addWorldLink } from "./city-core.js";
import { normalizeNpcKey } from "./npc-cognition.js";

export const minorNpcSchema={type:"object",additionalProperties:false,properties:{
  name:{type:"string"},occupation:{type:"string"},public_identity:{type:"string"},portrayal:{type:"string"}
},required:["name","occupation","public_identity","portrayal"]};
function flag(db,guildId,key){if(db.getCityCalendar(guildId).flags[key]!==true) throw new Error(`The ${key} feature is opt-in and not enabled.`);}
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
function reservedNames(db,content,guildId){
  const names=db.listNpcProfiles(guildId,{limit:500}).map(row=>row.display_name);
  for(const rel of ["GM_PRIVATE/NPCS/npcs.json","GM/NPCS/npcs.json"]){
    const raw=content.read(rel);if(!raw.trim()) continue;
    const parsed=JSON.parse(raw);if(!Array.isArray(parsed)) throw new Error("Packaged NPC roster must be an array.");
    names.push(...parsed.map(row=>row.name).filter(Boolean));
  }
  return [...new Set(names)];
}
function validateMinor(db,content,guildId,key,data){
  cityObject(data);
  if(Object.keys(data).some(field=>!minorNpcSchema.required.includes(field))) throw new Error("Minor NPC draft contains unsupported fields or unearned knowledge.");
  for(const field of minorNpcSchema.required) cityKey(data[field]);
  const canonical=reservedNames(db,content,guildId).map(normalizeNpcKey),name=normalizeNpcKey(data.name);
  if(!name||canonical.includes(name)||db.cityNpcNameInUse(guildId,data.name)||db.getNpcProfile(guildId,key)||db.getReference(guildId,"npc",name))
    throw new Error("Named NPC identity already exists; generation cannot replace canon.");
}
/** Generate one relevant extra. Nothing becomes a persistent NPC until an explicit promotion. */
export async function draftMinorNpc({db,gm,content,guildId,input,actorId}){
  cityObject(input);flag(db,guildId,"minor_npcs");const key=cityKey(input.key);
  if(!key.startsWith("minor-")||normalizeNpcKey(key)!==key) throw new Error("Use a normalized minor-* stable key.");
  const prior=db.getCityRecord(guildId,"minor_draft",key);if(prior) return prior;
  requireCitySource(db,guildId,input.source_event);
  if(!db.getSimulationEntity(guildId,"location",input.location)) throw new Error("Minor NPC needs an established location.");
  cityKey(input.role);
  if(input.established_interaction!==true&&input.gm_authorized!==true) throw new Error("An established interaction or explicit GM authorization is required.");
  if(input.public_context!==undefined&&(typeof input.public_context!=="string"||input.public_context.length>2000)) throw new Error("Public scene context exceeds its budget.");
  if(db.getNpcProfile(guildId,key)) throw new Error("NPC key is already in use.");
  if(db.listCityRecords(guildId,{kind:"minor_draft",status:"draft",includeGM:true,limit:100}).length>=40) throw new Error("Minor NPC draft budget reached; review existing extras before expanding.");
  const data=await gm.planMinorNpc({role:input.role,location:input.location,publicContext:input.public_context||"",reservedNames:reservedNames(db,content,guildId).slice(0,80)});
  validateMinor(db,content,guildId,key,data);
  return db.transaction(()=>{
    const concurrent=db.getCityRecord(guildId,"minor_draft",key);if(concurrent) return concurrent;
    requireCitySource(db,guildId,input.source_event);
    const after=db.saveCityRecord(guildId,{kind:"minor_draft",key,source_event:input.source_event,location_key:input.location,status:"draft",
      data:{profile:data,requested_role:input.role,established_interaction:input.established_interaction===true,gm_authorized:input.gm_authorized===true}});
    cityAudit(db,guildId,"minor_npc_draft",key,null,after,actorId);return after;
  });
}
export function reviewMinorNpc({db,content,guildId,input,actorId}){
  flag(db,guildId,"minor_npcs");const before=db.getCityRecord(guildId,"minor_draft",cityKey(input.key));
  if(!before) throw new Error("Minor NPC draft not found.");
  if(before.status!=="draft") return before;
  if(!["promote","discard"].includes(input.decision)) throw new Error("Choose promote or discard.");
  return db.transaction(()=>{
    requireCitySource(db,guildId,before.source_event);
    if(input.decision==="promote"){
      validateMinor(db,content,guildId,before.record_key,before.data.profile);
      db.upsertNpcProfile(guildId,{npcKey:before.record_key,displayName:before.data.profile.name,role:before.data.profile.occupation,
        publicIdentity:before.data.profile.public_identity,portrayal:before.data.profile.portrayal,activityTier:"background",
        decisionProfile:{},knowledgeBoundaries:["No campaign knowledge granted by generation."],source:"city_minor_npc"});
      db.setSimulationEntity(guildId,"npc",before.record_key,{activity_tier:"background",location_key:before.location_key,source_event:before.source_event});
    }
    const after=db.saveCityRecord(guildId,{...before,key:before.record_key,status:input.decision==="promote"?"promoted":"discarded",
      data:{...before.data,reviewed_by:actorId,decision:input.decision}});
    cityAudit(db,guildId,"minor_npc_review",before.record_key,before,after,actorId);return after;
  });
}
