/** Audience/parent-scoped continuity identities and exact native disclosure ancestry. */
import {createHash} from 'node:crypto';
import {jsonHash as proofHash} from '../../kernel/json-hash.js';
import {listNarrativeRecords} from './narrative-records.js';
export function createMemoryLifecycle({narrativeSourceVisible,narrativeImportance,BACKGROUND_WORLD_KINDS,worldIdentityOrigin}){
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
function narrativeMemoryEpistemic(unit){
  return ['rumor','npc_speech'].includes(unit.kind)?'testimony':unit.kind==='npc_action_attempt'?'attempt':unit.epistemic==='hypothesis'?'inference':unit.epistemic||'observation';
}
/** V2 is a native unit projection, never a second route for world authoring or disclosure. */
function verifyWorldMemory(db,guild,input,source){
  if(input.version!==2||!BACKGROUND_WORLD_KINDS.includes(input.kind)||typeof input.world_identity_ref!=='string')
    fail('V2 world memory requires a native identity projection reference.');
  if(source?.source_id!=='native:narrative-memory'||!['native_narrative_memory','native_narrative_disclosure'].includes(source?.kind)
    ||typeof source.details?.unit!=='string')fail('V2 world memory requires a native unit/disclosure receipt.');
  const identity=db.getCityRecord(guild,'autonomous_entity',input.world_identity_ref),unit=source?.details.unit
    &&db.getCityRecord(guild,'narrative_unit',source.details.unit),event=unit&&db.getWorldEvent(guild,unit.source_event),scope=unit?.data.binding?.scope,
    u=unit?.data.unit,epistemic=u&&narrativeMemoryEpistemic(u);
  if(input.version!==2||!BACKGROUND_WORLD_KINDS.includes(input.kind)||!identity||!scope||!worldIdentityOrigin(db,guild,identity,scope)
    ||identity.data.kind!==input.kind||input.name!==identity.data.name||proofHash(input.aliases||[])!==proofHash(identity.data.aliases||[])
    ||input.parent_key!==`world:${identity.record_key}`||source?.source_id!=='native:narrative-memory'
    ||!['native_narrative_memory','native_narrative_disclosure'].includes(source.kind)||source.status!=='active'
    ||source.details.input_source!==unit.source_event||unit.status!=='accepted_established'||event?.source_id!=='native:narrative-authority'
    ||event.details.payload_hash!==proofHash(unit.data)||!u.source_refs.some(ref=>ref.replace(/^event:/,'')===identity.source_event)
    ||input.summary!==unit.data.text.slice(0,600)||input.epistemic!==epistemic||!narrativeSourceVisible(db,guild,unit.source_event,scope))
    fail('V2 world memory requires an exact native identity/unit projection receipt.');
  if(source.kind==='native_narrative_disclosure'){
    const pubs=source.details.publications;
    if(!Array.isArray(pubs)||!pubs.length||pubs.length>32||pubs.some(p=>!p||typeof p.id!=='string'||typeof p.message!=='string'))
      fail('V2 world memory requires bounded native disclosure receipts.');
    const job=listNarrativeRecords(db,guild,'narrative_delivery').find(row=>row.data.unit===unit.record_key&&Array.isArray(row.data.publications)
      &&row.data.unit_hash===proofHash(unit.data)&&proofHash([...row.data.publications].sort())===proofHash(pubs.map(p=>p.id).sort()));
    if(!job||!pubs.length||pubs.some(p=>{
      const saved=db.getPublication(guild,p.id);return saved?.status!=='delivered'||!saved.discord_message_id||saved.discord_message_id!==p.message
        ||saved.channel_id!==p.channel||saved.visibility!==input.visibility||(saved.target_character_id||null)!==(input.subject_key||null);
    }))fail('V2 world memory requires actual acknowledged native disclosure receipts.');
  }else if(input.visibility!=='gm')fail('Undelivered native world memory remains GM-private.');
}

function rememberEntity(db,guild,input){
  const source=db.getWorldEvent(guild,input.source_event);
  if(!source||source.status!=="active"||!compatible(source,input))fail("Memory needs active audience-compatible source evidence.");
  const world=BACKGROUND_WORLD_KINDS.includes(input.kind);
  if(world)verifyWorldMemory(db,guild,input,source);
  else if(input.version!==undefined&&input.version!==1)fail('Unsupported memory projection version.');
  if(!["object","detail","rumor","npc","location","sign","clue",...BACKGROUND_WORLD_KINDS].includes(input.kind)||!input.name?.trim()
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
  if(prior&&world&&(prior.data.version!==2||prior.data.world_identity_ref!==input.world_identity_ref||prior.data.kind!==input.kind))
    fail('V2 native world identity cannot replace a different memory identity.');
  const aliases=[...new Set([...(prior?.data.aliases||[]),...(prior&&prior.data.name!==input.name?[prior.data.name]:[]),...(input.aliases||[])])];
  const identity=db.saveCityRecord(guild,{kind:"memory_identity",key:prior?.record_key||naturalKey,status:"active",
    source_event:source.event_key,visibility:input.visibility,subject_key:input.subject_key||null,
    location_key:input.parent_key.startsWith("location:")?input.parent_key.slice(9):"",data:{kind:input.kind,name:input.name,
      ...(world?{version:2,world_identity_ref:input.world_identity_ref}:{}),
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
      ...(world?{version:2,world_identity_ref:input.world_identity_ref}:{}),
      identity_revision:identity.data.identity_revision,summary:input.summary,epistemic:input.epistemic,receipt:input.receipt||null,
      supersedes:null,expires_tick:input.expires_tick??null,created_tick:db.getSimulationClock(guild).tick,
      authority:"Memory evidence only; epistemic label and native receipt determine consequence authority."}});
  return {identity,revision};
}

function reviseMemory(db,guild,revisionKey,input){
  const prior=db.getCityRecord(guild,"memory_revision",revisionKey),source=db.getWorldEvent(guild,input.source_event);
  if(!prior||prior.status!=="active"||!source||source.status!=="active"||!compatible(source,prior))
    fail("Only an active audience-compatible memory can be corrected.");
  if(!input.summary?.trim()||!epistemics.has(input.epistemic))fail("Correction needs bounded epistemic content.");
  if(prior.data.version===2){
    const identity=db.getCityRecord(guild,'memory_identity',prior.data.identity);
    verifyWorldMemory(db,guild,{...identity.data,...input,version:2,visibility:prior.visibility,subject_key:prior.subject_key},source);
  }
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
      superseded_by:null,created_tick:db.getSimulationClock(guild).tick}});
}

