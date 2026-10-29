/** Closed nonmechanical GM fiction. Model text, NPC profiles and safety labels never certify PC material clauses. */
import {createHash} from "node:crypto";
import {gmOwnedScope} from './gm-world-scope.js';
export {gmWorldScope} from './gm-world-scope.js';
import {narrativeWorldPrimitives} from './frameworks/narrative/public.js';
const {indexWorldEvent}=narrativeWorldPrimitives;
import {validateCompositionShape,compositionEvidence,projectComposition} from "./gm-fiction-composition.js";
import {dialogue,atmosphere,tones,gmWorldPartsSchema,GM_WORLD_NARRATIVE_PROMPT} from './frameworks/narrative/gm-world-contract.js';

const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
export {gmWorldPartsSchema,GM_WORLD_NARRATIVE_PROMPT};
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
