/** Exact Self-Fulfilling Event cue; hazard and mechanical outcomes remain native. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:morrowline-echo:self-fulfilling-event';
const RULE='**Self-Fulfilling Event — Action:** Spend a Fear and name a plausible immediate hazard already present in the scene. The PC makes an Agility or Instinct Reaction Roll (13). On a failure, take 1d8+3 damage and the hazard becomes real; on a success, take half damage or avoid the secondary complication.';

export function projectNativeAdversarySelfFulfillingEventContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_self_fulfilling_event_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='after_gm_names_existing_hazard'||feature.target_policy!=='one_pc'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; Fear, hazard eligibility/creation, PC roll, damage, success choice and replay are not committed.'}];
}
