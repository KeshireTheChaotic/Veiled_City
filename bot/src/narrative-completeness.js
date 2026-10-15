/** Post-projection response health. Native verified parts, not model self-certification; no effects or provider retries. */
export function validateNarrativeCompleteness(db,guild,result,parts,requests=[]){
  const actual=parts.filter(p=>p.kind==='pvp_output_part'&&p.status==='verified'&&db.getCityRecord(guild,'pvp_output_part',p.record_key)?.data.content_hash===p.data.content_hash);
  const substantive=actual.filter(p=>!['neutral','scene_fiction_review'].includes(p.data.kind));
  const units=substantive.filter(p=>p.data.kind==='gm_narrative_unit').map(p=>db.getCityRecord(guild,'narrative_unit',p.data.ref)?.data.unit).filter(Boolean);
  const conversation=requests.some(r=>r.version===8&&r.operation==='conversation'),moving=(result.player_intents||[]).some(i=>i.type==='move'&&i.framing==='immediate');
  let status=!result.respond||result.act===false?'not_applicable':substantive.length?'complete':'held_irrecoverable';
  if(status==='complete'&&conversation&&!units.some(u=>u.kind==='npc_speech')&&!substantive.some(p=>['gm_fresh_npc','gm_world_narrative','observation_answer'].includes(p.data.kind)))status='npc_response_missing';
  if(status==='complete'&&moving&&substantive.some(p=>p.data.kind==='verified_action')
    &&!units.some(u=>['scene','lead'].includes(u.kind))&&!substantive.some(p=>['gm_scene_fiction','gm_fresh_scene','scene_description'].includes(p.data.kind)))status='destination_fiction_missing';
  return {version:1,status,substantive_parts:substantive.length,held_parts:Math.max(0,requests.length-substantive.length),
    authority:'native_projection_health_not_effect_authority',quality:'Typed coverage; not a universal literary-quality or semantic proof.'};
}
