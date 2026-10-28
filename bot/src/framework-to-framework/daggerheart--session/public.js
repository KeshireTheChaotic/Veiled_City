import {nativeMovementReaderSource} from '../../frameworks/daggerheart/public.js';
import {sessionNativeMovement} from '../../frameworks/session/public.js';
/** Uses the original native source engine; callback is never supplied by a model or source JSON. */
export function connectNativeSessionMovement(){return sessionNativeMovement.bind(nativeMovementReaderSource.movementFunction());}

import {nativeEnvironmentSession} from '../../frameworks/daggerheart/public.js';
import {conversationPrincipal,currentScene,scenePresence} from '../../frameworks/session/public.js';
export function connectNativeEnvironmentSession(){return nativeEnvironmentSession.bind({conversationPrincipal,currentScene,scenePresence});}

import {nativeScenes} from '../../frameworks/daggerheart/public.js';
import {sceneAccess,recordScenePresence} from '../../frameworks/session/public.js';
export function connectNativeScenes(){return nativeScenes.bind({currentScene,scenePresence,sceneAccess,recordScenePresence});}

import {RANGE_BANDS} from '../../frameworks/daggerheart/public.js';
import {sessionRangeBands} from '../../frameworks/session/public.js';
export function connectSessionRangeBands(){return sessionRangeBands.bind(RANGE_BANDS);}

import {nativePrincipals} from '../../frameworks/daggerheart/public.js';
import {historicalOwnerPrincipal} from '../../frameworks/session/public.js';
export function connectNativePrincipals(){return nativePrincipals.bind({conversationPrincipal,historicalOwnerPrincipal});}

import {nativeOwnerActionTerminal} from '../../frameworks/daggerheart/public.js';
import {overlapsOwnerActionTerminal,recordOwnerActionTerminal} from '../../frameworks/session/public.js';
export function connectNativeOwnerActionTerminal(){return nativeOwnerActionTerminal.bind({overlapsOwnerActionTerminal,recordOwnerActionTerminal});}

import {nativeActionConsentSource} from '../../frameworks/daggerheart/public.js';
import {sessionNativeActionConsent} from '../../frameworks/session/public.js';
/** Forward only the original native consent checks. */
export function connectSessionNativeActionConsent(){return sessionNativeActionConsent.bind({consentAction:nativeActionConsentSource.consentAction,validateActionConsent:nativeActionConsentSource.validateActionConsent,requestActionConsent:nativeActionConsentSource.requestActionConsent,respondActionConsent:nativeActionConsentSource.respondActionConsent,completedActionSource:nativeActionConsentSource.completedActionSource,historicalActionSource:nativeActionConsentSource.historicalActionSource});}

import {nativeSessionActionWindow} from '../../frameworks/daggerheart/public.js';
import {openActionWindow} from '../../frameworks/session/public.js';
export function connectNativeSessionActionWindow(){return nativeSessionActionWindow.bind({openActionWindow});}

import {nativeActionContinuation} from '../../frameworks/daggerheart/public.js';
import {sessionActionContinuation} from '../../frameworks/session/public.js';
/** Pass Session's original continuation drain to native rules unchanged. */
export function connectNativeActionContinuation(){return nativeActionContinuation.bind({drainActionContinuations:sessionActionContinuation.drainActionContinuations});}

import {nativePcActionEligibility,nativePvpResolutionReceipt,nativePvpPendingFear,nativePvpDamageApplication,nativePvpAttackRoll,nativeTypedRollProof} from '../../frameworks/daggerheart/public.js';
import {sessionNativeChecks} from '../../frameworks/session/public.js';
/** Pass native rules' original eligibility, PvP and typed-roll proof checks to Session unchanged. */
export function connectSessionNativeChecks(){return sessionNativeChecks.bind({assertPcCanAct:nativePcActionEligibility.assertPcCanAct,validatePvpResolutionReceipt:nativePvpResolutionReceipt.validatePvpResolutionReceipt,pendingPvpFear:nativePvpPendingFear.pendingPvpFear,validatePvpDamageApplication:nativePvpDamageApplication.validatePvpDamageApplication,validatePvpAttackRoll:nativePvpAttackRoll.validatePvpAttackRoll,typedRollProof:nativeTypedRollProof.typedRollProof});}

import {nativeMovementCondition,hasOwnerConsent,nativeActionReviewSource,nativeRulesArbitrationSource,nativeConditionRecoverySource} from '../../frameworks/daggerheart/public.js';
import {sessionNativeRules} from '../../frameworks/session/public.js';
/** Pass native rules' original movement condition, consent, review, arbitration and recovery functions to Session unchanged. */
export function connectSessionNativeRules(){return sessionNativeRules.bind({nativeMovementConditionIssue:nativeMovementCondition.nativeMovementConditionIssue,hasOwnerConsent,actionReviewOperation:nativeActionReviewSource.actionReviewOperation,adjudicateAcceptedIntent:nativeRulesArbitrationSource.adjudicateAcceptedIntent,clearNativeConditionFromOutcome:nativeConditionRecoverySource.clearNativeConditionFromOutcome});}
