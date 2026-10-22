/** Exact Pin to the Deal cue; attack, Stress and Restrained effects remain native. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:glass-market-knife:pin-to-the-deal';
const RULE='**Pin to the Deal — Action:** After a successful attack, mark a Stress to make the target **Restrained** by coat, clothing, or nearby terrain until they succeed on a Finesse or Strength Roll (12).';

export function projectNativeAdversaryPinToTheDealContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_pin_to_the_deal_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='after_successful_attack'||feature.target_policy!=='attack_target'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_stress'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; attack outcome, target, Stress, Restrained state, PC roll and expiry are not committed.'}];
}
