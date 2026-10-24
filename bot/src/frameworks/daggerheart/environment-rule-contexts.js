/** Exact current source-qualified environment rule contexts. No world mutation, execution, PC action, consent or disclosure is authorized here. */
import {jsonHash as hash} from '../../kernel/json-hash.js';

export function createNativeEnvironmentAuctionContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:glass-market-grand-concourse:auction-of-consequences.');


const FEATURE='environment:glass-market-grand-concourse:auction-of-consequences';
const RULE='**Auction of Consequences — Action:** Put a campaign-relevant relic, secret, or person’s contract up for sale. Bids can include non-monetary costs.';

function projectNativeEnvironmentAuctionContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_auction_context'
    ||contract?.handler!=='environment_auction_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Source-bound GM auction prompt; auction fiction remains GM-authored and audience-bound. Context alone records no bid, sale, transfer or PC commitment.'}];
}

function nativeEnvironmentAuctionSituation(db,guild,scope,location){
  return projectNativeEnvironmentAuctionContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentAuctionContext,nativeEnvironmentAuctionSituation});
}

export function createNativeEnvironmentChainOfTitleContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:archive-beneath-the-courthouse:chain-of-title.');


const FEATURE='environment:archive-beneath-the-courthouse:chain-of-title';
function projectNativeEnvironmentChainOfTitleContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_chain_of_title_context'
    ||contract?.entry!=='scene_context'||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**Chain of Title — Passive:** Ownership, threshold, and pact magic used here can often be traced through mundane property records.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive source cue only; no record, ownership or pact result is created.'}];
}
function nativeEnvironmentChainOfTitleSituation(db,guild,scope,location){
  return projectNativeEnvironmentChainOfTitleContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentChainOfTitleContext,nativeEnvironmentChainOfTitleSituation});
}

export function createNativeEnvironmentConsensusEngineContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:veil-anchor-chamber:consensus-engine.');


const FEATURE='environment:veil-anchor-chamber:consensus-engine';
function projectNativeEnvironmentConsensusEngineContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_consensus_engine_context'
    ||contract?.handler!=='environment_consensus_engine_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**Consensus Engine — Passive:** Obvious supernatural actions inside may alter Veil Exposure in unexpected directions; the GM should state the risk before a voluntary action.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive pre-action risk cue only; no Veil Exposure change is authored.'}];
}
function nativeEnvironmentConsensusEngineSituation(db,guild,scope,location){
  return projectNativeEnvironmentConsensusEngineContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentConsensusEngineContext,nativeEnvironmentConsensusEngineSituation});
}

export function createNativeEnvironmentContainmentShuttersContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:aster-vale-predictive-lab:containment-shutters.');


const FEATURE='environment:aster-vale-predictive-lab:containment-shutters';
const RULE='**Containment Shutters — Action:** Spend a Fear to divide the area with security barriers; escaping or reuniting routes requires a Difficulty 14 action.';

function projectNativeEnvironmentContainmentShuttersContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_containment_shutters_context'
    ||contract?.handler!=='environment_containment_shutters_context'||contract?.entry!=='scene_context'||contract?.fear!==1
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound one-Fear and Difficulty 14 route cue; context spends no Fear, changes no barrier or route, and chooses or rolls for no PC.'}];
}

function nativeEnvironmentContainmentShuttersSituation(db,guild,scope,location){
  return projectNativeEnvironmentContainmentShuttersContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentContainmentShuttersContext,nativeEnvironmentContainmentShuttersSituation});
}

export function createNativeEnvironmentContaminatedSceneContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:occult-crime-scene:contaminated-scene.');


const FEATURE='environment:occult-crime-scene:contaminated-scene';
const RULE='**Contaminated Scene — Passive:** The first careless supernatural effect used here raises Veil Exposure by 1 if mundane investigators are present.';

function projectNativeEnvironmentContaminatedSceneContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_contaminated_scene_context'
    ||contract?.handler!=='environment_contaminated_scene_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound trigger and Veil Exposure cue; context itself applies no delta, and any campaign change remains behind existing native state/privacy gates.'}];
}

function nativeEnvironmentContaminatedSceneSituation(db,guild,scope,location){
  return projectNativeEnvironmentContaminatedSceneContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentContaminatedSceneContext,nativeEnvironmentContaminatedSceneSituation});
}

export function createNativeEnvironmentEveryoneIsWatchingContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:glass-market-grand-concourse:everyone-is-watching.');


const FEATURE='environment:glass-market-grand-concourse:everyone-is-watching';
const RULE='**Everyone Is Watching — Reaction:** When the PC makes a public threat, promise, or bargain, record it as witnessed by at least one faction.';

