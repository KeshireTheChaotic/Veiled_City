import {narrativeKnowledgeDisclosure} from './frameworks/narrative/public.js';
const {factVisibleTo,objectiveEvidence}=narrativeKnowledgeDisclosure;
/** Audience-safe native viewpoint for GM-owned local fiction. No inferred placement, PC knowledge or effects. */
import {jsonHash} from './kernel/json-hash.js';
import {sceneFictionFailure} from './kernel/scene-fiction-failure.js';
export {sceneFictionFailure} from './kernel/scene-fiction-failure.js';
import {narrativeSessionScene} from './frameworks/narrative/public.js';
const {currentScene,scenePresence,sceneAccess}=narrativeSessionScene;
import {narrativeSessionPrincipal} from './frameworks/narrative/public.js';
function conversationPrincipal(...args){return narrativeSessionPrincipal.conversationPrincipal(...args);}


import {narrativePublicationProtectedScope} from './frameworks/narrative/public.js';
const {protectedPvpScope}=narrativePublicationProtectedScope;
import {narrativeBridgeSessionSources} from './frameworks/narrative/public.js';
function assemblyOrientation(...args){return narrativeBridgeSessionSources.assemblyOrientation(...args);}
import {narrativeSourceVisible} from './frameworks/narrative/public.js';
export const sceneFictionHash=value=>jsonHash(value);
const visible=(row,scope)=>row&&factVisibleTo({...row,subject_character_id:row.subject_character_id||row.subject_key,
  subject_user_id:row.subject_user_id||row.subject_key},scope);
