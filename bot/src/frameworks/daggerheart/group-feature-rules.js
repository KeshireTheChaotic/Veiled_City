/** Existing source-keyed Daggerheart group-feature rules; no source evidence or effects are produced here. */
import {nativeArbitrationFailure} from './native-failure.js';
import {featureCostPlan} from './feature-costs.js';

export const LANES='adversary:traffic-saint:all-lanes-stop';
export const FLASH='adversary:aster-vale-contractor:flashbang';
export const REGENT='adversary:pale-regent:command-the-blood';
export const FOAM='adversary:ritual-enforcement-team:null-foam';
// Source-owned outcome descriptors. Callers must still prove each owner's actual roll and choice.
export const groupFeatureEffects=Object.freeze({
  [LANES]:Object.freeze({choice_on:null,failure:Object.freeze({stress:0,hope:0,condition:true}),success:Object.freeze({stress:0,hope:0,condition:false})}),
  [FLASH]:Object.freeze({choice_on:'success',failure:Object.freeze({stress:1,hope:0,condition:true}),success:Object.freeze({stress:0,hope:0,condition:false}),
    choices:Object.freeze({vulnerable:Object.freeze({stress:0,hope:0,condition:true}),stress:Object.freeze({stress:1,hope:0,condition:false})})}),
  [REGENT]:Object.freeze({choice_on:'failure',failure:Object.freeze({stress:0,hope:0,condition:false}),success:Object.freeze({stress:0,hope:0,condition:false}),
    choices:Object.freeze({hope:Object.freeze({stress:0,hope:2,condition:false}),stress:Object.freeze({stress:2,hope:0,condition:false}),command:Object.freeze({stress:0,hope:0,condition:false})})})
});
export const groupFeaturePolicies=Object.freeze({
  [FOAM]:Object.freeze({trait:'Agility',difficulty:14,range:'Close',all:true,area:true,stress_when_tracked:true,condition:'Restrained',expiry:'until_freed',spellcast_disadvantage:true}),
  [LANES]:Object.freeze({trait:'Instinct',difficulty:14,range:'Far',all:true,condition:'Movement limited',expiry:'next_spotlight'}),
  [FLASH]:Object.freeze({trait:'Instinct',difficulty:12,range:'Close',all:false,condition:'Vulnerable',expiry:'until_cleared'}),
  [REGENT]:Object.freeze({trait:'Presence',difficulty:20,range:'Melee',all:false,condition:null,expiry:null})
});
export const isGroupFeature=key=>Object.hasOwn(groupFeaturePolicies,key);
/** One source-owned cost policy for both preflight and authoritative commitment. */
export function groupFeatureCostPlan(feature,combatant,options){
  if(!isGroupFeature(feature?.feature_key))throw nativeArbitrationFailure('group_feature_cost_source');
  const source=groupFeaturePolicies[feature.feature_key].stress_when_tracked&&combatant?.stress_max===0
    ?{...feature,costs:feature.costs.filter(c=>c.resource!=='npc_stress')}:feature;
  return featureCostPlan(source,{...options,stress:combatant?.stress_current,stressMax:combatant?.stress_max});
}
export function groupReactionRules(key){
  const policy=groupFeaturePolicies[key];if(!policy)throw nativeArbitrationFailure('group_feature_fixed_rules');
  return Object.freeze({trait:policy.trait,difficulty:policy.difficulty});
}
export function validateGroupFeatureProposal(entry,p,feature){
  const policy=groupFeaturePolicies[feature?.feature_key];
  if(!policy||entry.actor.type!=='npc'||entry.operation!=='feature'||p.disposition!=='native_feature_resolution'||p.stakes_kind!=='native_feature'
    ||p.trait!==policy.trait||p.difficulty!==policy.difficulty||p.proposal_version===2||p.experience_ref||p.advantage||p.disadvantage
    ||!p.rule_basis_refs.includes('srd:reaction-rolls'))throw nativeArbitrationFailure('group_feature_fixed_rules');
  return policy;
}
export const groupNeedsChoice=(feature,success,critical=false)=>!critical&&groupFeatureEffects[feature]?.choice_on===(success?'success':'failure');
export const groupReactionOptions=feature=>Object.keys(groupFeatureEffects[feature]?.choices||{});
export function groupFeatureStakes(key){
  if(key===FOAM)return 'Everyone in the designated area makes an independent Agility Reaction Roll (14). Failure causes Restrained and disadvantage on Spellcast Rolls until freed. Each PC owner controls their reaction; silence is pending.';
  if(key===LANES)return 'On failure you cannot move beyond Very Close until after the Saint next takes the spotlight. On success no restriction applies. No roll or failed response is assumed.';
  if(key===FLASH)return 'On failure become Vulnerable and mark 1 Stress. On ordinary success YOU choose Vulnerable or 1 Stress. A native Critical ignores both effects, without Hope/Fear or Stress recovery. Silence/withdrawal is not a failed reaction.';
  if(key===REGENT)return 'On failure YOU choose lose 2 Hope, mark 2 Stress, or one immediate non-suicidal command. Command compliance needs an exact communicated command and supported owner declaration; it is never invented. Success applies no consequence. Silence/withdrawal is not failure.';
  throw nativeArbitrationFailure('group_feature_stakes');
}
