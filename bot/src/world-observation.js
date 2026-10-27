/** Selected GM-established non-PC visual facts. Neither profile prose nor an inquiry certifies an answer. */
import { createHash } from "node:crypto";
import { indexWorldEvent } from './frameworks/world/public.js';
import {worldSessionScene} from './frameworks/world/public.js';
function currentScene(...args){return worldSessionScene.currentScene(...args);}function scenePresence(...args){return worldSessionScene.scenePresence(...args);}function sceneAccess(...args){return worldSessionScene.sceneAccess(...args);}
import { activeCityProxy } from "./city-constraints.js";

const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const vocabulary={coat:["blue","black","brown","gray","white","green","red","yellow"],
  hair:["black","brown","blond","red","gray","white","bald"],weather:["rain","snow","clear","fog"],
  exposure:["outdoors","sheltered"],greeting:["hello"]};
function fail(){throw Object.assign(new Error("Native GM description source, selected fields and current audience proof required."),
  {code:"WORLD_OBSERVATION",expected:true});}
function fields(input,type){
  if(!input||Object.keys(input).some(k=>!["entity_type","entity_key","location_key","visibility","subject_key","facts"].includes(k))
    ||!input.facts||Array.isArray(input.facts)||!Object.keys(input.facts).length||Object.keys(input.facts).length>3)fail();
  for(const [field,value] of Object.entries(input.facts))
    if(!(type==="npc"?["coat","hair","greeting"]:["weather","exposure"]).includes(field)||!vocabulary[field]?.includes(value))fail();
}
/** Native command boundary passes the permission result; model/JSON flags are not accepted. */
export function establishWorldDescription(db,guild,user,input,{gm=false,interactionId}={}){
  if(!gm||!user||typeof interactionId!=="string"||!interactionId||interactionId.length>100)fail();
  const scene=currentScene(db,guild),type=input?.entity_type;
  fields(input,type);
  if(!["npc","location"].includes(type)||typeof input.entity_key!=="string"||input.entity_key.length>160
    ||typeof input.location_key!=="string"||input.location_key.length>160
    ||!["party","character","gm"].includes(input.visibility))fail();
  if(input.visibility==="character"&&db.getCharacter(input.subject_key)?.guild_id!==guild)fail();
  if(input.visibility!=="character"&&input.subject_key)fail();
  const entity=db.getSimulationEntity(guild,type,input.entity_key);
  if(type==="npc"&&input.facts.greeting&&activeCityProxy(db,guild,input.entity_key))fail();
  if(!entity||type==="npc"&&(!db.getNpcProfile(guild,input.entity_key)||entity.state.location_key!==input.location_key)
    ||type==="location"&&input.entity_key!==input.location_key)fail();
  return db.transaction(()=>{
    const data={version:1,author:user,scene:scene.key,session:scene.session_id,...input};
    const source=indexWorldEvent(db,guild,{key:`world-description:${hash([guild,user,interactionId])}`,
      kind:"gm_selected_description",title:"GM-selected visible non-PC description",source_id:`gm:${user}`,
      session_id:scene.session_id,scene:scene.key,location_key:input.location_key,visibility:input.visibility,
      subject_key:input.subject_key||null,details:data},user);
    if(source.status!=="active"||hash(source.details)!==hash(data)||source.kind!=="gm_selected_description")fail();
    const proof={...data,source_ref:source.event_key,source_hash:hash(source.details)};
    const key=`world-visible:${hash(proof)}`;
    return db.getCityRecord(guild,"world_visible_fact",key)||db.saveCityRecord(guild,{kind:"world_visible_fact",key,
      status:"active",source_event:source.event_key,visibility:input.visibility,subject_key:input.subject_key||null,
      location_key:input.location_key,data:proof});
  });
}
function seen(db,guild,query){
  const pc=db.getCharacter(query.observer),entity=db.getSimulationEntity(guild,query.target_type,query.target);
  if(!entity||!pc?.data.location)return false;
  if(query.target_type==="location")return pc.data.location===query.target;
  if(entity.state.removed||["dead","removed"].includes(entity.state.status)||entity.state.location_key!==pc.data.location)return false;
  const presence=scenePresence(db,guild,"npc",query.target);
  if(presence||scenePresence(db,guild,"character",query.observer))
    return sceneAccess(db,guild,{observer_type:"character",observer_key:query.observer,target_type:"npc",target_key:query.target});
  // Legacy native occupancy has no implicit knowledge of hidden or character-private NPCs.
  return !entity.state.hidden&&["party","public"].includes(entity.state.visibility||"party");
}
/** Selected values only, with live source/scene/visibility revalidation at each render and delivery. */
export function renderWorldObservation(db,guild,query,scope){
  const type=query.target_type,entity=db.getSimulationEntity(guild,type,query.target);
  const profile=type==="npc"&&db.getNpcProfile(guild,query.target);
  if(!["npc","location"].includes(type)||!entity||type==="npc"&&!profile)fail();
  const canSee=seen(db,guild,query),name=profile?.display_name||"This location",proof_refs=[],values=new Map();
  if(canSee)for(const row of db.listCityRecords(guild,{kind:"world_visible_fact",includeGM:true,limit:500}).reverse()){
    const d=row.data,s=db.getWorldEvent(guild,row.source_event);
    if(row.status!=="active"||d.entity_type!==type||d.entity_key!==query.target||d.scene!==query.scene||d.session!==query.session
      ||d.location_key!==db.getCharacter(query.observer)?.data.location)continue;
    if(row.visibility!=="party"&&!(row.visibility==="character"&&scope.mode==="private"&&row.subject_key===query.observer))continue;
    if(row.record_key!==`world-visible:${hash(d)}`||s?.status!=="active"||s.kind!=="gm_selected_description"
      ||s.source_id!==`gm:${d.author}`||hash(s.details)!==d.source_hash||s.visibility!==row.visibility
      ||s.subject_key!==row.subject_key||row.visibility!==d.visibility||s.scene!==query.scene)continue;
    fields(d.facts?{entity_type:type,entity_key:d.entity_key,location_key:d.location_key,visibility:d.visibility,facts:d.facts}:null,type);
    for(const [field,value] of Object.entries(d.facts))values.set(field,value);
    proof_refs.push(row.record_key);
  }
  const selected=[...values].filter(([field])=>query.operation==="clothing"?field==="coat":["appearance","activity"].includes(query.operation));
  if(type==="npc"&&activeCityProxy(db,guild,query.target))values.delete("greeting");
  const descriptions=selected.filter(([field])=>!["greeting","exposure"].includes(field)).map(([field,value])=>field==="coat"?`a ${value} coat`
    :field==="hair"?value==="bald"?"a bald head":`${value} hair`:value==="clear"?"clear weather":value);
  const greeting=canSee&&type==="npc"&&query.operation==="activity"&&values.get("greeting")==="hello"?`${name} says: “Hello.”`:null;
  return {kind:type==="npc"?"npc_observation_answer":"scene_environment",proof_refs,
    facts:canSee?Object.fromEntries(values):{},canSee,
    text:!canSee?"You cannot currently see that subject; no remote observation is available."
      :greeting||descriptions.length&&`Visible established details of ${name}: ${descriptions.join(", ")}.`
        ||`${name} is nearby, but those visible details are not established in enough detail to report reliably.`};
}
