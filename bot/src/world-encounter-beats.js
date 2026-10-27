/** Read-only pending encounter metadata. A candidate never activates combat or grants publication. */
import {EncounterLibrary,encounterActors,livePcRoster,partyTier,baseBattlePoints,battlePointCost,recomputeBudget} from './encounter.js';
import {worldSessionScene} from './frameworks/world/public.js';
function currentScene(...args){return worldSessionScene.currentScene(...args);}function scenePresence(...args){return worldSessionScene.scenePresence(...args);}function sceneAccess(...args){return worldSessionScene.sceneAccess(...args);}
import {worldConversationPrincipal} from './frameworks/world/public.js';
function conversationPrincipal(...args){return worldConversationPrincipal.conversationPrincipal(...args);}
import {nativeActorControl} from './native-actor-control.js';
import {worldIdentityOrigin} from './world-authorship.js';
import {jsonHash as hash} from './kernel/json-hash.js';
import {worldKnowledgeSources,worldNarrativeAuthorship} from './frameworks/world/public.js';
function narrativeSourceVisible(...args){return worldNarrativeAuthorship.narrativeSourceVisible(...args);}
function factVisibleTo(...args){return worldKnowledgeSources.factVisibleTo(...args);}
import {StateConflictError,UserInputError} from "./kernel/errors.js";
const expectedPrincipal=new Set(['Active session required.','Select an authenticated current controlled role.',
  'Controller attendance required.','Active campaign character required.']);
const expectedActor=new Set(['One to twelve distinct established encounter actors required.','GM-approved actor template binding required.',
  'Actor must actually occupy this scene; budget cannot create arrivals.']);
