/** Closed nonmechanical GM fiction. Model text, NPC profiles and safety labels never certify PC material clauses. */
import {createHash} from "node:crypto";
import {currentScene,scenePresence,sceneAccess} from "./scene-continuity.js";
import {conversationPrincipal} from "./conversation-principal.js";
import {activeCityProxy,assertNpcAvailability} from "./city-constraints.js";
import {indexWorldEvent} from "./city-calendar.js";

const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const dialogue={
  welcome:"Hello. Come closer if you'd like to talk.",
  ask_work:"Looking for work? Tell me what kind of work you're looking for.",
  ask_skills:"What are you good at, and what would you rather avoid? We can start there.",
  ask_needs:"What can I help you with?",
  invite_details:"I'm listening. Tell me a little more before I make any suggestions.",
  ask_destination:"Where are you hoping to go?",
  clarify:"I'm not sure what you mean. Could you explain a little more?",
  decline:"I can't help with that. You don't owe me an explanation.",
  acknowledge:"I hear you. What would you like to do next?"
};
const atmosphere={room_hum:"A low, uneven hum hangs in the room.",coffee_aroma:"The scent of coffee drifts through the air.",
  soft_light:"Soft light settles across the surroundings.",quiet_pause:"For a moment, the surroundings are quiet."};
const tones={plain:"",warm:"The speaker's voice is warm. ",wry:"The speaker gives a wry smile. ",terse:"The speaker keeps it brief. "};
const acts=[...Object.keys(dialogue),...Object.keys(atmosphere)];
export const gmWorldPartsSchema={type:"array",maxItems:4,items:{type:"object",additionalProperties:false,
  properties:{version:{type:"integer",enum:[1]},kind:{type:"string",enum:["npc_dialogue","scene_atmosphere"]},
    entity_key:{type:"string",maxLength:160},acts:{type:"array",minItems:1,maxItems:3,items:{type:"string",enum:acts}},
    tone:{type:"string",enum:Object.keys(tones)}},required:["version","kind","entity_key","acts","tone"]}};
export const GM_WORLD_NARRATIVE_PROMPT="In protected PvP scenes, use gm_world_parts for meaningful GM-owned conversation and atmosphere. "
  +"Choose current native NPC/location entity_key and compose up to three speech acts with a tone. ask_work + ask_skills invites a natural work discussion. "
  +"These parts authorize only the NPC's own closed utterance or harmless ephemeral atmosphere: never a PC response, secrets, promises, new access or mechanics. "
  +"Free text remains quarantined; do not encode extra facts in entity_key. Unsupported exposition needs separate native evidence/review. "
  +"Use [] when no suitable GM-owned fiction is needed. Never use an active human NPC proxy.";
function fail(){throw Object.assign(new Error("Current native GM-owned output scope and closed nonmechanical projection required."),
  {code:"GM_WORLD_NARRATIVE",expected:true});}
