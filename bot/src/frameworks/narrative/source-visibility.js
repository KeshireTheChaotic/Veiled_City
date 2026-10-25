/** Narrative's fail-closed recursive source visibility capability. Provider policies are injected. */
export function createNarrativeSourceVisibility({sceneFictionHash,visible,activeEvidence,evidenceType,actorReferenceVisible}){
  if([sceneFictionHash,visible,activeEvidence,evidenceType,actorReferenceVisible].some(fn=>typeof fn!=='function'))
    throw new TypeError('Complete narrative source visibility capabilities required.');
  function closure(db,guild,key,scope,seen=new Set()){
    if(typeof key!=='string'||!key)return false;
    if(seen.has(key)||seen.size>=32)return false;seen.add(key);
    const row=db.getFact(guild,key)||db.getWorldEvent(guild,String(key).replace(/^event:/,''));
    let artifactSource=null;
    if(row?.kind==='native_narrative_unit'&&row.details.artifact_ref){
      const unit=db.getCityRecord(guild,'narrative_unit',row.event_key.replace(/:source$/,'')),
        artifact=db.getCityRecord(guild,'narrative_artifact',row.details.artifact_ref),event=artifact&&db.getWorldEvent(guild,artifact.source_event);
      if(row.source_id!=='native:narrative-authority'||!unit||sceneFictionHash(unit.data)!==row.details.payload_hash
        ||artifact?.status!=='established'||event?.source_id!=='native:narrative-artifact'
        ||sceneFictionHash(artifact.data)!==event.details.payload_hash||artifact.data.unit_hash!==sceneFictionHash(unit.data.unit)
        ||sceneFictionHash(artifact.data.binding)!==sceneFictionHash(unit.data.binding))return false;
      artifactSource=artifact.source_event;
    }
    if(row?.kind==='native_narrative_unit'&&row.details.actor_evidence_refs){
      const unit=db.getCityRecord(guild,'narrative_unit',row.event_key.replace(/:source$/,''));
      if(row.source_id!=='native:narrative-authority'||!unit||sceneFictionHash(unit.data)!==row.details.payload_hash
        ||!row.details.actor_evidence_refs.every(ref=>actorReferenceVisible(db,guild,row.details.actor,ref,scope)))return false;
    }
    const ancestors=row?.content?evidenceType(row).source_refs:[row?.details?.input_source,row?.details?.declaration,
      artifactSource,...(row?.kind==='native_scene_fiction'?[row.details.origin]:[]),...(Array.isArray(row?.details?.source_refs)?row.details.source_refs:[])].filter(Boolean);
    return !!(row&&visible(row,scope)&&activeEvidence(db,guild,key)
      &&ancestors.every(ref=>closure(db,guild,ref,scope,new Set(seen))));
  }
  return Object.freeze({narrativeSourceVisible:closure});
}
