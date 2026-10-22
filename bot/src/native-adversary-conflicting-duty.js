/** Exact Clause-Eater Conflicting Duty cue; roll and consequence remain native/player-owned. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:clause-eater:conflicting-duty';
const RULE='**Conflicting Duty — Action:** Spend a Fear. The PC makes a Presence Reaction Roll (15). On a failure, choose: mark 2 Stress, lose 1 Hope, or become Vulnerable until they publicly state which obligation they prioritize.';

export function projectNativeAdversaryConflictingDutyContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_clause_eater_conflicting_duty_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; Fear payment, PC Presence roll, player consequence choice and effects are not committed.'}];
}
