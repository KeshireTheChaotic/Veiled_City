/** Exact Reputation Attack cue; target, Stress and institution-bound disadvantage remain uncommitted. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:pale-court-fixer:reputation-attack';
const RULE='**Reputation Attack — Action:** Mark a Stress and name an institution currently relevant to the PC. Until the PC presents leverage or clears the misunderstanding, rolls using that institution have disadvantage.';

export function projectNativeAdversaryReputationAttackContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_reputation_attack_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='on_reputation_attack_action'||feature.target_policy!=='one_pc'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_stress'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; target relevance, NPC Stress, institution selection, disadvantage and its end condition are not committed.'}];
}
