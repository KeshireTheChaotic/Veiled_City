/** Source-qualified passive network context; a specific connection outcome remains unselected. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:district-blackout:no-ordinary-signal';
export function projectNativeEnvironmentNoOrdinarySignalContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_no_ordinary_signal_context'
    ||contract?.handler!=='environment_no_ordinary_signal_context'||contract?.entry!=='scene_context'
    ||contract?.effect!=='Exact passive source cue: cellular and normal network access is unreliable; alternate infrastructure or Signal magic is required. A connection attempt has no automatic outcome.'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**No Ordinary Signal — Passive:** Cellular and normal network access is unreliable; alternate infrastructure or Signal magic is required.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive source cue only; no specific connection attempt outcome is created.'}];
}
export function nativeEnvironmentNoOrdinarySignalSituation(db,guild,scope,location){
  return projectNativeEnvironmentNoOrdinarySignalContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
