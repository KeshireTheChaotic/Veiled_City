import { personalCharacter, personalArc } from "./personal-continuity.js";
import { organizationRequest } from "./owned-community.js";
import { manageLongProject, projectPhaseRevision } from "./long-projects.js";
import { manageEvidence } from "./evidence-custody.js";
import {stateRevision} from './kernel/state-revision.js';
import { requireCitySource } from "./city-core.js";
import { indexWorldEvent } from "./city-calendar.js";
import {jsonKey32 as motivationKey} from "./kernel/json-key32.js";
import {createConsentResponseRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createConsentResponseRules({capabilities:{personalCharacter:(...args)=>personalCharacter(...args),personalArc:(...args)=>personalArc(...args),organizationRequest:(...args)=>organizationRequest(...args),manageLongProject:(...args)=>manageLongProject(...args),projectPhaseRevision:(...args)=>projectPhaseRevision(...args),manageEvidence:(...args)=>manageEvidence(...args),stateRevision:(...args)=>stateRevision(...args),requireCitySource:(...args)=>requireCitySource(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),motivationKey:(...args)=>motivationKey(...args)}});}
export function consentOffers(...args){return rules().consentOffers(...args);}
export function respondConsent(...args){return rules().respondConsent(...args);}
