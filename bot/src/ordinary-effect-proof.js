/** Read-only ordinary effect ancestry and final projection. No RNG, costs or effect executor. */
import {historicalActionSource,consentAction} from './action-consent.js';
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {nativeOwnerActionTerminal} from './frameworks/daggerheart/public.js';
function overlapsOwnerActionTerminal(...args){return nativeOwnerActionTerminal.overlapsOwnerActionTerminal(...args);}
import {typedRollProof} from './typed-roll-proof.js';
import {isPvpIntent} from './pvp-authority.js';
import {nativeWorldActions} from './frameworks/daggerheart/public.js';
function renderWorldObservation(...args){return nativeWorldActions.renderWorldObservation(...args);}
import {verifyRoutineEvidenceAnalysis} from './native-evidence-analysis.js';
import {nativeScenes} from './frameworks/daggerheart/public.js';
function scenePresence(...args){return nativeScenes.scenePresence(...args);}
import {validateNativeCondition} from './native-group-features.js';
import {inspectNativeConditionClearAncestry} from './native-condition-recovery.js';
import {inspectNativeEnvironmentNoiseClear} from './frameworks/daggerheart/public.js';
import {inspectNativeEnvironmentResolution,environmentResolutionText} from './native-environment-recovery.js';

import {createOrdinaryEffectProofRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createOrdinaryEffectProofRules({capabilities:{historicalActionSource:(...args)=>historicalActionSource(...args),consentAction:(...args)=>consentAction(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),overlapsOwnerActionTerminal:(...args)=>overlapsOwnerActionTerminal(...args),typedRollProof:(...args)=>typedRollProof(...args),isPvpIntent:(...args)=>isPvpIntent(...args),renderWorldObservation:(...args)=>renderWorldObservation(...args),verifyRoutineEvidenceAnalysis:(...args)=>verifyRoutineEvidenceAnalysis(...args),scenePresence:(...args)=>scenePresence(...args),validateNativeCondition:(...args)=>validateNativeCondition(...args),inspectNativeConditionClearAncestry:(...args)=>inspectNativeConditionClearAncestry(...args),inspectNativeEnvironmentNoiseClear:(...args)=>inspectNativeEnvironmentNoiseClear(...args),inspectNativeEnvironmentResolution:(...args)=>inspectNativeEnvironmentResolution(...args),environmentResolutionText:(...args)=>environmentResolutionText(...args)}});}
export const effectHash=(...args)=>rules().effectHash(...args);
export const effectKey=(...args)=>rules().effectKey(...args);
export function effectFail(...args){return rules().effectFail(...args);}
export function ordinaryActionProof(...args){return rules().ordinaryActionProof(...args);}
export function ordinaryPrerequisite(...args){return rules().ordinaryPrerequisite(...args);}
export function effectTarget(...args){return rules().effectTarget(...args);}
export function effectVisibility(...args){return rules().effectVisibility(...args);}
export function assertOrdinaryBinding(...args){return rules().assertOrdinaryBinding(...args);}
export function effectObservation(...args){return rules().effectObservation(...args);}
export function verifyOrdinaryEffect(...args){return rules().verifyOrdinaryEffect(...args);}
export function ordinaryEffectProjection(...args){return rules().ordinaryEffectProjection(...args);}
import {nativeAccessOrdinaryProof} from './frameworks/daggerheart/public.js';
nativeAccessOrdinaryProof.bind({ordinaryActionProof,ordinaryPrerequisite});
