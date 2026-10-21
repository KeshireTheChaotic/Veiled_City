/** Source-bound contamination trigger cue; native state/privacy gates commit any campaign change. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:occult-crime-scene:contaminated-scene';
const RULE='**Contaminated Scene — Passive:** The first careless supernatural effect used here raises Veil Exposure by 1 if mundane investigators are present.';

export function projectNativeEnvironmentContaminatedSceneContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_contaminated_scene_context'
    ||contract?.handler!=='environment_contaminated_scene_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound trigger and Veil Exposure cue; context itself applies no delta, and any campaign change remains behind existing native state/privacy gates.'}];
}

export function nativeEnvironmentContaminatedSceneSituation(db,guild,scope,location){
  return projectNativeEnvironmentContaminatedSceneContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
