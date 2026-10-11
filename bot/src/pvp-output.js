/** Receipt-rendered output authority, independent of triggering user. Raw candidates never certify their own contents. */
import { createHash } from "node:crypto";
import { currentScene } from "./scene-continuity.js";
import { conversationPrincipal } from "./conversation-principal.js";
import { pvpProjection } from "./pvp-authorship.js";
import { observationQueries, renderObservation } from "./character-observation.js";
import { activeEvidence, objectiveEvidence } from "./epistemic.js";
import { renderFearEffect } from "./pvp-fear-moves.js";
import { indexWorldEvent } from "./city-calendar.js";

const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const prepared=new WeakMap();
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
  if(kind==="owner_clause"){
    const projection=pvpProjection(db,guild,ref);
    if(scope.mode==="private"&&!protectedPvpScope(db,guild,scope).some(p=>p.record_key===projection.data.proposal))fail();
    return projection.data.text;
  }
  if(kind==="observation_answer")return renderObservation(db,guild,part.query,scope).text;
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
  if("gm_notes" in result)result.gm_notes="Unverified generated prose is held in private scope review; native receipts are unchanged.";
  // Claims annotated against the quarantined paragraph are not claims about the renderer's output.
  result.narrative_claims=[];
  for(const field of ["context_memories","handouts","npc_memories","npc_knowledge","npc_goals"])
    if(result[field]?.length)result[field]=[];
  prepared.set(result,{raw,drafts,parts:parts.map(p=>p.record_key),scope:hash(scope),fingerprint:fingerprint(result)});
  return result;
}
/** Direct unprepared boundaries reject. High-level callers deliberately prepare before entering them. */
export function assertPvpOutput(db,guild,result,scope={mode:"party"}){
  const proof=prepared.get(result);
  if(proof){
    if(proof.scope!==hash(scope)||proof.fingerprint!==fingerprint(result))fail();
    for(const id of proof.parts)validateOutputPart(db,guild,id);
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
  db.saveCityRecord(guild,{kind:"pvp_output_publication",key:publication.id,status:"verified",visibility:"gm",
    source_event:validateOutputPart(db,guild,proof.parts[0]).source_event,
    data:{version:1,parts:proof.parts,payload_hash:hash(payload),surface:publication.surface,recipient:publication.target_user_id||null,
      visibility:publication.visibility,character:publication.target_character_id||null}});
}
export function revalidateOutputPublication(db,guild,row){
  const record=db.getCityRecord(guild,"pvp_output_publication",row.id);
  if(record){
    if(record.status!=="verified"||record.data.payload_hash!==hash(row.payload)||record.data.surface!==row.surface
      ||record.data.recipient!==(row.target_user_id||null)||record.data.visibility!==row.visibility
      ||record.data.character!==(row.target_character_id||null))fail();
    for(const id of record.data.parts)validateOutputPart(db,guild,id);
  }else if(protectedPvpScope(db,guild,{mode:row.visibility==="party"?"party":"private",recipientUserId:row.target_user_id}).length)fail();
  return row;
}
export function deliveredPartyOutput(db,guild,turnId){
  return db.listTurnPublications(guild,turnId).filter(r=>r.status==="delivered"&&r.visibility==="party")
    .map(r=>revalidateOutputPublication(db,guild,r).payload).join("\n");
}
/** Archives can refer to earlier scenes/ended sessions. Current-trigger scope alone is not an archive authorization. */
export function archivePvpHistory(db,guild,sessionId=null){
  const session=sessionId||db.getActiveSession(guild)?.id;
  return records(db,guild,"pvp_proposal").filter(p=>!session||p.data.session_id===session);
}
export function assertArchiveOutput(db,guild,text,{sessionId=null}={}){
  if(!String(text||"").trim()||!archivePvpHistory(db,guild,sessionId).length)return;
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
