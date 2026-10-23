/** Pure native feature cost planning; callers remain responsible for authority and committing any payment. */
import {nativeArbitrationFailure} from './native-failure.js';

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
  return {fear:amount,npc_stress:npcStress,expenses:{additional_spotlight:Number(additionalSpotlight),feature:featureFear,experience:Number(experience)}};
}
