/** Pure existing consequences for a verified group-feature reaction and exact owner choice. */
import {nativeArbitrationFailure} from './native-failure.js';
import {groupNeedsChoice,groupFeatureEffects} from './group-feature-rules.js';

export function groupFeatureOutcome(feature,{success,critical=false,choice=null}={}){
  if(!Object.hasOwn(groupFeatureEffects,feature)||typeof success!=='boolean'||typeof critical!=='boolean')
    throw nativeArbitrationFailure('group_feature_outcome_evidence');
  const requiredChoice=groupNeedsChoice(feature,success,critical),policy=groupFeatureEffects[feature],
    branch=requiredChoice&&choice&&Object.hasOwn(policy.choices||{},choice)?policy.choices[choice]:success?policy.success:policy.failure,
    stress=critical?0:branch.stress,hope=critical?0:branch.hope,condition=!critical&&branch.condition;
  return {required_choice:requiredChoice,stress,hope,condition};
}
