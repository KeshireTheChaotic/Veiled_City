/** Exact I Saw That cue; repeated-action tracking and disadvantage remain native. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:morrowline-echo:i-saw-that';
const RULE='**I Saw That — Reaction:** Once per GM turn after the PC declares an action that directly repeats something they already attempted this scene, mark a Stress to give the roll disadvantage.';

export function projectNativeAdversaryISawThatContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_i_saw_that_context'
    ||feature.type!=='Reaction'||feature.trigger_kind!=='after_repeated_pc_action_declared'||feature.target_policy!=='declared_pc_roll'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_stress'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; repeated-action proof, scene and turn limits, NPC Stress and roll disadvantage are not committed.'}];
}
