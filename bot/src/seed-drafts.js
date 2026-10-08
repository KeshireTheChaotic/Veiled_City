/** Add-only bulk projections and GM-reviewed seed drafts. Archives are sources, never shared knowledge or automatic canon. */
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { cityObject, cityKey, cityInteger, cityAudit, indexWorldEvent } from "./city-calendar.js";
import { requireCitySource, updateCityCore } from "./city-core.js";
import { CIVIC_KINDS, updateCityCivic } from "./city-civic.js";
import { configurePortrayal } from "./portrayal.js";
import { configureMystery } from "./story-continuity.js";
import { configureSimulationEntity } from "./simulation.js";
import { normalizeNpcKey } from "./npc-cognition.js";

const plain=value=>value&&typeof value==="object"&&!Array.isArray(value);
const hash=value=>createHash("sha256").update(value).digest("hex").slice(0,32);
const CORE=["institution","district","belief","case"];
export const SEED_DRAFT_KINDS=["portrayal","simulation","clock","relationship","mystery","reference",...CORE,...CIVIC_KINDS];
const directionFields=["address","formality","humor","verbal_habits","emotional_tone","pronunciation"];

function sourceEvent(db,guildId,document,actorId){
  return indexWorldEvent(db,guildId,{key:`seed-source:${hash(document.source_path+document.sha256)}`,
    source_kind:"gm",source_id:`seed:${hash(document.source_path)}`,kind:"seed_source",title:"Accepted content seed source",
    visibility:"gm",details:{source_path:document.source_path,sha256:document.sha256,
      source_visibility:document.visibility,subject_character_id:document.subject_character_id,authority:"reference_only"}},actorId).event_key;
}

function proposal(input){
  cityObject(input);
  if(Object.keys(input).some(key=>!["kind","key","data","source_event","reason"].includes(key))) throw new Error("Unsupported seed draft field.");
  if(!SEED_DRAFT_KINDS.includes(input.kind)) throw new Error("Unsupported seed draft kind.");
  cityKey(input.key);cityObject(input.data);
  if(input.reason!==undefined&&(typeof input.reason!=="string"||input.reason.length>1000)) throw new Error("Bounded draft reason required.");
  if(input.kind==="portrayal"){
    if(Object.keys(input.data).some(key=>!directionFields.includes(key))
      ||!Object.keys(input.data).length||Object.values(input.data).some(value=>typeof value!=="string"||value.length>160))
      throw new Error("Use only bounded speaking-style fields; no knowledge or mechanics.");
  }
  return input;
}

export function addSeedDraft(db,guildId,input,actorId,{id=`manual:${randomUUID()}`,provenance={}}={}){
  proposal(input);requireCitySource(db,guildId,input.source_event);cityKey(id);
  const prior=db.getCityRecord(guildId,"seed_draft",id);
  if(prior) return prior; // Includes rejected/removed tombstones: rerunning seed-data never resurrects a draft.
  return db.transaction(()=>{
    const after=db.saveCityRecord(guildId,{kind:"seed_draft",key:id,status:"draft",source_event:input.source_event,
      data:{proposal:{kind:input.kind,key:input.key,data:input.data},reason:input.reason||"Human-authored seed draft",
        provenance,revision:1,created_by:actorId,history:[]}});
    cityAudit(db,guildId,"seed_draft_add",id,null,after,actorId);return after;
  });
}

export function editSeedDraft(db,guildId,id,patch,actorId){
  cityObject(patch);
  if(Object.keys(patch).some(key=>!["kind","key","data","reason"].includes(key))) throw new Error("Only proposal fields and reason may be edited.");
  const before=db.getCityRecord(guildId,"seed_draft",cityKey(id));
  if(!before||before.status!=="draft") throw new Error("An editable pending seed draft is required.");
  const next=proposal({...before.data.proposal,reason:before.data.reason,...patch});
  requireCitySource(db,guildId,before.source_event);
  return db.transaction(()=>{
    const after=db.saveCityRecord(guildId,{...before,key:id,data:{...before.data,
      proposal:{kind:next.kind,key:next.key,data:next.data},reason:next.reason,revision:before.data.revision+1,
      history:[...before.data.history,{action:"edit",actor:actorId,revision:before.data.revision,proposal:before.data.proposal}]}});
    cityAudit(db,guildId,"seed_draft_edit",id,before,after,actorId);return after;
  });
}

