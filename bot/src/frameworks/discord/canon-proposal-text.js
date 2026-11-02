/** Original GM-facing canon proposal list presentation. */
export function canonProposalsText(rows,status){
  const body=rows.map(r=>{
    const state=r.status.toUpperCase();
    const current=r.current_value!=null?`\n  current: ${r.current_value}`:"";
    const reason=r.reason?`\n  why: ${r.reason}`:"";
    const source=r.source==="player_private_scene"
      ?`player/private${r.proposed_by_user_id?` by <@${r.proposed_by_user_id}>`:""}`
      :`import/${r.source||"character-hook"}`;
    return `• \`${r.id.slice(0,8)}\` **${r.character_name}** • ${state} • ${source}\n  \`${r.canon_key}\` → ${r.proposed_value}${current}${reason}`;
  }).join("\n");
  return rows.length?`**Canon Proposals — ${status}**\n${body}`.slice(0,1950):`No ${status} canon proposals found.`;
}
