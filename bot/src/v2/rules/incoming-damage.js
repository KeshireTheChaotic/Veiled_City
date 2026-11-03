/** Pure PC marked-HP calculation from pinned incoming-attack-rules.js:485–509.
 * Requires native hit/defense/owner-choice authority outside this calculator.
 * Does not spend Armor, modify HP or select a death move.
 */
export function incomingDamageOutcome({damage,major,severe,hp,armorSlots,defenses,useArmor}){
  if(![damage,major,severe,hp?.current,hp?.max,armorSlots?.current,armorSlots?.max].every(Number.isSafeInteger)
    ||damage<0||major<1||severe<major||hp.max<1||hp.max>12||hp.current<0||hp.current>hp.max
    ||armorSlots.max<0||armorSlots.current<0||armorSlots.current>armorSlots.max
    ||!['none','half','immune'].includes(defenses?.resistance)||![1,2].includes(defenses.armorReduction)||typeof defenses.armorAllowed!=='boolean'||typeof useArmor!=='boolean')throw new Error('Verified native incoming damage, defenses and marked resources required');
  if(useArmor&&(armorSlots.current===armorSlots.max||!defenses.armorAllowed))throw new Error('Available applicable owner-selected Armor Slot required');
  const afterResistance=defenses.resistance==='immune'?0:defenses.resistance==='half'?Math.ceil(damage/2):damage;
  const baseMarks=afterResistance<=0?0:afterResistance>=severe?3:afterResistance>=major?2:1;
  if(useArmor&&!baseMarks)throw new Error('No positive damage to reduce with Armor');
  const marks=Math.max(0,baseMarks-(useArmor?defenses.armorReduction:0)),afterHp=Math.min(hp.max,hp.current+marks);
  return {damageAfterResistance:afterResistance,baseMarks,hpMarks:afterHp-hp.current,
    hp:{...hp,current:afterHp},armorSlots:{...armorSlots,current:armorSlots.current+(useArmor?1:0)},
    deathChoiceRequired:hp.current+marks>=hp.max&&marks>0,effectsCommitted:false};
}
