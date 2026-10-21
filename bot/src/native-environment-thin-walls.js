/** Source-qualified passive witness-risk context; this never creates a witness. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:apartment-veil-breach:thin-walls';
export function projectNativeEnvironmentThinWallsContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_thin_walls_context'
    ||contract?.entry!=='scene_context'||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**Thin Walls — Passive:** Loud or spectacular actions risk adding witnesses.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive source cue only; no witness or PC action is created.'}];
}
export function nativeEnvironmentThinWallsSituation(db,guild,scope,location){
  return projectNativeEnvironmentThinWallsContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
