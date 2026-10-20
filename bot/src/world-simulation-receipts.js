/** Native simulation history is GM metadata, never an audience disclosure capability. */
import {isDeepStrictEqual} from 'node:util';
import {ACTION_COSTS} from './simulation.js';
import {createHash} from 'node:crypto';
import {principalAllows} from './application-authority.js';
import {currentScene,scenePresence,sceneAccess} from './scene-continuity.js';
import {activeCityProxy} from './city-constraints.js';
import {indexWorldEvent,cityAudit} from './city-calendar.js';
import {conversationPrincipal} from './conversation-principal.js';
import {worldIdentityOrigin} from './world-authorship.js';
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {factVisibleTo} from './disclosure-authority.js';

const key=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const parse=value=>{try{return JSON.parse(value);}catch{return null;}};
const held=reason=>Object.freeze({status:'held_source',reason,execution_authority:false,publication_authority:false});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const issuer='native:world-travel-observation';
function matches(db,guild,current,mutation){
  if(!mutation||mutation.guild_id!==guild||mutation.entity_key!==current.id
    ||mutation.actor_type!=='ai'||mutation.source_layer!=='npc_director'||mutation.visibility!=='gm')return false;
  const before=parse(mutation.before_json),after=parse(mutation.after_json),payload=parse(mutation.payload_json),a=current.data,r=a?.result;
  if(!before||!after||!r||!isDeepStrictEqual(after,current)||!isDeepStrictEqual(payload,r)
    ||before.guild_id!==guild||before.id!==current.id||before.kind!=='action'
    ||!['ready','active','scheduled','pending','deferred'].includes(before.status)||before.data?.result
    ||mutation.mutation_type!==`npc_action:${a.type}`||mutation.actor_id!==a.actor_key
    ||!['npc','faction'].includes(a.actor_type)||!key(a.actor_key)||!ACTION_COSTS[a.type])return false;
  const {result,...intent}=a;
  if(!isDeepStrictEqual(before.data,intent)||before.entity_key!==current.entity_key
    ||before.due_tick!==current.due_tick||before.due_minute!==current.due_minute)return false;
  const opposed=['npc','faction'].includes(a.target_type);
  return typeof r.success==='boolean'&&[r.attack_roll,r.defense_roll].every(n=>Number.isInteger(n)&&n>=1&&n<=20)
    &&Number.isFinite(r.attack)&&Number.isFinite(r.defense)&&r.success===(r.attack>=r.defense)
    &&(opposed||r.defense_roll===10&&r.defense===10)
    &&isDeepStrictEqual(r.resource_cost,{[ACTION_COSTS[a.type]]:1});
}

/** Read-only exact current-record/committed-after comparison. Never rechecks historical resource eligibility. */
export function inspectWorldSimulationReceipt(db,guild,actionId){
  if(!key(guild)||!key(actionId))return held('invalid_identity');
  const current=db.getSimulationRecord(guild,actionId);
  if(current?.guild_id!==guild||current.kind!=='action'||current.status!=='completed')return held('no_completed_native_action');
  const receipts=db.mutationsForEntity(guild,actionId,20).filter(m=>matches(db,guild,current,m));
  if(receipts.length!==1)return held(receipts.length?'ambiguous_native_receipt':'missing_or_changed_native_receipt');
  const m=receipts[0],a=current.data,r=a.result;
  const entity=(type,id)=>key(id)&&['npc','faction','location'].includes(type)?db.getSimulationEntity(guild,type,id):null;
  const actor=entity(a.actor_type,a.actor_key),target=entity(a.target_type,a.target_key);
  return Object.freeze({status:'verified_native_receipt',visibility:'gm',action_id:actionId,mutation_id:m.id,
    source_ref:`mutation:${m.id}`,operation:a.type,
    actor:Object.freeze({type:a.actor_type,key:a.actor_key,current_native:!!actor,
      current_profile:a.actor_type==='npc'?!!db.getNpcProfile(guild,a.actor_key):null}),
    target:key(a.target_key)?Object.freeze({type:key(a.target_type)?a.target_type:null,key:a.target_key,current_native:!!target}):null,
    location_key:key(a.location_key)?a.location_key:a.type==='travel'&&key(a.target_key)?a.target_key:null,
    result:Object.freeze({success:r.success,attack_roll:r.attack_roll,defense_roll:r.defense_roll,attack:r.attack,defense:r.defense,
      resource_cost:Object.freeze({...r.resource_cost})}),execution_authority:false,publication_authority:false});
}

