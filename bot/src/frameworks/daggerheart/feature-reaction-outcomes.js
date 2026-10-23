/** Pure existing Static Wraith Feedback outcome; callers verify rolls and commit its consequences. */
import {nativeArbitrationFailure} from './native-failure.js';

export function planFeedbackReactionOutcome({success,stressCurrent,stressMax,effectKey}){
  if(typeof success!=='boolean'||!Number.isSafeInteger(stressCurrent)||!Number.isSafeInteger(stressMax)
    ||stressCurrent<0||stressMax<stressCurrent||typeof effectKey!=='string'||!effectKey)
    throw nativeArbitrationFailure('feature_reaction_outcome_evidence');
  if(!success&&stressCurrent>=stressMax)throw nativeArbitrationFailure('feature_stress_overflow_adapter_required');
  return {stress_delta:success?0:1,device_disabled_by:success?null:effectKey};
}
