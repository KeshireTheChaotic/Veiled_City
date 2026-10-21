/** Exact Snatch a Link action cue; attack, discovery and theft need native proof. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:hexbound-familiar:snatch-a-link';
const RULE='**Snatch a Link — Action:** Make an attack roll against a target in Melee. On a success, deal no damage; instead the Familiar steals a small personal object, hair, blood trace, or similar sympathetic link if one is exposed.';

export function projectNativeAdversarySnatchALinkContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_snatch_a_link_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='adversary_action'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no attack roll/damage, exposed-link finding, theft or inventory update is committed.'}];
}
