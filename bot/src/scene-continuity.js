/** Sourced descriptive scene occupancy. Actual combat/roster/travel state stays authoritative; observers never receive hidden GM metadata. */
import { cityObject, cityKey, cityVisibility, cityAudit, indexWorldEvent } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { activeCityProxy } from "./city-constraints.js";
import { motivationKey } from "./simulation-motivation.js";
import { UserInputError, StateConflictError } from "./errors.js";
export const RANGE_BANDS=["Melee","Very Close","Close","Far","Very Far"];
export function currentScene(db,guildId){
  const session=db.getActiveSession(guildId);if(!session) throw new StateConflictError("Active session required for occupancy.");
  const director=db.getDirectorState(session.id);
  return {key:`${session.id}:${director.scene_number}`,session_id:session.id,label:director.scene_label};
}
const presenceKey=(scene,type,key)=>`presence:${motivationKey([scene,type,key])}`;
export function scenePresence(db,guild,type,key){
  return db.getActiveSession(guild)?db.getCityRecord(guild,"scene_presence",presenceKey(currentScene(db,guild).key,type,key)):null;
}
export function reconcileSceneArrival(db,guild,{type,key,source_event,owner=null}){
  if(db.getCityCalendar(guild).flags.scene_continuity!==true||!db.getActiveSession(guild)) return null;
  const event=requireCitySource(db,guild,source_event);
  if(!["arrival","travel"].includes(event.kind)||event.details.entity_type!==type||event.details.entity_key!==key)
    throw new StateConflictError("Committed actor-specific arrival evidence required.");
  if(type==="character"&&(event.details.owner_user_id!==owner||event.source_id!==`player:${owner}`))
    throw new StateConflictError("Authenticated owner arrival required.");
  if(type==="npc"&&activeCityProxy(db,guild,key)) return null;
  const before=scenePresence(db,guild,type,key);
  if(before?.source_event===source_event) return before;
  return recordScenePresence(db,guild,{entity_type:type,entity_key:key,source_event,location_key:event.location_key,
    zone:"scene",visibility:event.visibility,subject_key:event.subject_key,accepted_by:owner},"scene_reconciliation");
}
export function recordCharacterArrival(db,guild,character,user,interactionId){
  if(db.getCityCalendar(guild).flags.scene_continuity!==true||!db.getSimulationEntity(guild,"location",character.data?.location)) return null;
  return db.transaction(()=>{
    const event=indexWorldEvent(db,guild,{key:`arrival:${motivationKey([interactionId,character.id])}`,kind:"arrival",title:"Owner-established arrival",
      source_id:`player:${user}`,location_key:character.data.location,visibility:"party",
      details:{entity_type:"character",entity_key:character.id,owner_user_id:user}},user);
    return reconcileSceneArrival(db,guild,{type:"character",key:character.id,source_event:event.event_key,owner:user});
  });
}
export function assertNpcObservation(db,guild,npc,sourceRef,{sourceType="",content=""}={}){
  if(db.getCityCalendar(guild).flags.scene_continuity!==true) return true;
  const existing=db.listNpcKnowledge(guild,npc,{limit:200}).find(row=>row.source_ref===sourceRef&&row.belief_state!=="unknown"&&row.content===content);
  if(existing) return true;
  const event=db.getWorldEvent(guild,sourceRef);
  if(!event||event.status!=="active"||!db.getActiveSession(guild)) throw new StateConflictError("Unknown or unwitnessed source; no new actor knowledge.");
  const targetType=event.details.entity_type,targetKey=event.details.entity_key;
  const sense=["heard","overheard"].includes(sourceType)?"sound":"sight";
  if(!targetType||!targetKey||!sceneAccess(db,guild,{observer_type:"npc",observer_key:npc,target_type:targetType,target_key:targetKey,sense}))
    throw new StateConflictError("Source was not actually accessible to this witness.");
  if(!["observed","witnessed","heard","overheard"].includes(sourceType)) throw new StateConflictError("Remote knowledge needs an established delivery, not scene inference.");
  if(content!==event.title&&content!==event.details.observation) throw new StateConflictError("Observation must match its committed source, not invented content.");
  return true;
}
function records(db,guildId,scene){
  const rows=[];
  for(let offset=0;offset<2000;offset+=100){
    const page=db.listCityRecords(guildId,{kind:"scene_presence",status:"active",query:scene,includeGM:true,limit:100,offset});
    rows.push(...page.filter(row=>row.data.scene===scene));if(page.length<100) break;
  }
  return rows;
}
export function recordScenePresence(db,guildId,input,actorId){
  cityObject(input);
  if(db.getCityCalendar(guildId).flags.scene_continuity!==true) throw new StateConflictError("Scene continuity is opt-in.");
  const scene=currentScene(db,guildId),source=requireCitySource(db,guildId,input.source_event),type=input.entity_type;
  const allowed=["source_event","entity_type","entity_key","location_key","zone","to_zone","range","state","hidden","known_to","visibility","subject_key","accepted_by","proxy_consent_by","blocks"];
  if(Object.keys(input).some(field=>!allowed.includes(field))) throw new UserInputError("Descriptive occupancy fields only; never combat mechanics.");
  if(!["npc","character","adversary","evidence","hazard","entrance","barrier"].includes(type)) throw new UserInputError("Unsupported scene entity type.");
  const entity=cityKey(input.entity_key),location=cityKey(input.location_key),zone=cityKey(input.zone||"scene");
  if(!db.getSimulationEntity(guildId,"location",location)) throw new StateConflictError("Established scene location required.");
  if(source.location_key!==location) throw new StateConflictError("Source event must establish this scene location.");
  if(input.range&&!RANGE_BANDS.includes(input.range)) throw new UserInputError("Use descriptive Daggerheart range bands.");
  const state=input.state||"actually_present";
  if(!["actually_present","believed_present","uncertain","departed"].includes(state)) throw new UserInputError("Explicit occupancy state required.");
  const knownTo=input.known_to||[];
  if(!Array.isArray(knownTo)||knownTo.length>30||knownTo.some(value=>typeof value!=="string"||value.length>180)) throw new UserInputError("Bounded observer list required.");
  for(const observer of knownTo){
    if(observer.startsWith("npc:")?!db.getNpcProfile(guildId,observer.slice(4))
      :observer.startsWith("character:")?db.getCharacter(observer.slice(10))?.guild_id!==guildId:true)
      throw new StateConflictError("Observer not found in this campaign.");
  }
  if(type==="npc"){
    if(!db.getNpcProfile(guildId,entity)) throw new StateConflictError("NPC profile required.");
    const proxy=activeCityProxy(db,guildId,entity);
    if(proxy&&input.proxy_consent_by!==proxy.discord_user_id) throw new StateConflictError("Proxy controls voluntary presence.");
    if(state==="actually_present"&&db.getSimulationEntity(guildId,"npc",entity)?.state.location_key!==location)
      throw new StateConflictError("NPC must actually reach this location before appearing.");
  }
  if(type==="character"){
    const character=db.getCharacter(entity),roster=db.roster(scene.session_id);
    if(character?.guild_id!==guildId||!roster.some(row=>row.character_id===entity&&["present","guest","late"].includes(row.presence)))
      throw new StateConflictError("Absent or unrelated PC cannot be placed in a scene.");
    if(!character.owner_user_id||input.accepted_by!==character.owner_user_id) throw new StateConflictError("PC presence needs explicit owner-established fiction.");
  }
  if(type==="barrier"&&(!Array.isArray(input.blocks)||input.blocks.some(value=>!["sight","sound"].includes(value))||!input.to_zone))
    throw new UserInputError("Barrier requires a second zone and sight/sound descriptors.");
  const boundary=cityVisibility(db,guildId,input.hidden?"gm":input.visibility||"gm",input.subject_key);
  if(boundary.visibility!=="gm"&&!["public","party"].includes(source.visibility)
    &&(source.visibility!==boundary.visibility||source.subject_key!==boundary.subject_key)) throw new StateConflictError("Private source requires a legitimate disclosure event.");
  const key=presenceKey(scene.key,type,entity),before=db.getCityRecord(guildId,"scene_presence",key);
  if(before?.source_event===input.source_event) return before;
  if(before?.data.state==="departed"&&state==="actually_present"&&!['arrival','travel'].includes(source.kind))
    throw new StateConflictError("Reappearance requires a sourced arrival or completed travel.");
  return db.transaction(()=>{
    const after=db.saveCityRecord(guildId,{kind:"scene_presence",key,source_event:source.event_key,location_key:location,actor_key:`${type}:${entity}`,
      ...boundary,data:{scene:scene.key,session_id:scene.session_id,entity_type:type,entity_key:entity,zone,to_zone:input.to_zone||"",
        range:input.range||null,state,hidden:input.hidden===true,known_to:knownTo,blocks:input.blocks||[],
        history:[...(before?.data.history||[]).slice(-19),...(before?[{source_event:before.source_event,state:before.data.state,zone:before.data.zone}]:[])]}});
    cityAudit(db,guildId,"scene_presence",key,before,after,actorId);return after;
  });
}
function accessFromRows(db,guildId,rows,{observer_type,observer_key,target_type,target_key,sense="sight"}){
  if(!["npc","character"].includes(observer_type)||!['sight','sound'].includes(sense)) return false;
  for(const [type,key] of [[observer_type,observer_key],[target_type,target_key]]){
    if(type==="character"&&!db.roster(currentScene(db,guildId).session_id)
      .some(row=>row.character_id===key&&["present","late","guest"].includes(row.presence))) return false;
    if(type==="npc"){
      const state=db.getSimulationEntity(guildId,"npc",key)?.state;
      if(!state||state.removed||["dead","removed"].includes(state.status)) return false;
    }
  }
  const observer=rows.find(row=>row.actor_key===`${observer_type}:${observer_key}`),target=rows.find(row=>row.actor_key===`${target_type}:${target_key}`);
  if(!observer||!target||observer.data.state!=="actually_present"||target.data.state!=="actually_present"
    ||observer.location_key!==target.location_key) return false;
  if(observer_type==="npc"&&db.getSimulationEntity(guildId,"npc",observer_key)?.state.location_key!==observer.location_key) return false;
  if(target_type==="npc"&&db.getSimulationEntity(guildId,"npc",target_key)?.state.location_key!==target.location_key) return false;
  if(target.data.hidden&&!target.data.known_to.includes(`${observer_type}:${observer_key}`)) return false;
  return !rows.some(row=>row.data.entity_type==="barrier"&&row.data.state==="actually_present"&&row.data.blocks.includes(sense)
    &&(row.data.zone===observer.data.zone&&row.data.to_zone===target.data.zone||row.data.to_zone===observer.data.zone&&row.data.zone===target.data.zone));
}
export function sceneAccess(db,guildId,input){
  const scene=currentScene(db,guildId);return accessFromRows(db,guildId,records(db,guildId,scene.key),input);
}
export function sceneView(db,guildId,{observer_type="",observer_key="",gm=false}={}){
  const scene=currentScene(db,guildId),rows=records(db,guildId,scene.key);
  return {scene:scene.key,authority:"Descriptive only; authoritative encounter state overrides positions and ranges.",
    occupants:rows.filter(row=>gm||accessFromRows(db,guildId,rows,{observer_type,observer_key,target_type:row.data.entity_type,target_key:row.data.entity_key})
      &&(row.data.known_to.includes(`${observer_type}:${observer_key}`)||["public","party"].includes(row.visibility)
        ||row.visibility==="character"&&row.subject_key===observer_key))
      .map(row=>gm?row:{entity_type:row.data.entity_type,entity_key:row.data.entity_key,zone:row.data.zone,range:row.data.range,
        source_event:row.source_event,state:row.data.state})};
}
export function archiveScenePresence(db,guildId,sessionId){
  if(db.getActiveSession(guildId)?.id!==sessionId) return [];
  const scene=currentScene(db,guildId);
  return records(db,guildId,scene.key).map(before=>{
    const residue=db.saveCityRecord(guildId,{kind:"scene_residue",key:before.record_key,source_event:before.source_event,
      location_key:before.location_key,data:{...before.data,authority:"historical_residue_not_current_presence"}});
    db.saveCityRecord(guildId,{...before,key:before.record_key,status:"archived"});
    cityAudit(db,guildId,"scene_archive",before.record_key,before,residue,"scene_transition");return residue;
  });
}