function identityBoundary(db,guild,type,id,scope){
  const entity=db.getSimulationEntity(guild,type,id),authored=db.getCityRecord(guild,'autonomous_entity',`${type}:${id}`),
    reference=db.getReference(guild,type,id);
  if(!entity)return null;
  const visible=row=>factVisibleTo({...row,subject_character_id:row.subject_key||row.subject_character_id,
    subject_user_id:row.subject_user_id},scope)
    &&(!['character','player'].includes(row.visibility)||scope.mode==='private'
      &&db.getCharacter(scope.actorCharacterId)?.owner_user_id===scope.actorUserId);
  const native={visibility:entity.state.visibility||reference?.visibility||'party',
    subject_key:entity.state.subject_key||entity.state.subject_character_id||reference?.subject_key||reference?.subject_character_id};
  if(!visible(native)||reference&&!visible(reference))return null;
  let origin=null;
  if(authored){
    origin=worldIdentityOrigin(db,guild,authored,scope);
    if(!origin||!visible(authored)||!narrativeSourceVisible(db,guild,authored.source_event,scope))return null;
  }
  return {type,key:id,native_visibility:native.visibility,native_subject:native.subject_key||null,
    reference_hash:reference?hash(reference):null,authored_hash:authored?hash(authored):null,
    origin_hash:origin?hash(origin):null};
}
const expectedPrincipalErrors=new Set(['Active session required.','Select an authenticated current controlled role.',
  'Controller attendance required.','Active campaign character required.']);
function arrivalContext(db,guild,actionId,scope){
  const receipt=inspectWorldSimulationReceipt(db,guild,actionId);
  const actorless=scope?.mode==='party'&&scope.actorUserId==null&&scope.actorCharacterId==null;
  if(receipt.status!=='verified_native_receipt'||receipt.operation!=='travel'||!receipt.result.success
    ||receipt.actor.type!=='npc'||!receipt.actor.current_profile||!['party','private'].includes(scope?.mode)
    ||!actorless&&(!key(scope.actorUserId)||!key(scope.actorCharacterId))||!db.getActiveSession(guild)
    ||db.getCityCalendar(guild).flags.scene_continuity!==true)return null;
  const scene=currentScene(db,guild),npc=receipt.actor.key,state=db.getSimulationEntity(guild,'npc',npc)?.state,
    travel=db.getWorldEvent(guild,`travel:${actionId}`),presence=scenePresence(db,guild,'npc',npc),
    mutationSource=db.getWorldEvent(guild,receipt.source_ref);
  const actorBoundary=identityBoundary(db,guild,'npc',npc,scope),
    placeBoundary=receipt.location_key&&identityBoundary(db,guild,'location',receipt.location_key,scope);
  if(!actorBoundary||!placeBoundary)return null;
  if(!state||state.hidden||state.removed||['dead','removed'].includes(state.status)||activeCityProxy(db,guild,npc)
    ||mutationSource?.status!=='active'||mutationSource.source_kind!=='mutation'||mutationSource.source_id!==receipt.mutation_id
    ||travel?.status!=='active'||travel.kind!=='travel'||travel.source_kind!=='mutation'||travel.source_id!==receipt.mutation_id
    ||travel.details.entity_type!=='npc'||travel.details.entity_key!==npc||travel.location_key!==receipt.location_key
    ||state.location_key!==travel.location_key||presence?.status!=='active'||presence.source_event!==travel.event_key
    ||presence.location_key!==travel.location_key||presence.data.scene!==scene.key||presence.data.session_id!==scene.session_id
    ||presence.data.state!=='actually_present'||presence.data.hidden)return null;
  const roster=db.roster(scene.session_id).filter(r=>['present','late','guest'].includes(r.presence));
  const viewerIds=scope.mode==='private'?[scope.actorCharacterId]:roster.map(r=>r.character_id).sort();
  if(!viewerIds.length||new Set(viewerIds).size!==viewerIds.length||!actorless&&!viewerIds.includes(scope.actorCharacterId))return null;
  const viewers=[];
  for(const id of viewerIds){
    const pc=db.getCharacter(id),p=scenePresence(db,guild,'character',id),source=p&&db.getWorldEvent(guild,p.source_event);
    let principal;
    try{principal=pc&&conversationPrincipal(db,guild,pc.owner_user_id,id);}catch(error){
      if(expectedPrincipalErrors.has(error.message))return null;
      throw error;
    }
    if(pc?.guild_id!==guild||!pc.owner_user_id||id===scope.actorCharacterId&&pc.owner_user_id!==scope.actorUserId
      ||principal?.kind!=='owner'||principal.character_id!==id||principal.session_id!==scene.session_id
      ||principal.assignment.control_policy!=='player_only'||principal.assignment.proxy_user_id||!key(principal.revision)
      ||!roster.some(r=>r.character_id===id)||pc.data.location!==travel.location_key
      ||['travelling','traveling','in_transit'].includes(pc.data.travel?.status)
      ||p?.status!=='active'||p.location_key!==travel.location_key||p.data.scene!==scene.key
      ||p.data.session_id!==scene.session_id||p.data.state!=='actually_present'||p.data.hidden
      ||source?.status!=='active'||source.kind!=='arrival'||source.source_id!==`player:${pc.owner_user_id}`
      ||source.details.entity_type!=='character'||source.details.entity_key!==id||source.details.owner_user_id!==pc.owner_user_id
      ||source.location_key!==travel.location_key
      ||!sceneAccess(db,guild,{observer_type:'character',observer_key:id,target_type:'npc',target_key:npc}))return null;
    viewers.push({character:id,owner:pc.owner_user_id,principal_kind:principal.kind,principal_revision:principal.revision,
      presence_hash:hash(p),source_hash:hash(source)});
  }
  return {version:1,issuer,action_id:actionId,mutation_id:receipt.mutation_id,mutation_hash:hash(db.getMutation(guild,receipt.mutation_id)),
    actor:npc,location:travel.location_key,session:scene.session_id,scene:scene.key,mode:scope.mode,
    viewpoint:scope.actorCharacterId??null,owner:scope.actorUserId??null,viewers,travel_hash:hash(travel),
    mutation_source_hash:hash(mutationSource),presence_hash:hash(presence),actor_boundary:actorBoundary,place_boundary:placeBoundary};
}
const observationKey=context=>`world-travel-observation:${hash(context)}`;
const safeFact=context=>({actor:{type:'npc',key:context.actor},location_key:context.location,outcome:'observed_arrival'});

