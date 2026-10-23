/** Native encounter arithmetic. No roster membership, world presence or state mutation. */
export const BATTLE_POINT_COSTS=Object.freeze({
  Minion:1, Social:1, Support:1,
  Horde:2, Ranged:2, Skulk:2, Standard:2,
  Leader:3, Bruiser:4, Solo:5
});
export const HEAVY_ROLES=new Set(["Bruiser","Horde","Leader","Solo"]);
export const DIFFICULTY_ADJUSTMENTS=Object.freeze({easy:-1,standard:0,hard:2});

export function tierForLevel(level=1){
  const n=Number(level)||1;
  if(n<=1) return 1;
  if(n<=4) return 2;
  if(n<=7) return 3;
  return 4;
}
export function baseBattlePoints(pcCount){ return (3*Number(pcCount))+2; }
export function battlePointCost(type){
  const c=BATTLE_POINT_COSTS[type];
  if(c==null) throw new Error(`Unknown Daggerheart adversary role: ${type}`);
  return c;
}
export function derivedAdjustments(composition,{tier,damageBoosted=false}={}){
  const rows=composition||[];
  const soloCount=rows.filter(x=>x.type==="Solo").reduce((n,x)=>n+(x.quantity||1),0);
  const hasLower=rows.some(x=>Number(x.tier)<Number(tier));
  const hasHeavy=rows.some(x=>HEAVY_ROLES.has(x.type));
  const mods=[];
  if(soloCount>=2) mods.push({key:"two_plus_solos",delta:-2,label:"2+ Solo adversaries"});
  if(damageBoosted) mods.push({key:"boosted_damage",delta:-2,label:"boosted all adversary damage"});
  if(hasLower) mods.push({key:"lower_tier",delta:+1,label:"lower-tier adversary present"});
  if(rows.length && !hasHeavy) mods.push({key:"no_heavy",delta:+1,label:"no Bruiser/Horde/Leader/Solo"});
  return mods;
}
export function recomputeBudget(encounter){
  const comp=typeof encounter.composition_json==="string"?JSON.parse(encounter.composition_json||"[]"):(encounter.composition||[]);
  const derived=derivedAdjustments(comp,{tier:encounter.tier,damageBoosted:!!encounter.damage_boosted});
  const diff=DIFFICULTY_ADJUSTMENTS[encounter.difficulty]??0;
  const custom=Number(encounter.custom_adjustment_bp||0);
  const budget=Number(encounter.base_bp)+diff+custom+derived.reduce((n,x)=>n+x.delta,0);
  const spent=comp.reduce((n,x)=>n+Number(x.spent_bp||0),0);
  return {budget,spent,derived,difficultyAdjustment:diff,remaining:budget-spent};
}

