/** Existing source/effect bindings for the Daggerheart owner-selected death lifecycle. */
import {historicalOwnerPrincipal} from "./conversation-principal.js";
import {currentScene} from "./scene-continuity.js";
import {indexWorldEvent} from "./city-calendar.js";
import {validatePvpDamageApplication,settlePvpDamageAction} from "./pvp-damage.js";
import {historicalActionSource,consentAction} from "./action-consent.js";
import {validateIncomingDamageApplication} from "./pc-incoming.js";
import {validateAllyHealingApplication} from "./pc-effects.js";
import {settlePreRollFearForIncoming} from './pre-roll-fear.js';
import {createPcDeathRules} from './frameworks/daggerheart/public.js';
export {hopeCap} from './frameworks/daggerheart/public.js';
let nativeDeath;
function rules(){return nativeDeath??=createPcDeathRules({sources:{historicalOwnerPrincipal:(...args)=>historicalOwnerPrincipal(...args),currentScene:(...args)=>currentScene(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args)},mechanics:{validatePvpDamageApplication:(...args)=>validatePvpDamageApplication(...args),settlePvpDamageAction:(...args)=>settlePvpDamageAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),consentAction:(...args)=>consentAction(...args),validateIncomingDamageApplication:(...args)=>validateIncomingDamageApplication(...args),validateAllyHealingApplication:(...args)=>validateAllyHealingApplication(...args),settlePreRollFearForIncoming:(...args)=>settlePreRollFearForIncoming(...args)}});}
export function reviewPcDeathMove(...args){return rules().reviewPcDeathMove(...args);}
export function choosePcDeathMove(...args){return rules().choosePcDeathMove(...args);}
export function validatePcDeathOutcome(...args){return rules().validatePcDeathOutcome(...args);}
export function allocatePcDeathRecovery(...args){return rules().allocatePcDeathRecovery(...args);}
export function approveBlazeAction(...args){return rules().approveBlazeAction(...args);}
export function blazeActionAuthorization(...args){return rules().blazeActionAuthorization(...args);}
export function blazeCriticalResult(...args){return rules().blazeCriticalResult(...args);}
export function validateBlazeSavedRoll(...args){return rules().validateBlazeSavedRoll(...args);}
export function completeBlazeAction(...args){return rules().completeBlazeAction(...args);}
export function wakeAfterNativeAllyHealing(...args){return rules().wakeAfterNativeAllyHealing(...args);}
export function validatePcConsciousness(...args){return rules().validatePcConsciousness(...args);}
