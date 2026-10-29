/** Opt-in depth: established upkeep obligations without auto-spending; demand-driven minor NPC drafts without unearned knowledge. */
import { cityObject, cityKey, cityAudit } from './frameworks/world/public.js';
import { requireCitySource } from './frameworks/world/public.js';
import {normalizeEntityKey as normalizeNpcKey} from './kernel/entity-key.js';
import {minorNpcSchema} from './frameworks/world/minor-npc-schema.js';
export {minorNpcSchema};

import {requireWorldFeature as flag} from './frameworks/world/public.js';
export {recordCityUpkeep} from './frameworks/world/public.js';
function reservedNames(db,content,guildId){
  const names=db.listNpcProfiles(guildId,{limit:500}).map(row=>row.display_name);
  for(const rel of ["GM_PRIVATE/NPCS/npcs.json","GM/NPCS/npcs.json"]){
    const raw=content.read(rel);if(!raw.trim()) continue;
    const parsed=JSON.parse(raw);if(!Array.isArray(parsed)) throw new Error("Packaged NPC roster must be an array.");
    names.push(...parsed.map(row=>row.name).filter(Boolean));
  }
  return [...new Set(names)];
}
export function validateMinorIdentity(db,content,guildId,key,data){
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
  const data=await gm.planMinorNpc({guildId,role:input.role,location:input.location,publicContext:input.public_context||"",reservedNames:reservedNames(db,content,guildId).slice(0,80)});
  validateMinorIdentity(db,content,guildId,key,data);
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
      validateMinorIdentity(db,content,guildId,before.record_key,before.data.profile);
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
import {worldCityDepthSource} from './frameworks/world/public.js';
// Provide this module's original minor identity validator to the fixed World slot; no other authority is granted.
worldCityDepthSource.bind({validateMinorIdentity});