function materialize(db,guildId,row,actorId,publicVoice){
  const {kind,key,data}=proposal(row.data.proposal),source_event=row.source_event;
  requireCitySource(db,guildId,source_event);
  if(publicVoice&&kind!=="portrayal") throw new Error("Public voice approval applies only to portrayal drafts.");
  if(kind==="portrayal"){
    const current=db.getSimulationEntity(guildId,"npc",key)?.state?.voice?.portrayal_direction||{};
    if(Object.keys(data).some(field=>Object.hasOwn(current,field))) throw new Error("Speaking-style field already exists; seed approval cannot overwrite GM edits.");
    if(publicVoice&&Object.keys(current).length) throw new Error("Existing private directions require separate public review; seed approval cannot publish them implicitly.");
    return configurePortrayal(db,guildId,{npc:key,direction:{...current,...data},source_event,
      public_voice_approved:publicVoice},actorId);
  }
  if(kind==="reference"){
    if(db.getCityRecord(guildId,"seed_reference",key)) throw new Error("Seed reference already exists.");
    return db.saveCityRecord(guildId,{kind:"seed_reference",key,source_event,data:{content:data,authority:"reference_only"}});
  }
  if(kind==="clock"){
    if(Object.keys(data).some(field=>!["label","max","value","stages"].includes(field))) throw new Error("Unsupported clock field.");
    if(db.getClock(guildId,key)) throw new Error("Clock already exists; seed approval cannot reset progress.");
    cityKey(data.label);cityInteger(data.max,1,100);cityInteger(data.value??0,0,data.max);
    if(data.stages!==undefined&&(!Array.isArray(data.stages)||data.stages.length>101
      ||data.stages.some(stage=>typeof stage!=="string"||stage.length>2000))) throw new Error("Invalid clock stages.");
    const result=db.changeClock(guildId,key,data.value??0,{label:data.label,max:data.max,visibility:"gm"});
    db.saveCityRecord(guildId,{kind:"seed_clock",key,source_event,data});return result;
  }
  if(kind==="simulation"){
    const {type,state}=data;cityObject(state);
    if(Object.keys(data).some(field=>!["type","state"].includes(field))||!["npc","faction","location"].includes(type))
      throw new Error("Typed NPC/faction/location simulation data required.");
    if(type==="npc"?!db.getNpcProfile(guildId,key):!db.getSimulationEntity(guildId,type,key)) throw new Error("Simulation target must already exist.");
    const allowed=type==="location"?["wards","entrances","hazards"]
      :["activity_tier","location_key","preparation","position","traits","resources"];
    if(Object.keys(state).some(field=>!allowed.includes(field))) throw new Error("Unsupported simulation seed field.");
    for(const field of ["preparation","position","traits"]) if(state[field]!==undefined) cityInteger(state[field],0,5);
    for(const field of ["wards","entrances","hazards"]) if(state[field]!==undefined
      &&(!Array.isArray(state[field])||state[field].length>30||state[field].some(value=>typeof value!=="string"||value.length>500)))
      throw new Error("Simulation location descriptors must be bounded string lists, not mechanics.");
    const current=db.getSimulationEntity(guildId,type,key)?.state||{};
    if(Object.keys(state).some(field=>Object.hasOwn(current,field))) throw new Error("Simulation field already exists; use normal GM tools to change live state.");
    if(state.location_key&&!db.getSimulationEntity(guildId,"location",state.location_key)) throw new Error("Location is not established.");
    return configureSimulationEntity(db,guildId,type,key,state);
  }
  if(kind==="relationship"){
    const allowed=["fromType","fromKey","toType","toKey","relationshipType","score","note"];
    if(Object.keys(data).some(field=>!allowed.includes(field))) throw new Error("Unsupported relationship seed field.");
    for(const [type,endpoint] of [[data.fromType,data.fromKey],[data.toType,data.toKey]]){
      if(!["npc","faction","location"].includes(type)) throw new Error("Seed relationships cannot author PC feelings or consent.");
      if(type==="npc"?!db.getNpcProfile(guildId,endpoint):!db.getSimulationEntity(guildId,type,endpoint)) throw new Error("Relationship endpoint not found.");
    }
    cityKey(data.relationshipType);cityInteger(data.score,-5,5);
    if(data.note!==undefined&&(typeof data.note!=="string"||data.note.length>2000)) throw new Error("Bounded relationship note required.");
    if(db.findRelationship(guildId,data)) throw new Error("Relationship already exists.");
    return db.upsertRelationship(guildId,{...data,visibility:"gm",source:"human_approved_seed"});
  }
  if(db.getCityRecord(guildId,kind,key)) throw new Error("Live target already exists; seed approval cannot overwrite it.");
  const input={kind,key,data,source_event};
  if(CORE.includes(kind)) return updateCityCore(db,guildId,input,actorId);
  if(CIVIC_KINDS.includes(kind)){
    const result=updateCityCivic(db,guildId,input,actorId);
    if(result.kind==="change") throw new Error("Major civic changes require the dedicated city review workflow.");
    return result;
  }
  if(kind==="mystery") return configureMystery(db,guildId,{...data,key,source_event},actorId);
  throw new Error("Unsupported seed materializer.");
}

