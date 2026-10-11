/** Receipt-rendered output authority, independent of triggering user. Raw candidates never certify their own contents. */
import { createHash } from "node:crypto";
import { currentScene } from "./scene-continuity.js";
import { conversationPrincipal } from "./conversation-principal.js";
import { pvpProjection, validatePvpClause } from "./pvp-authorship.js";
import { observationQueries, ambientWorldQueries, renderObservation } from "./character-observation.js";
import { activeEvidence, objectiveEvidence } from "./epistemic.js";
import { renderFearEffect } from "./pvp-fear-moves.js";
import { indexWorldEvent } from "./city-calendar.js";

const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const prepared=new WeakMap();
const archiveCaptures=new WeakMap();
const neutral="No additional character response has been established. Independently authorized actions remain in effect.";
function fail(){throw Object.assign(new Error("PvP output needs current independently verified clauses and audience proof."),{code:"NARRATIVE_PVP"});}
function records(db,guild,kind){
  const out=[];
  for(let offset=0;offset<10000;offset+=100){
    const page=db.listCityRecords(guild,{kind,includeGM:true,limit:100,offset});out.push(...page);
    if(page.length<100)return out;
  }
  fail(); // No silent truncation of a security boundary.
}
/** Actual scene and recipient/control scope, not membership of the player who happened to post. */
export function protectedPvpScope(db,guild,scope={mode:"party"}){
  const session=db.getActiveSession(guild);if(!session)return [];
  const scene=currentScene(db,guild),roster=db.roster(session.id);
  let character=scope.actorCharacterId;
  if(scope.recipientUserId)character=db.activeAssignment(session.id,scope.recipientUserId)?.character_id;
  return records(db,guild,"pvp_proposal").filter(p=>p.data.session_id===session.id&&p.data.scene===scene.key
    &&(scope.mode!=="private"?p.data.participants.some(w=>roster.some(r=>r.character_id===w.character))
      :!character||p.data.participants.some(w=>w.character===character)
        ||db.getCharacter(character)?.data.location===p.data.location_key));
}
/** A safe prose projection does not authorize a parallel free-text fact/reference mutation. */
export function assertProtectedModelEvents(db,guild,events,scope){
  if(!protectedPvpScope(db,guild,scope).length)return;
  for(const event of events||[]){
    if(!["fact","clue","canon","npc_update","location_update","thread"].includes(event.type))continue;
    const refs=event.epistemic?.source_refs||[];
    const existing=refs.map(ref=>db.getFact(guild,ref)).find(row=>row&&!row.archived&&row.content===event.value
      &&activeEvidence(db,guild,row.id)&&objectiveEvidence(db,guild,row)
      &&(["party","public"].includes(row.visibility)||scope.mode==="private"&&row.subject_character_id===scope.actorCharacterId));
    // Free text is not a native receipt. Existing exact facts may be recalled; new unsupported state fails/rolls back.
    if(!existing)fail();
  }
}
function surfaces(result){
  return ["narration","public_narration","player_summary"].map(k=>[k,String(result[k]||"")])
    .concat((result.private_messages||[]).map(m=>[`private:${m.discord_user_id}`,String(m.content||"")]));
}
function fingerprint(result){return hash(surfaces(result));}
function audienceScope(scope,surface){
  if(!surface.startsWith("private:"))return scope;
  return {...scope,mode:"private",recipientUserId:surface.slice(8)};
}
function renderPart(db,guild,part){
  const {scope,scene,session,kind,ref}=part;
  if(currentScene(db,guild).key!==scene||db.getActiveSession(guild)?.id!==session)fail();
  const source=db.getWorldEvent(guild,part.source_ref);
  if(!source||source.status!=="active"||hash(source.details)!==part.source_hash)fail();
  if(part.principal_revision&&conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId).revision!==part.principal_revision)fail();
  if(scope.mode==="private"){
    const assignment=db.activeAssignment(session,scope.actorUserId);
    if(!assignment||assignment.character_id!==scope.actorCharacterId)fail();
  }
  if(kind==="neutral")return neutral;
  if(kind==="private_owner_clause"){
    const clause=validatePvpClause(db,guild,ref);
    if(scope.mode!=="private"||clause.subject_key!==scope.actorCharacterId
      ||clause.data.owning_user!==scope.actorUserId)fail();
    return clause.data.source_span;
  }
  if(kind==="owner_clause"){
    const projection=pvpProjection(db,guild,ref);
    if(scope.mode==="private"&&!protectedPvpScope(db,guild,scope).some(p=>p.record_key===projection.data.proposal))fail();
    return projection.data.text;
  }
  if(kind==="observation_answer"){
    const answer=renderObservation(db,guild,part.query,scope);
    if(part.evidence_refs&&hash(answer.proof_refs)!==hash(part.evidence_refs))fail();
    return answer.text;
  }
  if(kind==="pvp_fear_publication_part")return renderFearEffect(db,guild,ref,scope);
  if(kind==="verified_action"){
    const arrival=db.getWorldEvent(guild,ref),source=arrival&&db.getWorldEvent(guild,arrival.details.input_source);
    const pc=arrival&&db.getCharacter(arrival.details.entity_key);
    if(!arrival||arrival.status!=="active"||arrival.kind!=="arrival"||arrival.details.entity_type!=="character"
      ||arrival.scene!==scene||arrival.session_id!==session||source?.status!=="active"||source.kind!=="ai_gm_input"
      ||source.details.character_id!==pc?.id||arrival.details.owner_user_id!==pc.owner_user_id
      ||pc.data.location!==arrival.location_key||!db.ownerAuthoredSource(guild,source.event_key,pc.owner_user_id)
      ||conversationPrincipal(db,guild,pc.owner_user_id,pc.id).revision!==source.details.revision)fail();
    if(scope.mode!=="private"&&arrival.visibility!=="party"&&arrival.visibility!=="public")fail();
    if(scope.mode==="private"&&!["party","public"].includes(arrival.visibility)&&arrival.subject_key!==scope.actorCharacterId)fail();
    return `${pc.name} has arrived at ${arrival.location_key}.`;
  }
  fail();
}
function savePart(db,guild,part){
  if(part.kind==="observation_answer")part={...part,evidence_refs:renderObservation(db,guild,part.query,part.scope).proof_refs};
  const text=renderPart(db,guild,part),data={version:1,...part,text,content_hash:hash(text)},key=`pvp-output:${hash(data)}`;
  return db.getCityRecord(guild,"pvp_output_part",key)||db.saveCityRecord(guild,{kind:"pvp_output_part",key,
    status:"verified",visibility:part.scope.mode==="private"?"character":"party",subject_key:part.scope.actorCharacterId||null,
    source_event:part.source_ref,data});
}
export function validateOutputPart(db,guild,id){
  const row=db.getCityRecord(guild,"pvp_output_part",id),d=row?.data;
  if(!row||row.status!=="verified"||d.version!==1||id!==`pvp-output:${hash(d)}`
    ||hash(renderPart(db,guild,d))!==d.content_hash||hash(d.text)!==d.content_hash)fail();
  return row;
}
/** Trusted orchestration only; a model cannot manufacture the in-process capability or native proofs. */
export function prepareAuthorizedTurnOutput(db,guild,result,scope,{sourceRef=null,world=[],origin="turn"}={}){
  const prior=prepared.get(result),raw=prior?.raw||Object.fromEntries(surfaces(result));
  const drafts=prior?.drafts||Object.fromEntries(["context_memories","handouts","npc_memories","npc_knowledge","npc_goals"]
    .map(field=>[field,result[field]||[]]));
  const proposals=protectedPvpScope(db,guild,scope);
  const queries=observationQueries(db,guild,result.player_intents||[],scope,sourceRef);
  if(proposals.length)queries.push(...ambientWorldQueries(db,guild,scope,sourceRef));
  if(!proposals.length&&!queries.length)return result;
  if(result.act===false&&!surfaces(result).some(([,text])=>text.trim()))return result;
  const scene=currentScene(db,guild),parts=[];
  const nativeSource=sourceRef||proposals[0]?.source_event;
  const common={render_version:1,scene:scene.key,session:scene.session_id,scope:{...scope},origin,
    source_ref:nativeSource,source_hash:hash(db.getWorldEvent(guild,nativeSource)?.details),
    principal_revision:scope.actorUserId&&scope.actorCharacterId
      ?conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId).revision:null};
  for(const query of queries)parts.push(savePart(db,guild,{...common,kind:"observation_answer",query}));
  for(const action of world.filter(r=>r.status==="arrived"&&r.source_event))
    parts.push(savePart(db,guild,{...common,kind:"verified_action",ref:action.source_event}));
  for(const row of records(db,guild,"pvp_fear_effect_receipt")){
    if(row.data.scene!==scene.key||row.visibility!=="party"
      &&!(scope.mode==="private"&&row.visibility==="character"&&row.subject_key===scope.actorCharacterId))continue;
    try{parts.push(savePart(db,guild,{...common,kind:"pvp_fear_publication_part",ref:row.record_key}));}
    catch(error){
      if(error.code!=="NARRATIVE_PVP")throw error;
      // Hold this stale read-side projection only. Do not reexecute/revoke its saved effect or abort independent native actions.
      const key=`pvp-fear-publication-hold:${hash([row.record_key,sourceRef,origin,error.message])}`;
      if(!db.getCityRecord(guild,"pvp_fear_publication_hold",key))db.saveCityRecord(guild,{
        kind:"pvp_fear_publication_hold",key,status:"needs_review",visibility:"gm",source_event:row.source_event,
        data:{version:1,effect:row.record_key,scene:scene.key,reason:error.message,canonical:false,source_ref:sourceRef}});
    }
  }
  // Projection rows are independently revalidated; unapproved drafts are never candidates for rendering.
  for(const row of records(db,guild,"pvp_public_projection")){
    if(!proposals.some(p=>p.record_key===row.data.proposal)||row.data.version!==2)continue;
    try{parts.push(savePart(db,guild,{...common,kind:"owner_clause",ref:row.record_key}));}
    catch(e){if(e.code!=="NARRATIVE_PVP")throw e;} // Stale records stay inert; raw prose is not a fallback.
  }
  if(!parts.length)parts.push(savePart(db,guild,{...common,kind:"neutral"}));
  const text=parts.map(p=>p.data.text).join("\n"),quarantineKey=`pvp-quarantine:${hash([scene.key,origin,sourceRef,raw])}`;
  if(!db.getCityRecord(guild,"pvp_output_quarantine",quarantineKey))db.saveCityRecord(guild,{
    kind:"pvp_output_quarantine",key:quarantineKey,status:"needs_scope_review",visibility:"gm",source_event:common.source_ref,
    data:{version:1,scene:scene.key,session:scene.session_id,origin,source_ref:sourceRef,raw,drafts,hash:hash([raw,drafts]),canonical:false}});
  result.narration=text;
  if("public_narration" in result)result.public_narration=text;
  result.player_summary=text;result.private_messages=[];
  const privateParts={};
  // A proposed private message is only a lookup, never evidence. Preserve exact independently owner-authorized clauses.
  for(const [surface,content] of Object.entries(raw).filter(([s])=>s.startsWith("private:"))){
    const user=surface.slice(8),assignment=db.activeAssignment(scene.session_id,user);
    if(!assignment?.character_id||scope.mode==="private"&&user!==scope.actorUserId
      ||!db.roster(scene.session_id).some(r=>r.discord_user_id===user&&["present","late","guest"].includes(r.presence)))continue;
    for(const clause of records(db,guild,"pvp_narrative_clause")){
      if(clause.data.source_span!==content||clause.subject_key!==assignment.character_id||clause.data.owning_user!==user)continue;
      try{
        const privateScope={mode:"private",actorUserId:user,actorCharacterId:assignment.character_id};
        const source=db.getWorldEvent(guild,clause.source_event);
        const part=savePart(db,guild,{...common,scope:privateScope,kind:"private_owner_clause",ref:clause.record_key,
          source_ref:source?.event_key,source_hash:hash(source?.details),
          principal_revision:conversationPrincipal(db,guild,user,assignment.character_id).revision});
        privateParts[user]=[part.record_key];result.private_messages.push({discord_user_id:user,content:part.data.text});break;
      }catch(error){if(error.code!=="NARRATIVE_PVP")throw error;}
    }
  }
  if("gm_notes" in result)result.gm_notes="Unverified generated prose is held in private scope review; native receipts are unchanged.";
  // Claims annotated against the quarantined paragraph are not claims about the renderer's output.
  result.narrative_claims=[];
  for(const field of ["context_memories","handouts","npc_memories","npc_knowledge","npc_goals"])
    if(result[field]?.length)result[field]=[];
  prepared.set(result,{raw,drafts,parts:parts.map(p=>p.record_key),privateParts,scope:hash(scope),fingerprint:fingerprint(result)});
  return result;
}
/** Direct unprepared boundaries reject. High-level callers deliberately prepare before entering them. */
export function assertPvpOutput(db,guild,result,scope={mode:"party"}){
  const proof=prepared.get(result);
  if(proof){
    if(proof.scope!==hash(scope)||proof.fingerprint!==fingerprint(result))fail();
    for(const id of proof.parts)validateOutputPart(db,guild,id);
    for(const ids of Object.values(proof.privateParts||{}))for(const id of ids)validateOutputPart(db,guild,id);
    return;
  }
  for(const [surface,text] of surfaces(result)){
    if(!text.trim())continue;
    const proposals=protectedPvpScope(db,guild,audienceScope(scope,surface));if(!proposals.length)continue;
    const row=records(db,guild,"pvp_public_projection").find(p=>p.data.text===text&&proposals.some(v=>v.record_key===p.data.proposal));
    if(!row)fail();pvpProjection(db,guild,row.record_key);
  }
}
export function bindOutputPublication(db,guild,result,publication,payload){
  const proof=prepared.get(result);if(!proof)return;
  const parts=publication.surface.startsWith("private_user:")?proof.privateParts?.[publication.target_user_id]:proof.parts;
  if(!parts?.length)fail();
  db.saveCityRecord(guild,{kind:"pvp_output_publication",key:publication.id,status:"verified",visibility:"gm",
    source_event:validateOutputPart(db,guild,parts[0]).source_event,
    data:{version:1,parts,payload_hash:hash(payload),surface:publication.surface,recipient:publication.target_user_id||null,
      visibility:publication.visibility,character:publication.target_character_id||null}});
}
export function revalidateOutputPublication(db,guild,row){
  const record=db.getCityRecord(guild,"pvp_output_publication",row.id);
  if(record){
    if(record.status!=="verified"||record.data.payload_hash!==hash(row.payload)||record.data.surface!==row.surface
      ||record.data.recipient!==(row.target_user_id||null)||record.data.visibility!==row.visibility
      ||record.data.character!==(row.target_character_id||null))fail();
    for(const id of record.data.parts){
      const part=validateOutputPart(db,guild,id);
      if(part.visibility==="character"&&(row.visibility!=="character"||row.target_character_id!==part.subject_key
        ||row.target_user_id!==part.data.scope.actorUserId))fail();
      if(part.data.kind==="observation_answer"&&row.visibility!=="party"
        &&(row.target_character_id!==part.data.query.observer||row.target_user_id!==part.data.query.user))fail();
    }
  }else if(protectedPvpScope(db,guild,{mode:row.visibility==="party"?"party":"private",recipientUserId:row.target_user_id}).length)fail();
  return row;
}
export function deliveredPartyOutput(db,guild,turnId){
  return db.listTurnPublications(guild,turnId).filter(r=>r.status==="delivered"&&r.visibility==="party")
    .map(r=>revalidateOutputPublication(db,guild,r).payload).join("\n");
}

