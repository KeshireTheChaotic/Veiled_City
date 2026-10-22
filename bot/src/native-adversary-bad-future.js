/** Exact Bad Future cue; the GM keeps creative latitude inside the owner's authorized three-part truth. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:morrowline-echo:bad-future';
const RULE='**Bad Future — Reaction:** When reduced to 3 HP or fewer, the Echo projects three possible outcomes. The GM truthfully states one danger, one opportunity, and one uncertainty in the current scene.';

export function projectNativeAdversaryBadFutureContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_bad_future_context'
    ||feature.type!=='Reaction'||feature.trigger_kind!=='on_hp_at_or_below_three'||feature.target_policy!=='current_scene'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Owner-authorized source behavior: truthfully state one danger, one opportunity, and one uncertainty in the current scene; the GM retains creative latitude in their content.'}];
}
