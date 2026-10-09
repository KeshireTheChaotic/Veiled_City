/** Authenticated authored declarations are attempts/utterances, not completed facts or inferred PC consent. */
import { personalCharacter } from "./personal-continuity.js";
import { indexWorldEvent } from "./city-calendar.js";
import { motivationKey } from "./simulation-motivation.js";
import { currentScene } from "./scene-continuity.js";
export function interpretAuthoredText(message,{natural=false}={}){
  const text=String(message||"").replace(/^(?:\s*<@!?\d+>\s*)+/,"").trim();
  if(!text||text.length>4000) return {kind:"unclear",speech:null};
  if(/^(?:ooc\b|\(\(|\/\/)|\b(?:hypothetically|for example|if I|I might|I would|I could|imagine I|suppose I|planning to)\b/i.test(text))
    return {kind:"planning_or_ooc",speech:null};
  const legacy=/^say(?: to ([a-z0-9-]{1,160}))?:\s*["“]([^\n]{1,1000})["”]\s*$/i.exec(text);
  const free=natural?/^I (?:say|tell|ask|reply|whisper)(?: to)?(?: ([a-z0-9-]{1,160}))?\s*[:,]\s*["“]([^\n]{1,1000}?)["”](?:\s*[,.]?\s*(.*))?$/i.exec(text):null;
  const match=legacy||free;
  if(match) return {kind:free?.[3]?"mixed":"speech",speech:{target:match[1]||"",quote:match[2]},attempt:free?.[3]||""};
  if(natural&&/^I\s+(?:try|attempt|examine|search|open|lift|attack|look|read|move|walk|enter|step|go|investigate|ask)\b/i.test(text))
    return {kind:"attempt",speech:null,attempt:text};
  if(/\?\s*$/.test(text)) return {kind:"inquiry",speech:null};
  return {kind:"unclear",speech:null};
}
export function declarationContext(db,guild,user,character,message){
  if(db.getCityCalendar(guild).flags.natural_language!==true) return null;
  try{
    const pc=personalCharacter(db,guild,user,character),interpretation=interpretAuthoredText(message,{natural:true});
    return {character_id:pc.id,exact_text:String(message).slice(0,4000),...interpretation,
      authority:"Owner-authored text only. Attempts are not completed facts. Unclear/mixed meaning requires open clarification, never a menu or inferred assent."};
  }catch{return null;}
}
export function captureDeclaration(db,guild,user,character,messageId,message,{privateScene=false,sceneEntry=false}={}){
  const flags=db.getCityCalendar(guild).flags;
  if(!character||!messageId||flags.roll_requests!==true&&!(sceneEntry&&flags.natural_language===true&&flags.scene_continuity===true)) return null;
  let pc;try{pc=personalCharacter(db,guild,user,character);}catch{return null;}
  const parsed=interpretAuthoredText(message,{natural:true});
  if(!["attempt","mixed"].includes(parsed.kind)) return null;
  const key=`declaration:${motivationKey([messageId,pc.id])}`,prior=db.getWorldEvent(guild,key);if(prior) return prior;
  return indexWorldEvent(db,guild,{key,kind:"player_declaration",source_id:`player:${user}`,title:"Authenticated declared attempt",
    session_id:db.getActiveSession(guild).id,scene:currentScene(db,guild).key,
    visibility:"character",subject_key:pc.id,details:{author:user,character_id:pc.id,message_id:messageId,text:message,kind:parsed.kind,private_scene:privateScene,
      authority:"Declared attempt only; not movement, success, knowledge, spending or consent."}},user);
}
