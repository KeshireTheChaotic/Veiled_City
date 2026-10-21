/** Exact player-owned Presence option, disclosed only inside the verified GM actor context. */
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='adversary:pale-court-thrall:break-the-hold';
const RULE='**Break the Hold — Reaction:** When the Thrall is shown undeniable proof that its master has abandoned it, the PC can make a Presence Roll (11). On a success, remove this Thrall from the conflict without defeating them.';

export function projectNativeAdversaryBreakTheHoldContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_break_the_hold_context'
    ||feature.type!=='Reaction'||feature.trigger_kind!=='on_scene_event'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Source-bound GM cue only; proof remains GM-adjudicated and the PC chooses whether to roll. No roll, result or conflict removal is committed.'}];
}