// Historical scene-context call sites use this same original source closure.
const closure=narrativeSourceVisible;
export {narrativeSourceVisible};
const short=(value,max=180)=>typeof value==='string'&&!/[\x00-\x1f\u202a-\u202e\u2066-\u2069]/u.test(value)?value.slice(0,max):'';
export function buildSceneFictionContext(db,guild,scope,sourceRef,{operation='describe_scene',excludeFictionKey=null}={}){
  if(db.getCityCalendar(guild).flags.playable_narration!==true)throw sceneFictionFailure('disabled');
  if(!['party','private'].includes(scope.mode)||!['describe_scene','current_situation'].includes(operation))throw sceneFictionFailure('audience_or_operation');
  const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId),pc=db.getCharacter(scope.actorCharacterId),scene=currentScene(db,guild);
  const source=db.getWorldEvent(guild,sourceRef);
  const assembly=source?.kind==='native_assembly_scope'&&source.source_id==='native:assembly';
  const assemblyValid=assembly&&sceneFictionHash(source.details.scope)===sceneFictionHash(scope)
    &&source.details.revision===assemblyOrientation(db,guild,scene.session_id,scope).revision;
  const ownerValid=source?.kind==='ai_gm_input'&&!(
    source.details.author!==scope.actorUserId||source.details.character_id!==pc?.id||source.details.revision!==principal.revision
    ||!db.ownerAuthoredSource(guild,sourceRef,scope.actorUserId)||typeof source.details.text!=='string'||source.details.text.length>4000);
  if(principal.kind!=='owner'||source?.status!=='active'||!ownerValid&&!assemblyValid||source.session_id!==scene.session_id
    ||source.scene!==scene.key||!visible(source,scope))throw sceneFictionFailure('current_owner_source');
  if(protectedPvpScope(db,guild,scope).length||db.getCurrentEncounter(scene.session_id)?.status==='active')throw sceneFictionFailure('protected_or_encounter');
  const presence=scenePresence(db,guild,'character',pc.id),arrival=presence&&db.getWorldEvent(guild,presence.source_event),location=pc.data.location;
  const entity=location&&db.getSimulationEntity(guild,'location',location),authored=location&&db.getCityRecord(guild,'autonomous_entity',`location:${location}`);
  if(!entity||entity.state.hidden||entity.state.removed||!['party','public'].includes(entity.state.visibility||'party')
    ||authored&&!closure(db,guild,authored.source_event,scope)||presence?.status!=='active'||presence.data.state!=='actually_present'
    ||presence.data.scene!==scene.key||presence.location_key!==location||arrival?.status!=='active'||arrival.location_key!==location
    ||!visible(presence,scope)||!visible(arrival,scope))throw sceneFictionFailure('viewpoint');
  for(const kind of ['scene_action_window','action_window'])if(db.listCityRecords(guild,{kind,includeGM:true,limit:500}).some(r=>
    ['open','locked','collecting','pending','contested'].includes(r.status)&&[r.data.scene,r.data.scene_id].includes(scene.key)
    &&(!r.location_key||r.location_key===location)))throw sceneFictionFailure('contested');
  const evidence=db.listFactsForGM(guild,{limit:200}).filter(f=>{
    let p;try{p=JSON.parse(f.provenance_json||'{}');}catch{return false;}
    return ['scene','environment','clue','activity'].includes(f.category)&&['gm','human_gm'].includes(f.source)
      &&p.scene_location===location&&objectiveEvidence(db,guild,f)&&closure(db,guild,f.id,scope);
  }).slice(0,8);
  const local=db.listCityRecords(guild,{kind:'scene_local_detail',status:'committed',includeGM:true,limit:100}).filter(r=>
    r.source_event!==excludeFictionKey&&r.data.scene===scene.key&&r.location_key===location&&visible(r,scope)&&closure(db,guild,r.source_event,scope));
  const npcs=db.listSimulationEntities(guild,'npc').filter(n=>{
    const p=scenePresence(db,guild,'npc',n.entity_key),a=db.getCityRecord(guild,'autonomous_entity',`npc:${n.entity_key}`);
    return !n.state.hidden&&!n.state.removed&&n.state.location_key===location&&['party','public'].includes(n.state.visibility||'party')
      &&p?.status==='active'&&visible(p,scope)&&closure(db,guild,p.source_event,scope)
      &&(!a||visible(a,scope)&&closure(db,guild,a.source_event,scope))
      &&sceneAccess(db,guild,{observer_type:'character',observer_key:pc.id,target_type:'npc',target_key:n.entity_key});
  })
    .slice(0,6).map(n=>({name:short(db.getNpcProfile(guild,n.entity_key)?.display_name),role:short(n.state.public_role,80),activity:'No additional activity established.'}));
  const viewpoint=['interior','exterior'].includes(presence.data.zone)?presence.data.zone:'unspecified';
  const packet={version:1,operation,observation_request:assemblyValid?'Describe the established scene for assembly without assigning any character action, cooperation or disclosure.':short(source.details.text,4000),
    place:{name:short(entity.state.name||location),type:short(entity.state.place_type||entity.state.location_type,80)||'unknown'},viewpoint,
    established_observations:evidence.map(f=>({source_ref:f.id,text:f.content})),
    recent_scene_beats:evidence.filter(f=>['clue','activity'].includes(f.category)).map(f=>({source_ref:f.id,text:f.content})),
    visible_npcs:npcs,open_leads:evidence.filter(f=>f.category==='clue').map(f=>f.id),
    scene_local_details:local.map(r=>r.data.detail),unknowns:['Unprovided activity, hidden causes and NPC intentions are unknown.']};
  const state={guild,scene:scene.key,session:scene.session_id,scope:{...scope},principal:principal.revision,source:sceneFictionHash(source.details),
    // Preview/commit may occur in different wall-clock seconds. Audit timestamps/row IDs confer no fiction authority.
    location,entity:sceneFictionHash(entity.state),authored:authored?sceneFictionHash({key:authored.record_key,status:authored.status,
      source:authored.source_event,visibility:authored.visibility,subject:authored.subject_key,location:authored.location_key,data:authored.data}):null,
    presence:{source:presence.source_event,location,zone:presence.data.zone,state:presence.data.state,visibility:presence.visibility,subject:presence.subject_key},
    arrival:sceneFictionHash(arrival.details),evidence:evidence.map(f=>[f.id,sceneFictionHash(f)]),
    prior:local.map(r=>[r.record_key,sceneFictionHash(r.data)]),npcs:sceneFictionHash(npcs)};
  return {packet,state,source,scope:{...scope},sourceRef};
}

import {narrativeSceneFictionContextSource} from './frameworks/narrative/public.js';
// Supply original context and hash; no context or audience store is reconstructed.
narrativeSceneFictionContextSource.bind({buildSceneFictionContext,sceneFictionHash});