/** Observe only a currently established native arrival. Never expose historical dice or certify the journey. */
export function prepareWorldSimulationObservation(db,guild,actionId,scope,{principal}={}){
  if(!principalAllows(principal,guild,'world.observe-travel')||!key(principal.id))return held('application_authority_required');
  return db.transaction(()=>{
    const context=arrivalContext(db,guild,actionId,scope);if(!context)return held('no_current_lawful_arrival_observer');
    const data={...context,principal_id:principal.id,principal_operation:'world.observe-travel'},ref=observationKey(data),
      prior=db.getCityRecord(guild,'world_simulation_observation',ref);
    if(prior)return worldSimulationReceiptForAudience(db,guild,actionId,scope,{sourceRef:ref});
    const visibility=scope.mode==='private'?'character':'party',subject=scope.mode==='private'?scope.actorCharacterId:null;
    // The new observation has its own native source; private mutation ancestry remains only in the GM proof.
    const event=indexWorldEvent(db,guild,{key:`${ref}:source`,kind:'native_travel_observation',title:'Observed NPC arrival',
      source_id:issuer,visibility,subject_key:subject,session_id:context.session,scene:context.scene,
      location_key:context.location,truth_status:'observed',details:safeFact(context)},issuer);
    const row=db.saveCityRecord(guild,{kind:'world_simulation_observation',key:ref,status:'active',visibility:'gm',
      source_event:event.event_key,data:{...data,event_hash:hash(event)}});
    cityAudit(db,guild,'world_simulation_observation',ref,null,row,issuer);
    return worldSimulationReceiptForAudience(db,guild,actionId,scope,{sourceRef:ref});
  });
}

/** Read-only saved observation revalidation: no minting, rerolls, historical relocation or resources. */
export function worldSimulationReceiptForAudience(db,guild,actionId,scope,{sourceRef}={}){
  const receipt=inspectWorldSimulationReceipt(db,guild,actionId);
  if(receipt.status!=='verified_native_receipt')return held('unverified_native_action');
  if(!key(sourceRef)||!scope||!['party','private'].includes(scope.mode))return held('missing_current_audience_evidence');
  const row=db.getCityRecord(guild,'world_simulation_observation',sourceRef),d=row?.data,
    context=arrivalContext(db,guild,actionId,scope);
  if(!context||row?.status!=='active'||row.visibility!=='gm'||d?.issuer!==issuer||!key(d.principal_id)
    ||d.principal_operation!=='world.observe-travel')return held('no_native_recipient_action_observation');
  const expected={...context,principal_id:d.principal_id,principal_operation:'world.observe-travel'},
    event=db.getWorldEvent(guild,row.source_event),visibility=scope.mode==='private'?'character':'party',
    subject=scope.mode==='private'?scope.actorCharacterId:null;
  if(sourceRef!==observationKey(expected)||row.record_key!==sourceRef||row.source_event!==`${sourceRef}:source`
    ||!isDeepStrictEqual(d,{...expected,event_hash:hash(event)})||event?.status!=='active'
    ||event.kind!=='native_travel_observation'||event.source_kind!=='gm'||event.source_id!==issuer
    ||event.visibility!==visibility||(event.subject_key||null)!==subject||event.session_id!==context.session
    ||event.scene!==context.scene||event.location_key!==context.location||event.truth_status!=='observed'
    ||!isDeepStrictEqual(event.details,safeFact(context)))return held('changed_native_arrival_observation');
  const audit=db.mutationsForEntity(guild,sourceRef,20).filter(m=>m.source_layer==='city'&&m.actor_type==='system'
    &&m.actor_id===issuer&&m.visibility==='gm'&&m.mutation_type==='world_simulation_observation'
    &&isDeepStrictEqual(parse(m.after_json),row));
  if(audit.length!==1)return held('unverified_native_observation_producer');
  return Object.freeze({status:'verified_native_observation',source_ref:sourceRef,observation_ref:event.event_key,
    visibility,actor:Object.freeze({type:'npc',key:context.actor}),location_key:context.location,outcome:'observed_arrival',
    execution_authority:false,publication_authority:false});
}
