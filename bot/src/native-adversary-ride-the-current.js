/** Exact Ride the Current passive cue; movement and device range are never committed here. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:static-wraith:ride-the-current';
const RULE='**Ride the Current — Passive:** The Wraith can move between powered devices within Close range without crossing the intervening space.';

export function projectNativeAdversaryRideTheCurrentContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_ride_the_current_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='passive'||feature.target_policy!=='none'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no powered-device eligibility, Close-range proof, destination, movement or replay state is committed.'}];
}
