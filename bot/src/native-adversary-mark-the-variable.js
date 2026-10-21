/** Exact Mark the Variable action cue; no NPC or PC mechanics are committed here. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:aster-vale-occult-analyst:mark-the-variable';
const RULE='**Mark the Variable — Action:** Mark a Stress to study a PC within Far range. Until the Analyst next takes Severe damage, one allied adversary gains +2 Difficulty against that PC’s next action.';

export function projectNativeAdversaryMarkTheVariableContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_mark_the_variable_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_stress'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no NPC Stress, PC/ally/target choice, Difficulty grant, PC action or expiry is committed.'}];
}
