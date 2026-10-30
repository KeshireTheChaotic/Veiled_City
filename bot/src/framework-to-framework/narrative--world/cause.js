import {hash,narrativeSourceVisible,currentScene,npcSignalMemoryReferenceValid,actorEvidenceVisible,activeCityProxy,worldSimulationReceiptForAudience,inspectNativeEncounterCandidate,entitled,audience,nativeDirectorBridge} from './source-context.js';
import {nativeFearClockEffect} from './fear-clock-signals.js';
/** Historical snapshot reader for retrieval weight ONLY; cannot revive a live action or publication grant. */
function activeSignalSnapshot(db,guild,s,scope){
  if(s?.kind==='opening_opportunity_request')return false; // Attendance never earns fictional interest/canon weight, including after restart.
  if(s?.version!==1||s.protocol!=='narrative_signal_v1'||s.depth!==0||hash(s.audience)!==hash(audience(scope))
    ||!['human_action','native_diagnostic'].includes(s.origin_kind)||!Array.isArray(s.source_refs)||s.source_refs.length<2
    ||s.source_refs.length>6||!narrativeSourceVisible(db,guild,s.causation_ref,scope))return false;
  return s.source_refs.every(ref=>{
    const row=ref.kind==='world_event'?db.getWorldEvent(guild,ref.key):ref.kind==='saved_roll'?db.getSavedRoll(guild,ref.key)
      :['typed_intent','action_outcome_receipt','roll_request','native_adjudication','narrative_task_coverage','autonomous_turn','scene_presence'].includes(ref.kind)
        ?db.getCityRecord(guild,ref.kind,ref.key):null;
    if(ref.kind==='npc_memory'){
      return npcSignalMemoryReferenceValid(db,guild,ref,scope);
    }
    if(ref.kind==='scene_presence'&&ref.actor){
      if(typeof ref.key!=='string'||typeof ref.actor!=='string')return false;
      const presence=db.getCityRecord(guild,'scene_presence',ref.key),source=presence?.source_event&&db.getWorldEvent(guild,presence.source_event),
        npcState=db.getSimulationEntity(guild,'npc',ref.actor)?.state;
      return !!presence&&hash(presence)===ref.hash&&presence.data.entity_type==='npc'&&presence.data.entity_key===ref.actor
        &&presence.data.state==='actually_present'&&presence.data.scene===currentScene(db,guild).key
        &&presence.location_key===npcState?.location_key&&!activeCityProxy(db,guild,ref.actor)
        &&source?.status==='active'&&source.scene===presence.data.scene&&source.location_key===presence.location_key
        &&narrativeSourceVisible(db,guild,source.event_key,scope);
    }
    if(!row||hash(row)!==ref.hash)return false;
    if(ref.kind==='world_event')return row.kind==='authored_speech'
      ?s.source_refs.some(memoryRef=>memoryRef.kind==='npc_memory'&&memoryRef.actor&&memoryRef.key
        &&db.listNpcMemories(guild,memoryRef.actor,{status:'active',limit:200}).some(memory=>memory.id===memoryRef.key
          &&memory.source_ref===row.event_key&&actorEvidenceVisible(db,guild,memoryRef.actor,memory,scope)))
      :narrativeSourceVisible(db,guild,row.event_key,scope);
    if(ref.kind==='saved_roll')return scope.mode==='private'&&row.character_id===scope.actorCharacterId&&row.discord_user_id===scope.actorUserId;
    return (ref.kind==='narrative_task_coverage'||entitled(row,scope))&&narrativeSourceVisible(db,guild,row.source_event,scope);
  });
}
/** Reprojected Director narration inherits the human cause. Ambiguous/missing ancestry earns no new persistence weight. */
export function canonicalNarrativeCause(db,guild,sourceRef,scope){
  const source=db.getWorldEvent(guild,sourceRef);
  if(source?.status!=='active')return null;
  if(source.kind!=='native_director_narrative_scope'||source.details.version!==2)
    return narrativeSourceVisible(db,guild,sourceRef,scope)?sourceRef:null;
  if(!nativeDirectorBridge(db,guild,source,scope))return null;
  const signals=source.details.world_bridge.signals,sidecar=source.details.dramatic_brief?.native_clock_consequences,
    consequences=sidecar?.receipts||[];
  if(sidecar&&(sidecar.version!==1||sidecar.overflow||sidecar.omitted||!Array.isArray(sidecar.receipts)||sidecar.receipts.length>4))return null;
  const observationSidecar=source.details.dramatic_brief?.native_world_observations,observations=observationSidecar?.receipts||[];
  if(observationSidecar&&(observationSidecar.version!==1||!Array.isArray(observations)||observations.length>4))return null;
  const encounterSidecar=source.details.dramatic_brief?.native_encounter_candidates,encounters=encounterSidecar?.candidates||[];
  if(encounterSidecar&&(encounterSidecar.version!==1||!Array.isArray(encounters)||encounters.length>4))return null;
  if(!signals.length&&!consequences.length&&!observations.length&&!encounters.length)return sourceRef;
  if(!signals.every(s=>activeSignalSnapshot(db,guild,s,scope)))return null;
  const scene=currentScene(db,guild);
  for(const proof of consequences){
    const current=nativeFearClockEffect(db,guild,proof.key,scope,scene),event=current?.source;
    if(!current||proof.kind!=='pvp_fear_effect_receipt'||hash(current.row)!==proof.revision||event?.event_key!==proof.source_event
      ||hash(event)!==proof.source_revision||proof.session!==scene.session_id||proof.scene!==scene.key
      ||hash(proof.audience)!==hash(audience(scope))||proof.causation_ref!==current.causation
      ||scope.mode==='private'&&proof.principal_revision!==current.principalRevision
      ||!narrativeSourceVisible(db,guild,proof.causation_ref,scope))return null;
  }
  const observationRoots=[];
  for(const proof of observations){
    const current=worldSimulationReceiptForAudience(db,guild,proof.action,scope,{sourceRef:proof.key});
    if(proof.kind!=='world_simulation_observation'||current.status!=='verified_native_observation'
      ||hash(current)!==proof.revision||current.observation_ref!==proof.observation_ref)return null;
    observationRoots.push(current.observation_ref);
  }
  const encounterRoots=[];
  for(const proof of encounters){
    const current=inspectNativeEncounterCandidate(db,guild,proof,scope);if(!current)return null;
    encounterRoots.push(current.source_ref);
  }
  const roots=[...new Set([...signals.map(s=>s.causation_ref),...consequences.map(c=>c.causation_ref),...observationRoots,...encounterRoots])];return roots.length===1?roots[0]:null;
}
