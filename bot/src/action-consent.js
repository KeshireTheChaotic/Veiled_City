/** Existing authenticated source bindings for Daggerheart's exact action consent policy. */
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}function historicalOwnerPrincipal(...args){return nativePrincipals.historicalOwnerPrincipal(...args);}
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {typedRollProof} from './typed-roll-proof.js';
import {overlapsOwnerActionTerminal} from './owner-action-terminal.js';
import {createActionConsentRules} from './frameworks/daggerheart/public.js';
export {consentHash} from './frameworks/daggerheart/public.js';
let nativeConsent;
function rules(){return nativeConsent??=createActionConsentRules({sources:{conversationPrincipal:(...args)=>conversationPrincipal(...args),historicalOwnerPrincipal:(...args)=>historicalOwnerPrincipal(...args),currentScene:(...args)=>currentScene(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),overlapsOwnerActionTerminal:(...args)=>overlapsOwnerActionTerminal(...args)},typedRollProof:(...args)=>typedRollProof(...args)});}
export function consentAction(...args){return rules().consentAction(...args);}
export function historicalActionSource(...args){return rules().historicalActionSource(...args);}
export function completedActionSource(...args){return rules().completedActionSource(...args);}
export function requestActionConsent(...args){return rules().requestActionConsent(...args);}
export function respondActionConsent(...args){return rules().respondActionConsent(...args);}
export function validateActionConsent(...args){return rules().validateActionConsent(...args);}
