/** Persisted evidence types and ancestry. Model certainty never promotes evidence to truth. */
import { randomUUID } from "node:crypto";
import { indexWorldEvent, cityAudit } from "./city-calendar.js";
export const epistemicSchema={anyOf:[{type:"null"},{type:"object",additionalProperties:false,
  properties:{kind:{type:"string",enum:["observation","testimony","hypothesis","established"]},
    source_refs:{type:"array",maxItems:8,items:{type:"string",maxLength:200}},perspective:{type:"string",maxLength:180}},
  required:["kind","source_refs","perspective"]}]};
export function evidenceType(fact){
  let data;try{data=JSON.parse(fact?.provenance_json||"{}");}catch{data={};}
  return data.epistemic||{kind:fact?.source==="ai_gm"||["hypothesis","recap"].includes(fact?.category)?"hypothesis"
    :["rumor","testimony"].includes(fact?.category)?"testimony":"established",source_refs:[],perspective:"legacy"};
}
export function activeEvidence(db,guild,key,seen=new Set()){
  key=String(key).replace(/^event:/,"");if(seen.has(key)||seen.size>=32)return false;seen.add(key);
  const event=db.getWorldEvent(guild,key);if(event)return event.status==="active";
  const fact=db.getFact(guild,key);if(!fact||fact.archived)return false;
  return evidenceType(fact).source_refs.every(ref=>activeEvidence(db,guild,ref,new Set(seen)));
}
export function objectiveEvidence(db,guild,fact){
  if(!fact||fact.archived)return false;
  const type=evidenceType(fact);
  return ["established","observation"].includes(type.kind)&&type.source_refs.every(ref=>activeEvidence(db,guild,ref));
}
export function typedEvidence(db,guild,event,scope){
  const value=event.epistemic||{kind:"hypothesis",source_refs:[],perspective:scope.actorCharacterId?`character:${scope.actorCharacterId}`:"narrator"};
  if(Object.keys(value).sort().join()!=="kind,perspective,source_refs"||!['observation','testimony','hypothesis','established'].includes(value.kind)
    ||typeof value.perspective!=="string"||value.perspective.length>180||!Array.isArray(value.source_refs)||value.source_refs.length>8
    ||value.source_refs.some(ref=>typeof ref!=="string"||ref.length>200||!activeEvidence(db,guild,ref)))throw new Error("Typed evidence needs active bounded source ancestry.");
  for(const key of value.source_refs){
    const row=db.getWorldEvent(guild,key.replace(/^event:/,""))||db.getFact(guild,key);
    if(!["party","public"].includes(row.visibility)&&!(scope.mode==="private"&&(
      row.visibility==="character"&&(row.subject_key||row.subject_character_id)===scope.actorCharacterId
      ||row.visibility==="player"&&(row.subject_key||row.subject_user_id)===scope.actorUserId)))throw new Error("Evidence source is outside the acting audience.");
  }
  if(value.kind==="established")throw new Error("AI drafts cannot promote truth; use authenticated GM fact establishment.");
  if(value.kind==="observation"&&(!value.source_refs.length||!value.source_refs.every(key=>{
    const fact=db.getFact(guild,key);if(fact)return objectiveEvidence(db,guild,fact)&&fact.content===event.value;
    const source=db.getWorldEvent(guild,key.replace(/^event:/,""));
    return source.kind==="observation"&&source.details.observation===event.value;
  })))throw new Error("Observation must repeat a committed observation, not infer an outcome.");
  if(value.kind==="testimony"&&!value.source_refs.length)throw new Error("Testimony requires its authored/delivered source.");
  return {...value,source_refs:[...value.source_refs]};
}
export function establishFact(db,guild,id,reviewer){
  if(!reviewer)throw new Error("Authenticated GM required.");
  const before=db.getFact(guild,id);if(!before||before.archived)throw new Error("Active fact required.");
  return db.transaction(()=>{
    const event=indexWorldEvent(db,guild,{key:`fact-ruling:${randomUUID()}`,kind:"gm_fact_ruling",title:"GM established fact",
      source_id:reviewer,visibility:before.visibility,subject_key:before.subject_character_id||before.subject_user_id||undefined,
      details:{fact_id:id,reviewed_by:reviewer}},reviewer);
    const provenance=JSON.parse(before.provenance_json||"{}");
    provenance.epistemic={kind:"established",source_refs:[event.event_key],perspective:`gm:${reviewer}`,prior:evidenceType(before)};
    const after=db.updateFactProvenance(guild,id,provenance);cityAudit(db,guild,"fact_establish",id,before,after,reviewer);return after;
  });
}
