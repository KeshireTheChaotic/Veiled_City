/** Exact Route Around reaction cue; NPC resources and allied HP/location are not committed. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:choir-relay:route-around';
const RULE='**Route Around — Reaction:** When an allied Signal adversary would mark its last HP, the Relay may mark 2 Stress to move that adversary to another powered device within Close range and leave it at 1 HP.';

export function projectNativeAdversaryRouteAroundContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_route_around_context'
    ||feature.type!=='Reaction'||feature.trigger_kind!=='on_allied_last_hp'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_stress'||feature.costs[0].amount!==2
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no allied Signal binding, last-HP event, Stress spend, device/range proof, relocation or HP mutation is committed.'}];
}
