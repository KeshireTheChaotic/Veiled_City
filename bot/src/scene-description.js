import {narrativeKnowledgeDisclosure} from './frameworks/narrative/public.js';
const {factVisibleTo,activeEvidence,objectiveEvidence,evidenceType}=narrativeKnowledgeDisclosure;
/** Read-only scene composition. Typed sensory grammar is not authority for PC effects or new durable facts. */
import {createHash} from 'node:crypto';
import {narrativeSessionScene} from './frameworks/narrative/public.js';
const {currentScene,scenePresence}=narrativeSessionScene;
import {narrativeSessionPrincipal} from './frameworks/narrative/public.js';
function conversationPrincipal(...args){return narrativeSessionPrincipal.conversationPrincipal(...args);}


import {narrativeEnvironmentalText} from './frameworks/narrative/public.js';
function environmentalText(...args){return narrativeEnvironmentalText.environmentalText(...args);}
import {sceneAtmosphereSubjects as subjects,sceneAtmosphereVerbs as verbs,sceneAtmosphereEndings as endings} from './gm-fiction-schema.js';
export {sceneDescriptionSchema} from './gm-fiction-schema.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
function fail(){throw Object.assign(new Error('Scene description needs current owner source and scoped established evidence.'),{code:'SCENE_DESCRIPTION',expected:true});}
function shape(input){
  if(!input||Object.keys(input).sort().join()!=='atmosphere,fact_refs,kind,version'||input.version!==5||input.kind!=='scene_description'
    ||!Array.isArray(input.fact_refs)||input.fact_refs.length>6||new Set(input.fact_refs).size!==input.fact_refs.length
    ||input.fact_refs.some(ref=>typeof ref!=='string'||!ref||ref.length>200)||!Array.isArray(input.atmosphere)||input.atmosphere.length>3)fail();
  for(const clause of input.atmosphere)if(!clause||Object.keys(clause).sort().join()!=='manner,subject,verb'
    ||!Object.hasOwn(subjects,clause.subject)||!verbs[clause.subject].includes(clause.verb)||!endings[clause.subject].includes(clause.manner))fail();
}
function ownerSource(db,guild,scope,sourceRef){
  const source=db.getWorldEvent(guild,sourceRef);
  if(!scope.actorUserId||!scope.actorCharacterId||source?.kind!=='ai_gm_input')return null;
  let principal;try{principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);}catch{return null;}
  const scene=currentScene(db,guild),pc=db.getCharacter(scope.actorCharacterId);
  if(principal.kind!=='owner'||source.status!=='active'||source.details.revision!==principal.revision
    ||source.session_id!==scene.session_id||source.scene!==scene.key||source.details.character_id!==pc?.id
    ||!db.ownerAuthoredSource(guild,sourceRef,scope.actorUserId)
    ||!factVisibleTo({...source,subject_character_id:source.subject_key,subject_user_id:source.subject_key},scope))return null;
  return {scene,principal,source,pc};
}
function request(db,guild,scope,sourceRef){
  const r=ownerSource(db,guild,scope,sourceRef);if(!r)return null;
  const {principal,pc}=r;
  const rows=db.listCityRecords(guild,{kind:'typed_intent',includeGM:true,limit:120}).filter(row=>
    row.status==='accepted_for_adjudication'&&row.data.world_source_event===sourceRef&&row.data.actor===pc.id
    &&row.data.actor_principal_revision===principal.revision&&row.data.framing==='immediate'&&row.data.type==='other'
    &&['describe_scene','current_situation'].includes(row.data.operation));
  if(!rows.length)return null;
  return {...r,intents:rows.map(row=>[row.record_key,hash(row.data)])};
}
function visibleClosure(db,guild,key,scope,seen=new Set()){
  if(seen.has(key)||seen.size>=32)return false;seen.add(key);
  const row=db.getFact(guild,key)||db.getWorldEvent(guild,String(key).replace(/^event:/,''));
  if(!row||!factVisibleTo({...row,subject_character_id:row.subject_character_id||row.subject_key,
    subject_user_id:row.subject_user_id||row.subject_key},scope))return false;
  return !row.content||evidenceType(row).source_refs.every(ref=>visibleClosure(db,guild,ref,scope,new Set(seen)));
}
function eligible(db,guild,fact,scope,location){
  let provenance;try{provenance=JSON.parse(fact?.provenance_json||'{}');}catch{return false;}
  return !!(fact&&['environment','scene'].includes(fact.category)&&fact.source==='gm'&&!fact.archived
    &&provenance.scene_location===location&&factVisibleTo(fact,scope)&&activeEvidence(db,guild,fact.id)
    &&objectiveEvidence(db,guild,fact)&&visibleClosure(db,guild,fact.id,scope)&&environmentalText(fact)!==null);
}
export function sceneDescriptionRequest(db,guild,scope,sourceRef){
  if(db.getCityCalendar(guild).flags.scene_descriptions!==true||!sourceRef)return null;
  return request(db,guild,scope,sourceRef);
}
export function defaultSceneDescription(db,guild,scope,sourceRef){
  const r=sceneDescriptionRequest(db,guild,scope,sourceRef);if(!r)return null;
  const refs=['environment','scene'].flatMap(category=>db.listFactsForGM(guild,{category,limit:100}))
    .filter(f=>eligible(db,guild,f,scope,r.pc.data.location)).slice(0,6).map(f=>f.id);
  return {version:5,kind:'scene_description',fact_refs:refs,atmosphere:[]};
}
export function projectSceneDescription(db,guild,input,scope,sourceRef){
  shape(input);const r=sceneDescriptionRequest(db,guild,scope,sourceRef);if(!r)fail();
  const {scene,principal,source,pc}=r,location=typeof pc.data.location==='string'?pc.data.location:null;
  const entity=location&&db.getSimulationEntity(guild,'location',location);
  // A request has one authenticated viewpoint, not a requirement that the whole roster share a room.
  const roster=db.roster(scene.session_id).filter(row=>['present','late','guest'].includes(row.presence)
    &&row.character_id===scope.actorCharacterId&&row.discord_user_id===scope.actorUserId);
  const occupancy=roster.map(row=>{
    const character=db.getCharacter(row.character_id),presence=scenePresence(db,guild,'character',row.character_id);
    const event=presence&&db.getWorldEvent(guild,presence.source_event);
    return {character:row.character_id,owner:character?.owner_user_id,assignment:row.discord_user_id,
      location:character?.data.location,presence:hash(presence),event:hash(event),
      publicHere:presence?.status==='active'&&presence.data.state==='actually_present'&&presence.data.scene===scene.key
        &&character?.data.location===location&&presence?.location_key===location&&event?.status==='active'
        &&['public','party'].includes(presence.visibility)};
  });
  const visibleLocation=entity&&/^[a-z0-9][a-z0-9:_-]{0,159}$/i.test(location)&&!entity.state.hidden&&!entity.state.removed
    &&['public','party'].includes(entity.state.visibility||'party');
  // Saved position is an owner view, not proof that every player witnessed a private arrival.
  const shared=scope.mode==='private'||occupancy.length>0&&occupancy.every(row=>row.publicHere);
  const facts=[];
  if(visibleLocation&&shared)for(const ref of input.fact_refs){
    const fact=db.getFact(guild,ref);if(!eligible(db,guild,fact,scope,location))fail();facts.push(fact);
  }
  const state={version:1,source:hash(source),scene,principal:principal.revision,intents:r.intents,
    location,entity:hash(entity),occupancy,minute:db.getSimulationClock(guild).minute,facts:facts.map(f=>[f.id,hash(f)]),
    scope:{...scope},shared};
  let text;
  if(!location)text='Your initial scene location is not established in native state. Check-in and the assembly plan do not place your character. Use /vc session present for owner-private initial-location confirmation; earlier attempted actions remain unresolved. What location would you like to establish or ask about?';
  else if(!shared)text='An audience-visible viewpoint for this character is not established; shared presence has not been confirmed. Other players may continue independently. Ask privately about your saved surroundings, or reconcile the missing native presence source; no movement is inferred.';
  else if(!visibleLocation)text='Your current location has no established, accessible scene description. No arrival or movement is inferred. Where would you like to focus your view?';
  else {
    text=`Your saved location is ${JSON.stringify(location)}; this describes the current viewpoint, not a new arrival.`;
    if(facts.length)text+='\n'+facts.map(f=>environmentalText(f)).join('\n');
    else text+=' No sourced environmental details are available here yet. What would you like to examine?';
    if(input.atmosphere.length)text+='\n'+input.atmosphere.map(c=>`${subjects[c.subject]} ${c.verb} ${c.manner}.`).join(' ');
  }
  return {text,revision:hash([input,state]),source,state};
}

