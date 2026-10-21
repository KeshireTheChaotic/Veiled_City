/** Source-qualified creative offer prompt; terms are fiction and acceptance stays with the PC. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:abandoned-mall-glass-market:everything-has-a-price';
const RULE='**Everything Has a Price — Action:** Present a useful item or answer at a cost tailored to the PC’s current problem. State the price before acceptance.';

export function projectNativeEnvironmentPriceOfferContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_price_offer_context'
    ||contract?.handler!=='environment_price_offer_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Source-bound creative offer prompt; the GM authors the useful item or answer and tailored price, states the price before acceptance, and the PC chooses whether to accept. Context alone records no trade.'}];
}

export function nativeEnvironmentPriceOfferSituation(db,guild,scope,location){
  return projectNativeEnvironmentPriceOfferContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