const visible=(row,scope)=>!!row&&factVisibleTo({...row,subject_character_id:row.subject_key||row.subject_character_id},scope);
const hold=reason=>({reason});
const parse=value=>{try{return JSON.parse(value);}catch{return null;}};
// Runtime configuration only. Never serialize a host path into narrative proofs.
// Re-register on service construction after restart; absent catalogs hold only encounter hints.
const catalogRoots=new WeakMap();
export function configureWorldEncounterCatalog(db,contentRoot){
  if(typeof contentRoot==='string'&&contentRoot.length)catalogRoots.set(db,contentRoot);
}
function configuredLibrary(db,library){
  if(library!==undefined)return library;
  const root=catalogRoots.get(db);if(!root)return null;
  try{return new EncounterLibrary(root);}catch(error){if(error.code==='ENOENT')return null;throw error;}
}
function audited(db,guild,row,type){
  return db.mutationsForEntity(guild,row.record_key,20).some(m=>m.source_layer==='city'&&m.visibility==='gm'&&m.mutation_type===type
    &&hash(parse(m.after_json))===hash(row));
}
function identity(db,guild,type,key,scope){
  const entity=db.getSimulationEntity(guild,type,key),authored=db.getCityRecord(guild,'autonomous_entity',`${type}:${key}`),
    reference=db.getReference(guild,type,key);
  if(!entity||entity.state.hidden||entity.state.removed||['dead','removed'].includes(entity.state.status)
    ||!visible({visibility:entity.state.visibility||reference?.visibility||'party',subject_key:entity.state.subject_key||reference?.subject_character_id},scope)
    ||reference&&!visible(reference,scope)||authored&&(!worldIdentityOrigin(db,guild,authored,scope)
      ||!narrativeSourceVisible(db,guild,authored.source_event,scope)))return null;
  return hash([entity,authored,reference]);
}
function inspect(db,guild,ref,scope,library){
  if(!(library instanceof EncounterLibrary))return hold('missing_native_library');
  if(!['party','private'].includes(scope?.mode)||!db.getActiveSession(guild))return hold('missing_current_scope');
  const actorless=scope.mode==='party'&&scope.actorCharacterId==null&&scope.actorUserId==null;
  if(!actorless&&(!scope.actorCharacterId||!scope.actorUserId))return hold('missing_current_owner');
  if(db.getCityCalendar(guild).flags.encounter_intelligence!==true||db.isDirectorPaused(guild))return hold('encounter_unavailable');
  const scene=currentScene(db,guild),proposal=db.getCityRecord(guild,'encounter_proposal',ref),source=proposal&&db.getWorldEvent(guild,proposal.source_event);
  if(proposal?.status!=='pending'||proposal.data.scene!==scene.key||db.getCurrentEncounter(scene.session_id))return hold('no_current_pending_proposal');
  if(!audited(db,guild,proposal,'encounter_proposal'))return hold('unverified_native_proposal');
  if(!['escape','protect_evidence','containment','negotiation'].includes(proposal.data.objective))return hold('unsupported_native_objective');
  if(!source||!narrativeSourceVisible(db,guild,source.event_key,scope))return hold('missing_entitled_source');
  const place=identity(db,guild,'location',proposal.location_key,scope);if(!place)return hold('missing_entitled_place');
  const roster=livePcRoster(db,scene.session_id),eligible=roster.filter(r=>scenePresence(db,guild,'character',r.character_id)?.location_key===proposal.location_key);
  if(eligible.length<2)return hold('missing_native_roster');
  const owners=[];
  for(const r of eligible){
    const pc=db.getCharacter(r.character_id),presence=scenePresence(db,guild,'character',r.character_id),event=presence&&db.getWorldEvent(guild,presence.source_event);
    let principal;
    try{principal=pc&&conversationPrincipal(db,guild,pc.owner_user_id,pc.id);}catch(error){
      if(expectedPrincipal.has(error.message))return hold('missing_current_owner');throw error;
    }
    if(pc?.guild_id!==guild||principal?.kind!=='owner'||principal.assignment.control_policy!=='player_only'||principal.assignment.proxy_user_id
      ||pc.data.location!==proposal.location_key||['travelling','traveling','in_transit'].includes(pc.data.travel?.status)
      ||presence?.status!=='active'||presence.data.state!=='actually_present'||presence.data.hidden
      ||presence.data.scene!==scene.key||presence.data.session_id!==scene.session_id||event?.status!=='active')return hold('missing_current_owner');
    owners.push({character:pc.id,owner:pc.owner_user_id,principal_hash:hash([principal.kind,principal.revision]),
      presence_hash:hash(presence),source_hash:hash(event)});
  }
  owners.sort((a,b)=>a.character.localeCompare(b.character));
  if(!actorless&&!owners.some(o=>o.character===scope.actorCharacterId&&o.owner===scope.actorUserId))return hold('wrong_current_owner');
  const viewers=scope.mode==='private'?owners.filter(o=>o.character===scope.actorCharacterId):owners;
  if(scope.mode==='party'&&eligible.length!==roster.length)return hold('party_viewpoint_not_shared');
  if(viewers.some(o=>{
    const presence=scenePresence(db,guild,'character',o.character);
    return !visible(presence,scope)||!narrativeSourceVisible(db,guild,presence.source_event,scope);
  }))return hold('missing_entitled_viewpoint_source');
  if(!Array.isArray(proposal.data.actors)||proposal.data.actors.some(actor=>{
    const binding=db.getCityRecord(guild,'encounter_actor',actor),presence=scenePresence(db,guild,'npc',actor);
    return !binding||!presence||!narrativeSourceVisible(db,guild,binding.source_event,scope)
      ||!narrativeSourceVisible(db,guild,presence.source_event,scope);
  }))return hold('missing_entitled_actor_source');
  let actors;
  try{actors=encounterActors(db,guild,{...proposal.data,source_event:proposal.source_event,location_key:proposal.location_key});}
  catch(error){if(error instanceof StateConflictError||error instanceof UserInputError||expectedActor.has(error.message))return hold('native_actor_unavailable');throw error;}
  if(hash(actors)!==hash(proposal.data.bindings))return hold('changed_native_actor_binding');
  const actorProofs=[];
  for(const actor of actors){
    const binding=db.getCityRecord(guild,'encounter_actor',actor.key),presence=scenePresence(db,guild,'npc',actor.key),
      control=nativeActorControl(db,guild,'npc',actor.key),origin=identity(db,guild,'npc',actor.key,scope),
      template=library.adversaries.find(t=>t.name===actor.template);
    if(control.owner_control_type!=='ai_world'||!origin||presence?.status!=='active'||presence.data.hidden||!visible(presence,scope)
      ||presence.data.scene!==scene.key||presence.data.session_id!==scene.session_id||!audited(db,guild,binding,'encounter_binding')
      ||!narrativeSourceVisible(db,guild,binding.source_event,scope)||!narrativeSourceVisible(db,guild,presence.source_event,scope)
      ||viewers.some(o=>!sceneAccess(db,guild,{observer_type:'character',observer_key:o.character,target_type:'npc',target_key:actor.key})))
      return hold('missing_entitled_actor_source');
    if(!template||template.tier>partyTier(eligible)||['Minion','Horde'].includes(template.type))return hold('unsupported_native_template');
    actorProofs.push({actor_ref:actor.key,binding_hash:hash(binding),presence_hash:hash(presence),control_hash:hash(control),identity_hash:origin,template_hash:hash(template)});
  }
  const tier=partyTier(eligible),environment=library.environments.find(e=>e.name===proposal.data.environment&&Number(e.tier)===tier);
  if(!environment)return hold('missing_native_environment');
  const composition=actors.map(a=>{const t=library.adversaries.find(t=>t.name===a.template),cost=battlePointCost(t.type);
    return {name:t.name,type:t.type,tier:t.tier,quantity:1,unit_count:1,bp_cost:cost,spent_bp:cost};});
  const budget=recomputeBudget({tier,base_bp:baseBattlePoints(eligible.length),difficulty:'standard',composition});
  if(budget.spent>budget.budget)return hold('native_budget_exceeded');
  return {proof:{version:1,kind:'encounter_candidate',proposal_ref:ref,proposal_hash:hash(proposal),source_ref:source.event_key,source_hash:hash(source),
    session_ref:scene.session_id,scene_ref:scene.key,location_ref:proposal.location_key,place_hash:place,scope_hash:hash(scope),
    roster_hash:hash(owners),actors_hash:hash(actorProofs),library_hash:hash([actorProofs.map(a=>a.template_hash),environment]),budget_hash:hash(budget),
    execution_authority:false,publication_authority:false}};
}
/** At most four descriptors, with bounded non-prose held diagnostics. No persistence or effect path. */
export function snapshotNativeEncounterCandidates(db,guild,scope,{library}={}){
  library=configuredLibrary(db,library);
  const candidates=[],held={count:0,reasons:{}};
  for(const row of db.listCityRecords(guild,{kind:'encounter_proposal',status:'pending',includeGM:true,limit:20})){
    const result=inspect(db,guild,row.record_key,scope,library);
    if(result.proof){if(candidates.length<4)candidates.push(Object.freeze(result.proof));}
    else{held.count++;held.reasons[result.reason]=(held.reasons[result.reason]||0)+1;}
  }
  return {candidates,held};
}
export function inspectNativeEncounterCandidate(db,guild,proof,scope,{library}={}){
  if(proof?.version!==1||proof.kind!=='encounter_candidate'||typeof proof.proposal_ref!=='string')return null;
  library=configuredLibrary(db,library);
  const current=inspect(db,guild,proof.proposal_ref,scope,library).proof;
  return current&&hash(current)===hash(proof)?Object.freeze({...current,execution_authority:false,publication_authority:false}):null;
}
