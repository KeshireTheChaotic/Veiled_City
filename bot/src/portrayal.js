/** Persistent diction guidance, separated from factual memory and public voice authorization. */
import { cityObject, cityKey, cityAudit } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
const fields=["address","formality","humor","verbal_habits","emotional_tone","pronunciation"];
export function configurePortrayal(db,guildId,input,actorId){
  cityObject(input);requireCitySource(db,guildId,input.source_event);const key=cityKey(input.npc);
  if(!db.getNpcProfile(guildId,key)) throw new Error("NPC profile not found.");
  const direction=cityObject(input.direction);
  if(Object.keys(direction).some(key=>!fields.includes(key))||Object.values(direction).some(value=>typeof value!=="string"||value.length>160)) throw new Error("Bounded portrayal fields only; no knowledge or mechanics.");
  const before=db.getSimulationEntity(guildId,"npc",key)?.state||{};
  const after={...before,voice:{...before.voice,portrayal_direction:direction,direction_visibility:input.public_voice_approved===true?"public":"gm"}};
  return db.transaction(()=>{db.setSimulationEntity(guildId,"npc",key,after);cityAudit(db,guildId,"portrayal",key,before,after,actorId);return {npc:key,voice:after.voice};});
}
export function portrayalPacket(db,guildId,npc,{publicVoice=false}={}){
  const profile=db.getNpcProfile(guildId,npc),voice=db.getSimulationEntity(guildId,"npc",npc)?.state?.voice||{};
  if(!profile) return null;
  if(publicVoice&&voice.direction_visibility!=="public") return null;
  const direction=Object.fromEntries(fields.filter(field=>typeof voice.portrayal_direction?.[field]==="string")
    .map(field=>[field,voice.portrayal_direction[field].slice(0,160)]));
  return {npc,display_name:profile.display_name,...(!publicVoice?{portrayal:profile.portrayal}:{}),direction,
    authority:"Diction/emotional presentation only; never facts, consent, thoughts or new mechanics."};
}
