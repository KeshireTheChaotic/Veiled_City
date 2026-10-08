/** Human-reviewed world drafts reuse existing typed materializers and canon anchors; no generic rules or second canon ledger. */
import { cityObject, cityKey, cityAudit } from "./city-calendar.js";
import { requireCitySource, updateCityCore } from "./city-core.js";
import { configureSimulationEntity } from "./simulation.js";
import { configureMystery } from "./story-continuity.js";
import { validateMinorIdentity } from "./city-depth.js";
import { normalizeNpcKey } from "./npc-cognition.js";
const kinds=["faction","location","institution","npc","mystery","relationship"];
function materialize(db,content,guildId,input,actorId){
  const {kind,key,data,source_event}=input;cityObject(data);
  if(kind==="npc"){
    validateMinorIdentity(db,content,guildId,key,data);
    return db.upsertNpcProfile(guildId,{npcKey:key,displayName:data.name,role:data.occupation,publicIdentity:data.public_identity,
      portrayal:data.portrayal,activityTier:"background",source:"human_approved_world_draft",knowledgeBoundaries:["No knowledge inferred from authoring."]});
  }
  if(kind==="faction"||kind==="location"){
    const allowed=kind==="location"?["name","description","wards","entrances","hazards"]:["name","description","personality","activity_tier"];
    if(Object.keys(data).some(field=>!allowed.includes(field))) throw new Error("World draft cannot create PC mechanics, currencies or hidden knowledge.");
    cityKey(data.name);return configureSimulationEntity(db,guildId,kind,key,data);
  }
  if(kind==="institution") return updateCityCore(db,guildId,{kind,key,source_event,data},actorId);
  if(kind==="mystery") return configureMystery(db,guildId,{...data,key,source_event},actorId);
  if(kind==="relationship"){
    const allowed=["fromType","fromKey","toType","toKey","relationshipType","score","note"];
    if(Object.keys(data).some(field=>!allowed.includes(field))) throw new Error("Unsupported relationship draft fields.");
    if(!["npc","faction","location"].includes(data.fromType)||!["npc","faction","location"].includes(data.toType)) throw new Error("PC emotions/commitments cannot be authored.");
    for(const [type,endpoint] of [[data.fromType,data.fromKey],[data.toType,data.toKey]]){
      if(type==="npc"?!db.getNpcProfile(guildId,endpoint):!db.getSimulationEntity(guildId,type,endpoint)) throw new Error("Relationship endpoint must already exist.");
    }
    if(db.findRelationship(guildId,data)) throw new Error("Relationship already exists; authoring does not overwrite it.");
    return db.upsertRelationship(guildId,{...data,visibility:"gm",source:"human_approved_world_draft"});
  }
  throw new Error("Unsupported authoring kind.");
}
function validate(db,content,guildId,input,actorId){
  const {kind,key,data}=input;
  if(!kinds.includes(kind)||normalizeNpcKey(key)!==key) throw new Error("Supported kind and normalized stable key required.");
  if(kind==="npc"&&db.getNpcProfile(guildId,key)||["location","faction"].includes(kind)&&db.getSimulationEntity(guildId,kind,key)
    ||["institution","mystery"].includes(kind)&&db.getCityRecord(guildId,kind,key)||db.getReference(guildId,kind,key)) throw new Error("Identity already exists; draft cannot replace established state.");
  if(data.name&&db.worldDraftNameInUse(guildId,kind,data.name,key)) throw new Error("Duplicate world entity name.");
  // Reuse exact production validators inside a rolled-back savepoint, including all their audit writes.
  const rollback=new Error("AUTHOR_VALIDATION_ROLLBACK");
  try{db.transaction(()=>{materialize(db,content,guildId,input,actorId);throw rollback;});}
  catch(error){if(error!==rollback) throw error;}
}
export function authorWorldDraft(db,content,guildId,input,actorId){
  cityObject(input);if(db.getCityCalendar(guildId).flags.authoring!==true) throw new Error("World authoring is opt-in.");
  const key=cityKey(input.key),before=db.getCityRecord(guildId,"world_draft",key);
  if(before) return before;
  requireCitySource(db,guildId,input.source_event);cityObject(input.data);
  validate(db,content,guildId,input,actorId);
  return db.transaction(()=>{const after=db.saveCityRecord(guildId,{kind:"world_draft",key,status:"draft",source_event:input.source_event,
    data:{kind:input.kind,key,data:input.data,visibility:"gm",canon_changed:false}});
    cityAudit(db,guildId,"world_draft",key,null,after,actorId);return after;});
}
export function reviewWorldDraft(db,content,guildId,input,actorId){
  cityObject(input);if(db.getCityCalendar(guildId).flags.authoring!==true) throw new Error("World authoring is opt-in.");
  const before=db.getCityRecord(guildId,"world_draft",cityKey(input.key));if(!before) throw new Error("Draft not found.");
  if(before.status!=="draft") return before;
  if(!["approve","reject"].includes(input.decision)) throw new Error("Human approve/reject required.");
  requireCitySource(db,guildId,before.source_event);
  return db.transaction(()=>{
    const proposal={...before.data,source_event:before.source_event};
    if(input.decision==="approve"){validate(db,content,guildId,proposal,actorId);materialize(db,content,guildId,proposal,actorId);}
    const after=db.saveCityRecord(guildId,{...before,key:before.record_key,status:input.decision==="approve"?"approved":"rejected",
      data:{...before.data,reviewed_by:actorId,decision:input.decision}});
    cityAudit(db,guildId,"world_draft_review",input.key,before,after,actorId);return after;
  });
}
