/** Source-qualified passive scene-logic instruction; no supernatural rule is authored here. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:rupture-district:no-consensus';
export function projectNativeEnvironmentNoConsensusContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_no_consensus_context'
    ||contract?.entry!=='scene_context'||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**No Consensus — Passive:** Each major scene may obey a different supernatural logic. State the current rule clearly when the PC can perceive it.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive GM cue only; no supernatural rule or PC perception is created.'}];
}
export function nativeEnvironmentNoConsensusSituation(db,guild,scope,location){
  return projectNativeEnvironmentNoConsensusContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
