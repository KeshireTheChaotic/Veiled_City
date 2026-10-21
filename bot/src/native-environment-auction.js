/** Source-qualified GM auction prompt; auction terms remain fiction and audience-bound. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:glass-market-grand-concourse:auction-of-consequences';
const RULE='**Auction of Consequences — Action:** Put a campaign-relevant relic, secret, or person’s contract up for sale. Bids can include non-monetary costs.';

export function projectNativeEnvironmentAuctionContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_auction_context'
    ||contract?.handler!=='environment_auction_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Source-bound GM auction prompt; auction fiction remains GM-authored and audience-bound. Context alone records no bid, sale, transfer or PC commitment.'}];
}

export function nativeEnvironmentAuctionSituation(db,guild,scope,location){
  return projectNativeEnvironmentAuctionContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
