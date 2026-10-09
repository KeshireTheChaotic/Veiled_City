/** Authenticated authored declarations are attempts/utterances, not completed facts or inferred PC consent. */
import { personalCharacter } from "./personal-continuity.js";
import { indexWorldEvent } from "./city-calendar.js";
import { motivationKey } from "./simulation-motivation.js";
import { currentScene } from "./scene-continuity.js";
export function authoredSceneText(value){
  return String(value||"").trim().replace(/^(?:\*\*|\*|_)([\s\S]*?)(?:\*\*|\*|_)$/,"$1").trim();
}
/** Conservative lexical hints; freeform GM interpretation remains primary and cannot supply consent. */
export function worldRequirements(value){
  const text=authoredSceneText(value).replace(/^(?:\s*<@!?\d+>\s*)+/,"").trim();
  const base={kind:"observe",movement:"none",target:"",location_constraints:[],exclude_locations:[]};
  if(/^(?:ooc\b|\(\(|\/\/|hypothetically\b|if\b|I (?:might|would|could)\b)/i.test(text))return {...base,kind:"planning_or_ooc"};
  const local=/^I\s+(?:go|head|walk|step|move)\s+(upstairs|downstairs|up the stairs|down the stairs)\b/i.exec(text);
  if(local)return {...base,kind:"local_zone",movement:"attempt",target:local[1]};
  const movement=/^I\s+(?:walk\s+(?:into|inside|to)|step\s+(?:into|inside)|go\s+(?:into|inside|to|back to)|head\s+(?:into|inside|to|for|back to)|return\s+to|duck\s+into|slip\s+into|cut\s+(?:into|through)|take|enter)\s+(.+?)(?=\s+and\s+|[,.!?;\n]|$)/i.exec(text);
  if(movement)return {...base,kind:"move",movement:"attempt",target:movement[1].trim().replace(/^the\s+/i,"")};
  if(/\b(?:look|search|seek|find)\b/i.test(text)){
    const constraints=[...text.matchAll(/\b(?:public|open|shaded|sheltered|quiet|nearby|out of the light)\b/gi)].map(m=>m[0]);
    const exclusions=[...text.matchAll(/\b(?:not|away from|avoiding)\s+([^,.!?;\n]+)/gi)].map(m=>m[1].trim());
    return {...base,kind:"find_place",location_constraints:constraints,exclude_locations:exclusions};
  }
  return base;
}
/** Routing hint only: acknowledging a need never commits a job, income, travel, debt or personal arc. */
export function hasCharacterInvitation(value){
  const text=authoredSceneText(value);
  if(interpretAuthoredText(text,{natural:true}).kind==="planning_or_ooc")return false;
  return /\bI\s+(?:need|want|wish|wonder|hope|am looking for|can't afford|cannot afford)\b|\bI'm\s+(?:looking for|worried|hungry|lost|broke)\b/i.test(text);
}
/** Read-only routing obligation; it never supplies consent, action success, movement or state authority. */
export function responseObligation(value,{authenticated=false,directMention=false,conversationFocus=""}={}){
  const text=authoredSceneText(value).replace(/^(?:\s*<@!?\d+>\s*)+/,"").trim();
  if(!authenticated||!text||/^(?:ooc\b|\(\(|\/\/)/i.test(text))return {needed:false,reason:"intentional_silence"};
  if(directMention)return {needed:true,reason:"direct_address"};
  const parsed=interpretAuthoredText(text,{natural:true});
  if(["attempt","mixed","inquiry","speech"].includes(parsed.kind))return {needed:true,reason:`in_world_${parsed.kind}`};
  if(hasCharacterInvitation(text))return {needed:true,reason:"character_need"};
  if(/["“][^"”]{2,}["”]/.test(text)||/^(?:he|she|they|[A-Z][a-z]+)\s+(?:looks?|glances?|turns?|sighs?|asks?|says?|tells?|searches?|moves?)\b/.test(text))
    return {needed:true,reason:"scene_reaction"};
  if(conversationFocus&&/\b(?:again|there|that|them|him|her|it|this)\b/i.test(text))return {needed:true,reason:"continuing_exchange"};
  if(/\b(?:empty|quiet|rain|work|hungry|lost|broke|worried)\b/i.test(text)&&/[.!…]$/.test(text))return {needed:true,reason:"reflective_scene_cue"};
  return {needed:false,reason:"table_chatter_or_no_world_reaction"};
}
export function interpretAuthoredText(message,{natural=false}={}){
  const text=authoredSceneText(message).replace(/^(?:\s*<@!?\d+>\s*)+/,"").trim();
  if(!text||text.length>4000) return {kind:"unclear",speech:null};
  if(/^(?:ooc\b|\(\(|\/\/|hypothetically\b|for example\b|if I\b|I (?:might|would|could)\b|imagine I\b|suppose I\b|planning to\b)/i.test(text))
    return {kind:"planning_or_ooc",speech:null};
  const legacy=/^say(?: to ([a-z0-9-]{1,160}))?:\s*["“]([^\n]{1,1000})["”]\s*$/i.exec(text);
  const free=natural?/^I (?:say|tell|ask|reply|whisper)(?: to)?(?: ([a-z0-9-]{1,160}))?\s*[:,]\s*["“]([^\n]{1,1000}?)["”](?:\s*[,.]?\s*(.*))?$/i.exec(text):null;
  const match=legacy||free;
  if(match) return {kind:free?.[3]?"mixed":"speech",speech:{target:match[1]||"",quote:match[2]},attempt:free?.[3]||""};
  if(natural&&/^(?:I\s+(?:try|attempt|examine|search|open|lift|attack|look|read|move|walk|enter|step|go|investigate|ask)|(?:heading|stepping|walking|going)\s+(?:inside|into))\b/i.test(text))
    return {kind:"attempt",speech:null,attempt:text};
  if(/\?\s*$/.test(text)) return {kind:"inquiry",speech:null};
  return {kind:"unclear",speech:null};
}
export function declarationContext(db,guild,user,character,message){
  if(db.getCityCalendar(guild).flags.natural_language!==true) return null;
  try{
    const pc=personalCharacter(db,guild,user,character),interpretation=interpretAuthoredText(message,{natural:true});
    return {character_id:pc.id,exact_text:String(message).slice(0,4000),...interpretation,
      authority:"Owner-authored text only. Attempts are not completed facts. Understand ordinary contextual references from scoped conversation. "
        +"The coarse kind classifier is not a demand for clarification. Ask openly only when unresolved ambiguity materially affects an action; never infer assent."};
  }catch{return null;}
}
export function captureDeclaration(db,guild,user,character,messageId,message,{privateScene=false,sceneEntry=false,candidate=null}={}){
  const flags=db.getCityCalendar(guild).flags;
  if(!character||!messageId||flags.roll_requests!==true&&!(sceneEntry&&flags.natural_language===true&&flags.scene_continuity===true)) return null;
  let pc;try{pc=personalCharacter(db,guild,user,character);}catch{return null;}
  const parsed=interpretAuthoredText(message,{natural:true});
  if(parsed.kind==="planning_or_ooc"||!["attempt","mixed"].includes(parsed.kind)&&!candidate) return null;
  const key=`declaration:${motivationKey([messageId,pc.id])}`,prior=db.getWorldEvent(guild,key);if(prior) return prior;
  return indexWorldEvent(db,guild,{key,kind:"player_declaration",source_id:`player:${user}`,title:"Authenticated declared attempt",
    session_id:db.getActiveSession(guild).id,scene:currentScene(db,guild).key,
    visibility:"character",subject_key:pc.id,details:{author:user,character_id:pc.id,message_id:messageId,text:message,kind:parsed.kind,private_scene:privateScene,
      candidate_span:candidate?.source_span||null,authority:"Declared attempt only; not movement, success, knowledge, spending or consent."}},user);
}
