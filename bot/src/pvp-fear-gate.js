/** Provider for native pvp-fear-gate policy. */
import {validateFearEffect} from './pvp-fear-moves.js';
import {validatePvpAttackRoll} from './pvp-attacks.js';
import {validateCampaignPvp} from './pvp-campaign-execution.js';
import {createPvpFearGateRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPvpFearGateRules({capabilities:{validateFearEffect:(...args)=>validateFearEffect(...args),validatePvpAttackRoll:(...args)=>validatePvpAttackRoll(...args),validateCampaignPvp:(...args)=>validateCampaignPvp(...args)}});}
export function fearGateKey(...args){return rules().fearGateKey(...args);}
export function captureAttackFear(...args){return rules().captureAttackFear(...args);}
export function capturePvpFear(...args){return rules().capturePvpFear(...args);}
export function gatePvpExchange(...args){return rules().gatePvpExchange(...args);}
export function pendingPvpFear(...args){return rules().pendingPvpFear(...args);}
export function closePartialFearGate(...args){return rules().closePartialFearGate(...args);}
import {nativePvpPendingFear} from './frameworks/daggerheart/public.js';
// Provide this module's original pending PvP Fear reader to the fixed native slot; no other authority is granted.
nativePvpPendingFear.bind({pendingPvpFear});

import {nativeFearGateSource} from './frameworks/daggerheart/public.js';
// Original provider remains fixed; registration executes before runtime Fear calls.
nativeFearGateSource.bind({fearGateKey,pendingPvpFear});
