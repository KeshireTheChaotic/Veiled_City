/** Closed structured Experience eligibility. This proves availability only, never owner choice or payment. */
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {consentAction,historicalActionSource} from './action-consent.js';
import {nativePersonalContinuity} from './frameworks/daggerheart/public.js';
function personalCharacter(...args){return nativePersonalContinuity.personalCharacter(...args);}

import {createExperienceEligibilityRules} from './frameworks/daggerheart/public.js';
let nativeEligibility;
function rules(){return nativeEligibility??=createExperienceEligibilityRules({sources:{indexWorldEvent:(...args)=>indexWorldEvent(...args),consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),personalCharacter:(...args)=>personalCharacter(...args)}});}
export function recordNativeExperienceEligibility(...args){return rules().recordNativeExperienceEligibility(...args);}
export function validateNativeExperienceEligibility(...args){return rules().validateNativeExperienceEligibility(...args);}
export function validateSavedNativeExperienceEligibility(...args){return rules().validateSavedNativeExperienceEligibility(...args);}
export function inspectNativeExperienceEligibility(...args){return rules().inspectNativeExperienceEligibility(...args);}
