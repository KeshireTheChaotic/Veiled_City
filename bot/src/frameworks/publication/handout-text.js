/** Original handout display text; callers remain responsible for native source and audience qualification. */
function safe(v){return v==null?"":String(v);}

export function handoutMarkdown(h){
  const facts=h.canonical_facts||[];
  const links=[h.case_key&&`Case: ${h.case_key}`,h.npc_key&&`NPC: ${h.npc_key}`,h.location_key&&`Location: ${h.location_key}`].filter(Boolean);
  return [
    `# ${h.title}`,
    `**Veiled City Evidence Handout**`,
    ``,
    `- Type: ${h.kind}`,
    `- Authority: ${h.authority}`,
    `- Visibility: ${h.visibility}`,
    ...(links.map(x=>`- ${x}`)),
    ``,
    `## Player-Facing Artifact`,
    ``,
    h.content||"(No player-facing text.)",
    ``,
    `## Evidence Authority`,
    h.authority==="canonical"?"Only independently established source facts are canonical; decorative presentation does not create campaign truth.":
      h.authority==="partial"?"The artifact is genuine, but its meaning or completeness is uncertain.":
      h.authority==="unreliable"?"The source may be mistaken, altered, forged, corrupted, or supernatural.":
      "This is an illustrative aid; incidental details are not automatically canon.",
    ``,
    `Handout ID: ${h.id}`
  ].join("\n");
}

export function handoutSummary(h){
  const badge={canonical:"CANONICAL",partial:"PARTIAL",unreliable:"UNRELIABLE",illustrative:"ILLUSTRATIVE"}[h.authority]||String(h.authority).toUpperCase();
  return `**📎 Evidence — ${h.title}**\nType: ${h.kind} • Authority: **${badge}**\n${safe(h.content).slice(0,1300)}${safe(h.content).length>1300?"…":""}\n\nID: \`${String(h.id).slice(0,8)}\``;
}
