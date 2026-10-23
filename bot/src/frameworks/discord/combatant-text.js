/** Presentation of already resolved combatant state; no mechanical adjudication. */
export function combatantLine(c){
  const cond=c.conditions?.length?` • ${c.conditions.join(", ")}`:"";
  return `\`${c.id.slice(0,8)}\` **${c.display_name}** [${c.role}] — HP ${c.hp_current}/${c.hp_max}${c.stress_max?` • Stress ${c.stress_current}/${c.stress_max}`:""} • ${c.status}${cond}`;
}
