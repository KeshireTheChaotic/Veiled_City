/** Pure native feature cost planning; callers remain responsible for authority and committing any payment. */
import {nativeArbitrationFailure} from './native-failure.js';
import {nativeResourcePlan} from './feature-operation-plans.js';

export function featureCostPlan(feature,{timing,additionalSpotlight=false,experience=false,fear,stress,stressMax}){
  if(!['spotlight_action','reaction','passive'].includes(timing)||typeof additionalSpotlight!=='boolean'||typeof experience!=='boolean'
    ||timing!=='spotlight_action'&&additionalSpotlight||!Array.isArray(feature?.costs)
    ||![fear,stress,stressMax].every(Number.isSafeInteger)||fear<0||fear>12||stress<0||stressMax<stress)throw nativeArbitrationFailure('feature_cost_timing_or_balance');
  let featureFear=0,npcStress=0;
  for(const c of feature.costs){
    if(!c||Object.keys(c).sort().join()!=='amount,resource'||!['fear','npc_stress'].includes(c.resource)||!Number.isSafeInteger(c.amount)||c.amount<0||c.amount>12)
      throw nativeArbitrationFailure('feature_cost_descriptor');
    if(c.resource==='fear')featureFear+=c.amount;else npcStress+=c.amount;
  }
  const amount=featureFear+Number(additionalSpotlight)+Number(experience);
  if(fear<amount||stress+npcStress>stressMax)throw nativeArbitrationFailure('insufficient_feature_fear_or_stress');
  nativeResourcePlan({current:fear,max:12},-amount);
  nativeResourcePlan({current:stress,max:stressMax},npcStress);
  return {fear:amount,npc_stress:npcStress,expenses:{additional_spotlight:Number(additionalSpotlight),feature:featureFear,experience:Number(experience)}};
}

/** Shared cost writer, called only after the existing native source/actor/receipt gate.
 * The caller's receipt owns idempotence. This synchronous transaction cannot make
 * a model proposal, an arbitrary token payment or a PC-owned expenditure legal.
 */
export function commitFeatureResources(db,guild,combatant,cost){
  if(!cost||Object.keys(cost).sort().join()!=='expenses,fear,npc_stress'
    ||!cost.expenses||Object.keys(cost.expenses).sort().join()!=='additional_spotlight,experience,feature'
    ||![cost.fear,cost.npc_stress,...Object.values(cost.expenses)].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=12)
    ||cost.fear!==cost.expenses.additional_spotlight+cost.expenses.experience+cost.expenses.feature
    ||!combatant&&cost.npc_stress!==0)throw nativeArbitrationFailure('feature_cost_operation_shape');
  return db.transaction(()=>{
    const before=db.getCampaign(guild).fear,fear=nativeResourcePlan({current:before,max:12},-cost.fear),
      stress=combatant?nativeResourcePlan({current:combatant.stress_current,max:combatant.stress_max},cost.npc_stress):null;
    if(cost.fear)db.changeFear(guild,fear.delta);
    const after=combatant?db.updateCombatant(combatant.id,{stress_current:stress.after}):null;
    if(db.getCampaign(guild).fear!==fear.after||combatant&&after?.stress_current!==stress.after)
      throw nativeArbitrationFailure('feature_cost_writer_result_changed');
    return {fear,combatant:after};
  });
}
