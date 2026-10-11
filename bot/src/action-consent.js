/** Exact action-bound native consent. Interaction identity is supplied only by authenticated adapters, never model output. */
import { createHash } from "node:crypto";
import { conversationPrincipal } from "./conversation-principal.js";
import { currentScene } from "./scene-continuity.js";
import { indexWorldEvent } from "./city-calendar.js";

export const consentHash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
function fail(message){throw Object.assign(new Error(message),{code:"SCENE_ACTION_WINDOW"});}
function closed(input,fields){
  if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(key=>!fields.includes(key)))
    fail("Closed action-consent fields required.");
}
const resources=value=>Array.isArray(value)&&value.length<=32&&new Set(value).size===value.length
  &&value.every(key=>typeof key==="string"&&/^[a-z][a-z0-9_-]*:[^\s]{1,180}$/i.test(key));

/** Re-read the current owner, exact immutable source and accepted occurrence before consent can be used. */
export function consentAction(db,guild,key){
  const row=db.getCityRecord(guild,"typed_intent",key),scene=currentScene(db,guild);
  if(!row||row.status!=="accepted_for_adjudication")fail("Consent needs a current accepted action.");
  const source=db.getWorldEvent(guild,row.source_event),d=row.data;
  const principal=conversationPrincipal(db,guild,d.owner_user_id,d.actor);
  if(principal.kind!=="owner"||principal.revision!==d.actor_principal_revision
    ||d.session_id!==scene.session_id||d.scene!==scene.key||!source||source.status!=="active"
    ||source.kind!=="authored_turn"||source.details.author!==principal.user||source.details.character_id!==d.actor
    ||source.details.principal_revision!==principal.revision||source.session_id!==scene.session_id||source.scene!==scene.key
    ||source.source_id!==`player:${principal.user}`||!db.ownerAuthoredSource(guild,source.event_key,principal.user)
    ||source.details.raw_hash!==d.source_hash||typeof source.details.raw_text!=="string"
    ||createHash("sha256").update(source.details.raw_text).digest("hex")!==d.source_hash
    ||source.details.raw_text.slice(d.start,d.end)!==d.source_span
    ||row.visibility!==source.visibility||(row.subject_key||null)!==(source.subject_key||null))
    fail("Consent action owner, principal, source, audience or scene is stale.");
  return {row,source,scene,principal};
}
function termsFor(window,accepted,input){
  if(!resources(input.reads)||!resources(input.writes)||!Array.isArray(input.required_participants)
    ||!input.required_participants.length||input.required_participants.length>12
    ||new Set(input.required_participants).size!==input.required_participants.length
    ||typeof input.operation!=="string"||!input.operation||typeof input.location_key!=="string"||!input.location_key)
    fail("Consent needs bounded exact resources and participants.");
  return {window:window.record_key,window_revision:window.data.revision,accepted_intent:accepted.record_key,
    actor:accepted.data.actor,source_event:accepted.source_event,source_hash:accepted.data.source_hash,
    operation:input.operation,reads:[...input.reads].sort(),writes:[...input.writes].sort(),location_key:input.location_key,
    required_participants:[...input.required_participants].sort(),scene:accepted.data.scene,session_id:accepted.data.session_id,
    source_audience:accepted.visibility,source_subject:accepted.subject_key||null};
}

export function requestActionConsent(db,guild,input){
  closed(input,["window","expected_revision","accepted_intent","reads","writes","location_key","operation","participation",
    "required_participants","consequences","expires_minute","pvp_agreement"]);
  const {row:accepted,scene}=consentAction(db,guild,input.accepted_intent);
  const window=db.getCityRecord(guild,"scene_action_window",input.window);
  if(!window||window.status!=="open"||window.data.scene!==scene.key||window.data.revision!==input.expected_revision)
    fail("Consent window revision or scene is stale.");
  if(typeof input.consequences!=="string"||!input.consequences.trim()||input.consequences.length>1200
    ||!Number.isSafeInteger(input.expires_minute)||input.expires_minute<=db.getSimulationClock(guild).minute)
    fail("Consent needs exact bounded consequences and fictional expiry.");
  if(window.data.reason==="direct_pc_conflict")fail("PvP consent requires the separately locked bilateral narrative agreement service.");
  if(input.pvp_agreement)fail("Cooperation consent cannot stand in for a narrative PvP agreement.");
  const terms=termsFor(window,accepted,input),owners=terms.required_participants.map(character=>{
    const pc=db.getCharacter(character);
    if(!pc||pc.guild_id!==guild)fail("Consent participant is not a campaign PC.");
    const principal=conversationPrincipal(db,guild,pc.owner_user_id,character);
    if(principal.kind!=="owner")fail("Consent requires each current controlled owner.");
    return {character,user:principal.user,principal_revision:principal.revision};
  });
  const data={version:1,guild,terms,owners,consequences:input.consequences,expires_minute:input.expires_minute,
    audience:"recipient_private",authority:"Voluntary participation only; no dice, costs or outcome."};
  data.terms_hash=consentHash(data);
  const key=`consent-request:${data.terms_hash.slice(0,40)}`;
  return db.getCityRecord(guild,"action_consent_request",key)||db.saveCityRecord(guild,{
    kind:"action_consent_request",key,status:"pending",source_event:accepted.source_event,visibility:"gm",data});
}
function liveOffer(db,guild,offer,{allowJoined=false}={}){
  if(!offer||offer.status!=="pending"||offer.data.version!==1||offer.data.guild!==guild)fail("Current native consent request required.");
  const {row:accepted,scene}=consentAction(db,guild,offer.data.terms.accepted_intent);
  const window=db.getCityRecord(guild,"scene_action_window",offer.data.terms.window);
  if(!window||!(allowJoined?["open","locked"]:["open"]).includes(window.status)||window.data.scene!==scene.key||db.getWorldEvent(guild,window.source_event)?.status!=="active"
    ||!allowJoined&&window.data.revision!==offer.data.terms.window_revision
    ||db.getSimulationClock(guild).minute>=offer.data.expires_minute)fail("Consent expired or its window revision is stale.");
  const {terms_hash,...unsigned}=offer.data;
  if(consentHash(unsigned)!==terms_hash)fail("Consent terms digest changed.");
  for(const owner of offer.data.owners){
    const pc=db.getCharacter(owner.character),principal=conversationPrincipal(db,guild,owner.user,owner.character);
    if(pc?.owner_user_id!==owner.user||principal.kind!=="owner"||principal.revision!==owner.principal_revision)
      fail("Consent owner or principal revision changed.");
  }
  return {accepted,window};
}

