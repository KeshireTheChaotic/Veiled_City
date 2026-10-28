import {nativePersonalContinuity} from './frameworks/daggerheart/public.js';
function personalCharacter(...args){return nativePersonalContinuity.personalCharacter(...args);}function personalArc(...args){return nativePersonalContinuity.personalArc(...args);}
import {nativeKnowledgeActions} from './frameworks/daggerheart/public.js';
function organizationRequest(...args){return nativeKnowledgeActions.organizationRequest(...args);}function manageEvidence(...args){return nativeKnowledgeActions.manageEvidence(...args);}
import {nativeWorldActions} from './frameworks/daggerheart/public.js';
function manageLongProject(...args){return nativeWorldActions.manageLongProject(...args);}function projectPhaseRevision(...args){return nativeWorldActions.projectPhaseRevision(...args);}
import {stateRevision} from './kernel/state-revision.js';
import {nativeWorldSource} from './frameworks/daggerheart/public.js';
function requireCitySource(...args){return nativeWorldSource.requireCitySource(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {jsonKey32 as motivationKey} from "./kernel/json-key32.js";
import {createConsentResponseRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createConsentResponseRules({capabilities:{personalCharacter:(...args)=>personalCharacter(...args),personalArc:(...args)=>personalArc(...args),organizationRequest:(...args)=>organizationRequest(...args),manageLongProject:(...args)=>manageLongProject(...args),projectPhaseRevision:(...args)=>projectPhaseRevision(...args),manageEvidence:(...args)=>manageEvidence(...args),stateRevision:(...args)=>stateRevision(...args),requireCitySource:(...args)=>requireCitySource(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),motivationKey:(...args)=>motivationKey(...args)}});}
export function consentOffers(...args){return rules().consentOffers(...args);}
export function respondConsent(...args){return rules().respondConsent(...args);}
