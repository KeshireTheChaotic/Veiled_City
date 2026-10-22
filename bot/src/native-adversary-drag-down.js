/** Exact Drag Down action cue; Fear and PC Reaction outcomes remain native. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:river-hound:drag-down';
const RULE='**Drag Down — Action:** After a successful attack, spend a Fear to force a Strength Reaction Roll (12). On a failure, move the target to Very Close range toward the nearest significant water and make them **Vulnerable** until they regain footing.';

export function projectNativeAdversaryDragDownContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_drag_down_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='adversary_action'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no Fear transaction, qualifying attack, PC Reaction Roll, movement, Vulnerable condition or recovery is committed.'}];
}
