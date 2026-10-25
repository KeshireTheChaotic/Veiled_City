/** Authenticated entry declarations preserve intended destinations; native autonomous actions adjudicate ordinary travel separately. */
import { personalCharacter } from "./personal-continuity.js";
import { captureDeclaration, interpretAuthoredText } from "./player-language.js";
import { recordCharacterArrival, currentScene } from "./scene-continuity.js";
import { stateRevision } from "./ai-intents.js";
import { cityAudit } from "./city-calendar.js";
import { conversationPrincipal } from './frameworks/session/public.js';
export function entryTarget(text){
  if(interpretAuthoredText(text,{natural:true}).kind!=="attempt") return null;
  const clean=String(text).replace(/^(?:\s*<@!?\d+>\s*)+/,"").trim();
  const match=/^I\s+(?:walk\s+(?:into|inside)|step\s+(?:into|inside)|go\s+(?:into|inside)|enter)\s+(.+?)(?=\s+and\s+|[,.!?;\n]|$)/i.exec(clean);
  return match&&match[1].length<=160?match[1].trim():null;
}
import {locationMatches} from './scene-entry-native.js';
export {locationMatches} from './scene-entry-native.js';
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
import {reviewSceneEntry as nativeReviewSceneEntry,configureEntryPolicy as nativeConfigureEntryPolicy} from './scene-entry-native.js';
// Named historical entry points remain for compatibility; all validation and
// effects live in the extracted native service and execute exactly once.
export function reviewSceneEntry(db,guild,input,reviewer){return nativeReviewSceneEntry(db,guild,input,reviewer);}
export function configureEntryPolicy(db,guild,input,reviewer){return nativeConfigureEntryPolicy(db,guild,input,reviewer);}
export {mundaneEntryImpact,resolveMundaneEntry} from './scene-entry-native.js';
