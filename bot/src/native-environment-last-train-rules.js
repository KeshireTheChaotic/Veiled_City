/** Exact Dead Platform departure rule and Difficulty cue for its entitled GM scene context. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:dead-platform:last-train-rules';
const RULE='**Last Train Rules — Passive:** Every departure requires a destination, a fare, and a stated reason. Lying to the platform increases Difficulty by 2.';

export function projectNativeEnvironmentLastTrainRulesContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_last_train_rules_context'
    ||contract?.handler!=='environment_last_train_rules_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound departure requirements and +2 Difficulty cue; the GM judges whether the PC-authored statement is a lie and sets the ruling. Context commits no PC statement, lie, dice result or action.'}];
}

export function nativeEnvironmentLastTrainRulesSituation(db,guild,scope,location){
  return projectNativeEnvironmentLastTrainRulesContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
