/** Audience- and parent-scoped memory identities with explicit epistemic revision lifecycle. */
import { createHash } from "node:crypto";

const epistemics=new Set(["observation","testimony","inference","attempt","claimed_result","native_fact"]);
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,40);
function fail(message){throw Object.assign(new Error(message),{code:"MEMORY_LIFECYCLE"});}
function boundary(input){return `${input.visibility}:${input.subject_key||"shared"}`;}
function visible(row,scope){return ["public","party"].includes(row.visibility)||scope.mode==="private"&&(
  row.visibility==="character"&&row.subject_key===scope.actorCharacterId||row.visibility==="player"&&row.subject_key===scope.actorUserId);}
function compatible(source,input){
  if(["public","party"].includes(input.visibility))return ["public","party"].includes(source.visibility);
  return ["public","party"].includes(source.visibility)||source.visibility===input.visibility&&source.subject_key===input.subject_key;
}
function words(values){return Array.isArray(values)&&values.length<=20&&values.every(value=>typeof value==="string"&&value.trim()&&value.length<=160);}

export function rememberEntity(db,guild,input){
  const source=db.getWorldEvent(guild,input.source_event);
  if(!source||source.status!=="active"||!compatible(source,input))fail("Memory needs active audience-compatible source evidence.");
  if(!["object","detail","rumor","npc","location","sign","clue"].includes(input.kind)||!input.name?.trim()
    ||!input.parent_key?.trim()||!words(input.aliases||[])||!epistemics.has(input.epistemic)||!input.summary?.trim())
    fail("Memory identity and epistemic description must be closed and bounded.");
  if(input.expires_tick!=null&&(!Number.isSafeInteger(input.expires_tick)||input.expires_tick<0))fail("Expiry uses a fictional campaign tick.");
  if(input.epistemic==="native_fact"){
    const receipt=input.receipt&&db.getCityRecord(guild,input.receipt.kind,input.receipt.key);
    if(!receipt||receipt.status!=="resolved")fail("Native-established fact requires a committed receipt.");
  }
  const naturalKey=`memory-id:${digest([input.kind,input.name.toLocaleLowerCase(),input.parent_key,boundary(input)])}`;
  const prior=input.identity_key?db.getCityRecord(guild,"memory_identity",input.identity_key):db.getCityRecord(guild,"memory_identity",naturalKey);
  if(prior&&(prior.data.parent_key!==input.parent_key||prior.visibility!==input.visibility||prior.subject_key!==(input.subject_key||null)))
    fail("Identity rename cannot cross parent or audience boundaries.");
  const aliases=[...new Set([...(prior?.data.aliases||[]),...(prior&&prior.data.name!==input.name?[prior.data.name]:[]),...(input.aliases||[])])];
  const identity=db.saveCityRecord(guild,{kind:"memory_identity",key:prior?.record_key||naturalKey,status:"active",
    source_event:source.event_key,visibility:input.visibility,subject_key:input.subject_key||null,
    location_key:input.parent_key.startsWith("location:")?input.parent_key.slice(9):"",data:{kind:input.kind,name:input.name,
      aliases,parent_key:input.parent_key,identity_revision:(prior?.data.identity_revision||0)+1,
      authority:"Continuity identity only; equivalence is parent- and audience-scoped."}});
  const revisionKey=`memory-rev:${digest([identity.record_key,source.event_key,input.summary,input.epistemic])}`;
  const existing=db.getCityRecord(guild,"memory_revision",revisionKey);
  if(existing)return {identity,revision:existing};
  for(const old of db.listCityRecords(guild,{kind:"memory_revision",includeGM:true,limit:500})
    .filter(row=>row.status==="active"&&row.data.identity===identity.record_key))
    db.saveCityRecord(guild,{...old,key:old.record_key,status:"superseded",data:{...old.data,superseded_by:revisionKey}});
  const revision=db.saveCityRecord(guild,{kind:"memory_revision",key:revisionKey,status:"active",source_event:source.event_key,
    visibility:identity.visibility,subject_key:identity.subject_key,location_key:identity.location_key,data:{identity:identity.record_key,
      identity_revision:identity.data.identity_revision,summary:input.summary,epistemic:input.epistemic,receipt:input.receipt||null,
      supersedes:null,expires_tick:input.expires_tick??null,created_tick:db.getCityCalendar(guild).tick,
      authority:"Memory evidence only; epistemic label and native receipt determine consequence authority."}});
  return {identity,revision};
}

