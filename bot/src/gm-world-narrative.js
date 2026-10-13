/** Closed nonmechanical GM fiction. Model text, NPC profiles and safety labels never certify PC material clauses. */
import {createHash} from "node:crypto";
import {gmOwnedScope} from './gm-world-scope.js';
export {gmWorldScope} from './gm-world-scope.js';
import {indexWorldEvent} from "./city-calendar.js";
import {validateCompositionShape,compositionEvidence,projectComposition} from "./gm-fiction-composition.js";
import {npcCompositionSchema,freshNpcRequestSchema,nativeOutcomeSchema} from './gm-fiction-schema.js';

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
gmWorldPartsSchema.items={anyOf:[gmWorldPartsSchema.items,npcCompositionSchema,freshNpcRequestSchema,nativeOutcomeSchema]};
export const GM_WORLD_NARRATIVE_PROMPT="In ordinary, private and protected PvP scenes, use gm_world_parts for meaningful GM-owned conversation and atmosphere. "
  +"Choose current native NPC/location entity_key and compose up to three speech acts with a tone. ask_work + ask_skills invites a natural work discussion. "
  +"These parts authorize only the NPC's own closed utterance or harmless ephemeral atmosphere: never a PC response, secrets, promises, new access or mechanics. "
  +"Free text remains quarantined; do not encode extra facts in entity_key. Unsupported exposition needs separate native evidence/review. "
  +"Use [] when no suitable GM-owned fiction is needed. Never use an active human NPC proxy. "
  +"For fresh source-grounded NPC conversation in any scene, request version=3 kind=npc_fresh_request with current entity_key, "
  +"focus (conversation/work/help/warning/offer/rumor/greeting/farewell), and source_refs of current audience-visible NPC observations. "
  +"No utterance/text/safety flag is accepted from this combined GM prompt: a native audience-isolated authoring stage supplies words. "
  +"Use at most one such request; it authorizes no PC effect, revelation, reaction, spending or factual assertion about a PC. "
  +"Project an existing committed receipt using version=4 kind=native_outcome receipt_kind (pc_effect_receipt/roll_request/evidence_receipt/commitment) and ref. "
  +"This is read-only, audience-checked rendering, never permission to apply a receipt or disclose private resources.";
function fail(){throw Object.assign(new Error("Current native GM-owned output scope and closed nonmechanical projection required."),
  {code:"GM_WORLD_NARRATIVE",expected:true});}
function closed(input){
  if(input?.version===2){validateCompositionShape(input);return;}
  const keys=["version","kind","entity_key","acts","tone"];
  if(!input||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k))||keys.some(k=>!(k in input))
    ||input.version!==1||!["npc_dialogue","scene_atmosphere"].includes(input.kind)
    ||typeof input.entity_key!=="string"||!input.entity_key||input.entity_key.length>160
    ||!Object.hasOwn(tones,input.tone)||!Array.isArray(input.acts)||!input.acts.length||input.acts.length>3
    ||new Set(input.acts).size!==input.acts.length)fail();
  const catalog=input.kind==="npc_dialogue"?dialogue:atmosphere;
  if(input.acts.some(act=>!Object.hasOwn(catalog,act))||input.kind==="scene_atmosphere"&&input.tone!=="plain")fail();
}
function snapshot(db,guild,input,scope){
  if(input?.version===2){
    closed(input);
    const base=snapshot(db,guild,{version:1,kind:"npc_dialogue",entity_key:input.entity_key,acts:["acknowledge"],tone:input.tone},scope);
    return {...base,composition:compositionEvidence(db,guild,input,scope,base)};
  }
  closed(input);
  return gmOwnedScope(db,guild,input.kind==='npc_dialogue'?'npc':'location',input.entity_key,scope,
    {declineOnly:input.acts.every(act=>act==='decline')});
}
function project(input){
  closed(input);
  if(input.version===2)return tones[input.tone]+projectComposition(input);
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
  const material={version:1,renderer:input.version,authority:"native:gm-world-narrative",input,scope:{...scope},state,
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
  if(row?.status!=="verified"||d.version!==1||d.renderer!==d.input?.version||key!==`gm-world-narrative:${hash(d)}`
    ||d.authority!=="native:gm-world-narrative"||s?.status!=="active"||s.kind!=="native_gm_world_narrative"
    ||s.source_id!==d.authority||hash(s.details)!==hash(d)||hash(parent)!==d.parent_hash||parent?.status!=="active"
    ||hash(scope)!==hash(d.scope)||hash(snapshot(db,guild,d.input,scope))!==hash(d.state)
    ||row.visibility!==d.state.visibility||s.visibility!==row.visibility||s.subject_key!==row.subject_key
    ||row.subject_key!==(scope.mode==="private"?scope.actorCharacterId:null)||s.scene!==d.state.scene
    ||s.session_id!==d.state.session||s.location_key!==d.state.location||d.text!==project(d.input))fail();
  return d.text;
}
