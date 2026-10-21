/** Exact source-bound barrier and route Difficulty cue; no mechanics are committed here. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:aster-vale-predictive-lab:containment-shutters';
const RULE='**Containment Shutters — Action:** Spend a Fear to divide the area with security barriers; escaping or reuniting routes requires a Difficulty 14 action.';

export function projectNativeEnvironmentContainmentShuttersContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_containment_shutters_context'
    ||contract?.handler!=='environment_containment_shutters_context'||contract?.entry!=='scene_context'||contract?.fear!==1
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound one-Fear and Difficulty 14 route cue; context spends no Fear, changes no barrier or route, and chooses or rolls for no PC.'}];
}

export function nativeEnvironmentContainmentShuttersSituation(db,guild,scope,location){
  return projectNativeEnvironmentContainmentShuttersContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
