/** PC resource effects require a separately authorized native cause, never generated prose. */
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {nativeScenes,RANGE_BANDS} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import { personalCharacter } from "./personal-continuity.js";
import {assertPcCanAct} from "./pc-native-eligibility.js";
import {consentAction} from "./action-consent.js";
import {wakeAfterNativeAllyHealing} from "./pc-death.js";
import {applyNativeStressPassive} from "./native-stress-passives.js";


import {createPcEffectRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPcEffectRules({capabilities:{indexWorldEvent:(...args)=>indexWorldEvent(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),personalCharacter:(...args)=>personalCharacter(...args),assertPcCanAct:(...args)=>assertPcCanAct(...args),consentAction:(...args)=>consentAction(...args),wakeAfterNativeAllyHealing:(...args)=>wakeAfterNativeAllyHealing(...args),applyNativeStressPassive:(...args)=>applyNativeStressPassive(...args),RANGE_BANDS}});}
export function reviewFeatureEffect(...args){return rules().reviewFeatureEffect(...args);}
export function reviewHealingSource(...args){return rules().reviewHealingSource(...args);}
export function authorizeHealingSource(...args){return rules().authorizeHealingSource(...args);}
export function reviewPcEffect(...args){return rules().reviewPcEffect(...args);}
export function approvePcEffect(...args){return rules().approvePcEffect(...args);}
export function applyPcEffect(...args){return rules().applyPcEffect(...args);}
export function validateAllyHealingApplication(...args){return rules().validateAllyHealingApplication(...args);}
export function applyGeneratedPcEffect(...args){return rules().applyGeneratedPcEffect(...args);}
export function validatedPcEffectProjection(...args){return rules().validatedPcEffectProjection(...args);}
