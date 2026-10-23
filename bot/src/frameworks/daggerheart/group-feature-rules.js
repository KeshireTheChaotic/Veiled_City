/** Existing source-keyed Daggerheart group-feature rules; no source evidence or effects are produced here. */
import {nativeArbitrationFailure} from './native-failure.js';

export const LANES='adversary:traffic-saint:all-lanes-stop';
export const FLASH='adversary:aster-vale-contractor:flashbang';
export const REGENT='adversary:pale-regent:command-the-blood';
export const groupFeaturePolicies=Object.freeze({
  [LANES]:Object.freeze({trait:'Instinct',difficulty:14,range:'Far',all:true,condition:'Movement limited',expiry:'next_spotlight'}),
  [FLASH]:Object.freeze({trait:'Instinct',difficulty:12,range:'Close',all:false,condition:'Vulnerable',expiry:'until_cleared'}),
  [REGENT]:Object.freeze({trait:'Presence',difficulty:20,range:'Melee',all:false,condition:null,expiry:null})
});
export const isGroupFeature=key=>Object.hasOwn(groupFeaturePolicies,key);
export function groupReactionRules(key){
  const policy=groupFeaturePolicies[key];if(!policy)throw nativeArbitrationFailure('group_feature_fixed_rules');
  return Object.freeze({trait:policy.trait,difficulty:policy.difficulty});
}
export const groupNeedsChoice=(feature,success,critical=false)=>!critical&&(feature===FLASH&&success||feature===REGENT&&!success);
export const groupReactionOptions=feature=>feature===REGENT?['hope','stress','command']:feature===FLASH?['vulnerable','stress']:[];
export function groupFeatureStakes(key){
  if(key===LANES)return 'On failure you cannot move beyond Very Close until after the Saint next takes the spotlight. On success no restriction applies. No roll or failed response is assumed.';
  if(key===FLASH)return 'On failure become Vulnerable and mark 1 Stress. On ordinary success YOU choose Vulnerable or 1 Stress. A native Critical ignores both effects, without Hope/Fear or Stress recovery. Silence/withdrawal is not a failed reaction.';
  if(key===REGENT)return 'On failure YOU choose lose 2 Hope, mark 2 Stress, or one immediate non-suicidal command. Command compliance needs an exact communicated command and supported owner declaration; it is never invented. Success applies no consequence. Silence/withdrawal is not failure.';
  throw nativeArbitrationFailure('group_feature_stakes');
}
