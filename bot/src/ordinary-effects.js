/** Bounded ordinary follow-through via existing native adapters. Proposals cannot mint receipts or GM approval. */
import {ordinaryActionProof,ordinaryPrerequisite,effectObservation,effectTarget,effectVisibility,effectHash,effectKey,effectFail,verifyOrdinaryEffect} from './ordinary-effect-proof.js';
import {dispatchAiIntents} from './ai-intents.js';
import {validateIntent} from './ai-intent-contracts.js';
import {activeCityProxy} from './city-constraints.js';
import {worldInputKey} from './autonomous-world.js';
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {applicationPrincipal} from './kernel/application-authority.js';
import {applyRoutineEvidenceAnalysis,verifyRoutineEvidenceAnalysis,routineEvidenceContext} from './native-evidence-analysis.js';
import {clearNativeConditionFromOutcome} from './native-condition-recovery.js';
import {activeNativeConditions} from './native-group-features.js';
import {clearNativeEnvironmentNoise} from './native-environment-noise.js';
import {resolveNativeEnvironmentEvent,environmentResolutionText} from './native-environment-recovery.js';


import {createOrdinaryEffectRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createOrdinaryEffectRules({capabilities:{ordinaryActionProof:(...args)=>ordinaryActionProof(...args),ordinaryPrerequisite:(...args)=>ordinaryPrerequisite(...args),effectObservation:(...args)=>effectObservation(...args),effectTarget:(...args)=>effectTarget(...args),effectVisibility:(...args)=>effectVisibility(...args),effectHash:(...args)=>effectHash(...args),effectKey:(...args)=>effectKey(...args),effectFail:(...args)=>effectFail(...args),verifyOrdinaryEffect:(...args)=>verifyOrdinaryEffect(...args),dispatchAiIntents:(...args)=>dispatchAiIntents(...args),validateIntent:(...args)=>validateIntent(...args),activeCityProxy:(...args)=>activeCityProxy(...args),worldInputKey:(...args)=>worldInputKey(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),applicationPrincipal:(...args)=>applicationPrincipal(...args),applyRoutineEvidenceAnalysis:(...args)=>applyRoutineEvidenceAnalysis(...args),verifyRoutineEvidenceAnalysis:(...args)=>verifyRoutineEvidenceAnalysis(...args),routineEvidenceContext:(...args)=>routineEvidenceContext(...args),clearNativeConditionFromOutcome:(...args)=>clearNativeConditionFromOutcome(...args),activeNativeConditions:(...args)=>activeNativeConditions(...args),clearNativeEnvironmentNoise:(...args)=>clearNativeEnvironmentNoise(...args),resolveNativeEnvironmentEvent:(...args)=>resolveNativeEnvironmentEvent(...args),environmentResolutionText:(...args)=>environmentResolutionText(...args)}});}

export function applyOrdinaryEffects(...args){return rules().applyOrdinaryEffects(...args);}
export function ordinaryEffectContext(...args){return rules().ordinaryEffectContext(...args);}
