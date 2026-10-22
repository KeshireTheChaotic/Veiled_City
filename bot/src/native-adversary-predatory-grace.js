/** Exact Predatory Grace cue; forced-movement events and per-scene immunity remain uncommitted. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:pale-court-knight:predatory-grace';
const RULE='**Predatory Grace — Passive:** The Knight ignores the first instance of forced movement each scene.';

export function projectNativeAdversaryPredatoryGraceContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_predatory_grace_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='before_movement_applied'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; forced-movement event matching and once-per-scene prevention are not committed.'}];
}
