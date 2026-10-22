/** Exact Terms First cue; the PC event and NPC Fear mutation remain native. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:glass-market-knife:terms-first';
const RULE='**Terms First — Passive:** If the Knife clearly states a debt and offers surrender before attacking, gain 1 Fear when the PC rejects the offer and immediately initiates violence.';

export function projectNativeAdversaryTermsFirstContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_terms_first_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='after_pc_rejects_offer_initiates_violence'||feature.target_policy!=='source_actor_only'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; PC intent/event, offer truth, Fear spend and replay are not committed.'}];
}
