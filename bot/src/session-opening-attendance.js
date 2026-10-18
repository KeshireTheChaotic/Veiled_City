const KIND="opening_attendance_registration";

export function registerOpeningAttendance(db,guildId,userId,interactionId,characterQuery=""){
  if(db.getActiveSession(guildId)) throw new Error("A session is already active; use `/vc-session present` to check in.");
  const character=db.findOwnedCharacter(guildId,userId,characterQuery);
  if(!character||character.owner_user_id!==userId||character.guild_id!==guildId||!["active","reserve","guest"].includes(character.status))
    throw new Error("Choose an active, reserve, or guest character that you own.");
  const number=db.nextSessionNumber(guildId), key=`${number}:${userId}:${character.id}`;
  const existing=db.getCityRecord(guildId,KIND,key);
  if(existing?.data?.owner_user_id===userId&&existing.data.character_id===character.id)
    return {character,duplicate:true,sessionNumber:number};
  const sourceEvent=`attendance-registration:${interactionId}`;
  indexWorldEvent(db,guildId,{key:sourceEvent,kind:"attendance_registration",title:"Pre-start attendance declaration",source_kind:"gm",
    source_id:interactionId,visibility:"gm",details:{owner_user_id:userId,character_id:character.id,session_number:number,interaction_id:interactionId}},userId);
  db.saveCityRecord(guildId,{kind:KIND,key,actor_key:character.id,status:"registered",source_event:sourceEvent,
    visibility:"gm",subject_key:null,data:{version:1,owner_user_id:userId,character_id:character.id,session_number:number,source_interaction_id:interactionId}});
  return {character,duplicate:false,sessionNumber:number};
}

export function carryOpeningAttendance(db,guildId,session){
  const records=db.db.prepare("SELECT * FROM city_records WHERE guild_id=? AND kind=? AND status='registered' ORDER BY rowid")
    .all(guildId,KIND).map(r=>({...r,data:JSON.parse(r.data_json)}));
  const result={carried:[],held:[]};
  for(const row of records){
    const d=row.data, number=Number(d.session_number), character=db.getCharacter(d.character_id);
    if(number>session.session_number) continue;
    const valid=d.version===1&&number===session.session_number&&d.owner_user_id&&d.character_id===row.actor_key
      &&character?.guild_id===guildId&&character.owner_user_id===d.owner_user_id&&["active","reserve","guest"].includes(character.status)
      &&db.listPlayers(guildId).some(p=>p.discord_user_id===d.owner_user_id);
    if(valid){
      db.setPresence(session.id,d.owner_user_id,"present","offscreen",null,"Pre-start attendance registration; no arrival or movement inferred.");
      db.assignCharacter(session.id,d.owner_user_id,d.character_id,{role:"primary",controlPolicy:"player_only"});
      db.saveCityRecord(guildId,{kind:KIND,key:row.record_key,actor_key:row.actor_key,status:"carried",source_event:row.source_event,
        visibility:"gm",data:{...d,carried_session_id:session.id}});
      result.carried.push(d.character_id);
    }else{
      db.saveCityRecord(guildId,{kind:KIND,key:row.record_key,actor_key:row.actor_key,status:"held",source_event:row.source_event,
        visibility:"gm",data:{...d,hold_reason:number!==session.session_number?"stale_session":"owner_or_character_validation_failed"}});
      result.held.push(row.record_key);
    }
  }
  return result;
}
import {indexWorldEvent} from './city-calendar.js';
