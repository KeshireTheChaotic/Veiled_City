/** Original fact display text only; callers retain source/audience query authorization. */
function factScopeLabel(row){
  if(row.visibility==="gm") return "GM";
  if(row.visibility==="player") return row.subject_user_id?`PLAYER <@${row.subject_user_id}>`:"PLAYER";
  if(row.visibility==="character") return row.subject_character_id?`CHARACTER ${row.subject_character_id.slice(0,8)}`:"CHARACTER";
  return String(row.visibility||"party").toUpperCase();
}

export function gmFactLine(row){return `• **[${factScopeLabel(row)}] [${String(row.category||"fact").toUpperCase()}]** \`${row.fact_key}\` — ${row.content} _(${row.source||"unknown"}, ${row.confidence??100}% confidence)_`;}

export function playerFactLine(row){
  if(row.visibility==="gm") throw new Error("GM-only fact reached a player-safe fact formatter.");
  const scope=["player","character"].includes(row.visibility)?"PRIVATE":String(row.visibility||"party").toUpperCase();
  return `• **[${scope}]** ${row.content}`;
}
