/** Native source-qualified adversary cues. Printed context is not mechanical execution, a PC declaration or disclosure authority. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
export function createNativeAdversaryContextProjectors({featureDisposition,nativeFeatureRuleContext}){
  const projectors={};
  {
const FEATURE='adversary:pale-court-thrall:break-the-hold';
const RULE='**Break the Hold — Reaction:** When the Thrall is shown undeniable proof that its master has abandoned it, the PC can make a Presence Roll (11). On a success, remove this Thrall from the conflict without defeating them.';

function projectNativeAdversaryBreakTheHoldContext(context){
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

    projectors.projectNativeAdversaryBreakTheHoldContext=projectNativeAdversaryBreakTheHoldContext;
  }
  {
const FEATURE='adversary:aster-vale-contractor:professional-entry';
const RULE='**Professional Entry — Passive:** The Contractor has advantage on the first roll made to breach, restrain, or surprise a prepared position.';

function projectNativeAdversaryProfessionalEntryContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_professional_entry_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='passive'||feature.target_policy!=='none'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no prepared-position ruling, first-use tracking or Advantage roll modifier is committed.'}];
}

    projectors.projectNativeAdversaryProfessionalEntryContext=projectNativeAdversaryProfessionalEntryContext;
  }
  {
const FEATURE='adversary:aster-vale-occult-analyst:mark-the-variable';
const RULE='**Mark the Variable — Action:** Mark a Stress to study a PC within Far range. Until the Analyst next takes Severe damage, one allied adversary gains +2 Difficulty against that PC’s next action.';

function projectNativeAdversaryMarkTheVariableContext(context){
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

    projectors.projectNativeAdversaryMarkTheVariableContext=projectNativeAdversaryMarkTheVariableContext;
  }
  {
const FEATURE='adversary:aster-vale-occult-analyst:readout';
const RULE='**Readout — Reaction:** When a PC uses an obvious supernatural feature, the Analyst may mark a Stress to identify its broad source and tell one allied adversary how to counter it; that adversary gains advantage on its next reaction roll against that feature.';

function projectNativeAdversaryReadoutContext(context){
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

    projectors.projectNativeAdversaryReadoutContext=projectNativeAdversaryReadoutContext;
  }
  {
const FEATURE='adversary:static-wraith:ride-the-current';
const RULE='**Ride the Current — Passive:** The Wraith can move between powered devices within Close range without crossing the intervening space.';

function projectNativeAdversaryRideTheCurrentContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_ride_the_current_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='passive'||feature.target_policy!=='none'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no powered-device eligibility, Close-range proof, destination, movement or replay state is committed.'}];
}

    projectors.projectNativeAdversaryRideTheCurrentContext=projectNativeAdversaryRideTheCurrentContext;
  }
  {
const FEATURE='adversary:veil-burned-stalker:peripheral';
const RULE='**Peripheral — Passive:** Until the Stalker attacks or speaks directly to the PC, rolls to notice them are at disadvantage unless the PC is specifically searching.';

function projectNativeAdversaryPeripheralContext(context){
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

    projectors.projectNativeAdversaryPeripheralContext=projectNativeAdversaryPeripheralContext;
  }
  {
const FEATURE='adversary:veil-burned-stalker:steal-the-focus';
const RULE='**Steal the Focus — Action:** Spend a Fear. Move the Stalker from Close to Melee range without a roll and make a standard attack. On a success, the PC also loses 1 Hope if they have any.';

function projectNativeAdversaryStealTheFocusContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_steal_the_focus_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='adversary_action'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no Fear transaction, range change, attack/damage roll, Hope loss or receipt is committed.'}];
}

    projectors.projectNativeAdversaryStealTheFocusContext=projectNativeAdversaryStealTheFocusContext;
  }
  {
const FEATURE='adversary:hexbound-familiar:sympathetic-relay';
const RULE='**Sympathetic Relay — Passive:** A hidden creator can originate simple Hex effects through the Familiar while it remains within Far range of the target.';

function projectNativeAdversarySympatheticRelayContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_sympathetic_relay_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='passive'||feature.target_policy!=='none'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no creator authority, target eligibility, Far-range proof or Hex effect is committed.'}];
}

    projectors.projectNativeAdversarySympatheticRelayContext=projectNativeAdversarySympatheticRelayContext;
  }
  {
const FEATURE='adversary:hexbound-familiar:snatch-a-link';
const RULE='**Snatch a Link — Action:** Make an attack roll against a target in Melee. On a success, deal no damage; instead the Familiar steals a small personal object, hair, blood trace, or similar sympathetic link if one is exposed.';

function projectNativeAdversarySnatchALinkContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_snatch_a_link_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='adversary_action'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no attack roll/damage, exposed-link finding, theft or inventory update is committed.'}];
}

    projectors.projectNativeAdversarySnatchALinkContext=projectNativeAdversarySnatchALinkContext;
  }
  {
const FEATURE='adversary:river-hound:flow-around-it';
const RULE='**Flow Around It — Passive:** The Hound can pass through gaps large enough for flowing water.';

function projectNativeAdversaryFlowAroundItContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_flow_around_it_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='passive'||feature.target_policy!=='none'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no gap-size ruling, passage or position change is committed.'}];
}

    projectors.projectNativeAdversaryFlowAroundItContext=projectNativeAdversaryFlowAroundItContext;
  }
  {
const FEATURE='adversary:river-hound:drag-down';
const RULE='**Drag Down — Action:** After a successful attack, spend a Fear to force a Strength Reaction Roll (12). On a failure, move the target to Very Close range toward the nearest significant water and make them **Vulnerable** until they regain footing.';

function projectNativeAdversaryDragDownContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_drag_down_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='adversary_action'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no Fear transaction, qualifying attack, PC Reaction Roll, movement, Vulnerable condition or recovery is committed.'}];
}

    projectors.projectNativeAdversaryDragDownContext=projectNativeAdversaryDragDownContext;
  }
  {
const FEATURE='adversary:memory-leech:blank-spot';
const RULE='**Blank Spot — Reaction:** When the Leech deals damage, the target makes a Knowledge Reaction Roll (12). On a failure, they temporarily lose access to one relevant Experience until the end of the scene.';

function projectNativeAdversaryBlankSpotContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_blank_spot_context'
    ||feature.type!=='Reaction'||feature.trigger_kind!=='after_adversary_damage'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; no damage event, PC Knowledge Roll, Experience choice or temporary access state is committed.'}];
}

    projectors.projectNativeAdversaryBlankSpotContext=projectNativeAdversaryBlankSpotContext;
  }
  {
const FEATURE='adversary:choir-relay:route-around';
const RULE='**Route Around — Reaction:** When an allied Signal adversary would mark its last HP, the Relay may mark 2 Stress to move that adversary to another powered device within Close range and leave it at 1 HP.';

function projectNativeAdversaryRouteAroundContext(context){
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

    projectors.projectNativeAdversaryRouteAroundContext=projectNativeAdversaryRouteAroundContext;
  }
  {
const FEATURE='adversary:glass-market-knife:terms-first';
const RULE='**Terms First — Passive:** If the Knife clearly states a debt and offers surrender before attacking, gain 1 Fear when the PC rejects the offer and immediately initiates violence.';

function projectNativeAdversaryTermsFirstContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_terms_first_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='after_pc_rejects_offer_initiates_violence'||feature.target_policy!=='source_actor_only'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; PC intent/event, offer truth, Fear spend and replay are not committed.'}];
}

    projectors.projectNativeAdversaryTermsFirstContext=projectNativeAdversaryTermsFirstContext;
  }
  {
const FEATURE='adversary:glass-market-knife:pin-to-the-deal';
const RULE='**Pin to the Deal — Action:** After a successful attack, mark a Stress to make the target **Restrained** by coat, clothing, or nearby terrain until they succeed on a Finesse or Strength Roll (12).';

function projectNativeAdversaryPinToTheDealContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_pin_to_the_deal_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='after_successful_attack'||feature.target_policy!=='attack_target'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_stress'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; attack outcome, target, Stress, Restrained state, PC roll and expiry are not committed.'}];
}

    projectors.projectNativeAdversaryPinToTheDealContext=projectNativeAdversaryPinToTheDealContext;
  }
  {
const FEATURE='adversary:morrowline-echo:i-saw-that';
const RULE='**I Saw That — Reaction:** Once per GM turn after the PC declares an action that directly repeats something they already attempted this scene, mark a Stress to give the roll disadvantage.';

function projectNativeAdversaryISawThatContext(context){
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

    projectors.projectNativeAdversaryISawThatContext=projectNativeAdversaryISawThatContext;
  }
  {
const FEATURE='adversary:morrowline-echo:self-fulfilling-event';
const RULE='**Self-Fulfilling Event — Action:** Spend a Fear and name a plausible immediate hazard already present in the scene. The PC makes an Agility or Instinct Reaction Roll (13). On a failure, take 1d8+3 damage and the hazard becomes real; on a success, take half damage or avoid the secondary complication.';

function projectNativeAdversarySelfFulfillingEventContext(context){
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

    projectors.projectNativeAdversarySelfFulfillingEventContext=projectNativeAdversarySelfFulfillingEventContext;
  }
  {
const FEATURE='adversary:cicada-runner:always-a-price';
const RULE='**Always a Price — Passive:** The Runner will answer one useful question if the PC offers information, access, or a favor of comparable value.';

function projectNativeAdversaryAlwaysAPriceContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_always_a_price_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='after_pc_offers_comparable_value'||feature.target_policy!=='one_question'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; PC offer, comparable-value assessment and NPC response are not committed.'}];
}

    projectors.projectNativeAdversaryAlwaysAPriceContext=projectNativeAdversaryAlwaysAPriceContext;
  }
  {
const FEATURE='adversary:morrowline-echo:bad-future';
const RULE='**Bad Future — Reaction:** When reduced to 3 HP or fewer, the Echo projects three possible outcomes. The GM truthfully states one danger, one opportunity, and one uncertainty in the current scene.';

function projectNativeAdversaryBadFutureContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_bad_future_context'
    ||feature.type!=='Reaction'||feature.trigger_kind!=='on_hp_at_or_below_three'||feature.target_policy!=='current_scene'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Owner-authorized source behavior: truthfully state one danger, one opportunity, and one uncertainty in the current scene; the GM retains creative latitude in their content.'}];
}

    projectors.projectNativeAdversaryBadFutureContext=projectNativeAdversaryBadFutureContext;
  }
  {
const FEATURE='adversary:cicada-runner:exit-clause';
const RULE='**Exit Clause — Reaction:** When threatened with violence, the Runner may spend a Fear to reveal a prearranged escape route or neutral-party protection. The PC can still pursue, but doing so has social consequences.';

function projectNativeAdversaryExitClauseContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_exit_clause_context'
    ||feature.type!=='Reaction'||feature.trigger_kind!=='when_threatened_with_violence'||feature.target_policy!=='current_scene'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; Fear spend, revealed route/protection, pursuit and social consequences are not committed. The PC may still choose to pursue.'}];
}

    projectors.projectNativeAdversaryExitClauseContext=projectNativeAdversaryExitClauseContext;
  }
  {
const FEATURE='adversary:pale-court-knight:predatory-grace';
const RULE='**Predatory Grace — Passive:** The Knight ignores the first instance of forced movement each scene.';

function projectNativeAdversaryPredatoryGraceContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_predatory_grace_context'
    ||feature.type!=='Passive'||feature.trigger_kind!=='before_movement_applied'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; forced-movement event matching and once-per-scene prevention are not committed.'}];
}

    projectors.projectNativeAdversaryPredatoryGraceContext=projectNativeAdversaryPredatoryGraceContext;
  }
  {
const FEATURE='adversary:pale-court-fixer:reputation-attack';
const RULE='**Reputation Attack — Action:** Mark a Stress and name an institution currently relevant to the PC. Until the PC presents leverage or clears the misunderstanding, rolls using that institution have disadvantage.';

function projectNativeAdversaryReputationAttackContext(context){
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

    projectors.projectNativeAdversaryReputationAttackContext=projectNativeAdversaryReputationAttackContext;
  }
  {
const FEATURE='adversary:pale-court-fixer:call-security';
const RULE='**Call Security — Action:** Spend a Fear to introduce two Pale Court Thralls or equivalent mundane security at Far range. They act according to the Fixer’s stated objective, not suicidal loyalty.';

function projectNativeAdversaryCallSecurityContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_call_security_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='on_fixer_calls_security'||feature.target_policy!=='two_at_far'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; Fear spend, security arrivals and their objective-bound actions are not committed. The security retain their own agency.'}];
}

    projectors.projectNativeAdversaryCallSecurityContext=projectNativeAdversaryCallSecurityContext;
  }
  {
const FEATURE='adversary:thorn-hound-of-the-green:urban-cover';
const RULE='**Urban Cover — Passive:** The Hound may move unseen between patches of vegetation, storm drains, medians, and neglected lots within Close range.';

function projectNativeAdversaryUrbanCoverContext(context){
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

    projectors.projectNativeAdversaryUrbanCoverContext=projectNativeAdversaryUrbanCoverContext;
  }
  {
const FEATURE='adversary:thorn-hound-of-the-green:root-snare';
const RULE='**Root Snare — Action:** A target within Close range makes an Agility Reaction Roll (15). On a failure, take 2d6+3 magic damage and become Restrained until freed.';

function projectNativeAdversaryRootSnareContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_root_snare_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='on_root_snare_action'||feature.target_policy!=='one_within_close'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==0
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; target/range proof, PC Agility Reaction Roll, damage, Restrained state and recovery are not committed.'}];
}

    projectors.projectNativeAdversaryRootSnareContext=projectNativeAdversaryRootSnareContext;
  }
  {
const FEATURE='adversary:clause-eater:loophole';
const RULE='**Loophole — Reaction:** When the PC invokes a pact, oath, written authority, or social promise, mark a Stress. The PC must clarify one limitation or exception; if none exists, they mark a Stress instead.';
function projectNativeAdversaryLoopholeContext(context){
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

    projectors.projectNativeAdversaryLoopholeContext=projectNativeAdversaryLoopholeContext;
  }
  {
const FEATURE='adversary:clause-eater:conflicting-duty';
const RULE='**Conflicting Duty — Action:** Spend a Fear. The PC makes a Presence Reaction Roll (15). On a failure, choose: mark 2 Stress, lose 1 Hope, or become Vulnerable until they publicly state which obligation they prioritize.';

function projectNativeAdversaryConflictingDutyContext(context){
  const exposed=context?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.actor_kind!=='adversary'||feature.native_handler!=='adversary_clause_eater_conflicting_duty_context'
    ||feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'||feature.target_policy!=='one'
    ||feature.roll_protocol!=='native_adversary_context'||feature.costs.length!==1
    ||feature.costs[0].resource!=='npc_fear'||feature.costs[0].amount!==1
    ||hash(feature)!==exposed.hash||context.template_hash!==feature.template_hash
    ||source?.catalog_status!=='supported'||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!==RULE)return [];
  return [{feature_ref:FEATURE,source_ref:feature.source_ref,text:source.printed_rule,
    authority:'Exact source-bound GM cue only; Fear payment, PC Presence roll, player consequence choice and effects are not committed.'}];
}

    projectors.projectNativeAdversaryConflictingDutyContext=projectNativeAdversaryConflictingDutyContext;
  }
  return Object.freeze(projectors);
}
