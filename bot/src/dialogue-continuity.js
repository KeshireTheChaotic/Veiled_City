/** Authored speech and actor-owned interpretations extend native NPC memories, never canon or consent. */
import { personalCharacter } from "./personal-continuity.js";
import { sceneAccess, sceneView, scenePresence, currentScene } from "./scene-continuity.js";
import { indexWorldEvent } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import {jsonKey32 as motivationKey} from './kernel/json-key32.js';
import { activeCityProxy } from "./city-constraints.js";
import {assertNpcAvailability} from './city-constraints.js';
import {conversationPrincipal} from './frameworks/session/public.js';
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {factVisibleTo} from './disclosure-authority.js';
import {sourceSpanInsideQuote} from './authored-turn-envelope.js';
import { interpretAuthoredText } from "./player-language.js";
import {mentionsPublicIdentity} from './public-referents.js';
export function captureDialogue(db,guild,user,characterId,messageId,message,{privateScene=false,candidate=null,typedIntentKey=null}={}){
  const flags=db.getCityCalendar(guild).flags;
  if(flags.dialogue_history!==true||flags.scene_continuity!==true||!characterId||!messageId||typeof message!=="string") return null;
  let pc;try{pc=personalCharacter(db,guild,user,characterId);}catch{return null;}
  const speech=candidate?{target:candidate.target,quote:candidate.quote}:interpretAuthoredText(message,{natural:flags.natural_language===true}).speech;
  if(!speech||privateScene&&!speech.target) return null;
  if(candidate&&(!candidate.source_span||!message.includes(candidate.source_span)||!candidate.source_span.includes(candidate.quote)))return null;
  const scope={mode:privateScene?'private':'party',actorUserId:user,actorCharacterId:pc.id},scene=currentScene(db,guild);
  let typed=null;
  if(typedIntentKey){
    typed=db.getCityRecord(guild,'typed_intent',typedIntentKey);const d=typed?.data,s=d&&db.getWorldEvent(guild,typed.source_event);
    let principal;try{principal=conversationPrincipal(db,guild,user,pc.id);}catch{return null;}
    if(!d||typed.status!=='accepted_for_adjudication'||d.type!=='speak'||d.framing!=='immediate'||principal.kind!=='owner'
      ||d.owner_user_id!==user||d.actor!==pc.id||d.actor_principal_revision!==principal.revision||d.scene!==scene.key||d.session_id!==scene.session_id
      ||s?.status!=='active'||s.details.discord_message_id!==messageId||s.details.raw_text!==message
      ||message.slice(d.start,d.end)!==candidate?.source_span||d.utterance!==candidate?.quote
      ||!db.ownerAuthoredSource(guild,s.event_key,user)||!narrativeSourceVisible(db,guild,s.event_key,scope))return null;
    // A model framing label cannot turn explicitly reported or extracted quoted words into the owner's utterance.
    if(sourceSpanInsideQuote(message,d.start)||/^(?:he|she|they)\s+(?:said|says|told)\b/i.test(candidate.source_span.trim()))return null;
  }
  const key=`speech:${motivationKey(candidate?[messageId,pc.id,candidate.source_span]:[messageId,pc.id])}`;
  const prior=db.getWorldEvent(guild,key);if(prior) return prior;
  const position=scenePresence(db,guild,'character',pc.id),pcLocation=position?.status==='active'&&position.data.state==='actually_present'?position.location_key:pc.data.location;
  if(typed&&(!position||position.status!=='active'||position.data.state!=='actually_present'||position.location_key!==pc.data.location
    ||!factVisibleTo({...position,subject_character_id:position.subject_key},scope)||!narrativeSourceVisible(db,guild,position.source_event,scope)))return null;
  const occupants=sceneView(db,guild,{gm:true}).occupants.filter(row=>{
    if(row.data.entity_type!=='npc')return false;
    const key=row.data.entity_key,state=db.getSimulationEntity(guild,'npc',key)?.state;
    if(!state||row.data.state!=='actually_present'||state.hidden||state.removed||['dead','removed'].includes(state.status)||state.location_key!==pcLocation
      ||!factVisibleTo({...row,subject_character_id:row.subject_key},scope)
      ||!factVisibleTo({visibility:state.visibility||'party',subject_character_id:state.subject_character_id},scope)
      ||!narrativeSourceVisible(db,guild,row.source_event,scope)||activeCityProxy(db,guild,key)
      ||!sceneAccess(db,guild,{observer_type:'npc',observer_key:key,target_type:'character',target_key:pc.id,sense:'sound'}))return false;
    try{assertNpcAvailability(db,guild,key,{type:'contact',location_key:pcLocation});}catch(error){if(error.constructor===Error&&!error.code)return false;throw error;}
    return true;
  });
  // Typed target identity + grounded local hearing replaces exact display-name equality for normal gameplay.
  let addressed;
  if(typed){
    if(!typed.data.target_key||!db.getNpcProfile(guild,typed.data.target_key))return null;
    addressed=occupants.filter(row=>row.data.entity_key===typed.data.target_key);
    const profile=db.getNpcProfile(guild,typed.data.target_key),state=db.getSimulationEntity(guild,'npc',typed.data.target_key)?.state;
    const names=[profile?.display_name,...(state?.aliases||[])].filter(n=>typeof n==='string'&&n.length>=3);
    const explicitlyNamed=names.some(n=>mentionsPublicIdentity(candidate.source_span,n));
    if(occupants.length>1&&!explicitlyNamed){
      // Match native public descriptors, not a catalog of English referring phrases.
      // The model's target must agree with the unique actual audible candidate.
      const matches=occupants.filter(row=>{
        const role=db.getSimulationEntity(guild,'npc',row.data.entity_key)?.state.public_role;
        return mentionsPublicIdentity(candidate.source_span,role);
      });
      if(matches.length!==1||matches[0].data.entity_key!==typed.data.target_key)return null;
    }
  }else addressed=speech.target?occupants.filter(row=>[row.data.entity_key,db.getNpcProfile(guild,row.data.entity_key)?.display_name,
    db.getNpcProfile(guild,row.data.entity_key)?.name].filter(Boolean).some(name=>name.toLowerCase()===speech.target.toLowerCase())):occupants;
  if(speech.target&&addressed.length!==1)return null;
  const listeners=addressed
    .filter(row=>!activeCityProxy(db,guild,row.data.entity_key)&&sceneAccess(db,guild,{observer_type:"npc",observer_key:row.data.entity_key,
      target_type:"character",target_key:pc.id,sense:"sound"})).slice(0,12).map(row=>row.data.entity_key);
  if(!listeners.length) return null;
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key,source_id:`player:${user}`,kind:"authored_speech",title:"Explicitly authored character speech",visibility:"gm",
      session_id:db.getActiveSession(guild).id,scene:currentScene(db,guild).key,details:{character_id:pc.id,author:user,quote:speech.quote,listeners,
        private_scene:privateScene,...(typed?{typed_intent:typed.record_key,input_source:typed.source_event,start:typed.data.start,end:typed.data.end,principal_revision:typed.data.actor_principal_revision}:{}),
        authority:"utterance_only_not_truth_or_consent"}},user);
    for(const npc of listeners) db.addNpcMemory(guild,{npcKey:npc,memoryType:"relational",content:`${pc.name} said: “${speech.quote}” (claim unverified; not consent or binding terms)`,
      subjectType:"character",subjectKey:pc.id,sourceType:"heard",sourceRef:key,confidence:100,importance:70,
      tags:["authored_dialogue","utterance_not_truth"],dedupe:false});
    return source;
  });
}
export function interpretDialogue(db,guild,input){
  if(db.getCityCalendar(guild).flags.dialogue_history!==true) throw new Error("Dialogue history is opt-in.");
  const source=requireCitySource(db,guild,input.source_event),npc=input.npc_key;
  if(source.kind!=="authored_speech"||!source.source_id.startsWith("player:")||source.source_id!==`player:${source.details.author}`
    ||!source.details.listeners?.includes(npc)||!db.getNpcProfile(guild,npc)||activeCityProxy(db,guild,npc)
    ||!db.ownerAuthoredSource(guild,source.event_key,source.details.author))
    throw new Error("Only an actual listener can interpret authenticated speech.");
  if(typeof input.interpretation!=="string"||!input.interpretation.trim()||input.interpretation.length>600
    ||!Number.isInteger(input.confidence)||input.confidence<0||input.confidence>70
    ||!["promise","offer","refusal","boundary","address","argument","joke","apology","disagreement"].includes(input.topic))
    throw new Error("Bounded subjective dialogue interpretation required.");
  const prior=input.corrects?db.getNpcMemory(input.corrects):null;
  if(input.corrects&&(!prior||prior.guild_id!==guild||prior.npc_key!==npc||prior.subject_key!==source.details.character_id
    ||!prior.tags.includes("dialogue_interpretation")||prior.source_ref===source.event_key))
    throw new Error("A correction must reference this listener's prior interpretation of the same character.");
  return db.addNpcMemory(guild,{npcKey:npc,memoryType:"impression",content:`Subjective ${input.topic} interpretation of “${source.details.quote}”: ${input.interpretation}. Not canon, future choice or acceptance.`,
    subjectType:"character",subjectKey:source.details.character_id,sourceType:"inferred",sourceRef:source.event_key,
    importance:70,confidence:Math.min(70,input.confidence??50),tags:["dialogue_interpretation",input.topic,"unverified",
      ...(prior?[`corrects:${prior.id}`,`prior-source:${prior.source_ref}`]:[])]});
}
