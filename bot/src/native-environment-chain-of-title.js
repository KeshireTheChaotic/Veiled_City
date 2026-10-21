/** Source-qualified passive records-tracing cue; no title or pact result is inferred. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:archive-beneath-the-courthouse:chain-of-title';
export function projectNativeEnvironmentChainOfTitleContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_chain_of_title_context'
    ||contract?.entry!=='scene_context'||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**Chain of Title — Passive:** Ownership, threshold, and pact magic used here can often be traced through mundane property records.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive source cue only; no record, ownership or pact result is created.'}];
}
export function nativeEnvironmentChainOfTitleSituation(db,guild,scope,location){
  return projectNativeEnvironmentChainOfTitleContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
