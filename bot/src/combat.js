/** Deterministic combat-state helpers. These functions do not narrate or invoke AI. */
function parseThresholds(s){
  const m=String(s||"").match(/(\d+)\s*\/\s*(\d+)/); return m?{major:Number(m[1]),severe:Number(m[2])}:{major:null,severe:null};
}
export function buildCombatants(encounter,library){
  const rows=[];
  for(const item of encounter.composition||[]){
    const adv=library.findAdversary(item.name); if(!adv) continue;
    const count=item.type==="Minion"?Number(item.unit_count||item.quantity||1):Number(item.quantity||1);
    const th=parseThresholds(adv.thresholds);
    for(let i=1;i<=count;i++) rows.push({
      base_name:adv.name,display_name:count>1?`${adv.name} ${i}`:adv.name,role:adv.type,tier:Number(adv.tier),instance_index:i,
      difficulty:Number(adv.difficulty||10),major_threshold:th.major,severe_threshold:th.severe,hp_max:Number(adv.hp||1),stress_max:Number(adv.stress||0),notes:adv.standard||""
    });
  }
  return rows;
}
export function hpMarksForDamage(c,damage){
  const n=Math.max(0,Number(damage)||0); if(n<=0) return 0;
  if(c.role==="Minion") return 1;
  if(c.severe_threshold!=null && n>=c.severe_threshold) return 3;
  if(c.major_threshold!=null && n>=c.major_threshold) return 2;
  return 1;
}
export function combatantLine(c){
  const cond=c.conditions?.length?` • ${c.conditions.join(", ")}`:"";
  return `\`${c.id.slice(0,8)}\` **${c.display_name}** [${c.role}] — HP ${c.hp_current}/${c.hp_max}${c.stress_max?` • Stress ${c.stress_current}/${c.stress_max}`:""} • ${c.status}${cond}`;
}
