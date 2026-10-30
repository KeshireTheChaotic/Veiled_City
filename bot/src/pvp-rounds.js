/** Sealed owner-authorized narrative PvP. Opposed totals only; never ordinary combat damage/metacurrency. */
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import { pvpOwnerContext, validatePvpAgreement } from "./narrative-pvp.js";
import {nativePvpWindow} from './frameworks/daggerheart/public.js';
function synchronizePvpWindow(...args){return nativePvpWindow.synchronizePvpWindow(...args);}
import { settlePvpWindow } from "./pvp-terminal.js";
import { capturePvpFear, gatePvpExchange, fearGateKey, pendingPvpFear } from "./pvp-fear-gate.js";
import {nativeActionContinuation} from './frameworks/daggerheart/public.js';
function drainActionContinuations(...args){return nativeActionContinuation.drainActionContinuations(...args);}
import {reservePvpNotices} from "./native-publications.js";
import {resolveAutonomousPvpFear} from "./frameworks/daggerheart/public.js";
import {assertPvpSafety} from './pvp-campaign-policy.js';
export { authorPvpNarrative, reviewPvpNarrative, sharePvpNarrative } from "./pvp-authorship.js";


import {createPvpRoundRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPvpRoundRules({capabilities:{indexWorldEvent:(...args)=>indexWorldEvent(...args),pvpOwnerContext:(...args)=>pvpOwnerContext(...args),validatePvpAgreement:(...args)=>validatePvpAgreement(...args),synchronizePvpWindow:(...args)=>synchronizePvpWindow(...args),settlePvpWindow:(...args)=>settlePvpWindow(...args),capturePvpFear:(...args)=>capturePvpFear(...args),gatePvpExchange:(...args)=>gatePvpExchange(...args),fearGateKey:(...args)=>fearGateKey(...args),pendingPvpFear:(...args)=>pendingPvpFear(...args),drainActionContinuations:(...args)=>drainActionContinuations(...args),reservePvpNotices:(...args)=>reservePvpNotices(...args),resolveAutonomousPvpFear:(...args)=>resolveAutonomousPvpFear(...args),assertPvpSafety:(...args)=>assertPvpSafety(...args)}});}
export function choosePvp(...args){return rules().choosePvp(...args);}
export function validatePvpRoundReceipt(...args){return rules().validatePvpRoundReceipt(...args);}
export function validatePvpResolutionReceipt(...args){return rules().validatePvpResolutionReceipt(...args);}
export function rollPvp(...args){return rules().rollPvp(...args);}
export function continuePvp(...args){return rules().continuePvp(...args);}
export function progressPvp(...args){return rules().progressPvp(...args);}
export function pvpComplication(...args){return rules().pvpComplication(...args);}
import {nativePvpResolutionReceipt} from './frameworks/daggerheart/public.js';
// Provide this module's original PvP resolution receipt check to the fixed native slot; no other authority is granted.
nativePvpResolutionReceipt.bind({validatePvpResolutionReceipt});

import {nativeFearRoundSource} from './frameworks/daggerheart/public.js';
// Original provider remains fixed; registration executes before runtime Fear calls.
nativeFearRoundSource.bind({validatePvpRoundReceipt});
