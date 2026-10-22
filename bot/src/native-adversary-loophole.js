/** Exact Clause-Eater Loophole cue; PC clarification and Stress remain native/player-owned. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
const FEATURE='adversary:clause-eater:loophole';
const RULE='**Loophole — Reaction:** When the PC invokes a pact, oath, written authority, or social promise, mark a Stress. The PC must clarify one limitation or exception; if none exists, they mark a Stress instead.';
export function projectNativeAdversaryLoopholeContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_clause_eater_loophole_context'
    ||feature.type!=='Reaction'||feature.trigger_kind!=='on_pc_invokes_obligation'||feature.target_policy!=='invoking_pc'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_stress'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; trigger proof, PC clarification, and all Stress/resource changes are not committed.'}];
}