function closed(input){
  const keys=["version","kind","entity_key","acts","tone"];
  if(!input||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k))||keys.some(k=>!(k in input))
    ||input.version!==1||!["npc_dialogue","scene_atmosphere"].includes(input.kind)
    ||typeof input.entity_key!=="string"||!input.entity_key||input.entity_key.length>160
    ||!Object.hasOwn(tones,input.tone)||!Array.isArray(input.acts)||!input.acts.length||input.acts.length>3
    ||new Set(input.acts).size!==input.acts.length)fail();
  const catalog=input.kind==="npc_dialogue"?dialogue:atmosphere;
  if(input.acts.some(act=>!Object.hasOwn(catalog,act))||input.kind==="scene_atmosphere"&&input.tone!=="plain")fail();
}
function audience(db,guild,scope){
  const scene=currentScene(db,guild),roster=db.roster(scene.session_id).filter(r=>["present","late","guest"].includes(r.presence));
  if(scope.mode==="private"){
    const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
    if(principal.kind!=="owner"||!roster.some(r=>r.character_id===scope.actorCharacterId&&r.discord_user_id===scope.actorUserId))fail();
    return {characters:[scope.actorCharacterId],principal:principal.revision};
  }
  return {characters:roster.map(r=>r.character_id).filter(Boolean),principal:null};
}
function snapshot(db,guild,input,scope){
  closed(input);const scene=currentScene(db,guild),allowed=audience(db,guild,scope);
  const type=input.kind==="npc_dialogue"?"npc":"location",entity=db.getSimulationEntity(guild,type,input.entity_key);
  const authored=db.getCityRecord(guild,"autonomous_entity",`${type}:${input.entity_key}`);
  const source=authored&&db.getWorldEvent(guild,authored.source_event),visibility=authored?.visibility||entity?.state.visibility||"party";
  if(!entity||source&&source.status!=="active"||authored&&!source||entity.state.hidden||entity.state.removed
    ||["dead","removed","dormant"].includes(entity.state.status)
    ||!["public","party"].includes(visibility)&&!(scope.mode==="private"&&visibility==="character"
      &&authored?.subject_key===scope.actorCharacterId))fail();
  const location=type==="location"?input.entity_key:entity.state.location_key;
  const observers=allowed.characters.filter(id=>db.getCharacter(id)?.data.location===location);
  if(!observers.length)fail();
  let profile=null;
  if(type==="npc"){
    profile=db.getNpcProfile(guild,input.entity_key);
    if(!profile||db.getCharacter(input.entity_key)||activeCityProxy(db,guild,input.entity_key))fail();
    if(profile.activity_tier==="dormant"||profile.decision_profile?.conversation_policy==="refuse"
      &&input.acts.some(act=>act!=="decline"))fail();
    const clock=db.getSimulationClock(guild),commitment=db.overlappingCommitment(guild,`npc:${input.entity_key}`,clock.minute,clock.minute+1);
    if(commitment?.location_key&&commitment.location_key!==location)fail();
    assertNpcAvailability(db,guild,input.entity_key,{type:"contact",location_key:location});
    const presence=scenePresence(db,guild,"npc",input.entity_key);
    if(presence&&!observers.some(id=>sceneAccess(db,guild,{observer_type:"character",observer_key:id,
      target_type:"npc",target_key:input.entity_key,sense:"sound"})))fail();
  }
  return {scene:scene.key,session:scene.session_id,location,entity:hash(entity),profile:hash(profile),
    authored:authored?hash(authored):null,principal:allowed.principal,visibility:scope.mode==="private"?"character":"party"};
}
function project(input){
  closed(input);
  // Deliberately no arbitrary name/profile/fact/prose interpolation. The native NPC ID remains in the private proof.
  return input.kind==="npc_dialogue"?`${tones[input.tone]}A nearby NPC says: “${input.acts.map(act=>dialogue[act]).join(" ")}”`
    :input.acts.map(act=>atmosphere[act]).join(" ");
}
function sceneAuthority(db,guild,input,scope,state,origin){
  // A new GM-owned utterance has its own native scene authority. A former PC attempt is not its author.
  // Closed input and native occupancy/control have already validated; no raw director prose enters this source.
  const details={version:1,issuer:"native:gm-world-narrative",role:"nonmechanical_gm_fiction",input,scope,state,origin};
  return indexWorldEvent(db,guild,{key:`gm-world-scope:${hash(details)}`,kind:"native_gm_world_scope",
    source_id:details.issuer,title:"Native nonmechanical scene scope",session_id:state.session,scene:state.scene,
    location_key:state.location,visibility:state.visibility,subject_key:scope.mode==="private"?scope.actorCharacterId:null,
    details},details.issuer);
}
/** Trusted composer invokes this native authoring boundary; there is no model-accepted gm/verified flag. */
export function establishGmWorldPart(db,guild,input,scope,{sourceRef,origin}){
  const state=snapshot(db,guild,input,scope);
  const source=sourceRef?db.getWorldEvent(guild,sourceRef):sceneAuthority(db,guild,input,scope,state,origin);
  if(!source||source.status!=="active"||source.session_id!==state.session||source.scene!==state.scene)fail();
  if(!["party","public"].includes(source.visibility)&&!(scope.mode==="private"&&source.visibility==="character"
    &&source.subject_key===scope.actorCharacterId))fail();
  const material={version:1,renderer:1,authority:"native:gm-world-narrative",input,scope:{...scope},state,
    parent_source:source.event_key,parent_hash:hash(source),origin,text:project(input)};
  const key=`gm-world-narrative:${hash(material)}`;
  return db.transaction(()=>{
    const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:"native_gm_world_narrative",source_id:material.authority,
      title:"Closed GM-owned nonmechanical fiction",session_id:state.session,scene:state.scene,location_key:state.location,
      visibility:state.visibility,subject_key:scope.mode==="private"?scope.actorCharacterId:null,details:material},"native_gm_world_narrative");
    const row=db.getCityRecord(guild,"gm_world_narrative",key)||db.saveCityRecord(guild,{kind:"gm_world_narrative",key,
      status:"verified",source_event:event.event_key,visibility:state.visibility,subject_key:scope.mode==="private"?scope.actorCharacterId:null,
      location_key:state.location,data:material});
    renderGmWorldPart(db,guild,key,scope);return row;
  });
}
export function renderGmWorldPart(db,guild,key,scope){
  const row=db.getCityRecord(guild,"gm_world_narrative",key),d=row?.data,s=row&&db.getWorldEvent(guild,row.source_event);
  const parent=d&&db.getWorldEvent(guild,d.parent_source);
  if(row?.status!=="verified"||d.version!==1||d.renderer!==1||key!==`gm-world-narrative:${hash(d)}`
    ||d.authority!=="native:gm-world-narrative"||s?.status!=="active"||s.kind!=="native_gm_world_narrative"
    ||s.source_id!==d.authority||hash(s.details)!==hash(d)||hash(parent)!==d.parent_hash||parent?.status!=="active"
    ||hash(scope)!==hash(d.scope)||hash(snapshot(db,guild,d.input,scope))!==hash(d.state)
    ||row.visibility!==d.state.visibility||s.visibility!==row.visibility||s.subject_key!==row.subject_key
    ||row.subject_key!==(scope.mode==="private"?scope.actorCharacterId:null)||s.scene!==d.state.scene
    ||s.session_id!==d.state.session||s.location_key!==d.state.location||d.text!==project(d.input))fail();
  return d.text;
}
