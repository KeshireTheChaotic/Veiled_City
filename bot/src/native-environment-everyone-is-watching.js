/** Source-bound public reaction cue; witness fiction remains GM-authored and not persisted here. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:glass-market-grand-concourse:everyone-is-watching';
const RULE='**Everyone Is Watching — Reaction:** When the PC makes a public threat, promise, or bargain, record it as witnessed by at least one faction.';

export function projectNativeEnvironmentEveryoneIsWatchingContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_everyone_is_watching_context'
    ||contract?.handler!=='environment_everyone_is_watching_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound audience cue; the PC owns their public words and the GM authors any faction witness. Context creates no durable witness receipt or PC declaration.'}];
}

export function nativeEnvironmentEveryoneIsWatchingSituation(db,guild,scope,location){
  return projectNativeEnvironmentEveryoneIsWatchingContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
