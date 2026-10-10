/** Authenticated entry declarations preserve intended destinations; native autonomous actions adjudicate ordinary travel separately. */
import { personalCharacter } from "./personal-continuity.js";
import { captureDeclaration, interpretAuthoredText } from "./player-language.js";
import { recordCharacterArrival, currentScene, recordScenePresence } from "./scene-continuity.js";
import { stateRevision } from "./ai-intents.js";
import { indexWorldEvent, cityAudit } from "./city-calendar.js";
import { randomUUID } from "node:crypto";
import { conversationPrincipal } from "./conversation-principal.js";
const normalized=value=>String(value||"").toLowerCase().replace(/^the\s+/,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export function entryTarget(text){
  if(interpretAuthoredText(text,{natural:true}).kind!=="attempt") return null;
  const clean=String(text).replace(/^(?:\s*<@!?\d+>\s*)+/,"").trim();
  const match=/^I\s+(?:walk\s+(?:into|inside)|step\s+(?:into|inside)|go\s+(?:into|inside)|enter)\s+(.+?)(?=\s+and\s+|[,.!?;\n]|$)/i.exec(clean);
  return match&&match[1].length<=160?match[1].trim():null;
}
export function locationMatches(row,target){
  return [row.entity_key,row.state?.name,row.state?.title,row.state?.display_name].filter(Boolean).some(value=>normalized(value)===normalized(target));
}
export function prepareSceneEntry(db,guild,user,character,messageId,text,{privateScene=false,candidate=null}={}){
  const flags=db.getCityCalendar(guild).flags,target=candidate?.target||entryTarget(text);
  if(!target||!character||flags.natural_language!==true||flags.scene_continuity!==true) return null;
  const pc=personalCharacter(db,guild,user,character);
  const principal=conversationPrincipal(db,guild,user,pc.id);
  const source=captureDeclaration(db,guild,user,pc.id,messageId,text,{privateScene,sceneEntry:true,candidate});if(!source) return null;
  const key=`entry:${source.event_key}`,prior=db.getCityRecord(guild,"scene_entry",key);
  if(prior) return prior;
  const location=typeof pc.data.location==="string"?db.getSimulationEntity(guild,"location",pc.data.location):null;
  // Reconcile only the already-saved location. An apparent destination elsewhere is not proof of legal arrival.
  if(location&&locationMatches(location,target)&&!privateScene){
    const presence=recordCharacterArrival(db,guild,pc,user,messageId);
    if(presence) return {status:"established",record_key:key,data:{location_key:location.entity_key}};
  }
  return db.transaction(()=>{
    const manual=db.getCityRecord(guild,"gm_authority","campaign")?.data.gm_authority_mode==="manual";
    const after=db.saveCityRecord(guild,{kind:"scene_entry",key,status:manual?"pending":"awaiting_adjudication",source_event:source.event_key,
      visibility:"character",subject_key:pc.id,data:{user,character:pc.id,target,session_id:db.getActiveSession(guild).id,
        scene:currentScene(db,guild).key,prior_location:pc.data.location??null,private_scene:privateScene,principal_revision:principal.revision,
        authority:"Owner-authored entry attempt only; AI-GM native adjudication or explicit manual review resolves access. No completed travel, costs, occupants or knowledge inferred."}});
    cityAudit(db,guild,"scene_entry",key,null,after,user);return after;
  });
}
export async function routeSceneEntryMessage({db,message,characterId,text,privateScene=false}){
  prepareSceneEntry(db,message.guild.id,message.author.id,characterId,message.id,text,{privateScene});
  // Stage the authority review without intercepting ordinary conversation. The GM
  // may understand the intended destination without declaring arrival or access.
  return false;
}
/** Owner-scoped conversational referents, never travel authorization or NPC knowledge. */
export function entryReferenceContext(db,guild,user,character,{mode="private"}={}){
  const session=db.getActiveSession(guild);
  if(!session||!character||db.getCityCalendar(guild).flags.natural_language!==true
    ||db.getCityCalendar(guild).flags.scene_continuity!==true) return null;
  let pc;try{pc=personalCharacter(db,guild,user,character);}catch{return null;}
  const scene=currentScene(db,guild).key;
  const attempts=db.characterContinuity(guild,pc.id,{kind:"scene_entry",limit:30}).filter(row=>{
    const source=db.getWorldEvent(guild,row.source_event);
    return ["pending","awaiting_adjudication"].includes(row.status)&&row.data.user===user&&row.data.session_id===session.id&&row.data.scene===scene
      &&(mode==="private"||row.data.private_scene===false)
      &&source?.status==="active"&&source.kind==="player_declaration"&&source.details.author===user
      &&source.details.character_id===pc.id&&db.ownerAuthoredSource(guild,source.event_key,user);
  }).slice(0,8).map(row=>({target:row.data.target,source_ref:row.source_event,review_key:row.record_key,
    review_revision:stateRevision(row),status:row.status,private_scene:row.data.private_scene}));
  return {saved_location:pc.data.location??null,attempts,
    authority:"Conversational referents only. Resolve ordinary names, pronouns and follow-up clarifications from owner-visible context. "
      +"Understanding a destination is NOT arrival, access, an encounter, presence, NPC knowledge or consent. "
      +"Ask only when ambiguity materially affects an action; do not repeatedly ask for an already understood name. "
      +"Use autonomous world additions/actions for ordinary local creation and entry; keep native travel/encounter/access rules. Review keys and revisions are GM metadata, not dialogue."};
}
export function reviewSceneEntry(db,guild,input,reviewer){
  if(Object.keys(input).some(key=>!["op","key","expected_revision","location_key","adjudication"].includes(key))||input.op!=="review-entry"
    ||!reviewer||typeof input.adjudication!=="string"||!input.adjudication.trim()||input.adjudication.length>600) throw new Error("Closed human entry review and adjudication required.");
  const row=db.getCityRecord(guild,"scene_entry",input.key);
  if(!row||!["pending","awaiting_adjudication"].includes(row.status)||stateRevision(row)!==input.expected_revision) throw new Error("Current pending entry revision required.");
  const pc=personalCharacter(db,guild,row.data.user,row.data.character),source=db.getWorldEvent(guild,row.source_event);
  if(!source||source.status!=="active"||source.kind!=="player_declaration"||source.details.author!==pc.owner_user_id
    ||source.details.character_id!==pc.id||!db.ownerAuthoredSource(guild,source.event_key,pc.owner_user_id)
    ||row.data.session_id!==db.getActiveSession(guild).id||row.data.scene!==currentScene(db,guild).key
    ||(pc.data.location??null)!==row.data.prior_location) throw new Error("Entry owner/source/session/scene/location changed; request a fresh declaration.");
  const location=typeof input.location_key==="string"?db.getSimulationEntity(guild,"location",input.location_key):null;
  const candidate=(row.data.candidates||[]).find(candidate=>candidate.location_key===input.location_key
    &&candidate.sources.every(key=>{const event=db.getWorldEvent(guild,key);return event?.status==="active"
      &&event.details.author===pc.owner_user_id&&event.details.character_id===pc.id&&db.ownerAuthoredSource(guild,key,pc.owner_user_id);}));
  if(!location||!locationMatches(location,row.data.target)&&!candidate) throw new Error("Establish the explicitly named location first; do not redirect the owner's entry.");
  const encounter=db.getCurrentEncounter(row.data.session_id);
  if(encounter?.status==="active") throw new Error("Resolve encounter movement through native combat/travel review first.");
  return db.transaction(()=>{
    db.updateCharacterData(pc.id,data=>{data.location=location.entity_key;});
    const event=indexWorldEvent(db,guild,{key:`arrival:${row.record_key}`,kind:"arrival",title:"Human-reviewed owner entry",
      source_id:`player:${pc.owner_user_id}`,session_id:row.data.session_id,scene:row.data.scene,location_key:location.entity_key,
      visibility:row.data.private_scene?"character":"party",subject_key:row.data.private_scene?pc.id:"",
      details:{entity_type:"character",entity_key:pc.id,owner_user_id:pc.owner_user_id,declaration:source.event_key,reviewed_by:reviewer,adjudication:input.adjudication}},reviewer);
    // Native presence validation preserves the private boundary and attendance/owner checks.
    const presenceInput={entity_type:"character",entity_key:pc.id,location_key:location.entity_key,source_event:event.event_key,
      zone:"scene",visibility:event.visibility,subject_key:event.subject_key,accepted_by:pc.owner_user_id};
    const presence=recordScenePresence(db,guild,presenceInput,reviewer);
    const after=db.saveCityRecord(guild,{...row,key:row.record_key,status:"approved",data:{...row.data,reviewed_by:reviewer,arrival:event.event_key,presence:presence.record_key}});
    cityAudit(db,guild,"scene_entry_review",row.record_key,row,after,reviewer);return after;
  });
}

/** A human-established zero-cost adjacency policy, distinct from inferred names. */
export function configureEntryPolicy(db,guild,input,reviewer){
  if(!reviewer||Object.keys(input).sort().join()!=="from_locations,location_key,op"||input.op!=="entry-policy"
    ||typeof input.location_key!=="string"||!Array.isArray(input.from_locations)||!input.from_locations.length||input.from_locations.length>20
    ||[input.location_key,...input.from_locations].some(key=>typeof key!=="string"||!db.getSimulationEntity(guild,"location",key)))
    throw new Error("Entry policy requires established destination and adjacent source locations.");
  return db.transaction(()=>{
    const before=db.getCityRecord(guild,"entry_policy",input.location_key);
    const source=indexWorldEvent(db,guild,{key:`entry-policy:${randomUUID()}`,kind:"entry_policy",title:"GM-approved mundane accessible adjacency",source_id:reviewer},reviewer);
    const after=db.saveCityRecord(guild,{kind:"entry_policy",key:input.location_key,source_event:source.event_key,
      data:{from_locations:input.from_locations,configured_by:reviewer,session_id:db.getActiveSession(guild).id,scene:currentScene(db,guild).key,
        destination_revision:stateRevision(db.getSimulationEntity(guild,"location",input.location_key)),
        from_revisions:Object.fromEntries(input.from_locations.map(key=>[key,stateRevision(db.getSimulationEntity(guild,"location",key))]))}});
    cityAudit(db,guild,"entry_policy",input.location_key,before,after,reviewer);return after;
  });
}
export function mundaneEntryImpact(db,guild,entry,locationKey){
  const policy=db.getCityRecord(guild,"entry_policy",locationKey),location=db.getSimulationEntity(guild,"location",locationKey);
  const state=location?.state||{};
  const safe=["pending","awaiting_adjudication"].includes(entry?.status)&&policy?.status==="active"&&db.getWorldEvent(guild,policy.source_event)?.status==="active"
    &&policy.data.session_id===db.getActiveSession(guild)?.id&&policy.data.scene===currentScene(db,guild).key
    &&policy.data.from_locations.includes(entry.data.prior_location)
    &&policy.data.destination_revision===stateRevision(location)
    &&policy.data.from_revisions?.[entry.data.prior_location]===stateRevision(db.getSimulationEntity(guild,"location",entry.data.prior_location))
    &&(locationMatches(location,entry.data.target)||(entry.data.candidates||[]).length===1)
    &&!["restricted","locked","contested","hazard","travel_required","removed"].some(key=>state[key])
    &&!state.hazards?.length&&!state.wards?.length
    &&!(Number(state.travel_cost)||Number(state.travel_minutes))&&db.getCurrentEncounter(entry.data.session_id)?.status!=="active";
  return {cost:0,review:!safe,reason:safe?"Explicit GM-approved zero-cost mundane adjacency.":"Travel, access, encounter or missing adjacency policy requires native/human resolution."};
}
export function resolveMundaneEntry(db,guild,intent,principal,scope={}){
  const entry=db.getCityRecord(guild,"scene_entry",intent.payload.entry_key);
  if(!entry||intent.target_key!==entry.record_key||intent.payload.source_event!==entry.source_event
    ||scope.actorUserId!==entry.data.user||scope.actorCharacterId!==entry.data.character
    ||scope.mode!=="private"&&entry.data.private_scene)throw new Error("Mundane entry belongs to this authenticated actor and audience.");
  if(mundaneEntryImpact(db,guild,entry,intent.payload.location_key).review)throw new Error("Only approved mundane movement may use scene.enter; use native travel/access review otherwise.");
  return reviewSceneEntry(db,guild,{op:"review-entry",key:entry.record_key,expected_revision:intent.expected_revision,
    location_key:intent.payload.location_key,adjudication:"Native zero-cost entry under saved GM adjacency and explicit scene.enter delegation."},principal);
}
