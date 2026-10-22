/** Exact Always a Price cue; PC offer and NPC response remain fictional choices. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:cicada-runner:always-a-price';
const RULE='**Always a Price — Passive:** The Runner will answer one useful question if the PC offers information, access, or a favor of comparable value.';

export function projectNativeAdversaryAlwaysAPriceContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_always_a_price_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='after_pc_offers_comparable_value'||feature.target_policy!=='one_question'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; PC offer, comparable-value assessment and NPC response are not committed.'}];
}
