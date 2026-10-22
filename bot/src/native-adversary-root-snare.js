/** Exact Root Snare cue; PC dice, damage, condition and recovery remain native. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:thorn-hound-of-the-green:root-snare';
const RULE='**Root Snare — Action:** A target within Close range makes an Agility Reaction Roll (15). On a failure, take 2d6+3 magic damage and become Restrained until freed.';

export function projectNativeAdversaryRootSnareContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_root_snare_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='on_root_snare_action'||feature.target_policy!=='one_within_close'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; target/range proof, PC Agility Reaction Roll, damage, Restrained state and recovery are not committed.'}];
}
