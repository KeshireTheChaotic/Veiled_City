/** Exact Blank Spot reaction cue; damage, PC roll and temporary Experience effects remain native. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:memory-leech:blank-spot';
const RULE='**Blank Spot — Reaction:** When the Leech deals damage, the target makes a Knowledge Reaction Roll (12). On a failure, they temporarily lose access to one relevant Experience until the end of the scene.';

export function projectNativeAdversaryBlankSpotContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_blank_spot_context'
    ||feature.type!=='Reaction'||feature.trigger_kind!=='after_adversary_damage'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no damage event, PC Knowledge Roll, Experience choice or temporary access state is committed.'}];
}
