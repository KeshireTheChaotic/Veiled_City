/** Real Daggerheart incoming standard NPC attacks. Simulation d20 rows and GM prose are not damage authority. */
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import { currentScene, scenePresence, sceneAccess, RANGE_BANDS } from "./scene-continuity.js";
import {nativeWorldProxy} from './frameworks/daggerheart/public.js';
function activeCityProxy(...args){return nativeWorldProxy.activeCityProxy(...args);}
import { personalCharacter } from "./personal-continuity.js";
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}function historicalOwnerPrincipal(...args){return nativePrincipals.historicalOwnerPrincipal(...args);}
import { assertNonPvpCombatant } from "./pvp-authority.js";
import {assertPcAttackable} from "./pc-native-eligibility.js";
import {assertFearIncomingExecution} from "./pvp-fear-moves.js";
import {inspectNativeGmDecision,inspectCommittedGmDecision,commitGmActionCost} from './gm-action-capability.js';
import {captureIncomingFeatureWindows} from './native-feature-windows.js';
import {nativeAttackPassives,nativeStandardDamage,nativeDamageBonusExpression} from './native-feature-passives.js';
import {compileNativeFeatures} from './native-feature-catalog.js';
import {nativeHouseErratum} from './native-house-errata.js';
import {nativeHitFeatureCandidates,applyManyDeathsAfterIncoming} from './native-feature-hit.js';
import {nativeIncomingConditions,validateIncomingConditions,incomingConditionOdds,nativeAttackExpiryRevision} from './native-group-features.js';
import {settlePreRollFearForIncoming} from './pre-roll-fear.js';
import {PROFESSIONAL_ENTRY,professionalEntryRollState,commitProfessionalEntryUse,inspectProfessionalEntryUse} from './native-professional-entry.js';

import {createIncomingAttackRules} from './frameworks/daggerheart/public.js';
let nativeIncoming;
function rules(){return nativeIncoming??=createIncomingAttackRules({capabilities:{indexWorldEvent:(...args)=>indexWorldEvent(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),activeCityProxy:(...args)=>activeCityProxy(...args),personalCharacter:(...args)=>personalCharacter(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),historicalOwnerPrincipal:(...args)=>historicalOwnerPrincipal(...args),assertNonPvpCombatant:(...args)=>assertNonPvpCombatant(...args),assertPcAttackable:(...args)=>assertPcAttackable(...args),assertFearIncomingExecution:(...args)=>assertFearIncomingExecution(...args),inspectNativeGmDecision:(...args)=>inspectNativeGmDecision(...args),inspectCommittedGmDecision:(...args)=>inspectCommittedGmDecision(...args),commitGmActionCost:(...args)=>commitGmActionCost(...args),captureIncomingFeatureWindows:(...args)=>captureIncomingFeatureWindows(...args),nativeAttackPassives:(...args)=>nativeAttackPassives(...args),nativeStandardDamage:(...args)=>nativeStandardDamage(...args),nativeDamageBonusExpression:(...args)=>nativeDamageBonusExpression(...args),compileNativeFeatures:(...args)=>compileNativeFeatures(...args),nativeHouseErratum:(...args)=>nativeHouseErratum(...args),nativeHitFeatureCandidates:(...args)=>nativeHitFeatureCandidates(...args),applyManyDeathsAfterIncoming:(...args)=>applyManyDeathsAfterIncoming(...args),nativeIncomingConditions:(...args)=>nativeIncomingConditions(...args),validateIncomingConditions:(...args)=>validateIncomingConditions(...args),incomingConditionOdds:(...args)=>incomingConditionOdds(...args),nativeAttackExpiryRevision:(...args)=>nativeAttackExpiryRevision(...args),settlePreRollFearForIncoming:(...args)=>settlePreRollFearForIncoming(...args),professionalEntryRollState:(...args)=>professionalEntryRollState(...args),commitProfessionalEntryUse:(...args)=>commitProfessionalEntryUse(...args),inspectProfessionalEntryUse:(...args)=>inspectProfessionalEntryUse(...args),RANGE_BANDS,PROFESSIONAL_ENTRY}});}
export function inspectIncomingCandidate(...args){return rules().inspectIncomingCandidate(...args);}
export function inspectVolleyCandidate(...args){return rules().inspectVolleyCandidate(...args);}
export function prepareArbitratedVolley(...args){return rules().prepareArbitratedVolley(...args);}
export function inspectVolley(...args){return rules().inspectVolley(...args);}
export function authorizeIncomingOffer(...args){return rules().authorizeIncomingOffer(...args);}
export function prepareIncomingAttack(...args){return rules().prepareIncomingAttack(...args);}
export function prepareArbitratedIncomingAttack(...args){return rules().prepareArbitratedIncomingAttack(...args);}
export function reviewIncomingAttack(...args){return rules().reviewIncomingAttack(...args);}
export function withholdIncomingDefense(...args){return rules().withholdIncomingDefense(...args);}
export function confirmIncomingDefense(...args){return rules().confirmIncomingDefense(...args);}
export function rollIncomingAttack(...args){return rules().rollIncomingAttack(...args);}
export function rollArbitratedIncomingAttack(...args){return rules().rollArbitratedIncomingAttack(...args);}
export function rollAutonomousFearIncomingAttack(...args){return rules().rollAutonomousFearIncomingAttack(...args);}
export function incomingRollProjection(...args){return rules().incomingRollProjection(...args);}
export function incomingAttackEvidence(...args){return rules().incomingAttackEvidence(...args);}
export function resolveIncomingDamage(...args){return rules().resolveIncomingDamage(...args);}
export function validateIncomingDamageApplication(...args){return rules().validateIncomingDamageApplication(...args);}
export function visibleIncomingInjury(...args){return rules().visibleIncomingInjury(...args);}
