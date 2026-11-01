/** Original GM diagnostic strings only; callers retain authorization, source reads and delivery actions. */
export function pendingDeliveryLines(rows){
  return rows.length?['**Pending/uncertain turn delivery**',...rows.map(row=>
    `• turn \`${row.turn_id.slice(0,8)}\` part \`${row.id}\` (${row.ordinal+1}) · ${row.surface} · **${row.status}** · attempts ${row.attempt_count}${row.last_failure?` · ${row.last_failure.slice(0,160)}`:''}`)]:['No pending turn delivery rows.'];
}

export function heldNativeNoticeLines(rows){
  return rows.map(r=>`Native notice ${r.kind} \`${r.record_key}\`: **${r.status}**; no send performed. Current source/audience proof required.`);
}
