/** Authored speech and actor-owned interpretations extend native NPC memories, never canon or consent. */
import { personalCharacter } from "./personal-continuity.js";
import { sceneAccess, sceneView, currentScene } from "./scene-continuity.js";
import { indexWorldEvent } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { motivationKey } from "./simulation-motivation.js";
import { activeCityProxy } from "./city-constraints.js";
import { interpretAuthoredText } from "./player-language.js";
export function captureDialogue(db,guild,user,characterId,messageId,message,{privateScene=false}={}){
  const flags=db.getCityCalendar(guild).flags;
  if(flags.dialogue_history!==true||flags.scene_continuity!==true||!characterId||!messageId||typeof message!=="string") return null;
  let pc;try{pc=personalCharacter(db,guild,user,characterId);}catch{return null;}
  const speech=interpretAuthoredText(message,{natural:flags.natural_language===true}).speech;
  if(!speech||privateScene&&!speech.target) return null;
  const key=`speech:${motivationKey([messageId,pc.id])}`;
  const prior=db.getWorldEvent(guild,key);if(prior) return prior;
  const listeners=sceneView(db,guild,{gm:true}).occupants.filter(row=>row.data.entity_type==="npc"&&(!speech.target||row.data.entity_key===speech.target))
    .filter(row=>!activeCityProxy(db,guild,row.data.entity_key)&&sceneAccess(db,guild,{observer_type:"npc",observer_key:row.data.entity_key,
      target_type:"character",target_key:pc.id,sense:"sound"})).slice(0,12).map(row=>row.data.entity_key);
  if(!listeners.length) return null;
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key,source_id:`player:${user}`,kind:"authored_speech",title:"Explicitly authored character speech",visibility:"gm",
      scene:currentScene(db,guild).key,details:{character_id:pc.id,author:user,quote:speech.quote,listeners,
        private_scene:privateScene,authority:"utterance_only_not_truth_or_consent"}},user);
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
    ||!source.details.listeners?.includes(npc)||!db.getNpcProfile(guild,npc)||activeCityProxy(db,guild,npc))
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
