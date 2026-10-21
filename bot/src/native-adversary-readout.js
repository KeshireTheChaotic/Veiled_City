/** Exact Readout reaction cue; it neither infers supernatural identification nor grants Advantage. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:aster-vale-occult-analyst:readout';
const RULE='**Readout — Reaction:** When a PC uses an obvious supernatural feature, the Analyst may mark a Stress to identify its broad source and tell one allied adversary how to counter it; that adversary gains advantage on its next reaction roll against that feature.';

export function projectNativeAdversaryReadoutContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_readout_context'
    ||feature.type!=='Reaction'||feature.trigger_kind!=='on_scene_event'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_stress'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no source identification, disclosure, Stress, ally/counter choice, Advantage or roll is committed.'}];
}
