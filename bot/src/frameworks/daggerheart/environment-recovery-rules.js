/** Native emergency cleanup follows an already resolved, exact owner action. */
export function createEnvironmentRecoveryRules({capabilities}){
const {inspectEnvironmentSceneEffect,ordinaryActionProof,ordinaryPrerequisite,captureCountdownActionAncestry,inspectCountdownActionAncestry,recordScenePresence,scenePresence,hash,indexWorldEvent,fail}=capabilities||{};
if([inspectEnvironmentSceneEffect,ordinaryActionProof,ordinaryPrerequisite,captureCountdownActionAncestry,inspectCountdownActionAncestry,recordScenePresence,scenePresence,hash,indexWorldEvent,fail].some(fn=>typeof fn!=='function'))throw new TypeError('Native emergency recovery capabilities required');
const issuer='native:environment-recovery',kind='native_environment_resolution';
const text='Your source-verified action resolved this local emergency. No character resources, decisions or other consequences changed.';
function resolveNativeEnvironmentEvent(db,guild,input,scope){
  if(!input||Object.keys(input).sort().join()!=='accepted_intent,effect,prerequisite'
    ||Object.values(input).some(v=>typeof v!=='string'||!v||v.length>200))throw fail('environment_recovery_closed_owner_action');
  return db.transaction(()=>{
    const proof=ordinaryActionProof(db,guild,input.accepted_intent,scope),action=proof.row,
      outcome=ordinaryPrerequisite(db,guild,{prerequisite_ref:input.prerequisite},proof).receipt,
      original=inspectEnvironmentSceneEffect(db,guild,input.effect,scope),d=original.data,key=`environment-resolution:${hash(input.effect)}`,
      prior=db.getCityRecord(guild,kind,key);
    if(action.data.type!=='interact'||action.data.operation!=='resolve_environment_event'||action.data.target_key!==original.record_key
      ||!['medical_emergency','service_emergency'].includes(d.effect.kind)||!['success','resolved_no_roll'].includes(outcome.data.outcome)
      ||proof.pc.data.location!==d.origin.location||proof.scene.key!==d.origin.scene)throw fail('environment_recovery_actual_target_success_required');
    if(prior){
      const row=inspectNativeEnvironmentResolution(db,guild,key,{mode:'private',actorUserId:proof.principal.user,actorCharacterId:proof.pc.id});
      if(row.data.action!==action.record_key||row.data.prerequisite!==outcome.record_key)throw fail('environment_recovery_already_resolved');return row;
    }
    const presence=scenePresence(db,guild,'hazard',d.presence_snapshot.data.entity_key);
    if(presence?.source_event!==d.declaration||presence.data.state!=='actually_present')throw fail('environment_recovery_current_hazard_required');
    const ancestry=captureCountdownActionAncestry(db,guild,action.record_key,scope),scopeSnapshot={mode:'private',actorUserId:proof.pc.owner_user_id,actorCharacterId:proof.pc.id},
      terms={version:1,issuer,effect:original.record_key,effect_hash:hash(original),effect_scope:d.scope,action:action.record_key,
        prerequisite:outcome.record_key,owner:proof.principal.user,character:proof.pc.id,principal:proof.principal.revision,
        scope:scopeSnapshot,session:proof.scene.session_id,scene:proof.scene.key,location:proof.pc.data.location,ancestry,
        before:presence},
      declaration=indexWorldEvent(db,guild,{key:`${key}:declaration`,kind:'native_environment_recovery_declaration',source_id:issuer,
        title:'Native environmental emergency resolved after owner outcome',session_id:terms.session,scene:terms.scene,location_key:terms.location,
        visibility:'character',subject_key:terms.character,details:{input_source:action.source_event,source_refs:[original.source_event],payload_hash:hash(terms)}},issuer),
      after=recordScenePresence(db,guild,{entity_type:'hazard',entity_key:presence.data.entity_key,location_key:terms.location,
        zone:presence.data.zone,state:'departed',visibility:'character',subject_key:terms.character,source_event:declaration.event_key},issuer),
      data={...terms,declaration:declaration.event_key,declaration_hash:hash(declaration),after},
      mutation=db.recordMutation(guild,{sessionId:terms.session,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_environment',
        mutationType:'resolve_native_emergency_after_owner_outcome',entityKey:key,visibility:'character',before:presence,after:data}),
      source=indexWorldEvent(db,guild,{key:`${key}:source`,kind,source_kind:'mutation',source_id:mutation.id,title:'Native emergency resolution receipt',
        session_id:terms.session,scene:terms.scene,location_key:terms.location,visibility:'character',subject_key:terms.character,
        details:{input_source:declaration.event_key,payload_hash:hash(data)}},issuer);
    return db.saveCityRecord(guild,{kind,key,status:'resolved',source_event:source.event_key,visibility:'character',subject_key:terms.character,
      location_key:terms.location,data});
  });
}
/** Immutable ancestry read, not permission to resolve a second event or restore an old hazard. */
function inspectNativeEnvironmentResolution(db,guild,key,scope){
  const row=db.getCityRecord(guild,kind,key),d=row?.data,e=row&&db.getWorldEvent(guild,row.source_event),m=e&&db.getMutation(guild,e.source_id);
  if(row?.status!=='resolved'||row.visibility!=='character'||d?.version!==1||d.issuer!==issuer||row.subject_key!==d.character
    ||scope.mode!=='private'||scope.actorUserId!==d.owner||scope.actorCharacterId!==d.character
    ||db.getCharacter(d.character)?.owner_user_id!==d.owner||key!==`environment-resolution:${hash(d.effect)}`
    ||e?.status!=='active'||e.kind!==kind||e.source_kind!=='mutation'||e.visibility!=='character'||e.subject_key!==d.character
    ||e.details.payload_hash!==hash(d)||e.details.input_source!==d.declaration
    ||m?.actor_type!=='ai_gm'||m.actor_id!==issuer||m.source_layer!=='native_environment'
    ||m.mutation_type!=='resolve_native_emergency_after_owner_outcome'||m.entity_key!==key
    ||hash(JSON.parse(m.before_json))!==hash(d.before)||hash(JSON.parse(m.after_json))!==hash(d))throw fail('environment_recovery_saved_native_receipt');
  const original=inspectEnvironmentSceneEffect(db,guild,d.effect,d.effect_scope),ancestry=inspectCountdownActionAncestry(db,guild,d.ancestry),
    declaration=db.getWorldEvent(guild,d.declaration),{declaration:ignored,declaration_hash:ignoredHash,after:ignoredAfter,...terms}=d;
  if(hash(original)!==d.effect_hash||ancestry.action.record_key!==d.action||ancestry.receipt.record_key!==d.prerequisite
    ||ancestry.owner!==d.owner||ancestry.character!==d.character||ancestry.scene!==d.scene||ancestry.location!==d.location
    ||ancestry.action.data.operation!=='resolve_environment_event'||ancestry.action.data.target_key!==d.effect
    ||!['success','resolved_no_roll'].includes(ancestry.receipt.data.outcome)||d.before.source_event!==original.data.declaration
    ||d.before.data.entity_type!=='hazard'||d.before.data.state!=='actually_present'||d.after.data.state!=='departed'
    ||d.after.data.entity_key!==d.before.data.entity_key||d.after.source_event!==d.declaration||d.after.location_key!==d.location
    ||declaration?.status!=='active'||hash(declaration)!==d.declaration_hash||declaration.source_id!==issuer
    ||declaration.kind!=='native_environment_recovery_declaration'||declaration.details.input_source!==ancestry.action.source_event
    ||declaration.details.payload_hash!==hash(terms)||hash(declaration.details.source_refs)!==hash([original.source_event]))
    throw fail('environment_recovery_original_effect_or_owner_outcome_changed');
  return row;
}
function environmentResolutionText(){return text;}

return Object.freeze({resolveNativeEnvironmentEvent,inspectNativeEnvironmentResolution,environmentResolutionText});
}
