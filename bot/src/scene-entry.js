/** Authenticated entry declarations stage native review; unknown locations never become canon or automatic travel. */
import { personalCharacter } from "./personal-continuity.js";
import { captureDeclaration, interpretAuthoredText } from "./player-language.js";
import { recordCharacterArrival, currentScene, recordScenePresence } from "./scene-continuity.js";
import { stateRevision } from "./ai-intents.js";
import { indexWorldEvent, cityAudit } from "./city-calendar.js";
const normalized=value=>String(value||"").toLowerCase().replace(/^the\s+/,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export function entryTarget(text){
  if(interpretAuthoredText(text,{natural:true}).kind!=="attempt") return null;
  const clean=String(text).replace(/^(?:\s*<@!?\d+>\s*)+/,"").trim();
  const match=/^I\s+(?:walk\s+(?:into|inside)|step\s+(?:into|inside)|go\s+(?:into|inside)|enter)\s+(.+?)(?=\s+and\s+|[,.!?;\n]|$)/i.exec(clean);
  return match&&match[1].length<=160?match[1].trim():null;
}
function locationMatches(row,target){
  return [row.entity_key,row.state?.name,row.state?.title,row.state?.display_name].filter(Boolean).some(value=>normalized(value)===normalized(target));
}
export function prepareSceneEntry(db,guild,user,character,messageId,text,{privateScene=false}={}){
  const flags=db.getCityCalendar(guild).flags,target=entryTarget(text);
  if(!target||!character||flags.natural_language!==true||flags.scene_continuity!==true) return null;
  const pc=personalCharacter(db,guild,user,character);
  const source=captureDeclaration(db,guild,user,pc.id,messageId,text,{privateScene,sceneEntry:true});if(!source) return null;
  const key=`entry:${source.event_key}`,prior=db.getCityRecord(guild,"scene_entry",key);
  if(prior) return prior;
  const location=typeof pc.data.location==="string"?db.getSimulationEntity(guild,"location",pc.data.location):null;
  // Reconcile only the already-saved location. An apparent destination elsewhere is not proof of legal arrival.
  if(location&&locationMatches(location,target)&&!privateScene){
    const presence=recordCharacterArrival(db,guild,pc,user,messageId);
    if(presence) return {status:"established",record_key:key,data:{location_key:location.entity_key}};
  }
  return db.transaction(()=>{
    const after=db.saveCityRecord(guild,{kind:"scene_entry",key,status:"pending",source_event:source.event_key,
      visibility:"character",subject_key:pc.id,data:{user,character:pc.id,target,session_id:db.getActiveSession(guild).id,
        scene:currentScene(db,guild).key,prior_location:pc.data.location??null,private_scene:privateScene,
        authority:"Owner-authored entry attempt only; human review of established location/access required. No travel, cost, occupants or knowledge inferred."}});
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
    return row.status==="pending"&&row.data.user===user&&row.data.session_id===session.id&&row.data.scene===scene
      &&(mode==="private"||row.data.private_scene===false)
      &&source?.status==="active"&&source.kind==="player_declaration"&&source.details.author===user
      &&source.details.character_id===pc.id&&db.ownerAuthoredSource(guild,source.event_key,user);
  }).slice(0,8).map(row=>({target:row.data.target,source_ref:row.source_event,review_key:row.record_key,
    review_revision:stateRevision(row),status:"pending",private_scene:row.data.private_scene}));
  return {saved_location:pc.data.location??null,attempts,
    authority:"Conversational referents only. Resolve ordinary names, pronouns and follow-up clarifications from owner-visible context. "
      +"Understanding a destination is NOT arrival, access, an encounter, presence, NPC knowledge or consent. "
      +"Ask only when ambiguity materially affects an action; do not repeatedly ask for an already understood name. "
      +"Pending entry remains subject to native human review and travel/encounter/access rules. Review keys and revisions are GM metadata, not dialogue."};
}
export function reviewSceneEntry(db,guild,input,reviewer){
  if(Object.keys(input).some(key=>!["op","key","expected_revision","location_key","adjudication"].includes(key))||input.op!=="review-entry"
    ||!reviewer||typeof input.adjudication!=="string"||!input.adjudication.trim()||input.adjudication.length>600) throw new Error("Closed human entry review and adjudication required.");
  const row=db.getCityRecord(guild,"scene_entry",input.key);
  if(!row||row.status!=="pending"||stateRevision(row)!==input.expected_revision) throw new Error("Current pending entry revision required.");
  const pc=personalCharacter(db,guild,row.data.user,row.data.character),source=db.getWorldEvent(guild,row.source_event);
  if(!source||source.status!=="active"||source.kind!=="player_declaration"||source.details.author!==pc.owner_user_id
    ||source.details.character_id!==pc.id||!db.ownerAuthoredSource(guild,source.event_key,pc.owner_user_id)
    ||row.data.session_id!==db.getActiveSession(guild).id||row.data.scene!==currentScene(db,guild).key
    ||(pc.data.location??null)!==row.data.prior_location) throw new Error("Entry owner/source/session/scene/location changed; request a fresh declaration.");
  const location=typeof input.location_key==="string"?db.getSimulationEntity(guild,"location",input.location_key):null;
  if(!location||!locationMatches(location,row.data.target)) throw new Error("Establish the explicitly named location first; do not redirect the owner's entry.");
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
