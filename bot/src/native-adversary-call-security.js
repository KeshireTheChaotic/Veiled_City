/** Exact Call Security cue; Fear, arrivals and security choices remain uncommitted. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:pale-court-fixer:call-security';
const RULE='**Call Security — Action:** Spend a Fear to introduce two Pale Court Thralls or equivalent mundane security at Far range. They act according to the Fixer’s stated objective, not suicidal loyalty.';

export function projectNativeAdversaryCallSecurityContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_call_security_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='on_fixer_calls_security'||feature.target_policy!=='two_at_far'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; Fear spend, security arrivals and their objective-bound actions are not committed. The security retain their own agency.'}];
}
