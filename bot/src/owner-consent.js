import { stateRevision } from "./ai-intents.js";
import {createOwnerConsentRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createOwnerConsentRules({capabilities:{stateRevision:(...args)=>stateRevision(...args)}});}
export function externalConsentTerms(...args){return rules().externalConsentTerms(...args);}
export function externalConsentKey(...args){return rules().externalConsentKey(...args);}
export function hasOwnerConsent(...args){return rules().hasOwnerConsent(...args);}
