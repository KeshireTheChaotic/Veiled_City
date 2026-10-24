/** Explicit owner-controlled, redacted party projection of a saved native roll result. */
import {publishNativeNotice,reserveNativeNotice,queueNativeNotice} from "./native-publications.js";
import {ownedRollRequest} from './roll-requests.js';
import {historicalActionSource} from './action-consent.js';
import {protectedPvpScope} from './pvp-output.js';


import {createRollSharingRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createRollSharingRules({capabilities:{publishNativeNotice:(...args)=>publishNativeNotice(...args),reserveNativeNotice:(...args)=>reserveNativeNotice(...args),queueNativeNotice:(...args)=>queueNativeNotice(...args),ownedRollRequest:(...args)=>ownedRollRequest(...args),historicalActionSource:(...args)=>historicalActionSource(...args),protectedPvpScope:(...args)=>protectedPvpScope(...args)}});}
export function formatSharedRoll(...args){return rules().formatSharedRoll(...args);}
export function sourceConfirmedRollAttempt(...args){return rules().sourceConfirmedRollAttempt(...args);}
export function createRollSharePreview(...args){return rules().createRollSharePreview(...args);}
export function validateRollSharePreview(...args){return rules().validateRollSharePreview(...args);}
export function queueRollPartyDisclosure(...args){return rules().queueRollPartyDisclosure(...args);}
export function reserveRollPartyDisclosure(...args){return rules().reserveRollPartyDisclosure(...args);}
export async function publishRollPartyDisclosure(...args){return rules().publishRollPartyDisclosure(...args);}
