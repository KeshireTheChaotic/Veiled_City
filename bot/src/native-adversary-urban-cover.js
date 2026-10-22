/** Exact Urban Cover cue; movement, range and concealment outcomes remain uncommitted. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:thorn-hound-of-the-green:urban-cover';
const RULE='**Urban Cover — Passive:** The Hound may move unseen between patches of vegetation, storm drains, medians, and neglected lots within Close range.';

export function projectNativeAdversaryUrbanCoverContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_urban_cover_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='passive'||feature.target_policy!=='within_close'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; live path/range, movement and concealment outcomes are not committed.'}];
}
