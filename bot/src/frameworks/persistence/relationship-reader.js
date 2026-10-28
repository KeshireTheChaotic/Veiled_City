/** Read one persisted relationship using the caller's original evidence capabilities. */
export function readRelationship(db,id,relationshipEvidence,activeEvidence){
  const row=db.db.prepare('SELECT * FROM relationships WHERE id=?').get(id);
  return row?{...row,epistemic:relationshipEvidence(row),
    evidence_active:relationshipEvidence(row).source_refs.every(ref=>activeEvidence(db,row.guild_id,ref))}:row;
}
