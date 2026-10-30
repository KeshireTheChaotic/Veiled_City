import {featureOperationDescriptor,requireFeatureOperation} from './feature-operation-descriptors.js';
/** Native source-defined environmental feature qualification and immutable receipts. World identity creation stays behind its existing producer capability. */
export function createEnvironmentDoorChainRules({capabilities}){
const {inspectArbitrationOrigin,buildNarrativeContext,inspectNativeEnvironmentInstance,featureDisposition,environmentProposalContract,nativeGmOpportunity,establishNarrativeEntity,worldAuthority,worldIdentityOrigin,currentScene,scenePresence,indexWorldEvent,hash,narrativeSourceVisible,assertEnvironmentAudience,fail}=capabilities||{};
if([inspectArbitrationOrigin,buildNarrativeContext,inspectNativeEnvironmentInstance,featureDisposition,environmentProposalContract,nativeGmOpportunity,establishNarrativeEntity,worldAuthority,worldIdentityOrigin,currentScene,scenePresence,indexWorldEvent,hash,narrativeSourceVisible,assertEnvironmentAudience,fail].some(fn=>typeof fn!=='function'))throw new TypeError('Native environment identity feature capabilities required');
const FEATURE='environment:apartment-veil-breach:door-chain',issuer='native:environment-door-chain';
const keyFor=(origin,scope,environment)=>`environment-door-chain:${hash([origin.source,scope,environment,FEATURE])}`;
function featureFor(profile){
  const d=featureDisposition(FEATURE),f=d.feature;
  if(d.status!=='supported'||f.native_handler!=='environment_door_chain'||f.template_hash!==profile.data.template_hash
    ||environmentProposalContract(f)?.handler!=='environment_door_chain')throw fail('environment_door_chain_feature_not_qualified');
  requireFeatureOperation(f,'ordinary_arrival');return f;
}
function validateDoorChainProposal(feature,profile,input){
  const n=input?.npc;
  if(feature?.feature_key!==FEATURE||feature.status!=='supported'||feature.native_handler!=='environment_door_chain'
    ||feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'||feature.target_policy!=='none'
    ||feature.roll_protocol!=='none'||!Array.isArray(feature.costs)||feature.costs.length!==0
    ||profile?.data?.environment!=='apartment-veil-breach'||profile.data.template_hash!==feature.template_hash
    ||!input||Object.keys(input).sort().join()!=='environment,feature_ref,npc,version'||input.version!==1
    ||input.feature_ref!==FEATURE||input.environment!==profile.record_key
    ||!n||Object.keys(n).sort().join()!=='aliases,key,kind,location_key,name,parent_location_key,role,summary'
    ||n.kind!=='npc'||typeof n.key!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(n.key)||n.key.length>100
    ||typeof n.name!=='string'||!n.name.trim()||n.name.length>160||!Array.isArray(n.aliases)||n.aliases.length>6
    ||n.aliases.some(a=>typeof a!=='string'||!a.trim()||a.length>80)||!featureOperationDescriptor(FEATURE).operation.categories.includes(n.role)
    ||n.location_key!==profile.data.location||n.parent_location_key!==''
    ||typeof n.summary!=='string'||!n.summary.trim()||n.summary.length>600)
    throw fail('environment_door_chain_closed_current_resident');
  return {feature,npc:n};
}
/** The sealed native GM action is the capability; a model-authored name cannot create a free actor elsewhere. */
function applyEnvironmentDoorChain(db,guild,origin,board,input,{content}={}){
  if(board?.kind!=='scene_intent_board'||typeof board.record_key!=='string')throw fail('environment_door_chain_current_native_board');
  const o=inspectArbitrationOrigin(db,guild,origin),stored=db.getCityRecord(guild,board.kind,board.record_key);
  if(hash(stored?.data)!==hash(board.data)||hash(board.data.origin)!==hash(o.binding))
    throw fail('environment_door_chain_current_native_board');
  const profile=inspectNativeEnvironmentInstance(db,guild,input?.environment,o.scope),feature=featureFor(profile),{npc}=validateDoorChainProposal(feature,profile,input),
    opportunity=nativeGmOpportunity(db,guild,board),key=keyFor(o.binding,o.scope,profile.record_key),prior=db.getCityRecord(guild,'native_environment_door_chain',key);
  if(profile.data.location!==o.binding.location||profile.data.scene!==o.binding.scene||profile.data.session!==o.binding.session
    ||!opportunity||opportunity.pre_roll_fear||worldAuthority(db,guild).gm_authority_mode!=='autonomous')
    throw fail('environment_door_chain_current_local_gm_opportunity');
  if(prior){const saved=inspectEnvironmentDoorChain(db,guild,key,o.scope);
    if(saved.data.proposal_hash!==hash(input))throw fail('environment_door_chain_immutable_replay');return saved;}
  if(typeof content?.read!=='function')throw fail('environment_door_chain_packaged_identity_source_required');
  return db.transaction(()=>{
    const frame=buildNarrativeContext(db,guild,o.scope,o.binding.source),identity=establishNarrativeEntity(db,guild,npc,frame,{content}),
      visibility=o.scope.mode==='private'?'character':'party',subject=o.scope.mode==='private'?o.scope.actorCharacterId:null,
      data={version:1,issuer,feature:FEATURE,feature_hash:hash(feature),environment:profile.record_key,environment_hash:hash(profile),
        origin:o.binding,scope:structuredClone(o.scope),proposal:structuredClone(input),proposal_hash:hash(input),identity:identity.record_key,
        identity_source:identity.source_event,identity_hash:hash(identity),npc_key:npc.key,visibility,subject,
        cost:{fear:0,npc_stress:0},authority:'One frightened resident and a source-defined explanation request; no PC response, movement, access outcome, resource or combat result.'},
      mutation=db.recordMutation(guild,{sessionId:o.binding.session,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_environment',
        mutationType:'establish_apartment_door_chain_obstacle',entityKey:key,visibility,after:data}),
      source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_environment_door_chain',source_kind:'mutation',source_id:mutation.id,
        title:'Native source-defined resident obstacle',session_id:o.binding.session,scene:o.binding.scene,location_key:o.binding.location,
        visibility,subject_key:subject,details:{input_source:o.binding.source,payload_hash:hash(data)}},issuer);
    return db.saveCityRecord(guild,{kind:'native_environment_door_chain',key,status:'resolved',source_event:source.event_key,
      visibility,subject_key:subject,location_key:o.binding.location,data});
  });
}
function inspectEnvironmentDoorChain(db,guild,key,scope,{current=true}={}){
  const row=db.getCityRecord(guild,'native_environment_door_chain',key),d=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    mutation=event&&db.getMutation(guild,event.source_id);
  if(row?.status!=='resolved'||d?.version!==1||d.issuer!==issuer||d.feature!==FEATURE||key!==keyFor(d.origin,d.scope,d.environment)
    ||hash(d.proposal)!==d.proposal_hash||d.visibility!==(d.scope.mode==='private'?'character':'party')
    ||d.subject!==(d.scope.mode==='private'?d.scope.actorCharacterId:null)||row.visibility!==d.visibility||(row.subject_key||null)!==d.subject
    ||d.cost?.fear!==0||d.cost?.npc_stress!==0||event?.status!=='active'||event.kind!=='native_environment_door_chain'
    ||event.source_kind!=='mutation'||event.details.input_source!==d.origin.source||event.details.payload_hash!==hash(d)
    ||event.session_id!==d.origin.session||event.scene!==d.origin.scene||event.location_key!==d.origin.location
    ||mutation?.actor_type!=='ai_gm'||mutation.actor_id!==issuer||mutation.source_layer!=='native_environment'
    ||mutation.mutation_type!=='establish_apartment_door_chain_obstacle'||mutation.entity_key!==key
    ||hash(JSON.parse(mutation.after_json))!==hash(d))throw fail('environment_door_chain_saved_native_ancestry');
  assertEnvironmentAudience(db,guild,d.scope,scope,d.origin,{current});
  const feature=featureFor(inspectNativeEnvironmentInstance(db,guild,d.environment,d.scope,{historical:!current})),
    identity=db.getCityRecord(guild,'autonomous_entity',d.identity),authored=identity&&worldIdentityOrigin(db,guild,identity,scope),
    npc=db.getSimulationEntity(guild,'npc',d.npc_key),presence=scenePresence(db,guild,'npc',d.npc_key);
  if(hash(feature)!==d.feature_hash||hash(identity)!==d.identity_hash||identity?.source_event!==d.identity_source
    ||identity?.data.key!==d.npc_key||identity?.data.kind!=='npc'||!authored||!npc||npc.state.location_key!==d.origin.location
    ||presence?.data.state!=='actually_present'||presence.data.scene!==d.origin.scene||presence.location_key!==d.origin.location
    ||db.getWorldEvent(guild,presence.source_event)?.status!=='active'||!narrativeSourceVisible(db,guild,row.source_event,scope))
    throw fail('environment_door_chain_resident_identity_or_presence');
  if(current){const scene=currentScene(db,guild);
    if(scene.key!==d.origin.scene||scene.session_id!==d.origin.session||profileLocation(db,guild,d.environment,d.scope)!==d.origin.location)
      throw fail('environment_door_chain_current_scene_changed');}
  return row;
}
function profileLocation(db,guild,key,scope){return inspectNativeEnvironmentInstance(db,guild,key,scope).data.location;}
function environmentDoorChainProjection(db,guild,key,scope){
  const row=inspectEnvironmentDoorChain(db,guild,key,scope,{current:true});
  return {text:'A frightened resident holds a chain across the most direct path and asks for a believable explanation. Your answer, refusal, or another route remains yours.',
    identity:row.data.identity,source:db.getWorldEvent(guild,row.source_event),revision:hash(row)};
}
function nativeEnvironmentDoorChainSituation(db,guild,scope,location){
  const scene=currentScene(db,guild),out=[];
  for(const row of db.listCityRecords(guild,{kind:'native_environment_door_chain',includeGM:true,limit:100})){
    if(row.data.origin?.scene!==scene.key||row.data.origin.location!==location)continue;
    try{const view=environmentDoorChainProjection(db,guild,row.record_key,scope);
      out.push({receipt_kind:row.kind,receipt_ref:row.record_key,source_ref:view.source.event_key,text:view.text,
        authority:'Current resident and obstacle only; no PC response, movement or resolved access.'});}
    catch(error){if(!['GM_ARBITRATION','SCENE_FICTION','STATE_CONFLICT'].includes(error.code))throw error;}
    if(out.length===6)break;
  }
  return out;
}

return Object.freeze({validateDoorChainProposal,applyEnvironmentDoorChain,inspectEnvironmentDoorChain,environmentDoorChainProjection,nativeEnvironmentDoorChainSituation});
}
