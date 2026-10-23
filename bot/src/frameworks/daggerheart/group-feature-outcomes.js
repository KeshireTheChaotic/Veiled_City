/** Pure existing consequences for a verified group-feature reaction and exact owner choice. */
import {nativeArbitrationFailure} from './native-failure.js';
import {LANES,FLASH,REGENT,groupNeedsChoice} from './group-feature-rules.js';

export function groupFeatureOutcome(feature,{success,critical=false,choice=null}={}){
  if(![LANES,FLASH,REGENT].includes(feature)||typeof success!=='boolean'||typeof critical!=='boolean')
    throw nativeArbitrationFailure('group_feature_outcome_evidence');
  const requiredChoice=groupNeedsChoice(feature,success,critical),
    stress=critical?0:feature===REGENT?(choice==='stress'?2:0):feature===FLASH&&(!success||choice==='stress')?1:0,
    hope=feature===REGENT&&choice==='hope'?2:0,
    condition=!critical&&feature!==REGENT&&(!success||feature===FLASH&&choice==='vulnerable');
  return {required_choice:requiredChoice,stress,hope,condition};
}
