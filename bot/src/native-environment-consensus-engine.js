/** Source-qualified pre-action risk cue; Veil Exposure outcomes stay with source rules and native resolution. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:veil-anchor-chamber:consensus-engine';
export function projectNativeEnvironmentConsensusEngineContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_consensus_engine_context'
    ||contract?.handler!=='environment_consensus_engine_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**Consensus Engine — Passive:** Obvious supernatural actions inside may alter Veil Exposure in unexpected directions; the GM should state the risk before a voluntary action.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive pre-action risk cue only; no Veil Exposure change is authored.'}];
}
export function nativeEnvironmentConsensusEngineSituation(db,guild,scope,location){
  return projectNativeEnvironmentConsensusEngineContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
