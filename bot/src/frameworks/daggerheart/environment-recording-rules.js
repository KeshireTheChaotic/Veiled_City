/** Native exact owner recording/upload choice, artifact proof and saved ancestry; no recipient knowledge or PC effect. */
export function createEnvironmentRecordingRules({capabilities}){
const {ordinaryActionProof,ordinaryPrerequisite,captureCountdownActionAncestry,inspectCountdownActionAncestry,scenePresence,sceneAccess,currentScene,hash,narrativeSourceVisible,indexWorldEvent,fail}=capabilities||{};
if([ordinaryActionProof,ordinaryPrerequisite,captureCountdownActionAncestry,inspectCountdownActionAncestry,scenePresence,sceneAccess,currentScene,hash,narrativeSourceVisible,indexWorldEvent,fail].some(fn=>typeof fn!=='function'))throw new TypeError('Native recording capabilities required');
const issuer='native:environment-recording',kind='native_environment_recording';
const fields='accepted_intent,destination,device,op,prerequisite,target';
/** Only a command adapter supplies authenticated identity and interaction text.
 * Recording capability is explicit structured inventory data, never inferred from a device name.
 * Only non-PC scene subjects are supported; this cannot record private PC behavior or force disclosure.
 */
function createNativeEnvironmentRecording(db,guild,user,input,{interactionId,authoredText}={}){
  if(!input||Object.keys(input).sort().join()!==fields||input.op!=='recording-upload'||!interactionId
    ||typeof authoredText!=='string'||hash(JSON.parse(authoredText))!==hash(input)
    ||Object.values(input).some(v=>typeof v!=='string'||!v||v.length>200))throw fail('environment_recording_authenticated_closed_owner_choice');
  return db.transaction(()=>{
    const action=db.getCityRecord(guild,'typed_intent',input.accepted_intent),pc=action&&db.getCharacter(action.data.actor),
      scope={mode:action?.visibility==='character'?'private':'party',actorUserId:user,actorCharacterId:pc?.id},
      proof=ordinaryActionProof(db,guild,input.accepted_intent,scope),outcome=ordinaryPrerequisite(db,guild,{prerequisite_ref:input.prerequisite},proof).receipt,
      key=`environment-recording:${hash(input.accepted_intent)}`,prior=db.getCityRecord(guild,kind,key);
    if(proof.principal.user!==user||proof.row.data.type!=='interact'||proof.row.data.operation!=='record_video'
      ||!['success','resolved_no_roll'].includes(outcome.data.outcome))throw fail('environment_recording_actual_owner_recording_outcome');
    if(prior){const row=inspectNativeEnvironmentRecording(db,guild,key,user);
      if(hash(row.data.input)!==hash(input))throw fail('environment_recording_immutable_owner_choice');return row;}
    const flags=db.getCityCalendar(guild).flags;
    if(flags.gm_discretion!==true||flags.narrative_authority!==true||flags.authoring!==true
      ||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual')
      throw fail('environment_recording_current_native_authoring_disabled');
    const device=pc.data.inventory?.find(i=>i&&typeof i==='object'&&i.id===input.device),mapping=device?.recording,
      presence=db.getCityRecord(guild,'scene_presence',input.target),s=presence&&db.getWorldEvent(guild,presence.source_event),
      destination=db.getSimulationEntity(guild,'location',input.destination),scene=currentScene(db,guild);
    if(device?.equipped!==true||device.category!=='electronic_device'||device.disabled_by||mapping?.video!==true||mapping.upload!==true
      ||presence?.status!=='active'||presence.data.state!=='actually_present'||presence.data.entity_type==='character'
      ||!['npc','evidence','hazard','entrance','barrier'].includes(presence.data.entity_type)
      ||presence.data.scene!==scene.key||presence.location_key!==proof.pc.data.location||proof.row.data.target_key!==presence.data.entity_key
      ||s?.status!=='active'||!narrativeSourceVisible(db,guild,presence.source_event,scope)
      ||!sceneAccess(db,guild,{observer_type:'character',observer_key:pc.id,target_type:presence.data.entity_type,target_key:presence.data.entity_key,sense:'sight'})
      ||!destination||destination.state.removed===true||input.destination===proof.pc.data.location
      ||!['public','party'].includes(destination.state.visibility||'party'))throw fail('environment_recording_real_device_visible_nonpc_target_and_existing_route');
    const ancestry=captureCountdownActionAncestry(db,guild,proof.row.record_key,scope),registrationSource=`${key}:upload-source`,
      handout=db.createHandout(guild,{sessionId:scene.session_id,title:'Owner-recorded local video',kind:'video',authority:'documentary',
        visibility:'character',subjectCharacterId:pc.id,locationKey:proof.pc.data.location,source:issuer,
        content:'A source-bound recording of the accessible non-PC scene subject. It does not establish hidden facts, private knowledge or character reactions.',
        canonicalFacts:[],metadata:{recording:{clarity:'clear',upload:'pending',destination:input.destination,source_event:registrationSource},
          native_recording:{receipt:key,source_subject:presence.record_key,subject_source:presence.source_event,observation:'visible_subject_only'}}}),
      creationMutation=db.recordMutation(guild,{sessionId:scene.session_id,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_environment',
        sourceInteractionId:interactionId,mutationType:'handout',entityKey:handout.id,visibility:'character',after:handout}),
      creation=indexWorldEvent(db,guild,{key:`${key}:artifact`,kind:'handout',source_kind:'mutation',source_id:creationMutation.id,
        title:'Native owner-recorded video artifact',session_id:scene.session_id,scene:scene.key,location_key:proof.pc.data.location,
        visibility:'character',subject_key:pc.id,details:{input_source:proof.row.source_event,payload_hash:hash(handout),owner:user,
          accepted_intent:proof.row.record_key,prerequisite:outcome.record_key}},issuer),
      data={version:1,issuer,input:structuredClone(input),input_hash:hash(input),interaction:interactionId,authored_text:authoredText,
        owner:user,character:pc.id,scope,session:scene.session_id,scene:scene.key,location:proof.pc.data.location,ancestry,
        device:structuredClone(device),subject:presence,subject_source:s,handout,creation:creation.event_key,creation_hash:hash(creation),
        destination,knowledge_authorized:false,pc_effect_authorized:false},
      mutation=db.recordMutation(guild,{sessionId:scene.session_id,actorType:'player',actorId:user,sourceLayer:'native_environment',
        sourceInteractionId:interactionId,mutationType:'record_video_and_choose_upload',entityKey:key,visibility:'character',after:data}),
      source=indexWorldEvent(db,guild,{key:`${key}:source`,kind,source_kind:'mutation',source_id:mutation.id,title:'Owner-authenticated recording/upload choice',
        session_id:scene.session_id,scene:scene.key,location_key:proof.pc.data.location,visibility:'character',subject_key:pc.id,
        details:{input_source:proof.row.source_event,payload_hash:hash(data),author:user,authored_text:authoredText,handout_id:handout.id}},user);
    return db.saveCityRecord(guild,{kind,key,status:'resolved',visibility:'character',subject_key:pc.id,source_event:source.event_key,
      location_key:proof.pc.data.location,data});
  });
}
/** Saved readback cannot create footage, upload again or assign any recipient knowledge. */
function inspectNativeEnvironmentRecording(db,guild,key,user){
  const row=db.getCityRecord(guild,kind,key),d=row?.data,e=row&&db.getWorldEvent(guild,row.source_event),m=e&&db.getMutation(guild,e.source_id),
    creation=d&&db.getWorldEvent(guild,d.creation),cm=creation&&db.getMutation(guild,creation.source_id);
  if(row?.status!=='resolved'||row.visibility!=='character'||d?.version!==1||d.issuer!==issuer||d.owner!==user||row.subject_key!==d.character
    ||db.getCharacter(d.character)?.owner_user_id!==user||key!==`environment-recording:${hash(d.input?.accepted_intent)}`
    ||d.input_hash!==hash(d.input)||hash(JSON.parse(d.authored_text))!==hash(d.input)||d.input.op!=='recording-upload'
    ||e?.status!=='active'||e.kind!==kind||e.source_kind!=='mutation'||e.subject_key!==d.character||e.visibility!=='character'
    ||e.details.payload_hash!==hash(d)||e.details.authored_text!==d.authored_text||e.details.author!==user
    ||!db.ownerAuthoredSource(guild,e.event_key,user)||m?.actor_type!=='player'||m.actor_id!==user||m.source_layer!=='native_environment'
    ||m.mutation_type!=='record_video_and_choose_upload'||m.source_interaction_id!==d.interaction||m.entity_key!==key
    ||hash(JSON.parse(m.after_json))!==hash(d)||creation?.status!=='active'||hash(creation)!==d.creation_hash||creation.kind!=='handout'
    ||cm?.actor_type!=='ai_gm'||cm.actor_id!==issuer||cm.mutation_type!=='handout'||cm.entity_key!==d.handout.id
    ||hash(JSON.parse(cm.after_json))!==hash(d.handout)||creation.details.payload_hash!==hash(d.handout)
    ||d.knowledge_authorized!==false||d.pc_effect_authorized!==false)throw fail('environment_recording_saved_owner_artifact_ancestry');
  const ancestry=inspectCountdownActionAncestry(db,guild,d.ancestry);
  if(ancestry.action.record_key!==d.input.accepted_intent||ancestry.action.data.operation!=='record_video'||ancestry.owner!==user
    ||ancestry.character!==d.character||ancestry.receipt.record_key!==d.input.prerequisite||!['success','resolved_no_roll'].includes(ancestry.receipt.data.outcome)
    ||d.subject.data.entity_type==='character'||d.subject.record_key!==d.input.target||d.subject.data.entity_key!==ancestry.action.data.target_key
    ||hash(db.getWorldEvent(guild,d.subject.source_event))!==hash(d.subject_source)||d.device.id!==d.input.device
    ||d.device.recording?.video!==true||d.device.recording.upload!==true||d.handout.metadata.native_recording.receipt!==key)
    throw fail('environment_recording_original_native_cause_changed');
  return row;
}

return Object.freeze({createNativeEnvironmentRecording,inspectNativeEnvironmentRecording});
}
