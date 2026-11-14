/** R0 is an inventory/disposition gate, not parity or permission to delete.
 * Unresolved runtime edges must remain named blockers to adoption/removal.
 */
export function inspectR0Coverage({expected,entries,blockers,deletions=[]}){
 const errors=[],ids=new Set();
 for(const row of entries){
  if(!row||typeof row.id!=='string'||ids.has(row.id)){errors.push('duplicate_or_invalid_entry');continue;}ids.add(row.id);
  if(!['retain','port','replace','remove','migration-only'].includes(row.disposition)||typeof row.destination!=='string'||!row.destination.trim()||!row.source?.revision||!row.source?.file||!/^[a-f0-9]{64}$/.test(row.source.sha256??''))errors.push(`unbound_destination:${row.id}`);
 }
 for(const id of expected)if(!ids.has(id))errors.push(`missing_entry:${id}`);
 for(const id of ids)if(!expected.includes(id))errors.push(`unexpected_entry:${id}`);
 for(const row of blockers)if(!row.id||!row.source?.file||!Number.isSafeInteger(row.source.line)||!row.reason||row.adoptionAllowed!==false||row.deletionAllowed!==false)errors.push(`unbound_blocker:${row.id??'unknown'}`);
 for(const row of deletions)if(!row.zeroConsumerProof||!row.replacementEvidence||!row.migrationEvidence)errors.push(`unproved_deletion:${row.id}`);
 return {status:errors.length?'hold':'complete',errors,entries:ids.size,blockers:blockers.length,deletions:deletions.length,scope:'Inventory and named preservation/replacement destinations only. Blocked edges remain ineligible for migration, activation or deletion.'};
}
