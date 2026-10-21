/** Exact Steal the Focus action cue; costs, movement, attack and Hope remain native commits. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:veil-burned-stalker:steal-the-focus';
const RULE='**Steal the Focus — Action:** Spend a Fear. Move the Stalker from Close to Melee range without a roll and make a standard attack. On a success, the PC also loses 1 Hope if they have any.';

export function projectNativeAdversaryStealTheFocusContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_steal_the_focus_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='adversary_action'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no Fear transaction, range change, attack/damage roll, Hope loss or receipt is committed.'}];
}
