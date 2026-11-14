/** GM-only data on the shared read-only connection. No backfill or approval.
 * Capture synchronously with the character; never use as audience context.
 */
export function createLegacyGmExportReader(db){
 const bounded=(sql,args,max=10000)=>{const rows=db.prepare(sql+' LIMIT ?').all(...args,max+1);if(rows.length>max)throw new Error('Complete GM export source window requires reconciliation');return rows;};
 return function readGmCharacterExportFacets(guildId,characterId){
  if(![guildId,characterId].every(v=>typeof v==='string'&&v))throw new TypeError('Exact GM export source scope required');
  const c=db.prepare('SELECT * FROM characters WHERE guild_id=? AND id=?').get(guildId,characterId);if(!c)throw new Error('Campaign character export source required');
  const owner=c.owner_user_id||null,args=[guildId,characterId,owner];
  const facts=bounded("SELECT * FROM facts WHERE guild_id=? AND (subject_character_id=? OR subject_user_id=? AND visibility IN ('player','gm')) AND visibility IN ('player','character','gm') ORDER BY created_at,id",args);
  const clocks=bounded("SELECT * FROM clocks WHERE guild_id=? AND (subject_character_id=? OR subject_user_id=?) AND visibility IN ('player','character','gm') ORDER BY clock_key",args);
  const threads=bounded("SELECT * FROM threads WHERE guild_id=? AND (subject_character_id=? OR subject_user_id=?) AND visibility IN ('player','character','gm') ORDER BY updated_at DESC,id",args);
  const references=bounded("SELECT * FROM reference_entries WHERE guild_id=? AND (subject_character_id=? OR subject_user_id=?) AND visibility IN ('player','character','gm') ORDER BY kind,display_name,entity_key",args);
  const relationships=bounded('SELECT * FROM relationships WHERE guild_id=? AND (from_key=? OR to_key=? OR source_character_id=?) ORDER BY updated_at DESC,id',[guildId,characterId,characterId,characterId]);
  const hooks=bounded('SELECT * FROM character_gm_hooks WHERE guild_id=? AND character_id=? ORDER BY updated_at DESC,id',[guildId,characterId]).map(row=>{
   const payload=JSON.parse(row.payload_json);if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Explicit GM hook payload requires reconciliation');return {...row,payload};
  });
  const canon=bounded("SELECT * FROM canon_events WHERE guild_id=? AND status='current' ORDER BY canon_key,id",[guildId],1000);
  if(new Set(canon.map(r=>r.canon_key)).size!==canon.length)throw new Error('Ambiguous current canon requires reconciliation');
  const conflicts=bounded("SELECT cc.*,ce.value existing_value,ce.guild_id existing_guild_id FROM canon_conflicts cc LEFT JOIN canon_events ce ON ce.id=cc.existing_event_id WHERE cc.guild_id=? AND cc.status='pending' ORDER BY cc.created_at,cc.id",[guildId]);
  if(conflicts.some(r=>r.existing_event_id&&r.existing_guild_id!==guildId))throw new Error('Canon conflict source campaign requires reconciliation');
  const proposals=bounded("SELECT cp.*,ce.value current_value FROM canon_proposals cp LEFT JOIN canon_events ce ON ce.guild_id=cp.guild_id AND ce.canon_key=cp.canon_key AND ce.status='current' WHERE cp.guild_id=? AND cp.character_id=? ORDER BY CASE cp.status WHEN 'conflict' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,cp.created_at DESC,cp.id",[guildId,characterId],100);
  // The old list method writes/backfills and can accept proposals during reads.
  // Missing materialized rows require reviewed migration, never implicit writes.
  for(const h of hooks.filter(h=>h.hook_type==='canon_suggestion')){
   const nested=h.payload.canon_suggestion&&typeof h.payload.canon_suggestion==='object'?h.payload.canon_suggestion:{};
   const key=String(nested.key||h.hook_key.replace(/^canon\./,'')).trim().toLowerCase(),value=String(nested.value||h.premise||'').trim();
   if(key&&value&&!proposals.some(p=>p.canon_key===key&&p.proposed_value===value))throw new Error('Legacy canon suggestion needs reviewed proposal migration before GM export');
  }
  return {facts,clocks,threads,references,relationships,hooks,canon,conflicts,proposals};
 };
}
