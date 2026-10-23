/** Existing source-defined passive opportunity rules; this contract grants no roll or outcome. */
export const ENVIRONMENT_NOISE_FEATURE='environment:haunted-nightclub:too-loud-to-think';
export const ENVIRONMENT_MEMORY_FEATURE='environment:storm-drain-shrine:local-memory';
export const ENVIRONMENT_ODDS_FEATURE_RULES=Object.freeze({
  [ENVIRONMENT_NOISE_FEATURE]:Object.freeze({handler:'nightclub_auditory_disadvantage',kind:'disadvantage'}),
  [ENVIRONMENT_MEMORY_FEATURE]:Object.freeze({handler:'shrine_local_memory_advantage',kind:'advantage'})
});

export function createEnvironmentOddsContract({hash,fail}){
  if(typeof hash!=='function'||typeof fail!=='function')throw new TypeError('Environment odds require current source hashing and native failure capabilities.');
  function validateEnvironmentOddsProposal({feature,profile,entry,action,proposal,kind}){
    const expected=ENVIRONMENT_ODDS_FEATURE_RULES[feature?.feature_key];
    if(!expected||expected.kind!==kind||feature.status!=='supported'||feature.native_handler!==expected.handler
      ||feature.trigger_kind!=='passive'||feature.target_policy!=='none'
      ||feature.roll_protocol!==(kind==='advantage'?'native_pc_action_advantage':'native_pc_action_disadvantage')
      ||!Array.isArray(feature.costs)||feature.costs.length!==0||profile?.data?.template_hash!==feature.template_hash
      ||entry?.actor?.type!=='character'||entry?.intent_ref!==action?.record_key||entry?.actor?.key!==action?.data?.actor
      ||action?.data?.session_id!==profile?.data?.session||action?.data?.scene!==profile?.data?.scene
      ||proposal?.feature_ref!==feature.feature_key||proposal?.disposition!=='request_pc_action_roll'||proposal?.stakes_kind!=='attempt_only'
      ||proposal?.advantage!==(kind==='advantage')||proposal?.disadvantage!==(kind==='disadvantage')
      ||proposal?.experience_ref||!proposal?.reason?.trim()||!proposal?.rule_basis_refs?.includes('srd:action-rolls'))
      throw fail('environment_noise_exact_contextual_action_required');
    return {version:1,feature:feature.feature_key,feature_hash:hash(feature),environment:profile.record_key,environment_hash:hash(profile),
      action:action.record_key,applicability_ruling:proposal.reason,kind,amount:1};
  }
  return Object.freeze({validateEnvironmentOddsProposal});
}