const archiveRowHash=row=>hash({kind:row.kind,key:row.record_key,status:row.status,visibility:row.visibility,
  subject:row.subject_key,source:row.source_event,data:row.data});
/** Snapshot a live-validated public dependency closure, not raw text or a GM approval. Hashes stay GM-private. */
export function captureOutputArchive(db,guild,publication){
  const proof=db.getCityRecord(guild,"pvp_output_publication",publication.id);
  if(!proof||publication.visibility!=="party")return null;
  revalidateOutputPublication(db,guild,publication);
  const inventory=records(db,guild,""),byKey=new Map(),refs=[],seen=new Set(),owners=new Map();
  for(const row of inventory){const list=byKey.get(row.record_key)||[];list.push(row);byKey.set(row.record_key,list);}
  function scan(value,field=""){
    if(seen.size>1000)fail();
    if(Array.isArray(value)){for(const item of value)scan(item,field);return;}
    if(value&&typeof value==="object"){
      for(const who of Array.isArray(value.participants)?value.participants:[])if(who.character&&who.user)owners.set(who.character,who.user);
      if(value.actorCharacterId&&value.actorUserId)owners.set(value.actorCharacterId,value.actorUserId);
      if(value.subject_character&&value.owning_user)owners.set(value.subject_character,value.owning_user);
      if(value.character&&value.user&&db.getCharacter(value.character))owners.set(value.character,value.user);
      for(const [k,v] of Object.entries(value))scan(v,k);return;
    }
    if(typeof value!=="string"&&!(Number.isSafeInteger(value)&&["roll_id","roll_refs"].includes(field)))return;
    if(["roll_id","roll_refs"].includes(field)){
      const roll=db.getSavedRoll(guild,value),key=`roll:${value}`;
      if(roll&&!seen.has(key)){seen.add(key);refs.push({type:"roll",key:value,digest:hash(roll)});}return;
    }
    const event=db.getWorldEvent(guild,value),eventKey=`event:${value}`;
    if(event&&!seen.has(eventKey)){
      if(event.status!=="active")fail();seen.add(eventKey);refs.push({type:"event",key:value,digest:hash(event)});scan(event.details);
    }
    for(const row of byKey.get(value)||[]){
      const key=`${row.kind}:${value}`;if(seen.has(key))continue;seen.add(key);
      refs.push({type:"record",kind:row.kind,key:value,digest:archiveRowHash(row)});scan(row.source_event);scan(row.data);
      if(row.kind==="npc_attack_roll_receipt")scan(row.data.roll,"roll_id");
      // Party disclosure proofs are separate from content-authority clauses.
      if(row.kind==="pvp_authored_narrative")for(const share of inventory.filter(r=>r.kind==="pvp_narration_disclosure"&&r.data.narrative===value))scan(share.record_key);
    }
  }
  for(const id of proof.data.parts)scan(id);
  const attempt=db.getTurnAttempt(publication.turn_id);
  const capture={version:1,publication:publication.id,session:attempt.session_id,payload_hash:hash(publication.payload),
    refs,owners:[...owners].map(([character,user])=>({character,user})),authority:"Previously verified delivered output only; no new outcome or current observation."};
  archiveCaptures.set(capture,hash(capture));return capture;
}
function archiveEvidence(db,guild,data){
  for(const ref of data.refs){
    const row=ref.type==="record"?db.getCityRecord(guild,ref.kind,ref.key):ref.type==="event"?db.getWorldEvent(guild,ref.key):db.getSavedRoll(guild,ref.key);
    if(!row||(ref.type==="record"?archiveRowHash(row):hash(row))!==ref.digest||ref.type==="event"&&row.status!=="active")fail();
  }
  for(const owner of data.owners)if(db.getCharacter(owner.character)?.owner_user_id!==owner.user)fail();
}
export function recordOutputArchive(db,guild,publication,data){
  if(!data)return;
  if(archiveCaptures.get(data)!==hash(data)||publication.status!=="delivered"||data.publication!==publication.id
    ||data.payload_hash!==hash(publication.payload))fail();
  archiveEvidence(db,guild,data);
  db.saveCityRecord(guild,{kind:"pvp_delivered_archive",key:publication.id,status:"verified",visibility:"gm",
    source_event:db.getCityRecord(guild,"pvp_output_publication",publication.id).source_event,
    data:{...data,digest:hash(data)}});
}
function archivedPublication(db,guild,row,sessionId){
  const certificate=db.getCityRecord(guild,"pvp_delivered_archive",row.id),{digest,...data}=certificate?.data||{};
  if(row?.status!=="delivered"||row.visibility!=="party"||certificate?.status!=="verified"||digest!==hash(data)
    ||data.publication!==row.id||data.payload_hash!==hash(row.payload)||sessionId&&data.session!==sessionId)fail();
  archiveEvidence(db,guild,data);return row.payload;
}
/** Receipt-rendered transcript excerpt, explicitly historical; no model synthesis enters shared archives. */
export function certifiedSessionRecap(db,guild,sessionId){
  const parts=[];
  for(const certificate of records(db,guild,"pvp_delivered_archive").reverse()){
    if(certificate.data.session!==sessionId)continue;
    const row=db.getPublication(guild,certificate.record_key);
    try{parts.push(archivedPublication(db,guild,row,sessionId));}catch(error){if(error.code!=="NARRATIVE_PVP")throw error;}
  }
  return parts.length?`Previously delivered, source-verified session excerpts (not new or current observations):\n\n${parts.join("\n\n")}`:"";
}
export function scopedSessionRecap(db,guild,session){
  return !session?"":archivePvpHistory(db,guild,session.id).length?certifiedSessionRecap(db,guild,session.id):session.recap||"";
}
/** Reuse only a current native-rendered part at an exactly compatible audience. Raw hooks confer no claim authority. */
export function prepareStoredOutput(db,guild,text,scope){
  const parts=records(db,guild,"pvp_output_part").filter(row=>row.data.text===text&&row.status==="verified"
    &&(scope.mode!=="private"?row.visibility==="party"&&row.data.scope.mode!=="private"
      :row.visibility==="party"||row.visibility==="character"&&row.subject_key===scope.actorCharacterId
        &&row.data.scope.actorUserId===scope.actorUserId))
    .filter(row=>scope.mode!=="private"||row.data.kind!=="observation_answer"
      ||row.data.query.observer===scope.actorCharacterId&&row.data.query.user===scope.actorUserId).filter(row=>{
    try{validateOutputPart(db,guild,row.record_key);return true;}catch(error){
      if(!["NARRATIVE_PVP","CHARACTER_OBSERVATION","WORLD_OBSERVATION"].includes(error.code))throw error;return false;
    }
  });
  if(!parts.length)fail();
  const result={narration:text,player_summary:text,narrative_claims:[],private_messages:[]};
  prepared.set(result,{raw:{},drafts:{},parts:[parts[0].record_key],scope:hash(scope),fingerprint:fingerprint(result)});
  return result;
}
export function quarantineSimulationHook(db,guild,hook){
  const key=`pvp-hook-review:${hash([hook.id,hook.data])}`;
  const source=indexWorldEvent(db,guild,{key,kind:"pvp_hook_review",title:"Unsupported hook held for source review",
    source_id:"native:hook-review",visibility:"gm",details:{hook:hook.id,canonical:false}},"native_output_guard");
  db.saveCityRecord(guild,{kind:"pvp_output_quarantine",key,status:"needs_scope_review",visibility:"gm",source_event:source.event_key,
    data:{version:1,origin:"simulation-hook",hook:hook.id,raw:{narration:hook.data.content},canonical:false}});
  return db.putSimulationRecord(guild,{...hook,id:hook.id,entityKey:hook.entity_key,status:"needs_scope_review",data:hook.data});
}
export function protectedHookSource(db,guild,hook){
  const context=hook.data.source_context;
  return records(db,guild,"pvp_proposal").some(p=>!context||p.data.session_id===context.session&&p.data.scene===context.scene);
}
/** Archives can refer to earlier scenes/ended sessions. Current-trigger scope alone is not an archive authorization. */
export function archivePvpHistory(db,guild,sessionId=null){
  const session=sessionId||db.getActiveSession(guild)?.id;
  return records(db,guild,"pvp_proposal").filter(p=>!session||p.data.session_id===session);
}
export function assertArchiveOutput(db,guild,text,{sessionId=null}={}){
  if(!String(text||"").trim()||!archivePvpHistory(db,guild,sessionId).length)return;
  for(const certificate of records(db,guild,"pvp_delivered_archive")){
    const row=db.getPublication(guild,certificate.record_key);
    if(row?.payload===text){archivedPublication(db,guild,row,sessionId);return;}
  }
  if(sessionId&&text===certifiedSessionRecap(db,guild,sessionId))return;
  if(!db.getActiveSession(guild))fail();
  const part=records(db,guild,"pvp_output_part").find(r=>r.visibility==="party"&&r.status==="verified"&&r.data.text===text);
  if(part){validateOutputPart(db,guild,part.record_key);return;}
  const projection=records(db,guild,"pvp_public_projection").find(r=>r.visibility==="party"&&r.data.text===text);
  if(projection){pvpProjection(db,guild,projection.record_key);return;}
  fail();
}
/** Ending a session does not certify the model's synthesis. Hold it outside shared facts, recaps and retrieval. */
export function quarantineSessionRecap(db,guild,session,text){
  const key=`pvp-quarantine:${hash([session.id,"session-recap",text])}`;
  const source=indexWorldEvent(db,guild,{key:`${key}:review`,kind:"pvp_archive_review",source_id:"native:recap-review",
    title:"Unverified archive held for source review",visibility:"gm",session_id:session.id,
    details:{session:session.id,content_hash:hash(String(text||"")),canonical:false}},"native_output_guard");
  return db.getCityRecord(guild,"pvp_output_quarantine",key)||db.saveCityRecord(guild,{
    kind:"pvp_output_quarantine",key,status:"needs_scope_review",visibility:"gm",source_event:source.event_key,
    data:{version:1,session:session.id,origin:"session-recap",raw:{narration:String(text||"")},canonical:false,
      reason:"Unverified archive synthesis; session closure supplies no PC authorship or disclosure authority."}});
}
