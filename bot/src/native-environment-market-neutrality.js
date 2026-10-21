/** Exact source-bound Market rule cue; social consequences remain GM-authored fiction. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:abandoned-mall-glass-market:no-violence-in-the-aisles';
const RULE='**No Violence in the Aisles — Passive:** The first party to knowingly break Market neutrality immediately loses standing and attracts enforcement.';

export function projectNativeEnvironmentMarketNeutralityContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_market_neutrality_context'
    ||contract?.handler!=='environment_market_neutrality_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound Market rule cue; the GM authors any fictional standing and enforcement response. Context records no violation or consequence.'}];
}

export function nativeEnvironmentMarketNeutralitySituation(db,guild,scope,location){
  return projectNativeEnvironmentMarketNeutralityContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
