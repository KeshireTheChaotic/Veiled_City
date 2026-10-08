/** Validated inert content definitions reuse seed drafts/references. GM boundary owns rights/public review, never model data. */
import { createHash } from "node:crypto";
import { cityObject, cityKey, cityAudit, indexWorldEvent } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { addSeedDraft, reviewSeedDraft } from "./seed-drafts.js";
import { stateRevision } from "./ai-intents.js";
const format="veiled-city-content-package-v1";
const fields={npc:["name","occupation","public_identity","portrayal","gm_notes"],location:["name","description","gm_notes"],
  faction:["name","description","gm_notes"],mystery:["name","description","truth","clues","gm_notes"],
  rules_reference:["name","text"],player_material:["name","text"]};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==="object"?
  Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
function closed(value,keys){cityObject(value);if(Object.keys(value).some(key=>!keys.includes(key))) throw new Error("Closed inert package fields required; no runtime/owner/authority fields.");}
function bounded(value,max=2000){if(typeof value!=="string"||!value.trim()||value.length>max) throw new Error("Bounded nonempty package text required.");}
export function validateContentPackage(input){
  closed(input,["format","name","version","license","sources","entries","sha256"]);
  if(input.format!==format||JSON.stringify(input).length>24000) throw new Error("Supported content package format and 24000-character bound required.");
  for(const field of ["name","version","license"]) bounded(input[field],160);
  if(!Array.isArray(input.sources)||!input.sources.length||input.sources.length>8||!Array.isArray(input.entries)||!input.entries.length||input.entries.length>12)
    throw new Error("One to eight source citations and one to twelve inert definitions required.");
  const sources=new Set(),entries=new Set();
  for(const source of input.sources){closed(source,["id","title","url","license"]);cityKey(source.id);
    if(sources.has(source.id)) throw new Error("Duplicate source citation.");sources.add(source.id);
    bounded(source.title,160);bounded(source.license,160);bounded(source.url,500);
    const url=new URL(source.url);if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash) throw new Error("Public HTTPS source citation without credentials/query required.");
  }
  for(const entry of input.entries){closed(entry,["kind","key","visibility","source_refs","definition"]);cityKey(entry.key);
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.key)) throw new Error("Normalized definition keys required.");
    if(!fields[entry.kind]||!['gm','public'].includes(entry.visibility)||!Array.isArray(entry.source_refs)||!entry.source_refs.length
      ||entry.source_refs.length>8||entry.source_refs.some(id=>!sources.has(id))) throw new Error("Supported inert kind, explicit privacy and exact source citations required.");
    const key=`${entry.kind}:${entry.key}`;if(entries.has(key)) throw new Error("Duplicate definition identity.");entries.add(key);
    closed(entry.definition,fields[entry.kind]);bounded(entry.definition.name,160);
    for(const [key,value] of Object.entries(entry.definition)){
      if(key==="clues"){if(!Array.isArray(value)||value.length>12) throw new Error("Bounded mystery clue references required.");for(const clue of value) bounded(clue,600);}
      else bounded(value);
    }
    if(entry.visibility==="public"&&(entry.definition.gm_notes||entry.definition.truth)) throw new Error("GM notes/fixed mystery truths cannot be labelled public.");
  }
  const {sha256,...document}=input,actual=digest(document);
  if(sha256!==undefined&&sha256!==actual) throw new Error("Package integrity digest mismatch.");
  return {document:canonical(document),sha256:actual};
}
export function previewContentPackage(db,guild,input){
  const valid=validateContentPackage(input);
  const entries=valid.document.entries.map(entry=>({...entry,collision:entry.kind==="npc"?!!db.getNpcProfile(guild,entry.key):
    ['location','faction'].includes(entry.kind)?!!db.getSimulationEntity(guild,entry.kind,entry.key):!!db.getCityRecord(guild,entry.kind,entry.key)}));
  return {...valid,read_only:true,entries,rights:"Citation/license strings are unverified declarations. Authenticated human redistribution-rights approval is required.",
    privacy:"Public labels are proposals, not disclosure permission. Separate human public-export review is required; no live state, PC data or homebrew installation."};
}
export function importContentPackage(db,guild,input,actor,{rightsApproved=false}={}){
  const preview=previewContentPackage(db,guild,input);if(rightsApproved!==true) throw new Error("Explicit human rights approval required before import.");
  const id=`package:${preview.sha256}`,prior=db.getCityRecord(guild,"seed_draft",id);if(prior) return prior;
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key:id,source_id:actor,kind:"content_package",title:"Rights-reviewed inert content package",visibility:"gm",
      details:{sha256:preview.sha256,rights_reviewed_by:actor,authority:"definitions_only_not_live_state_or_rules"}},actor);
    return addSeedDraft(db,guild,{kind:"reference",key:`package-${preview.sha256.slice(0,24)}`,source_event:source.event_key,
      data:preview.document,reason:"Inert content package; live authoring requires separate native validation and review."},actor,
    {id,provenance:{sha256:preview.sha256,rights_reviewed_by:actor,collisions:preview.entries.filter(row=>row.collision).map(row=>`${row.kind}:${row.key}`)}});
  });
}
export function reviewContentPackage(db,guild,{id,expected_revision,decision,public_export=false},actor){
  const row=db.getCityRecord(guild,"seed_draft",id);if(!row||stateRevision(row)!==expected_revision) throw new Error("Current exact package draft revision required.");
  const valid=validateContentPackage(row.data.proposal.data);requireCitySource(db,guild,row.source_event);
  if(valid.sha256!==row.data.provenance.sha256) throw new Error("Package changed after rights review; reimport revised content for fresh approval.");
  if(typeof public_export!=="boolean"||!['approve','reject'].includes(decision)) throw new Error("Explicit human package decision/public review required.");
  return db.transaction(()=>{
    const reviewed=reviewSeedDraft(db,guild,id,decision,actor);
    const after=db.saveCityRecord(guild,{...reviewed,key:id,data:{...reviewed.data,public_export_approved:decision==="approve"&&public_export,
      public_export_reviewed_by:decision==="approve"&&public_export?actor:null}});
    cityAudit(db,guild,"content_package_review",id,row,after,actor);return after;
  });
}
export function exportContentPackage(db,guild,id,{publicOnly=true}={}){
  const row=db.getCityRecord(guild,"seed_draft",id);if(!row||row.status!=="approved") throw new Error("Approved inert package required.");
  requireCitySource(db,guild,row.source_event);
  const {document,sha256}=validateContentPackage(row.data.proposal.data);
  if(sha256!==row.data.provenance.sha256) throw new Error("Package changed after rights review; reimport revised definitions.");
  if(publicOnly&&!row.data.public_export_approved) throw new Error("Separate authenticated human public-export review required.");
  const entries=document.entries.filter(entry=>!publicOnly||entry.visibility==="public");
  if(!entries.length) throw new Error("No approved public definitions to export.");
  const used=new Set(entries.flatMap(entry=>entry.source_refs)),output={...document,entries,sources:document.sources.filter(source=>used.has(source.id))};
  if(publicOnly){
    const text=JSON.stringify(output),names=db.listGuildCharacters(guild).map(pc=>pc.name).filter(name=>name.length>=3);
    if(/<@!?\d+>|\b\d{17,20}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|[A-Z]:\\|\b(?:api[_-]?key|discord[_-]?token)\b/i.test(text)
      ||names.some(name=>new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"i").test(text)))
      throw new Error("Possible personal/runtime information blocked from public export; redact and reimport for human review.");
  }
  return {...output,sha256:digest(output)};
}
