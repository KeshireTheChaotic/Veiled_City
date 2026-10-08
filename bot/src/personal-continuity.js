/** Owner-established private arcs and zero-write discovery. Identity comes from the interaction, never caller-supplied scope or aliases. */
import { cityObject, cityKey, cityInteger, cityAudit, indexWorldEvent } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { motivationKey } from "./simulation-motivation.js";
import { PermissionError, StateConflictError, UserInputError } from "./errors.js";
export function personalCharacter(db,guild,userId,characterId){
  const session=db.getActiveSession(guild),assignment=session?db.activeAssignment(session.id,userId):null;
  const id=characterId||assignment?.character_id,character=id?db.getCharacter(id):null;
  if(!character||character.guild_id!==guild||character.owner_user_id!==userId||assignment?.character_id!==id)
    throw new PermissionError("An active owned character assignment is required; proxies do not gain private continuity.");
  const present=db.roster(session.id).some(row=>row.character_id===id&&["present","late","guest"].includes(row.presence));
  if(!present) throw new PermissionError("Personal continuity requires attendance.");
  return character;
}
export function personalArc(db,guild,userId,input){
  cityObject(input);if(db.getCityCalendar(guild).flags.personal_arcs!==true) throw new StateConflictError("Personal arcs are opt-in.");
  const character=personalCharacter(db,guild,userId,input.character_id),key=`${character.id}:${cityKey(input.key)}`,op=input.op||"state";
  if(op==="respond"){
    const beat=db.getCityRecord(guild,"arc_beat",key);
    if(!beat||beat.subject_key!==character.id||!["accept","decline"].includes(input.decision)) throw new UserInputError("Your own proposed beat and explicit decision required.");
    if(beat.status!=="pending") return beat;
    return db.transaction(()=>{
      const after=db.saveCityRecord(guild,{...beat,key,status:input.decision==="accept"?"accepted":"declined",data:{...beat.data,response_by:userId}});
      cityAudit(db,guild,"arc_response",key,beat,after,userId);return after;
    });
  }
  if(op!=="state"||!["dilemma","stake","relationship","vow","choice","desire"].includes(input.type)
    ||typeof input.statement!=="string"||!input.statement.trim()||input.statement.length>1500)
    throw new UserInputError("A bounded player-stated arc type and statement required; no inferred PC feelings.");
  const before=db.getCityRecord(guild,"arc",key),revision=(before?.data.revision||0)+1;
  if(before?.data.statement===input.statement&&before.data.type===input.type) return before;
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key:`arc:${motivationKey([key,revision,input.statement])}`,source_kind:"gm",source_id:`player:${userId}`,
      title:"Owner-established personal statement",kind:"player_statement",details:{authority:"player_established_not_world_truth"}},userId);
    const after=db.saveCityRecord(guild,{kind:"arc",key,visibility:"character",subject_key:character.id,source_event:source.event_key,
      data:{type:input.type,statement:input.statement,established_by:userId,revision,authority:"player_stated",
        history:[...(before?.data.history||[]),...(before?[{revision:before.data.revision,statement:before.data.statement,source_event:before.source_event}]:[])].slice(-20)}});
    cityAudit(db,guild,"arc_established",key,before,after,userId);return after;
  });
}
export function proposeArcBeat(db,guild,input,actorId){
  cityObject(input);if(db.getCityCalendar(guild).flags.personal_arcs!==true) throw new StateConflictError("Personal arcs are opt-in.");
  const character=db.getCharacter(input.character_id);
  if(!character||character.guild_id!==guild) throw new PermissionError("Campaign character required.");
  personalCharacter(db,guild,character.owner_user_id,character.id);
  const arc=db.getCityRecord(guild,"arc",`${character.id}:${cityKey(input.arc_key)}`);
  if(!arc||arc.subject_key!==character.id) throw new StateConflictError("A player-established arc is required.");
  requireCitySource(db,guild,input.source_event);
  if(typeof input.invitation!=="string"||!input.invitation.trim()||input.invitation.length>1000) throw new UserInputError("Bounded nonbinding invitation required.");
  const key=`${character.id}:${cityKey(input.key)}`,prior=db.getCityRecord(guild,"arc_beat",key);if(prior) return prior;
  return db.transaction(()=>{
    const after=db.saveCityRecord(guild,{kind:"arc_beat",key,status:"pending",visibility:"character",subject_key:character.id,source_event:input.source_event,
      data:{arc_key:arc.record_key,invitation:input.invitation,authority:"GM_opportunity_not_PC_choice",nonbinding:true,costs:[],proposed_by:actorId}});
    cityAudit(db,guild,"arc_invitation",key,null,after,actorId);return after;
  });
}
export function discoverPersonal(db,guild,userId,input={}){
  cityObject(input);if(db.getCityCalendar(guild).flags.discovery!==true) throw new StateConflictError("Discovery lookup is opt-in.");
  const character=personalCharacter(db,guild,userId,input.character_id),query=input.query||"",mode=input.mode||"know";
  if(typeof query!=="string"||query.length>300||!["know","leads","changed","witness","arcs"].includes(mode)) throw new UserInputError("Bounded literal query and discovery mode required.");
  if(input.since_minute!==undefined) cityInteger(input.since_minute,0,1000000000);
  const facts=db.contextFacts(guild,{scope:"character",characterId:character.id,userId,query,limit:50})
    .filter(row=>mode!=="leads"||["clue","lead"].includes(row.category)).map(row=>({id:row.id,key:row.fact_key,content:row.content,
      category:row.category,confidence:row.confidence,source:row.source,last_recorded:row.created_at,authority:"recorded_knowledge_not_global_truth"}));
  const events=mode==="changed"?db.listWorldEvents(guild,{characterId:character.id,userId,query,limit:50})
    .filter(row=>row.status==="active"&&row.minute>(input.since_minute??-1)).map(row=>({source:row.event_key,title:row.title,minute:row.minute,truth_status:row.truth_status})):[];
  const personal=mode==="arcs"?["arc","arc_beat"].flatMap(kind=>db.characterContinuity(guild,character.id,{kind,query}).map(row=>({key:row.record_key,
    kind,status:row.status,source:row.source_event,data:row.data}))):[];
  return {character_id:character.id,mode,query,facts,events,personal,unknown:!facts.length&&!events.length&&!personal.length,
    authority:"Read-only recorded character knowledge; witness claims are not established truth; no alias expansion or discoveries."};
}
