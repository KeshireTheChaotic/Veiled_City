/** Original World/native scene composition; retained NPC evidence rules await separate Knowledge/NPC adoption. */
import {StateConflictError} from './kernel/errors.js';
import {activeEvidence} from './epistemic.js';
import {sceneAccess} from './frameworks/session/public.js';
export {RANGE_BANDS,currentScene,scenePresence,lastVerifiedCharacterPresence,reconcileSceneArrival,recordCharacterArrival,recordScenePresence,sceneAccess,sceneView,archiveScenePresence} from './frameworks/session/public.js';

export function npcEvidenceActive(db,guild,npc,sourceRef,seen=new Set()){
  if(seen.has(sourceRef)||seen.size>=16)return false;seen.add(sourceRef);
  const event=db.getWorldEvent(guild,sourceRef);if(event)return event.status==="active";
  if(db.getFact(guild,sourceRef))return activeEvidence(db,guild,sourceRef);
  const transmission=db.getCityRecord(guild,"transmission",sourceRef);
  if(transmission)return transmission.status==="active"&&transmission.data.to===`npc:${npc}`&&activeEvidence(db,guild,transmission.source_event);
  const row=db.listNpcKnowledge(guild,npc,{limit:200}).find(row=>row.knowledge_key===sourceRef&&row.belief_state!=="unknown");
  return !!row&&(/^seed/.test(row.source_type)&&!db.getWorldEvent(guild,row.source_ref)
    ||npcEvidenceActive(db,guild,npc,row.source_ref,seen));
}

export function assertNpcObservation(db,guild,npc,sourceRef,{sourceType="",content="",strict=false}={}){
  const flags=db.getCityCalendar(guild).flags;
  if(!strict&&flags.scene_continuity!==true&&flags.natural_language!==true) return true;
  const existing=db.listNpcKnowledge(guild,npc,{limit:200}).find(row=>row.source_ref===sourceRef&&row.belief_state!=="unknown"&&row.content===content);
  const transmission=db.getCityRecord(guild,"transmission",sourceRef);
  const delivered=transmission?.status==="active"&&transmission.data.to===`npc:${npc}`&&activeEvidence(db,guild,transmission.source_event);
  const known=db.listNpcKnowledge(guild,npc,{limit:200}).find(row=>[row.knowledge_key,row.source_ref].includes(sourceRef)
    &&row.belief_state!=="unknown"&&(npcEvidenceActive(db,guild,npc,row.source_ref)
      ||!db.getWorldEvent(guild,row.source_ref)&&/^seed/.test(row.source_type)));
  const ownedMemory=db.listNpcMemories(guild,npc,{status:"active",limit:200}).find(row=>[row.id,row.source_ref].includes(sourceRef)
    &&(activeEvidence(db,guild,row.source_ref)||!db.getWorldEvent(guild,row.source_ref)&&/^seed/.test(row.source_type)));
  if(sourceType==="inferred"||sourceType==="supernatural_impression"){
    if(known||delivered||ownedMemory)return true;
    throw new StateConflictError("Subjective inference requires this NPC's own active evidence, not narrator context.");
  }
  if(["told","told_by_npc","faction_report","rumor","document"].includes(sourceType)){
    if(delivered&&transmission.data.content===content||known&&known.content===content)return true;
    throw new StateConflictError("Report/document needs an established recipient-specific delivery.");
  }
  if(existing&&existing.belief_state==="known"&&!['inferred','rumor','supernatural_impression','told','told_by_npc','faction_report','document'].includes(existing.source_type)
    &&(npcEvidenceActive(db,guild,npc,sourceRef)||delivered
    ||!db.getWorldEvent(guild,sourceRef)&&/^seed/.test(existing.source_type))) return true;
  const event=db.getWorldEvent(guild,sourceRef);
  if(!event||event.status!=="active"||!db.getActiveSession(guild)) throw new StateConflictError("Unknown or unwitnessed source; no new actor knowledge.");
  const targetType=event.details.entity_type,targetKey=event.details.entity_key;
  const sense=["heard","overheard"].includes(sourceType)?"sound":"sight";
  if(!targetType||!targetKey||!sceneAccess(db,guild,{observer_type:"npc",observer_key:npc,target_type:targetType,target_key:targetKey,sense}))
    throw new StateConflictError("Source was not actually accessible to this witness.");
  if(strict){
    const witnessed=event.details.observers?.some(key=>[npc,`npc:${npc}`].includes(key))
      ||event.details.observations?.some(row=>row.npc===npc&&row.observation===content);
    if(!witnessed&&!(ownedMemory&&ownedMemory.content===content))
      throw new StateConflictError("Current proximity cannot establish a past witness; recorded observer evidence required.");
  }
  if(!["observed","witnessed","heard","overheard"].includes(sourceType)) throw new StateConflictError("Remote knowledge needs an established delivery, not scene inference.");
  if(content!==event.title&&content!==event.details.observation) throw new StateConflictError("Observation must match its committed source, not invented content.");
  return true;
}
