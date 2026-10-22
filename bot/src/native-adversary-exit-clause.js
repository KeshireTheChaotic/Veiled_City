/** Exact Exit Clause cue; route, Fear and pursuit consequences remain native or fictional choices. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:cicada-runner:exit-clause';
const RULE='**Exit Clause — Reaction:** When threatened with violence, the Runner may spend a Fear to reveal a prearranged escape route or neutral-party protection. The PC can still pursue, but doing so has social consequences.';

export function projectNativeAdversaryExitClauseContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_exit_clause_context'
    ||feature.type!=='Reaction'||feature.trigger_kind!=='when_threatened_with_violence'||feature.target_policy!=='current_scene'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; Fear spend, revealed route/protection, pursuit and social consequences are not committed. The PC may still choose to pursue.'}];
}
