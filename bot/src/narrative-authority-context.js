/** Native creative-GM packet: camera != character position; no secrets, effects, or model-issued authority. */
import {currentScene,scenePresence,lastVerifiedCharacterPresence} from './scene-continuity.js';
import {conversationPrincipal} from './conversation-principal.js';
import {assemblyOrientation} from './assembly-state.js';
import {factVisibleTo} from './disclosure-authority.js';
import {objectiveEvidence,evidenceType} from './epistemic.js';
import {sceneFictionHash as hash,sceneFictionFailure as fail,narrativeSourceVisible} from './scene-fiction-context.js';
import {protectedPvpScope} from './pvp-output.js';
import {activeCityProxy} from './city-constraints.js';
import {disclosedNarrativeMemory} from './narrative-memory.js';
import {rankNarrativeMemory} from './narrative-salience.js';
import {speakerBrief} from './narrative-speakers.js';
import {directorBriefForAudience} from './narrative-director-source.js';
export const narrativeVisible=(row,scope)=>!!row&&factVisibleTo({...row,subject_character_id:row.subject_character_id||row.subject_key,
  subject_user_id:row.subject_user_id||row.subject_key},scope);
export function buildNarrativeContext(db,guild,scope,sourceRef,{operation='describe_scene'}={}){
  const flags=db.getCityCalendar(guild).flags;
  if(!flags.narrative_authority||!flags.playable_narration||!db.getActiveSession(guild))throw fail('creative_authority_disabled_or_no_session');
  if(!['party','private'].includes(scope.mode))throw fail('audience');
  const scene=currentScene(db,guild),source=db.getWorldEvent(guild,sourceRef);let principal=null,pc=null;
  if(scope.actorCharacterId&&scope.actorUserId){
    pc=db.getCharacter(scope.actorCharacterId);
    if(pc?.guild_id!==guild||pc.owner_user_id!==scope.actorUserId||!['active','reserve','guest'].includes(pc.status)
      ||db.activeAssignment(scene.session_id,scope.actorUserId)?.character_id!==pc.id
      ||!db.roster(scene.session_id).some(r=>r.character_id===pc.id&&r.discord_user_id===scope.actorUserId&&['present','late','guest'].includes(r.presence)))throw fail('owner');
    principal=conversationPrincipal(db,guild,scope.actorUserId,pc.id);
  }
  const owner=principal?.kind==='owner'&&source?.kind==='ai_gm_input'&&source.details.author===scope.actorUserId
    &&source.details.character_id===pc.id&&source.details.revision===principal.revision&&db.ownerAuthoredSource(guild,sourceRef,scope.actorUserId);
  const assembly=source?.kind==='native_assembly_scope'&&source.source_id==='native:assembly'&&hash(source.details.scope)===hash(scope)
    &&source.details.revision===assemblyOrientation(db,guild,scene.session_id,scope).revision;
  const director=source?.kind==='native_director_narrative_scope'&&source.source_id==='native:director'&&hash(source.details.scope)===hash(scope);
  if(!source||source.status!=='active'||source.session_id!==scene.session_id||source.scene!==scene.key||!owner&&!assembly&&!director
    ||!narrativeSourceVisible(db,guild,sourceRef,scope))throw fail('authenticated_source');
  const p=pc&&(scenePresence(db,guild,'character',pc.id)||lastVerifiedCharacterPresence(db,guild,pc)),arrival=p&&db.getWorldEvent(guild,p.source_event),
    placed=p?.status==='active'&&p.data.state==='actually_present'&&p.location_key===pc.data.location&&arrival?.status==='active'
      &&arrival.location_key===p.location_key&&narrativeVisible(p,scope)&&narrativeSourceVisible(db,guild,p.source_event,scope);
  if(!placed&&!flags.narrative_camera)throw fail('camera_disabled');
  const entitledLocation=row=>row&&!row.state.hidden&&!row.state.removed&&narrativeVisible({visibility:row.state.visibility||'party',
    subject_key:row.state.subject_character_id},scope)&&(!row.state.narrative_origin||row.state.narrative_origin!==sourceRef)
    &&(!db.getCityRecord(guild,'autonomous_entity',`location:${row.entity_key}`)
      ||narrativeSourceVisible(db,guild,db.getCityRecord(guild,'autonomous_entity',`location:${row.entity_key}`).source_event,scope));
  const location=placed?pc.data.location:db.listSimulationEntities(guild,'location').filter(entitledLocation).sort((a,b)=>a.entity_key.localeCompare(b.entity_key))[0]?.entity_key||null;
  const entity=location&&db.getSimulationEntity(guild,'location',location),authored=location&&db.getCityRecord(guild,'autonomous_entity',`location:${location}`);
  if(entity&&(!narrativeVisible({visibility:entity.state.visibility||'party',subject_key:entity.state.subject_character_id},scope)
    ||entity.state.hidden||entity.state.removed||authored&&!narrativeSourceVisible(db,guild,authored.source_event,scope)))throw fail('hidden_location');
  const protectedScene=!!protectedPvpScope(db,guild,scope).length||db.getCurrentEncounter(scene.session_id)?.status==='active'
    ||db.listCityRecords(guild,{kind:'scene_action_window',includeGM:true,limit:500}).some(r=>['open','locked'].includes(r.status)&&r.data.scene===scene.key&&r.location_key===location);
  if(protectedScene&&!flags.narrative_encounters)throw fail('encounter_fiction_disabled');
  const facts=db.listFactsForGM(guild,{limit:500}).filter(f=>{
    let provenance;try{provenance=JSON.parse(f.provenance_json||'{}');}catch{return false;}
    const e=evidenceType(f),ai=e.kind==='observation'&&e.source_refs.length&&e.source_refs.every(ref=>{
      const event=db.getWorldEvent(guild,ref.replace(/^event:/,''));return event&&(['observation','gm_selected_description'].includes(event.kind)
        ||event.kind==='native_narrative_unit'&&event.source_id==='native:narrative-authority'&&event.details.epistemic==='observation');
    });
    return ['gm','human_gm','ai_gm'].includes(f.source)&&(f.source!=='ai_gm'||ai)&&provenance.scene_location===location
      &&objectiveEvidence(db,guild,f)&&narrativeSourceVisible(db,guild,f.id,scope);
  }).slice(0,12);
  const npcs=db.listSimulationEntities(guild,'npc').filter(n=>n.state.location_key===location&&!n.state.hidden&&!n.state.removed
    &&n.state.narrative_origin!==sourceRef&&narrativeVisible({visibility:n.state.visibility||'party',subject_key:n.state.subject_character_id},scope)
    &&(!db.getCityRecord(guild,'autonomous_entity',`npc:${n.entity_key}`)
      ||narrativeSourceVisible(db,guild,db.getCityRecord(guild,'autonomous_entity',`npc:${n.entity_key}`).source_event,scope)))
    .sort((a,b)=>Number(String(source.details.text||'').toLowerCase().includes(b.entity_key.toLowerCase()))
      -Number(String(source.details.text||'').toLowerCase().includes(a.entity_key.toLowerCase()))||a.entity_key.localeCompare(b.entity_key))
    .slice(0,8).map(n=>({key:n.entity_key,name:db.getNpcProfile(guild,n.entity_key)?.display_name||n.state.name||n.entity_key,
      role:db.getNpcProfile(guild,n.entity_key)?.role||'',human_controlled:!!activeCityProxy(db,guild,n.entity_key)}));
  let speakerChars=0;
  for(const npc of npcs){
    const brief=speakerBrief(db,guild,npc.key,scope,location,owner?source.details.text:'');
    if(brief&&speakerChars+JSON.stringify(brief).length<=6000){npc.speaker_brief=brief;speakerChars+=JSON.stringify(brief).length;}
  }
  const binding={version:1,guild,session:scene.session_id,scene:scene.key,scope:{...scope},source:sourceRef,source_hash:hash(source.details),
    principal:principal?.revision||null,location,viewpoint:placed?'character':'camera',
    placement:placed?hash([p.source_event,p.location_key,p.data.zone,arrival.details]):null};
  const packet={version:2,operation,request:owner?source.details.text:director?'Portray a contextual world response without inventing PC actions or consequences.':'Open this assembly with interesting fiction, without inventing PC co-location or cooperation.',
    viewpoint:{kind:binding.viewpoint,zone:placed?p.data.zone:null,pc_witness:!!placed},
    audience:{mode:scope.mode,unit_visibility:scope.mode==='private'?'character':'party',subject_key:scope.mode==='private'?scope.actorCharacterId:null,
      rule:'Every unit must match this audience. Never relabel private evidence as party-visible.'},
    reference_rules:{npc_speech:'Use only entitled known speaker knowledge references for factual recall; assembly/input references authenticate this request, not NPC knowledge. Use [] for new ordinary self-dialogue or speculation.',
      scene:'Current source references bind the description, not a PC action or hidden explanation.'},
    place:{key:location||'',name:entity?.state.name||'An unestablished public setting',type:entity?.state.place_type||'unknown',
      identity_state:entity?'established_reuse_only':'unestablished',identity_rule:'Reuse established keys without fiction_delta; descriptive prose belongs in narrative_units. fiction_delta creates genuinely new identities only.'},
    observations:facts.map(f=>({source_ref:f.id,text:f.content,epistemic:evidenceType(f).kind})),npcs,
    prior_fiction:rankNarrativeMemory(db,guild,scope,disclosedNarrativeMemory(db,guild,scope,{limit:40}),
      {location,query:owner?source.details.text:'',maxChars:Math.max(3000,9000-speakerChars)}),unknowns:['Hidden causes, private character details and unresolved outcomes are unknown.']};
  if(director)packet.director_brief=directorBriefForAudience(db,guild,source,scope);
  return {binding,packet,scope,source,pc,sourceRef,protectedScene};
}
