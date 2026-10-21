/** Exact Peripheral passive cue; attention checks and roll outcomes remain native rulings. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:veil-burned-stalker:peripheral';
const RULE='**Peripheral — Passive:** Until the Stalker attacks or speaks directly to the PC, rolls to notice them are at disadvantage unless the PC is specifically searching.';

export function projectNativeAdversaryPeripheralContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_peripheral_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='passive'||feature.target_policy!=='none'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no attack/speech trigger, PC search state, notice roll modifier or outcome is committed.'}];
}