export function reviewSeedDraft(db,guildId,id,action,actorId,{reason="",publicVoice=false}={}){
  if(!["approve","reject","remove"].includes(action)) throw new Error("Use approve, reject, or remove.");
  if(typeof reason!=="string"||reason.length>1000) throw new Error("Bounded review reason required.");
  const before=db.getCityRecord(guildId,"seed_draft",cityKey(id));
  if(!before) throw new Error("Seed draft not found in this campaign.");
  const status={approve:"approved",reject:"rejected",remove:"removed"}[action];
  if(before.status===status) return before;
  if(before.status!=="draft") throw new Error("Only pending seed drafts may be reviewed or removed; approved state uses normal GM tools.");
  return db.transaction(()=>{
    if(action==="approve"){
      db.snapshotCampaign(guildId,{label:"Pre-seed draft approval",reason:id,createdBy:actorId});
      materialize(db,guildId,before,actorId,publicVoice);
    }
    const after=db.saveCityRecord(guildId,{...before,key:id,status,data:{...before.data,reviewed_by:actorId,
      history:[...before.data.history,{action,actor:actorId,reason,revision:before.data.revision,public_voice_approved:publicVoice}]}});
    cityAudit(db,guildId,`seed_draft_${action}`,id,before,after,actorId);return after;
  });
}

// This deliberately uses only nonsecret portrayal text, never dossiers' secret/knows/want fields.
function inferDirection(text){
  if(typeof text!=="string") return {};
  const result={};
  if(/\b(calm|patient|gentle|soft-spoken)\b/i.test(text)) result.emotional_tone="Calm and measured.";
  if(/\b(practical|direct|blunt|terse)\b/i.test(text)) result.verbal_habits="Concise, concrete phrasing.";
  if(/\b(formal|precise|meticulous)\b/i.test(text)) result.formality="Careful, precise phrasing.";
  if(/\b(wry|sarcastic|dry humor|dry wit)\b/i.test(text)) result.humor="Dry and understated.";
  return result;
}

