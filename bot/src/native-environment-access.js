/** VIP Threshold: admission is separate from movement, ownership and all other entry restrictions. */
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {ordinaryActionProof,ordinaryPrerequisite} from './ordinary-effect-proof.js';
import {captureCountdownActionAncestry,inspectCountdownActionAncestry} from './native-environment-countdown.js';
import {nativeEstablishedFact} from './native-established-fact.js';
import {conversationPrincipal} from './conversation-principal.js';
import {currentScene} from './scene-continuity.js';
import {stateRevision} from './ai-intents.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {indexWorldEvent} from './city-calendar.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
const FEATURE='environment:haunted-nightclub:vip-threshold',issuer='native:environment-access';
const kind='native_environment_admission';
function rule(profile){
  const d=featureDisposition(FEATURE);
  if(d.status!=='supported'||d.feature.native_handler!=='nightclub_vip_threshold'||d.feature.template_hash!==profile.data.template_hash)
    throw fail('environment_access_feature_not_qualified');
  return d.feature;
}
function credential(db,guild,id,scope,character,destination,method){
  const established=nativeEstablishedFact(db,guild,id,scope),f=established.fact;
  let provenance;try{provenance=JSON.parse(f?.provenance_json||'{}');}catch{throw fail('environment_access_invalid_credential');}
  const grant=provenance.access_grant;
  if(!['invitation','status','leverage'].includes(method)||!grant||Object.keys(grant).sort().join()!=='character,destination,method'
    ||grant.character!==character||grant.destination!==destination||grant.method!==method)
    throw fail('environment_access_exact_established_credential_required');
  return established;
}
function layout(db,guild,profile,destination){
  const row=db.getSimulationEntity(guild,'location',destination);
  if(!row||row.state?.parent_location_key!==profile.data.location||row.state.access!=='private')
    throw fail('environment_access_actual_local_private_floor_required');
  return row;
}
/** Explicit owner proposal; AI selection cannot mint a credential or a successful deception. */
export function establishEnvironmentAdmission(db,guild,input,scope){
  if(!input||Object.keys(input).sort().join()!=='accepted_intent,credential,destination,environment,method,prerequisite'
    ||Object.values(input).some(v=>typeof v!=='string'||v.length>200)||!['invitation','status','leverage','deception'].includes(input.method))
    throw fail('environment_access_closed_admission');
  return db.transaction(()=>{
    const profile=inspectNativeEnvironmentInstance(db,guild,input.environment,scope),feature=rule(profile),
      principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId),pc=db.getCharacter(scope.actorCharacterId),
      destination=layout(db,guild,profile,input.destination);
    if(principal.kind!=='owner'||pc.data.location!==profile.data.location)throw fail('environment_access_local_current_owner');
    let evidence,ancestry=null;
    if(input.method==='deception'){
      if(input.credential)throw fail('environment_access_no_deception_credential_substitution');
      const proof=ordinaryActionProof(db,guild,input.accepted_intent,scope),action=proof.row,
        result=ordinaryPrerequisite(db,guild,{prerequisite_ref:input.prerequisite},proof).receipt;
      if(action.data.operation!=='deceive_vip_entry'||action.data.type!=='interact'||action.data.target_key!==input.destination
        ||!['success','resolved_no_roll'].includes(result.data.outcome))throw fail('environment_access_actual_deception_outcome_required');
      ancestry=captureCountdownActionAncestry(db,guild,action.record_key,scope);evidence={action:action.record_key,result:result.record_key};
    }else{
      if(input.accepted_intent||input.prerequisite)throw fail('environment_access_no_credential_action_substitution');
      evidence=credential(db,guild,input.credential,scope,pc.id,input.destination,input.method);
    }
    const data={version:1,issuer,feature:FEATURE,feature_hash:hash(feature),environment:profile.record_key,environment_hash:hash(profile),
      scope:structuredClone(scope),session:profile.data.session,scene:profile.data.scene,location:profile.data.location,
      character:pc.id,owner:pc.owner_user_id,principal:principal.revision,destination:input.destination,destination_revision:stateRevision(destination),
      input:structuredClone(input),evidence,ancestry,
      authority:'Admission only. No arrival, PC choice, resources, ownership, custody, locked-door bypass or encounter permission.'};
    const key=`environment-admission:${hash([data.environment,data.character,data.destination,data.input])}`,
      prior=db.getCityRecord(guild,kind,key);
    if(prior)return inspectEnvironmentAdmission(db,guild,key,scope,{current:true});
    const mutation=db.recordMutation(guild,{sessionId:data.session,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_environment',
      mutationType:'vip_admission',entityKey:key,visibility:'gm',after:data});
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind,source_kind:'mutation',source_id:mutation.id,
      title:'Native source-backed VIP admission',session_id:data.session,scene:data.scene,location_key:data.location,
      visibility:'gm',details:{payload_hash:hash(data)}},issuer);
    return db.saveCityRecord(guild,{kind,key,status:'resolved',visibility:'gm',source_event:source.event_key,location_key:data.location,data});
  });
}
export function inspectEnvironmentAdmission(db,guild,key,scope,{current=false}={}){
  const row=db.getCityRecord(guild,kind,key),d=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    mutation=event&&db.getMutation(guild,event.source_id),pc=d&&db.getCharacter(d.character);
  if(row?.status!=='resolved'||row.visibility!=='gm'||d?.version!==1||d.issuer!==issuer||hash(d.scope)!==hash(scope)
    ||key!==`environment-admission:${hash([d.environment,d.character,d.destination,d.input])}`||event?.status!=='active'
    ||event.kind!==kind||event.source_kind!=='mutation'||event.visibility!=='gm'||event.details.payload_hash!==hash(d)
    ||event.session_id!==d.session||event.scene!==d.scene||event.location_key!==d.location
    ||mutation?.actor_type!=='ai_gm'||mutation.actor_id!==issuer||mutation.source_layer!=='native_environment'
    ||mutation.mutation_type!=='vip_admission'||mutation.entity_key!==key||mutation.visibility!=='gm'||mutation.session_id!==d.session
    ||hash(JSON.parse(mutation.after_json))!==hash(d)
    ||pc?.owner_user_id!==d.owner||scope.actorUserId!==d.owner||scope.actorCharacterId!==d.character)
    throw fail('environment_access_native_receipt_required');
  const profile=inspectNativeEnvironmentInstance(db,guild,d.environment,scope,{historical:!current}),feature=rule(profile);
  if(hash(profile)!==d.environment_hash||hash(feature)!==d.feature_hash)throw fail('environment_access_original_environment_changed');
  if(d.ancestry){
    const saved=inspectCountdownActionAncestry(db,guild,d.ancestry);
    if(saved.action.record_key!==d.evidence.action||saved.receipt.record_key!==d.evidence.result)
      throw fail('environment_access_original_deception_changed');
  }else if(hash(credential(db,guild,d.input.credential,scope,d.character,d.destination,d.input.method))!==hash(d.evidence))
    throw fail('environment_access_credential_changed');
  if(current){
    const scene=currentScene(db,guild),principal=conversationPrincipal(db,guild,d.owner,d.character);
    if(principal.kind!=='owner'||principal.revision!==d.principal||scene.key!==d.scene||scene.session_id!==d.session
      ||pc.data.location!==d.location||stateRevision(layout(db,guild,profile,d.destination))!==d.destination_revision)
      throw fail('environment_access_current_scope_changed');
  }
  return row;
}
/** Read-only consumer. Never clears another restriction or moves a character. */
export function nativeVipAdmission(db,guild,pc,destination){
  const scene=currentScene(db,guild),rows=db.db.prepare("SELECT record_key FROM city_records WHERE guild_id=? AND kind=? AND json_extract(data_json,'$.character')=? AND json_extract(data_json,'$.destination')=? AND json_extract(data_json,'$.scene')=? AND json_extract(data_json,'$.session')=? ORDER BY rowid DESC LIMIT 100")
    .all(guild,kind,pc.id,destination,scene.key,scene.session_id).map(r=>db.getCityRecord(guild,kind,r.record_key));
  for(const row of rows){
    const d=row.data;
    if(d?.character!==pc.id||d.destination!==destination||d.scene!==scene.key||d.session!==scene.session_id)continue;
    try{return inspectEnvironmentAdmission(db,guild,row.record_key,d.scope,{current:true});}catch(error){
      if(error.code!=='GM_ARBITRATION')throw error;
    }
  }
  return null;
}
