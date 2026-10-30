/** Discord text views of already-authorized character/encounter records; no retrieval or adjudication. */
function json(c){ return c?.data ?? {}; }

export function formatSheet(c){
  if(!c) return "No character found.";
  const d=json(c), r=d.resources||{};
  const domains=(d.domains||[]).join(", ")||"—";
  return [
    `**${c.name}** — ${d.class||"Class unset"}${d.subclass?` (${d.subclass})`:""}`,
    `${d.ancestry||"Ancestry unset"} • ${d.community||"Community unset"} • Level ${d.level||1}`,
    `Domains: ${domains}`,
    `HP ${r.hp?.current??"?"}/${r.hp?.max??"?"} • Stress ${r.stress?.current??"?"}/${r.stress?.max??6} • Hope ${r.hope??"?"} • Armor ${r.armor?.current??"?"}/${r.armor?.max??"?"}`,
    d.experiences?.length?`Experiences: ${d.experiences.map(e=>typeof e==="string"?e:`${e.name}${e.modifier!=null?` +${e.modifier}`:""}`).join("; ")}`:"",
    `Status: ${c.status}${c.is_guest?" (guest)":""}`
  ].filter(Boolean).join("\n");
}

export function encounterSummary(e){
  if(!e) return "No planned or active encounter.";
  const mods=(e.adjustments||[]).map(x=>`${x.delta>=0?"+":""}${x.delta} ${x.label}`).join("; ")||"none";
  const comp=(e.composition||[]).map(x=>{
    const qty=x.type==="Minion"?`${x.quantity} group(s) / ${x.unit_count} bodies`:`${x.quantity}×`;
    return `• ${x.name} — ${x.type} T${x.tier} — ${qty} — ${x.spent_bp} BP`;
  }).join("\n")||"• none";
  return [
    `**Encounter #${e.encounter_number} — ${e.status.toUpperCase()}**`,
    `PCs: **${e.pc_count}** • Tier: **${e.tier}** • Style: **${e.style}** • Difficulty: **${e.difficulty}**`,
    `Battle Points: base **${e.base_bp}** → budget **${e.budget_bp}** • spent **${e.spent_bp}** • remaining **${e.budget_bp-e.spent_bp}**`,
    `Adjustments: ${mods}`,
    `Environment: ${e.environment_name||"—"}`,
    `Objective: ${e.objective||"—"}`,
    `Composition:\n${comp}`,
    e.notes?`Notes: ${e.notes}`:""
  ].filter(Boolean).join("\n").slice(0,1900);
}