function fillDossierFields(db,guildId,entry,key,source_event,actorId){
  const marker=`fields:${hash(JSON.stringify([entry.source_path,entry.entry_key]))}`;
  if(db.getCityRecord(guildId,"seed_fields",marker)) return 0;
  const data=entry.data;let added=0;
  if(entry.kind==="npc"&&db.getNpcProfile(guildId,key)){
    if(data.want&&!db.getNpcGoal(guildId,key,"seed.primary")){
      db.upsertNpcGoal(guildId,{npcKey:key,goalKey:"seed.primary",title:"Primary agenda",objective:data.want,priority:80,
        rationale:"Missing field backfilled from accepted NPC dossier.",source:"gm_dossier"});added++;
    }
    const known=(knowledgeKey,content,beliefState,confidence,isSecret)=>{
      if(!String(content||"").trim()||db.getNpcKnowledge(guildId,key,knowledgeKey)) return;
      db.upsertNpcKnowledge(guildId,{npcKey:key,knowledgeKey,content:String(content),beliefState,confidence,isSecret,
        sourceType:"seed",sourceRef:entry.source_path});added++;
    };
    (data.knows||[]).forEach((value,index)=>known(`seed.known.${index+1}`,value,"known",95,false));
    (data.does_not||[]).forEach((value,index)=>known(`seed.unknown.${index+1}`,value,"unknown",100,true));
    known("seed.self_secret",data.secret,"known",100,true);
    if(data.secret) db.addNpcMemory(guildId,{npcKey:key,memoryType:"secret",content:String(data.secret),subjectType:"npc",subjectKey:key,
      importance:85,confidence:100,sourceType:"seed",sourceRef:entry.source_path,tags:["seed","self-secret"],dedupe:true});
  }
  if(entry.kind==="faction"&&data.goal&&!db.listSimulationRecords(guildId,{
    kind:"goal",entityKey:`faction:${key}`,limit:1000}).some(row=>row.data.goal_key==="seed.primary")){
    db.putSimulationRecord(guildId,{kind:"goal",entityKey:`faction:${key}`,data:{goal_key:"seed.primary",objective:data.goal,
      priority:80,dependencies:[],source:"gm_dossier"}});added++;
  }
  const after=db.saveCityRecord(guildId,{kind:"seed_fields",key:marker,source_event,
    data:{source_path:entry.source_path,source_entry:entry.entry_key,added,authority:"own_dossier_only"}});
  cityAudit(db,guildId,"seed_fields_backfill",marker,null,after,actorId);return added;
}

