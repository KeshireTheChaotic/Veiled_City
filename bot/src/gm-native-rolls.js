/** Thin native execution bridge: player invitations never roll until their real owner submits. */
import {inspectNativeGmDecision,commitGmActionCost} from './gm-action-capability.js';
import {prepareArbitratedIncomingAttack,prepareArbitratedVolley,inspectVolley} from './pc-incoming.js';
import {EncounterLibrary} from './encounter.js';
import {nativePersonalContinuity} from './frameworks/daggerheart/public.js';
function personalCharacter(...args){return nativePersonalContinuity.personalCharacter(...args);}
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {nativeWorldInput} from './frameworks/daggerheart/public.js';
function captureWorldInput(...args){return nativeWorldInput.captureWorldInput(...args);}
import {persistPlayerIntents} from './typed-intents.js';
import {adjudicateAcceptedIntent} from './rules-arbitration.js';
import {contributeRoll} from './roll-collaboration.js';
import {rollRevision} from './roll-requests.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {typedRollProof} from './typed-roll-proof.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {commitFeatureChoice,commitFeatureReactionCost} from './native-feature-windows.js';
import {applyFeatureReactionOutcome,validateFeatureInvitation,featureReactionStakes,cancelFeatureReaction} from './native-feature-effects.js';
import {commitNativeNpcAlliance} from './native-encounter-relations.js';
import {prepareGroupFeature,inspectGroupFeature,groupReactionState,groupReactionDetails,groupReactionOptions} from './native-group-features.js';
import {PROFESSIONAL_ENTRY,professionalEntryRollState,commitProfessionalEntryUse,inspectProfessionalEntryUse} from './native-professional-entry.js';

import {createGmExecutionRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createGmExecutionRules({capabilities:{inspectNativeGmDecision:(...args)=>inspectNativeGmDecision(...args),commitGmActionCost:(...args)=>commitGmActionCost(...args),prepareArbitratedIncomingAttack:(...args)=>prepareArbitratedIncomingAttack(...args),prepareArbitratedVolley:(...args)=>prepareArbitratedVolley(...args),inspectVolley:(...args)=>inspectVolley(...args),EncounterLibrary,personalCharacter:(...args)=>personalCharacter(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),captureWorldInput:(...args)=>captureWorldInput(...args),persistPlayerIntents:(...args)=>persistPlayerIntents(...args),adjudicateAcceptedIntent:(...args)=>adjudicateAcceptedIntent(...args),contributeRoll:(...args)=>contributeRoll(...args),rollRevision:(...args)=>rollRevision(...args),consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),typedRollProof:(...args)=>typedRollProof(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),commitFeatureChoice:(...args)=>commitFeatureChoice(...args),commitFeatureReactionCost:(...args)=>commitFeatureReactionCost(...args),applyFeatureReactionOutcome:(...args)=>applyFeatureReactionOutcome(...args),validateFeatureInvitation:(...args)=>validateFeatureInvitation(...args),featureReactionStakes:(...args)=>featureReactionStakes(...args),cancelFeatureReaction:(...args)=>cancelFeatureReaction(...args),commitNativeNpcAlliance:(...args)=>commitNativeNpcAlliance(...args),prepareGroupFeature:(...args)=>prepareGroupFeature(...args),inspectGroupFeature:(...args)=>inspectGroupFeature(...args),groupReactionState:(...args)=>groupReactionState(...args),groupReactionDetails:(...args)=>groupReactionDetails(...args),groupReactionOptions:(...args)=>groupReactionOptions(...args),professionalEntryRollState:(...args)=>professionalEntryRollState(...args),commitProfessionalEntryUse:(...args)=>commitProfessionalEntryUse(...args),inspectProfessionalEntryUse:(...args)=>inspectProfessionalEntryUse(...args),PROFESSIONAL_ENTRY}});}
export function executeUnifiedGmActions(...args){return rules().executeUnifiedGmActions(...args);}
export function resumePendingGmActions(...args){return rules().resumePendingGmActions(...args);}
export function inspectGmRollReceipt(...args){return rules().inspectGmRollReceipt(...args);}
export function inspectGmReactionInvitation(...args){return rules().inspectGmReactionInvitation(...args);}
export function gmReactionInbox(...args){return rules().gmReactionInbox(...args);}
export function withdrawGmReactionInvitation(...args){return rules().withdrawGmReactionInvitation(...args);}
export function submitGmReactionInvitation(...args){return rules().submitGmReactionInvitation(...args);}
export function assertGmInvitationRequest(...args){return rules().assertGmInvitationRequest(...args);}