export function respondActionConsent(db,guild,user,input){
  closed(input,["request","expected_revision","decision","interaction_id"]);
  if(!["accept","decline","revoke"].includes(input.decision)||typeof input.interaction_id!=="string"
    ||!input.interaction_id||input.interaction_id.length>100)fail("Explicit native consent decision and interaction required.");
  const offer=db.getCityRecord(guild,"action_consent_request",input.request);
  const owner=offer?.data.owners.find(value=>value.user===user);
  if(!owner)fail("Only a current affected owner participant can respond.");
  const principal=conversationPrincipal(db,guild,user,owner.character);
  if(principal.kind!=="owner"||principal.revision!==owner.principal_revision)fail("Consent controlled owner principal changed.");
  if(input.expected_revision!==offer.data.terms_hash)fail("Consent terms revision changed.");
  const key=`action-consent:${consentHash([offer.record_key,owner.character]).slice(0,40)}`;
  const prior=db.getCityRecord(guild,"action_consent",key);
  if(prior?.data.interaction_id===input.interaction_id){
    if(prior.data.decision!==input.decision)fail("Consent interaction replay cannot change decision.");
    liveOffer(db,guild,offer,{allowJoined:true});return prior;
  }
  if(prior&&prior.status!=="accepted")fail("Consent was revoked or terminal; request fresh terms.");
  liveOffer(db,guild,offer,{allowJoined:input.decision==="revoke"});
  if(prior&&input.decision==="accept")return prior;
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key:`consent-reply:${consentHash([guild,user,input.interaction_id]).slice(0,40)}`,
      kind:"action_consent_reply",title:"Authenticated action-consent decision",source_id:`player:${user}`,
      session_id:offer.data.terms.session_id,scene:offer.data.terms.scene,visibility:"character",subject_key:owner.character,
      details:{author:user,character_id:owner.character,principal_revision:principal.revision,request:offer.record_key,
        terms_hash:offer.data.terms_hash,decision:input.decision,interaction_id:input.interaction_id}},user);
    return db.saveCityRecord(guild,{kind:"action_consent",key,status:{accept:"accepted",decline:"declined",revoke:"revoked"}[input.decision],
      source_event:source.event_key,visibility:"character",subject_key:owner.character,data:{version:1,request:offer.record_key,
        owner_user_id:user,principal_revision:principal.revision,terms_hash:offer.data.terms_hash,decision:input.decision,
        interaction_id:input.interaction_id,previous_source:prior?.source_event||null}});
  });
}

/** Legacy/wildcard consents deliberately fail closed; this verifier never grants a mechanical outcome. */
export function validateActionConsent(db,guild,refs,{window,accepted,input}){
  try{
    if(window.data.reason==="direct_pc_conflict")return false; // V9-PVP-A owns the distinct bilateral agreement verifier.
    if(!Array.isArray(refs)||refs.length!==input.required_participants.length||new Set(refs).size!==refs.length)return false;
    const covered=new Set();
    for(const ref of refs){
      const row=db.getCityRecord(guild,"action_consent",ref),d=row?.data;
      if(!row||row.status!=="accepted"||d.version!==1||d.decision!=="accept"||row.visibility!=="character")return false;
      const offer=db.getCityRecord(guild,"action_consent_request",d.request);liveOffer(db,guild,offer,{allowJoined:true});
      const actual=termsFor({...window,data:{...window.data,revision:offer.data.terms.window_revision}},accepted,input);
      if(JSON.stringify(actual)!==JSON.stringify(offer.data.terms)||d.terms_hash!==offer.data.terms_hash)return false;
      const owner=offer.data.owners.find(value=>value.character===row.subject_key&&value.user===d.owner_user_id);
      const source=db.getWorldEvent(guild,row.source_event);
      if(!owner||d.principal_revision!==owner.principal_revision||!source||source.status!=="active"
        ||source.kind!=="action_consent_reply"||source.source_id!==`player:${owner.user}`
        ||source.visibility!=="character"||source.subject_key!==owner.character||source.session_id!==actual.session_id||source.scene!==actual.scene
        ||source.details.request!==offer.record_key||source.details.terms_hash!==d.terms_hash||source.details.decision!=="accept"
        ||source.details.author!==owner.user||source.details.principal_revision!==owner.principal_revision
        ||!db.ownerAuthoredSource(guild,source.event_key,owner.user))return false;
      covered.add(row.subject_key);
    }
    return input.required_participants.every(value=>covered.has(value));
  }catch(error){
    if(["SCENE_ACTION_WINDOW"].includes(error.code)||/Active session|attendance|controlled role|campaign character/i.test(error.message))return false;
    throw error;
  }
}