/** Isolated authoring can describe only this current audience-entitled viewpoint, never supply its own placement. */
export function sceneAuthoringContext(db,guild,scope,sourceRef,refs=[]){
  if(db.getCityCalendar(guild).flags.scene_descriptions!==true)fail();
  const r=ownerSource(db,guild,scope,sourceRef);if(!r)fail();
  // Reuse the identical snapshot/entitlement renderer, but authoring does not require a persisted semantic request yet.
  const {pc,scene,principal,source}=r,location=pc.data.location,entity=location&&db.getSimulationEntity(guild,'location',location);
  const presence=scenePresence(db,guild,'character',pc.id),event=presence&&db.getWorldEvent(guild,presence.source_event);
  if(!entity||entity.state.hidden||entity.state.removed||!['public','party'].includes(entity.state.visibility||'party')
    ||scope.mode!=='private'&&(!presence||presence.status!=='active'||presence.data.state!=='actually_present'
      ||presence.data.scene!==scene.key||presence.location_key!==location||event?.status!=='active'||!['party','public'].includes(presence.visibility)))fail();
  const facts=refs.map(ref=>db.getFact(guild,ref));if(facts.some(f=>!eligible(db,guild,f,scope,location)))fail();
  return {state:{scene,principal:principal.revision,owner:pc.owner_user_id,character:pc.id,location,entity:hash(entity),
    presence:scope.mode==='private'?null:hash(presence),presence_source:scope.mode==='private'?null:hash(event),source:hash(source),
    facts:facts.map(f=>[f.id,hash(f)]),scope:{...scope}},source,
    location_name:String(entity.state.name||location),evidence:facts.map(f=>environmentalText(f))};
}