/** Bulk coverage is lossless via source pointers. Ambiguous/templates stay references; supported runtime proposals require GM review. */
export function backfillSeedData(db,guildId,actorId){
  const counts={sources:0,entries:0,library:0,fields:0,drafts:0,byKind:{}};
  const documents=db.listSeedDocuments(guildId,{includeGM:true}),byPath=new Map(documents.map(doc=>[doc.source_path,doc]));
  const sourceFor=document=>sourceEvent(db,guildId,document,actorId);
  function coverage(document,entry=null){
    const key=`seed:${hash(JSON.stringify([document.source_path,entry?"entry":"document",entry?.entry_key??null]))}`;
    if(db.getCityRecord(guildId,"seed_content",key)) return;
    db.saveCityRecord(guildId,{kind:"seed_content",key,source_event:sourceFor(document),data:{
      source_path:document.source_path,source_sha256:document.sha256,source_entry:entry?.entry_key??null,
      kind:entry?.kind||"document",source_visibility:document.visibility,subject_character_id:document.subject_character_id,
      authority:"reference_only",encoding:document.encoding}});
    counts[entry?"entries":"sources"]++;
  }
  function draft(document,entry,kind,key,data,reason,inferred=false){
    const id=`seed:${hash(JSON.stringify([document.source_path,entry.entry_key,kind,key]))}`;
    if(db.getCityRecord(guildId,"seed_draft",id)) return;
    addSeedDraft(db,guildId,{kind,key,data,source_event:sourceFor(document),reason},actorId,{id,provenance:{
      source_path:document.source_path,source_entry:entry.entry_key,sha256:document.sha256,inferred,
      method:inferred?"deterministic portrayal keywords":"explicit source data",source_visibility:document.visibility}});
    counts.drafts++;counts.byKind[kind]=(counts.byKind[kind]||0)+1;
  }
  for(const document of documents) coverage(document);
  const catalog=db.listSeedCatalog(guildId,{includeGM:true});
  for(const entry of catalog){
    const document=byPath.get(entry.source_path);coverage(document,entry);
    if(!["npc","faction","location"].includes(entry.kind)){
      const libraryKey=`seed:${hash(document.source_path+":"+entry.entry_key)}`;
      if(!db.getCityRecord(guildId,"seed_library",libraryKey)){
        db.saveCityRecord(guildId,{kind:"seed_library",key:libraryKey,source_event:sourceFor(document),
          data:{kind:entry.kind,source_path:document.source_path,source_entry:entry.entry_key,
            name:entry.data?.name||entry.entry_key,source_visibility:document.visibility,authority:"template_only"}});
        counts.library++;
      }
    }
    // PLAYER material (including private character sheets) is not authority for simulated GM actors.
    if(document.source_path.split("/")[0]==="PLAYER"||!plain(entry.data)) continue;
    const data=entry.data,key=normalizeNpcKey(data.name||data.key||entry.entry_key);
    if(!key) continue;
    if(["npc","faction"].includes(entry.kind)) counts.fields+=fillDossierFields(db,guildId,entry,key,sourceFor(document),actorId);
    if(entry.kind==="npc"){
      const explicit=data.speaking_style||data.portrayal_direction;
      const direction=explicit||inferDirection(data.public);
      const current=db.getSimulationEntity(guildId,"npc",key)?.state?.voice?.portrayal_direction||{};
      const missing=Object.fromEntries(Object.entries(direction).filter(([field])=>!Object.hasOwn(current,field)));
      if(Object.keys(missing).length) draft(document,entry,"portrayal",key,missing,
        explicit?"Explicit NPC speaking style; private until separately approved for public voice.":"Inferred only from public portrayal adjectives; review diction, not facts.",!explicit);
    }
    if(["npc","faction","location"].includes(entry.kind)&&plain(data.simulation))
      draft(document,entry,"simulation",key,{type:entry.kind,state:data.simulation},"Explicit simulation fields; existing live fields cannot be replaced.");
    if(entry.kind==="faction"&&Array.isArray(data.clock)&&data.clock.length>1&&!db.getClock(guildId,`faction:${key}`))
      draft(document,entry,"clock",`faction:${key}`,{label:`${data.name} escalation`.slice(0,160),max:data.clock.length-1,value:0,stages:data.clock},
        "Dossier escalation template; initial progress requires human approval.");
  }
  // Optional typed JSON collections: arrays, key -> object maps, or a single {kind,key,data} envelope.
  for(const document of documents){
    if(!document.source_path.toLowerCase().endsWith(".json")||document.source_path.split("/")[0]==="PLAYER") continue;
    const json=JSON.parse(document.body.replace(/^\uFEFF/,""));
    const base=path.posix.basename(document.source_path).replace(/\.json$/i,"").toLowerCase();
    const inferredKind=SEED_DRAFT_KINDS.find(kind=>base===kind||base===`${kind}s`)
      ||({speaking_styles:"portrayal",routines:"routine",communities:"community",properties:"property",identities:"identity",mysteries:"mystery"})[base];
    if(!inferredKind&&!(plain(json)&&SEED_DRAFT_KINDS.includes(json.kind))
      &&!(Array.isArray(json)&&json.some(value=>plain(value)&&SEED_DRAFT_KINDS.includes(value.kind)))) continue;
    const entries=Array.isArray(json)?json.map((data,index)=>[String(index),data])
      :plain(json)&&(json.kind||json.name||json.key)?[["value",json]]:Object.entries(json);
    for(const [entryKey,value] of entries){
      if(!plain(value)) continue;
      const kind=value.kind||inferredKind;
      if(!SEED_DRAFT_KINDS.includes(kind)) continue;
      const key=value.key||normalizeNpcKey(value.name||entryKey),data=value.data||Object.fromEntries(
        Object.entries(value).filter(([field])=>!["key","kind"].includes(field)));
      draft(document,{entry_key:entryKey},kind,key,data,"Explicit typed seed data; validate dependencies on approval.");
    }
  }
  return counts;
}
