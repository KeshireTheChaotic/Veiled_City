import {hash,narrativeSourceVisible,currentScene,conversationPrincipal,worldSimulationReceiptForAudience,renderNarrativeUnit,inspectNativeEncounterCandidate,audience,nativeDirectorBridge,nativeCameraNarrativeOrigin} from './source-context.js';
import {nativeFearClockEffect} from './fear-clock-signals.js';
import {revalidateWorldNarrativeSignal} from './signals.js';
/** Audience-bound Director beat metadata only; never a message, knowledge, consent or native outcome. */
export function worldDirectorBridgeBeats(db,guild,source,scope){
  if(!nativeDirectorBridge(db,guild,source,scope))return null;
  const beats=[];let held=0,omitted=0;
  const scene=currentScene(db,guild);
  // Only project scene observations that were already established by the native
  // audience-bound narrative authority. Re-render with the original binding
  // scope on every read; the Director snapshot is a selector, not proof.
  for(const proof of source.details.dramatic_brief?.events||[]){
    if(proof.kind!=='native_narrative_unit')continue;
    const event=db.getWorldEvent(guild,proof.ref),unitKey=typeof proof.ref==='string'&&proof.ref.endsWith(':source')
      ?proof.ref.slice(0,-':source'.length):null,row=unitKey&&db.getCityRecord(guild,'narrative_unit',unitKey);
    if(!event||event.status!=='active'||event.kind!=='native_narrative_unit'||event.source_id!=='native:narrative-authority'
      ||hash(event)!==proof.revision||event.session_id!==scene.session_id||event.scene!==scene.key
      ||!narrativeSourceVisible(db,guild,event.event_key,scope)||!row||row.record_key!==unitKey||row.status!=='accepted_established'
      ||row.source_event!==event.event_key){held++;continue;}
    const data=row.data,binding=data?.binding,origin=binding?.source&&db.getWorldEvent(guild,binding.source),pc=binding?.scope?.actorCharacterId
      &&db.getCharacter(binding.scope.actorCharacterId);
    const privateAudience=scope.mode==='private',privateBinding=binding?.scope?.mode==='private',audienceValid=privateAudience===privateBinding
      &&(privateAudience?row.visibility==='character'&&row.subject_key===scope.actorCharacterId&&event.visibility==='character'
        &&event.subject_key===scope.actorCharacterId&&origin?.visibility==='character'&&origin?.subject_key===scope.actorCharacterId
        &&binding.scope.actorCharacterId===scope.actorCharacterId&&binding.scope.actorUserId===scope.actorUserId
        :row.visibility==='party'&&row.subject_key==null&&event.visibility==='party'&&(event.subject_key==null||event.subject_key==='')
          &&origin?.visibility==='party'&&(origin?.subject_key==null||origin?.subject_key===''));
    const humanOrigin=origin?.kind==='ai_gm_input',nativeCameraOrigin=nativeCameraNarrativeOrigin(db,guild,origin,binding,scope,scene),
      originValid=humanOrigin?origin?.status==='active'&&origin.session_id===scene.session_id&&origin.scene===scene.key
        &&origin.details?.author===binding?.scope?.actorUserId&&origin.details?.character_id===binding?.scope?.actorCharacterId
        &&origin.details?.private_scene===privateBinding&&db.ownerAuthoredSource(guild,origin.event_key,origin.details.author)
        :nativeCameraOrigin,
      viewpointValid=humanOrigin?binding?.viewpoint==='character'&&!!binding.placement
        :nativeCameraOrigin&&binding?.viewpoint==='camera'&&binding.placement==null;
    const unitKind=data?.unit?.kind,unitEpistemic=data?.epistemic??data?.unit?.epistemic,
      sceneUnit=unitKind==='scene'&&unitEpistemic==='observation',speechUnit=unitKind==='npc_speech'&&!!data.unit.subject_key,
      attemptUnit=unitKind==='npc_action_attempt'&&unitEpistemic==='attempt'&&!!data.unit.subject_key,
      leadUnit=unitKind==='lead';
    if(!origin||!audienceValid||data?.issuer!=='native:narrative-authority'||data?.unit?.visibility!==row.visibility
      ||!sceneUnit&&!speechUnit&&!attemptUnit&&!leadUnit||event.details?.payload_hash!==hash(data)
      ||event.details?.epistemic!==unitEpistemic||event.details?.input_source!==binding?.source
      ||binding.session!==scene.session_id||binding.scene!==scene.key||binding.location!==event.location_key
      ||!viewpointValid||!originValid
      ||humanOrigin&&(pc?.guild_id!==guild||pc.owner_user_id!==binding.scope.actorUserId)
      ||!narrativeSourceVisible(db,guild,origin.event_key,scope)) {held++;continue;}
    if(humanOrigin){
      let principal;try{principal=conversationPrincipal(db,guild,pc.owner_user_id,pc.id);}
      catch(error){if(['Active session required.','Select an authenticated current controlled role.','Controller attendance required.','Active campaign character required.'].includes(error.message)){held++;continue;}throw error;}
      if(principal.kind!=='owner'||principal.revision!==origin.details.revision||principal.character_id!==pc.id){held++;continue;}
    }
    let visibleText;
    try{
      // Rebuilding a native assembly writer context here would recursively ask
      // assemblyInputs for these same opportunities. The accepted row is bound
      // by the source event payload hash above, so use its immutable rendered
      // projection for native camera scopes; player-origin rows still revalidate
      // through the original owner/placement-aware renderer on every read.
      visibleText=nativeCameraOrigin?data.text:renderNarrativeUnit(db,guild,row.record_key,binding.scope);
    }catch(error){if(['SCENE_FICTION','NARRATIVE_PVP'].includes(error.code)){held++;continue;}throw error;}
    if(typeof visibleText!=='string'||!visibleText.trim()){held++;continue;}
    if(beats.length>=4){omitted++;continue;}
    const root=origin.event_key,cycle=`world-cycle:${hash([scene.session_id,scene.key,root])}`;
    beats.push({version:1,protocol:'world_beat_v1',id:`world-beat:${hash([source.event_key,event.event_key,scope.mode])}`,
      kind:sceneUnit?'established_world_change':leadUnit?'scene_opportunity':'npc_intention_or_offer',
      source_ref:source.event_key,signal_ref:event.event_key,causation_ref:root,world_cycle_ref:cycle,
      audience:audience(scope),depth:1,origin_kind:'director',epistemic:sceneUnit?'observation':attemptUnit?'attempt':'testimony',
      fictional_scope:sceneUnit?'nonmechanical_established_scene':attemptUnit?'npc_attempt_not_completed_effect':leadUnit?'nonbinding_scene_opportunity':'attributed_npc_dialogue_not_objective_truth',
      location:event.location_key||'',reason:sceneUnit?'native_established_scene_unit':leadUnit?'native_scene_lead':attemptUnit?'native_npc_attempt':'native_attributed_npc_speech',
      visible_text:visibleText,
      execution_authority:false,publication_authority:false});
  }
  const consequences=source.details.dramatic_brief?.native_clock_consequences;
  if(consequences){
    if(consequences.version!==1||!Array.isArray(consequences.receipts)||consequences.receipts.length>4)held++;
    else for(const [index,proof] of consequences.receipts.entries()){
      const current=currentScene(db,guild),validated=nativeFearClockEffect(db,guild,proof.key,scope,current),event=validated?.source;
      if(!validated||proof.kind!=='pvp_fear_effect_receipt'||hash(validated.row)!==proof.revision
        ||event.event_key!==proof.source_event||hash(event)!==proof.source_revision||proof.session!==current.session_id
        ||proof.scene!==current.key||hash(proof.audience)!==hash(audience(scope))
        ||proof.causation_ref!==validated.causation
        ||scope.mode==='private'&&proof.principal_revision!==validated.principalRevision
        ||!narrativeSourceVisible(db,guild,proof.causation_ref,scope)){held++;continue;}
      if(beats.length>=4){omitted++;continue;}
      const root=proof.causation_ref,cycle=`world-cycle:${hash([current.session_id,current.key,root])}`;
      beats.push({version:1,protocol:'world_beat_v1',id:`world-beat:${hash([source.event_key,proof.key,proof.audience])}`,
        kind:'world_consequence',source_ref:source.event_key,signal_ref:proof.key,effect_ref:proof.key,source_event_ref:event.event_key,
        causation_ref:root,world_cycle_ref:cycle,audience:proof.audience,depth:1,origin_kind:'native_consequence',
        consequence:'committed_native_clock_change',location:event.location_key||'',reason:'validated_native_fear_clock_receipt',
        execution_authority:false,publication_authority:false});
    }
  }
  const observations=source.details.dramatic_brief?.native_world_observations;
  if(observations){
    if(observations.version!==1||!Array.isArray(observations.receipts)||observations.receipts.length>4)held++;
    else for(const proof of observations.receipts){
      const verified=worldSimulationReceiptForAudience(db,guild,proof.action,scope,{sourceRef:proof.key});
      if(proof.kind!=='world_simulation_observation'||verified.status!=='verified_native_observation'
        ||hash(verified)!==proof.revision||verified.observation_ref!==proof.observation_ref){held++;continue;}
      if(beats.length>=4){omitted++;continue;}
      const root=verified.observation_ref;
      beats.push({version:1,protocol:'world_beat_v1',id:`world-beat:${hash([source.event_key,root,audience(scope)])}`,
        kind:'world_consequence',source_ref:source.event_key,signal_ref:proof.key,effect_ref:proof.key,source_event_ref:root,
        causation_ref:root,world_cycle_ref:`world-cycle:${hash([scene.session_id,scene.key,root])}`,audience:audience(scope),
        depth:1,origin_kind:'native_consequence',consequence:'observed_native_npc_arrival',location:verified.location_key,
        reason:'current_native_travel_observation',execution_authority:false,publication_authority:false});
    }
  }
  const encounters=source.details.dramatic_brief?.native_encounter_candidates;
  if(encounters){
    if(encounters.version!==1||!Array.isArray(encounters.candidates)||encounters.candidates.length>4)held++;
    else for(const proof of encounters.candidates){
      const verified=inspectNativeEncounterCandidate(db,guild,proof,scope);
      if(!verified){held++;continue;}
      if(beats.length>=4){omitted++;continue;}
      const root=verified.source_ref;
      beats.push({version:1,protocol:'world_beat_v1',id:`world-beat:${hash([source.event_key,proof.proposal_ref,audience(scope)])}`,
        kind:'encounter_candidate',source_ref:source.event_key,signal_ref:proof.proposal_ref,causation_ref:root,
        world_cycle_ref:`world-cycle:${hash([scene.session_id,scene.key,root])}`,audience:audience(scope),depth:1,
        origin_kind:'native_encounter_proposal',location:proof.location_ref,reason:'pending_native_encounter_not_activated',
        execution_authority:false,publication_authority:false});
    }
  }
  for(const signal of source.details.world_bridge.signals){
    if(!revalidateWorldNarrativeSignal(db,guild,signal,scope)){held++;continue;}
    if(beats.length>=4){omitted++;continue;}
    beats.push({version:1,protocol:'world_beat_v1',id:`world-beat:${hash([source.event_key,signal.id,signal.audience])}`,kind:'pacing_hint',
      source_ref:source.event_key,signal_ref:signal.id,causation_ref:signal.causation_ref,world_cycle_ref:signal.world_cycle_ref,
      audience:signal.audience,depth:1,origin_kind:'director',reason:signal.kind==='opening_opportunity_request'?'request_opening_opportunity':
        signal.kind==='unresolved_narrative_task'?'request_missing_coverage':'consider_native_result_opportunity',
      execution_authority:false,publication_authority:false});
  }
  const sidecar=source.details.dramatic_brief?.native_clock_consequences;
  return {version:1,beats,held,...(sidecar?{omitted:omitted+Number(sidecar.omitted||0),omission_truncated:sidecar.overflow===true}:{}),
    authority:'Source-bound scene fiction and pacing metadata only; no knowledge, consent, publication or native execution authority.'};
}