function retractMemory(db,guild,revisionKey,{source_event,reason}){
  const prior=db.getCityRecord(guild,"memory_revision",revisionKey),source=db.getWorldEvent(guild,source_event);
  if(!prior||prior.status!=="active"||!source||source.status!=="active"||!reason?.trim()||!compatible(source,prior))
    fail("Retraction needs active compatible evidence and a reason.");
  return db.saveCityRecord(guild,{...prior,key:prior.record_key,status:"retracted",data:{...prior.data,retracted_by:source.event_key,retraction_reason:reason}});
}

function retrieveMemoryRevisions(db,guild,scope={},options={}){
  const at=options.at_tick??db.getSimulationClock(guild).tick,protectedIds=new Set(options.pending_identity_refs||[]);
  return db.listCityRecords(guild,{kind:"memory_revision",includeGM:true,limit:500}).filter(row=>{
    if(row.status!=='active'||!visible(row,scope))return false;
    if(row.data.version===2&&row.visibility==='character'&&db.getCharacter(row.subject_key)?.owner_user_id!==scope.actorUserId)return false;
    const source=db.getWorldEvent(guild,row.source_event),identity=db.getCityRecord(guild,"memory_identity",row.data.identity);
    if(row.data.version===2||identity?.data.version===2||BACKGROUND_WORLD_KINDS.includes(identity?.data.kind)){
      if(row.data.version!==2||identity?.data.version!==2||row.data.world_identity_ref!==identity.data.world_identity_ref)return false;
      try{verifyWorldMemory(db,guild,{...identity.data,summary:row.data.summary,epistemic:row.data.epistemic,
        visibility:row.visibility,subject_key:row.subject_key},source);}
      catch(error){if(error.code==='MEMORY_LIFECYCLE')return false;throw error;}
    }
    const narrative=source?.kind==='native_narrative_disclosure';
    const disclosure=narrative&&listNarrativeRecords(db,guild,'narrative_delivery').find(job=>job.data.ack===source.event_key);
    const unit=disclosure&&db.getCityRecord(guild,'narrative_unit',disclosure.data.unit)?.data.unit;
    const entity=unit&&(unit.subject_key?`npc:${unit.subject_key}`:unit.location_key?`location:${unit.location_key}`:null);
    const archived=db.getCityCalendar(guild).flags.narrative_salience&&entity&&narrativeImportance(db,guild,entity,scope)?.status==='prompt_archived';
    const entitled=!narrative||disclosure?.status==='acknowledged_to_audience'&&narrativeSourceVisible(db,guild,source.event_key,scope)
      &&(disclosure.visibility!=='character'||disclosure.data.user===scope.actorUserId&&db.getCharacter(disclosure.data.character)?.owner_user_id===scope.actorUserId);
    return entitled&&(!archived||options.includeArchived===true)&&row.status==="active"&&identity?.status==="active"&&visible(row,scope)&&source?.status==="active"
      &&(row.data.expires_tick==null||row.data.expires_tick>=at||protectedIds.has(row.data.identity));
  }).sort((a,b)=>b.data.created_tick-a.data.created_tick).slice(0,Math.max(1,Math.min(100,options.limit||40))).map(row=>({
    identity:row.data.identity,name:db.getCityRecord(guild,"memory_identity",row.data.identity).data.name,
    aliases:db.getCityRecord(guild,"memory_identity",row.data.identity).data.aliases,parent_key:db.getCityRecord(guild,"memory_identity",row.data.identity).data.parent_key,
    summary:row.data.summary,epistemic:row.data.epistemic,source_event:row.source_event,visibility:row.visibility,subject_key:row.subject_key,
    ...(row.data.version===2?{version:2,world_identity_ref:row.data.world_identity_ref}:{}),
    knowledge_scope:db.getWorldEvent(guild,row.source_event)?.details?.knowledge||null}));
}

return Object.freeze({narrativeMemoryEpistemic,rememberEntity,reviseMemory,retractMemory,retrieveMemoryRevisions});
}
