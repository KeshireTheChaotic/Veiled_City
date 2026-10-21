/** Source-qualified conditional hospitality cue; the native adapter never infers acceptance. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:pale-court-townhouse:guest-right';
export function projectNativeEnvironmentGuestRightContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_guest_right_context'
    ||contract?.handler!=='environment_guest_right_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**Guest Right — Passive:** A guest who accepts formal hospitality gains protection from unprovoked violence by the host but is expected to obey explicitly stated house rules.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact conditional source cue only; no hospitality acceptance, protection or house-rule agreement is inferred.'}];
}
export function nativeEnvironmentGuestRightSituation(db,guild,scope,location){
  return projectNativeEnvironmentGuestRightContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
