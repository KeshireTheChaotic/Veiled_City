/** Perspective and presentation ancestry. Originals are retained; review adds metadata, never rewrites fiction. */
import { typedEvidence, evidenceType, objectiveEvidence, activeEvidence } from "./epistemic.js";
import { cityAudit, indexWorldEvent } from "./city-calendar.js";
import { stateRevision } from "./ai-intents.js";
import { randomUUID } from "node:crypto";
export const inferredSource=source=>!['gm','human_gm','hook_import','external_character_creator'].includes(source)&&!String(source).startsWith('seed');
export function relationshipEvidence(row){
  let data={};try{data=JSON.parse(row?.provenance_json||"{}");}catch{/* Preserve malformed legacy originals as uncertain. */}
  return data.epistemic||{kind:inferredSource(row?.source)?"hypothesis":"testimony",source_refs:[],
    perspective:`${row?.from_type||"unknown"}:${row?.from_key||"legacy"}`,authority:"Directional interpretation; never PC feelings, debt or agreement"};
}
export function relationshipProvenance(db,guild,draft,scope,existing){
  const epistemic=typedEvidence(db,guild,{value:draft.note||"",epistemic:draft.epistemic||null},scope);
  // Relationship interpretation always belongs to a perspective, even if it cites an observation.
  return {epistemic:{...epistemic,perspective:`${draft.from_type}:${draft.from_key}`,authority:"Interpretation, not consent or binding debt"},
    original:existing?{note:existing.note,score:existing.score,source:existing.source,epistemic:relationshipEvidence(existing)}:null};
}
export function artifactProvenance(db,guild,draft,visibility,subject,scope){
  if(draft.epistemic&&(Object.keys(draft.epistemic).sort().join()!=="kind,perspective,source_refs"
    ||!['observation','testimony','hypothesis'].includes(draft.epistemic.kind)||typeof draft.epistemic.perspective!=="string"
    ||draft.epistemic.perspective.length>180||!Array.isArray(draft.epistemic.source_refs)||draft.epistemic.source_refs.length>8
    ||draft.epistemic.source_refs.some(key=>typeof key!=="string"||key.length>200||!activeEvidence(db,guild,key))))throw new Error("Bounded active artifact perspective/ancestry required.");
  const refs=draft.epistemic?.source_refs||[],requested=draft.canonical_facts||[];
  const accepted=[],sources=[];
  for(const value of requested){
    const matching=refs.find(key=>{
      if(!activeEvidence(db,guild,key))return false;
      const fact=db.getFact(guild,key),event=db.getWorldEvent(guild,String(key).replace(/^event:/,"")),row=fact||event;
      if(!row)return false;
      const visible=["public","party"].includes(row.visibility)||visibility==="gm"
        ||row.visibility===visibility&&(row.subject_key||row.subject_character_id||row.subject_user_id)===subject;
      return visible&&(fact?objectiveEvidence(db,guild,fact)&&fact.content===value:event.kind==="observation"&&event.details.observation===value);
    });
    if(matching){accepted.push(value);sources.push(matching);}
  }
  return {accepted,metadata:{generated:true,epistemic:{kind:accepted.length?"testimony":"hypothesis",source_refs:[...new Set(sources)],
    perspective:draft.epistemic?.perspective||"artifact author; reliability is not objective truth"},
    proposed_canonical_facts:requested,authority:"Only source-backed canonical_facts are established. Decorative presentation is not truth.",
    unsupported_count:requested.length-accepted.length}};
}
export function reviewPresentation(db,guild,input,reviewer){
  if(!reviewer||Object.keys(input).sort().join()!=="decision,expected_revision,key,kind,op,reason,source_refs"||input.op!=="review-presentation"
    ||!["handout","relationship","relationship_interpretation","recap"].includes(input.kind)||!["approve","reject"].includes(input.decision)
    ||typeof input.reason!=="string"||!input.reason.trim()||input.reason.length>1000||!Array.isArray(input.source_refs)||input.source_refs.length>8
    ||input.source_refs.some(key=>typeof key!=="string"||!activeEvidence(db,guild,key)))throw new Error("Closed sourced GM presentation review required.");
  const target=input.kind==="handout"?db.getHandout(input.key):input.kind==="relationship"?db.getRelationship(input.key)
    :input.kind==="relationship_interpretation"?db.getCityRecord(guild,"relationship_interpretation",input.key)
    :db.presentationSession(guild,input.key);
  if(!target||target.guild_id!==guild||stateRevision(target)!==input.expected_revision)throw new Error("Current presentation target revision required.");
  return db.transaction(()=>{
    const event=indexWorldEvent(db,guild,{key:`presentation-review:${randomUUID()}`,kind:"presentation_review",title:"GM reviewed presentation without rewriting its original",
      source_id:reviewer,visibility:"gm",details:{...input,reviewed_by:reviewer}},reviewer);
    const row=db.saveCityRecord(guild,{kind:"presentation_review",key:event.event_key,source_event:event.event_key,
      data:{...input,reviewed_by:reviewer,authority:"Reviewed interpretation; does not authorize PC feelings/consent or alter original/canon"}});
    cityAudit(db,guild,"presentation_review",event.event_key,null,row,reviewer);return row;
  });
}
export function presentationContext(db,guild){
  return {interpretations:db.listCityRecords(guild,{kind:"relationship_interpretation",includeGM:true,limit:12})
    .map(row=>({...row,evidence_active:activeEvidence(db,guild,row.source_event)
      &&row.data.provenance.epistemic.source_refs.every(ref=>activeEvidence(db,guild,ref)),expected_revision:stateRevision(row)})),
    reviews:db.listCityRecords(guild,{kind:"presentation_review",includeGM:true,limit:12})
      .map(row=>({...row,evidence_active:activeEvidence(db,guild,row.source_event)&&row.data.source_refs.every(ref=>activeEvidence(db,guild,ref))})),
    authority:"Review/interpretation records only; originals retained. No PC emotions, consent, debt or automatic canon."};
}
export function presentationView(db,guild,input){
  if(Object.keys(input).some(key=>!["op","kind","key"].includes(key))||input.op!=="presentations"
    ||!["handout","relationship","relationship_interpretation","recap"].includes(input.kind)
    ||input.key!==undefined&&(typeof input.key!=="string"||!input.key||input.key.length>200))throw new Error("Known presentation kind and optional bounded full ID required.");
  const get=key=>input.kind==="handout"?db.getHandout(key):input.kind==="relationship"?db.getRelationship(key)
    :input.kind==="relationship_interpretation"?db.getCityRecord(guild,"relationship_interpretation",key):db.presentationSession(guild,key);
  const rows=input.key?[get(input.key)]:input.kind==="handout"?db.listHandoutsFor(guild,"",{includeGM:true,limit:12})
    :input.kind==="relationship"?db.listRelationships(guild,{includeGM:true}).slice(0,12)
    :input.kind==="relationship_interpretation"?db.listCityRecords(guild,{kind:input.kind,includeGM:true,limit:12}):[db.latestEndedSession(guild)];
  if(input.key&&(!rows[0]||rows[0].guild_id!==guild))throw new Error("Campaign presentation target not found.");
  return {visibility:"gm",read_only:true,kind:input.kind,targets:rows.filter(row=>row?.guild_id===guild)
    .map(row=>({target:row,expected_revision:stateRevision(row)})),reviews:presentationContext(db,guild).reviews,
    coverage:"At most 12 recent targets/reviews; supply a full key to inspect an older target. No mutation or authority promotion."};
}
