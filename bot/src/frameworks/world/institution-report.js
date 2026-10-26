/** Original explicit institutional report transfer; subjective actor testimony is never automatic canon. */
import {cityObject,cityKey,cityAudit} from './city-calendar.js';
import {requireCityRecord,requireCitySource} from './city-source.js';
import {activeCityProxy} from './active-proxy.js';
export function fileInstitutionReport(db,guildId,input,actorId){
  cityObject(input);requireCityRecord(db,guildId,"institution",input.institution);requireCitySource(db,guildId,input.source_event);
  const key=cityKey(input.key),prior=db.getCityRecord(guildId,"report",key);if(prior) return prior;
  if(input.from_type!=="npc") throw new Error("Institution report requires an explicit NPC source; employee knowledge is not shared automatically.");
  const proxy=activeCityProxy(db,guildId,input.from_key);
  if(proxy&&input.proxy_consent_by!==proxy.discord_user_id) throw new Error("Human NPC proxy consent is required for this report.");
  const known=db.getNpcKnowledge(guildId,input.from_key,input.information_key);
  if(!known||known.belief_state==="unknown") throw new Error("Reporter does not know the cited information.");
  if(input.authorized!==true) throw new Error("An authorized report/record transfer must be established explicitly.");
  return db.transaction(()=>{
    const after=db.saveCityRecord(guildId,{kind:"report",key,actor_key:input.institution,source_event:input.source_event,
      data:{from_type:"npc",from_key:input.from_key,information_key:input.information_key,content:known.content,
        belief_state:known.belief_state,confidence:known.confidence,mechanism:cityKey(input.mechanism||"filed_report"),subjective:true}});
    cityAudit(db,guildId,"institution_report",key,null,after,actorId);return after;
  });
}