function projectNativeEnvironmentEveryoneIsWatchingContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_everyone_is_watching_context'
    ||contract?.handler!=='environment_everyone_is_watching_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound audience cue; the PC owns their public words and the GM authors any faction witness. Context creates no durable witness receipt or PC declaration.'}];
}

function nativeEnvironmentEveryoneIsWatchingSituation(db,guild,scope,location){
  return projectNativeEnvironmentEveryoneIsWatchingContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentEveryoneIsWatchingContext,nativeEnvironmentEveryoneIsWatchingSituation});
}

export function createNativeEnvironmentExpressThroughMemoryContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:dead-platform:express-through-memory.');


const FEATURE='environment:dead-platform:express-through-memory';
const RULE='**Express Through Memory — Action:** The PC makes a Knowledge Reaction Roll (14); on a failure, the next train opens onto a location associated with a painful memory rather than the intended stop.';

function projectNativeEnvironmentExpressThroughMemoryContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_express_through_memory_context'
    ||contract?.handler!=='environment_express_through_memory_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound reaction and failure cue; the PC chooses their departure, declared destination and dice, while the GM authors any painful-memory location. Context commits no roll or consequence.'}];
}

function nativeEnvironmentExpressThroughMemorySituation(db,guild,scope,location){
  return projectNativeEnvironmentExpressThroughMemoryContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentExpressThroughMemoryContext,nativeEnvironmentExpressThroughMemorySituation});
}

export function createNativeEnvironmentGuestRightContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:pale-court-townhouse:guest-right.');


const FEATURE='environment:pale-court-townhouse:guest-right';
function projectNativeEnvironmentGuestRightContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_guest_right_context'
    ||contract?.handler!=='environment_guest_right_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**Guest Right — Passive:** A guest who accepts formal hospitality gains protection from unprovoked violence by the host but is expected to obey explicitly stated house rules.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact conditional source cue only; no hospitality acceptance, protection or house-rule agreement is inferred.'}];
}
function nativeEnvironmentGuestRightSituation(db,guild,scope,location){
  return projectNativeEnvironmentGuestRightContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentGuestRightContext,nativeEnvironmentGuestRightSituation});
}

export function createNativeEnvironmentLastTrainRulesContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:dead-platform:last-train-rules.');


const FEATURE='environment:dead-platform:last-train-rules';
const RULE='**Last Train Rules — Passive:** Every departure requires a destination, a fare, and a stated reason. Lying to the platform increases Difficulty by 2.';

function projectNativeEnvironmentLastTrainRulesContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_last_train_rules_context'
    ||contract?.handler!=='environment_last_train_rules_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound departure requirements and +2 Difficulty cue; the GM judges whether the PC-authored statement is a lie and sets the ruling. Context commits no PC statement, lie, dice result or action.'}];
}

function nativeEnvironmentLastTrainRulesSituation(db,guild,scope,location){
  return projectNativeEnvironmentLastTrainRulesContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentLastTrainRulesContext,nativeEnvironmentLastTrainRulesSituation});
}

export function createNativeEnvironmentMarketNeutralityContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:abandoned-mall-glass-market:no-violence-in-the-aisles.');


const FEATURE='environment:abandoned-mall-glass-market:no-violence-in-the-aisles';
const RULE='**No Violence in the Aisles — Passive:** The first party to knowingly break Market neutrality immediately loses standing and attracts enforcement.';

function projectNativeEnvironmentMarketNeutralityContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_market_neutrality_context'
    ||contract?.handler!=='environment_market_neutrality_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound Market rule cue; the GM authors any fictional standing and enforcement response. Context records no violation or consequence.'}];
}

function nativeEnvironmentMarketNeutralitySituation(db,guild,scope,location){
  return projectNativeEnvironmentMarketNeutralityContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentMarketNeutralityContext,nativeEnvironmentMarketNeutralitySituation});
}

export function createNativeEnvironmentMetaphorPhysicsContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:networked-dream:metaphor-is-physics.');


const FEATURE='environment:networked-dream:metaphor-is-physics';
function projectNativeEnvironmentMetaphorPhysicsContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_metaphor_physics_context'
    ||contract?.entry!=='scene_context'||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**Metaphor Is Physics — Passive:** Clever symbolic actions can substitute for literal tools if the player explains the connection.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive invitation only; the player owns their action and native adjudication owns its result.'}];
}
function nativeEnvironmentMetaphorPhysicsSituation(db,guild,scope,location){
  return projectNativeEnvironmentMetaphorPhysicsContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentMetaphorPhysicsContext,nativeEnvironmentMetaphorPhysicsSituation});
}

export function createNativeEnvironmentModelRoomContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:aster-vale-predictive-lab:model-room.');


const FEATURE='environment:aster-vale-predictive-lab:model-room';
const RULE='**Model Room — Action:** Reveal a forecast that is frighteningly accurate but incomplete. The PC may take a Hope by accepting that one listed risk is real and immediately relevant.';

function projectNativeEnvironmentModelRoomContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_model_room_context'
    ||contract?.handler!=='environment_model_room_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Source-bound GM forecast prompt; forecast remains fiction, the PC decides whether to accept the risk and take Hope, and context alone changes no resource.'}];
}

function nativeEnvironmentModelRoomSituation(db,guild,scope,location){
  return projectNativeEnvironmentModelRoomContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentModelRoomContext,nativeEnvironmentModelRoomSituation});
}

export function createNativeEnvironmentNoConsensusContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:rupture-district:no-consensus.');


const FEATURE='environment:rupture-district:no-consensus';
function projectNativeEnvironmentNoConsensusContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_no_consensus_context'
    ||contract?.entry!=='scene_context'||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**No Consensus — Passive:** Each major scene may obey a different supernatural logic. State the current rule clearly when the PC can perceive it.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive GM cue only; no supernatural rule or PC perception is created.'}];
}
function nativeEnvironmentNoConsensusSituation(db,guild,scope,location){
  return projectNativeEnvironmentNoConsensusContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentNoConsensusContext,nativeEnvironmentNoConsensusSituation});
}

export function createNativeEnvironmentNoOrdinarySignalContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:district-blackout:no-ordinary-signal.');


const FEATURE='environment:district-blackout:no-ordinary-signal';
function projectNativeEnvironmentNoOrdinarySignalContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_no_ordinary_signal_context'
    ||contract?.handler!=='environment_no_ordinary_signal_context'||contract?.entry!=='scene_context'
    ||contract?.effect!=='Exact passive source cue: cellular and normal network access is unreliable; alternate infrastructure or Signal magic is required. A connection attempt has no automatic outcome.'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**No Ordinary Signal — Passive:** Cellular and normal network access is unreliable; alternate infrastructure or Signal magic is required.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive source cue only; no specific connection attempt outcome is created.'}];
}
function nativeEnvironmentNoOrdinarySignalSituation(db,guild,scope,location){
  return projectNativeEnvironmentNoOrdinarySignalContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentNoOrdinarySignalContext,nativeEnvironmentNoOrdinarySignalSituation});
}

export function createNativeEnvironmentPriceOfferContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:abandoned-mall-glass-market:everything-has-a-price.');


const FEATURE='environment:abandoned-mall-glass-market:everything-has-a-price';
const RULE='**Everything Has a Price — Action:** Present a useful item or answer at a cost tailored to the PC’s current problem. State the price before acceptance.';

function projectNativeEnvironmentPriceOfferContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_price_offer_context'
    ||contract?.handler!=='environment_price_offer_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Source-bound creative offer prompt; the GM authors the useful item or answer and tailored price, states the price before acceptance, and the PC chooses whether to accept. Context alone records no trade.'}];
}

function nativeEnvironmentPriceOfferSituation(db,guild,scope,location){
  return projectNativeEnvironmentPriceOfferContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentPriceOfferContext,nativeEnvironmentPriceOfferSituation});
}

export function createNativeEnvironmentPrivateRoomContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:pale-court-townhouse:private-room.');


const FEATURE='environment:pale-court-townhouse:private-room';
const RULE='**Private Room — Action:** An NPC offers a confidential conversation that grants leverage but separates the PC from allies or exits.';

function projectNativeEnvironmentPrivateRoomContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_private_room_context'
    ||contract?.handler!=='environment_private_room_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Source-bound GM fiction prompt; narration remains GM-authored, the PC response remains player-owned, and context alone records no acceptance or consequence.'}];
}

function nativeEnvironmentPrivateRoomSituation(db,guild,scope,location){
  return projectNativeEnvironmentPrivateRoomContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentPrivateRoomContext,nativeEnvironmentPrivateRoomSituation});
}

export function createNativeEnvironmentProcedureContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:after-hours-emergency-department:hipaa-and-procedure.');


const FEATURE='environment:after-hours-emergency-department:hipaa-and-procedure';
function projectNativeEnvironmentProcedureContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_patient_procedure_context'
    ||contract?.entry!=='scene_context'||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**HIPAA and Procedure — Passive:** Routine access to patient information requires appropriate credentials, consent, or a credible workaround.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive source context only; no credential, consent, workaround or access outcome is created.'}];
}
function nativeEnvironmentProcedureSituation(db,guild,scope,location){
  return projectNativeEnvironmentProcedureContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentProcedureContext,nativeEnvironmentProcedureSituation});
}

export function createNativeEnvironmentSealedDocketContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:archive-beneath-the-courthouse:sealed-docket.');


const FEATURE='environment:archive-beneath-the-courthouse:sealed-docket';
const RULE='**Sealed Docket — Action:** Reveal a document that changes the legal or supernatural interpretation of a current conflict. Accessing it requires sacrificing time, secrecy, or a favor.';

function projectNativeEnvironmentSealedDocketContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_sealed_docket_context'
    ||contract?.handler!=='environment_sealed_docket_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Source-bound GM docket prompt; the document and interpretation remain GM-authored, the PC owns their response, and context alone records no document or cost agreement.'}];
}

function nativeEnvironmentSealedDocketSituation(db,guild,scope,location){
  return projectNativeEnvironmentSealedDocketContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentSealedDocketContext,nativeEnvironmentSealedDocketSituation});
}

export function createNativeEnvironmentThinWallsContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:apartment-veil-breach:thin-walls.');


const FEATURE='environment:apartment-veil-breach:thin-walls';
function projectNativeEnvironmentThinWallsContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_thin_walls_context'
    ||contract?.entry!=='scene_context'||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**Thin Walls — Passive:** Loud or spectacular actions risk adding witnesses.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive source cue only; no witness or PC action is created.'}];
}
function nativeEnvironmentThinWallsSituation(db,guild,scope,location){
  return projectNativeEnvironmentThinWallsContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentThinWallsContext,nativeEnvironmentThinWallsSituation});
}

export function createNativeEnvironmentThirdRailSpiritContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:dead-platform:third-rail-spirit.');


const FEATURE='environment:dead-platform:third-rail-spirit';
const RULE='**Third Rail Spirit — Action:** Spend a Fear to manifest a hostile current across a route, dealing 2d8+3 magic damage on a failed Agility Reaction Roll.';

function projectNativeEnvironmentThirdRailSpiritContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_third_rail_spirit_context'
    ||contract?.handler!=='environment_third_rail_spirit_context'||contract?.entry!=='scene_context'||contract?.fear!==1
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound Fear and failed reaction damage cue; context spends no Fear, chooses no route or target, rolls no PC dice and commits no damage.'}];
}

function nativeEnvironmentThirdRailSpiritSituation(db,guild,scope,location){
  return projectNativeEnvironmentThirdRailSpiritContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentThirdRailSpiritContext,nativeEnvironmentThirdRailSpiritSituation});
}

export function createNativeEnvironmentThreeVectorsContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:occult-crime-scene:three-vectors.');


const FEATURE='environment:occult-crime-scene:three-vectors';
const RULE='**Three Vectors — Action:** Offer three clue vectors from physical, digital, witness, occult, financial, historical, relationship, or contradiction evidence. The PC chooses one to pursue; on Fear, another interested party moves on a different vector.';

function projectNativeEnvironmentThreeVectorsContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_three_vectors_context'
    ||contract?.handler!=='environment_three_vectors_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Source-bound clue prompt; the PC chooses a vector and the GM authors clues and any interested-party movement. Context records no clue, choice, roll or movement.'}];
}

function nativeEnvironmentThreeVectorsSituation(db,guild,scope,location){
  return projectNativeEnvironmentThreeVectorsContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentThreeVectorsContext,nativeEnvironmentThreeVectorsSituation});
}

export function createNativeEnvironmentWrongOfferingContext({nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext}){
if([nativeEnvironmentInstanceForScope,environmentProposalContract,featureDisposition,nativeFeatureRuleContext].some(fn=>typeof fn!=='function'))throw new TypeError('Complete source capabilities required for environment:storm-drain-shrine:wrong-offering.');


const FEATURE='environment:storm-drain-shrine:wrong-offering';
const RULE='**Wrong Offering — Reaction:** When someone desecrates or carelessly removes an offering, the environment becomes hostile until restitution is made.';

function projectNativeEnvironmentWrongOfferingContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_wrong_offering_context'
    ||contract?.handler!=='environment_wrong_offering_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound shrine reaction cue; the GM authors any hostile response and restitution. Context records no PC action or consequence.'}];
}

function nativeEnvironmentWrongOfferingSituation(db,guild,scope,location){
  return projectNativeEnvironmentWrongOfferingContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}

return Object.freeze({projectNativeEnvironmentWrongOfferingContext,nativeEnvironmentWrongOfferingSituation});
}
