/** Exact Sympathetic Relay passive cue; creator and Hex effects are not authorized here. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:hexbound-familiar:sympathetic-relay';
const RULE='**Sympathetic Relay — Passive:** A hidden creator can originate simple Hex effects through the Familiar while it remains within Far range of the target.';

export function projectNativeAdversarySympatheticRelayContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_sympathetic_relay_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='passive'||feature.target_policy!=='none'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no creator authority, target eligibility, Far-range proof or Hex effect is committed.'}];
}