export function reviseMemory(db,guild,revisionKey,input){
  const prior=db.getCityRecord(guild,"memory_revision",revisionKey),source=db.getWorldEvent(guild,input.source_event);
  if(!prior||prior.status!=="active"||!source||source.status!=="active"||!compatible(source,prior))
    fail("Only an active audience-compatible memory can be corrected.");
  if(!input.summary?.trim()||!epistemics.has(input.epistemic))fail("Correction needs bounded epistemic content.");
  if(input.epistemic==="native_fact"){
    const receipt=input.receipt&&db.getCityRecord(guild,input.receipt.kind,input.receipt.key);
    if(!receipt||receipt.status!=="resolved")fail("Native-established correction requires a committed receipt.");
  }
  const key=`memory-rev:${digest([prior.data.identity,source.event_key,input.summary,input.epistemic,prior.record_key])}`;
  const existing=db.getCityRecord(guild,"memory_revision",key);if(existing)return existing;
  db.saveCityRecord(guild,{...prior,key:prior.record_key,status:"superseded",data:{...prior.data,superseded_by:key}});
  return db.saveCityRecord(guild,{kind:"memory_revision",key,status:"active",source_event:source.event_key,
    visibility:prior.visibility,subject_key:prior.subject_key,location_key:prior.location_key,data:{...prior.data,
      summary:input.summary,epistemic:input.epistemic,receipt:input.receipt||null,supersedes:prior.record_key,
      superseded_by:null,created_tick:db.getCityCalendar(guild).tick}});
}

export function retractMemory(db,guild,revisionKey,{source_event,reason}){
  const prior=db.getCityRecord(guild,"memory_revision",revisionKey),source=db.getWorldEvent(guild,source_event);
  if(!prior||prior.status!=="active"||!source||source.status!=="active"||!reason?.trim()||!compatible(source,prior))
    fail("Retraction needs active compatible evidence and a reason.");
  return db.saveCityRecord(guild,{...prior,key:prior.record_key,status:"retracted",data:{...prior.data,retracted_by:source.event_key,retraction_reason:reason}});
}

export function retrieveMemoryRevisions(db,guild,scope={},options={}){
  const at=options.at_tick??db.getCityCalendar(guild).tick,protectedIds=new Set(options.pending_identity_refs||[]);
  return db.listCityRecords(guild,{kind:"memory_revision",includeGM:true,limit:500}).filter(row=>{
    const source=db.getWorldEvent(guild,row.source_event),identity=db.getCityRecord(guild,"memory_identity",row.data.identity);
    return row.status==="active"&&identity?.status==="active"&&visible(row,scope)&&source?.status==="active"
      &&(row.data.expires_tick==null||row.data.expires_tick>=at||protectedIds.has(row.data.identity));
  }).sort((a,b)=>b.data.created_tick-a.data.created_tick).slice(0,Math.max(1,Math.min(100,options.limit||40))).map(row=>({
    identity:row.data.identity,name:db.getCityRecord(guild,"memory_identity",row.data.identity).data.name,
    aliases:db.getCityRecord(guild,"memory_identity",row.data.identity).data.aliases,parent_key:db.getCityRecord(guild,"memory_identity",row.data.identity).data.parent_key,
    summary:row.data.summary,epistemic:row.data.epistemic,source_event:row.source_event,visibility:row.visibility,subject_key:row.subject_key}));
}
