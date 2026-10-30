/** Existing provider composition only; native policy is implemented in Daggerheart. */
import {nativePersonalContinuity} from './frameworks/daggerheart/public.js';
function personalCharacter(...args){return nativePersonalContinuity.personalCharacter(...args);}
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}
import {nativeWorldSource} from './frameworks/daggerheart/public.js';
function requireCitySource(...args){return nativeWorldSource.requireCitySource(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function cityAudit(...args){return nativeWorldEvents.cityAudit(...args);}function cityKey(...args){return nativeWorldEvents.cityKey(...args);}function cityObject(...args){return nativeWorldEvents.cityObject(...args);}function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import { rollRevision, rollBreakdown, rollTraitBreakdown, reserveRollAmendment } from "./roll-requests.js";
import {reserveRollPartyDisclosure,validateRollSharePreview,sourceConfirmedRollAttempt} from "./roll-sharing.js";
import { recordObservedAttack } from "./frameworks/daggerheart/public.js";
import { finalizeTypedRollAction } from "./typed-roll-outcomes.js";
import { assertNonPvpCombatant } from "./pvp-authority.js";
import { validatePvpAttackRoll } from "./pvp-attacks.js";
import { validatePvpDamageRoll } from "./pvp-damage.js";
import { validatePcDeathOutcome,blazeActionAuthorization,blazeCriticalResult,completeBlazeAction,validateBlazeSavedRoll } from "./pc-death.js";
import {assertPcCanAct,hopeCap} from "./pc-native-eligibility.js";
import {consentAction,historicalActionSource} from "./action-consent.js";
import {assertGmRulingRequest} from "./gm-action-ruling.js";
import {assertGmInvitationRequest,resumePendingGmActions} from './gm-native-rolls.js';
import {nativeAdversaryDamageDefense} from './native-feature-damage.js';
import {reconcileNativeFormationBreakdown} from './native-defense-aura.js';
import {validateNativeExperienceEligibility} from './native-experience-eligibility.js';
import {inspectNativeUnarmedAttack} from './native-unarmed-attacks.js';
import {assertPreRollFearRollAllowed} from './pre-roll-fear.js';
import {inspectNativeRollParticipation} from './native-roll-participation.js';
import {typedRollProof} from './typed-roll-proof.js';
import {createRollCollaborationRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createRollCollaborationRules({
sources:{personalCharacter:(...args)=>personalCharacter(...args),currentScene:(...args)=>currentScene(...args),sceneAccess:(...args)=>sceneAccess(...args),requireCitySource:(...args)=>requireCitySource(...args),cityAudit:(...args)=>cityAudit(...args),cityKey:(...args)=>cityKey(...args),cityObject:(...args)=>cityObject(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),validateRollSharePreview:(...args)=>validateRollSharePreview(...args),sourceConfirmedRollAttempt:(...args)=>sourceConfirmedRollAttempt(...args)},
outcomes:{recordObservedAttack:(...args)=>recordObservedAttack(...args),finalizeTypedRollAction:(...args)=>finalizeTypedRollAction(...args),resumePendingGmActions:(...args)=>resumePendingGmActions(...args),reserveRollAmendment:(...args)=>reserveRollAmendment(...args),reserveRollPartyDisclosure:(...args)=>reserveRollPartyDisclosure(...args)},
mechanics:{rollRevision:(...args)=>rollRevision(...args),rollBreakdown:(...args)=>rollBreakdown(...args),rollTraitBreakdown:(...args)=>rollTraitBreakdown(...args),assertNonPvpCombatant:(...args)=>assertNonPvpCombatant(...args),validatePvpAttackRoll:(...args)=>validatePvpAttackRoll(...args),validatePvpDamageRoll:(...args)=>validatePvpDamageRoll(...args),validatePcDeathOutcome:(...args)=>validatePcDeathOutcome(...args),blazeActionAuthorization:(...args)=>blazeActionAuthorization(...args),blazeCriticalResult:(...args)=>blazeCriticalResult(...args),completeBlazeAction:(...args)=>completeBlazeAction(...args),validateBlazeSavedRoll:(...args)=>validateBlazeSavedRoll(...args),assertPcCanAct:(...args)=>assertPcCanAct(...args),hopeCap:(...args)=>hopeCap(...args),consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),assertGmRulingRequest:(...args)=>assertGmRulingRequest(...args),assertGmInvitationRequest:(...args)=>assertGmInvitationRequest(...args),nativeAdversaryDamageDefense:(...args)=>nativeAdversaryDamageDefense(...args),reconcileNativeFormationBreakdown:(...args)=>reconcileNativeFormationBreakdown(...args),validateNativeExperienceEligibility:(...args)=>validateNativeExperienceEligibility(...args),inspectNativeUnarmedAttack:(...args)=>inspectNativeUnarmedAttack(...args),assertPreRollFearRollAllowed:(...args)=>assertPreRollFearRollAllowed(...args),inspectNativeRollParticipation:(...args)=>inspectNativeRollParticipation(...args),typedRollProof:(...args)=>typedRollProof(...args)}
});}
export function adjudicateRollSource(...args){return rules().adjudicateRollSource(...args);}
export function inspectUnrolledInterruptRequest(...args){return rules().inspectUnrolledInterruptRequest(...args);}
export function mayKnowRoll(...args){return rules().mayKnowRoll(...args);}
export function applyRollOutcome(...args){return rules().applyRollOutcome(...args);}
export function contributeRoll(...args){return rules().contributeRoll(...args);}
