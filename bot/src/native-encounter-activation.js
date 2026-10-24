/** Explicitly delegated bookkeeping activation. No actor creation, spotlight, PC action, dice or damage. */
import {principalAllows} from './application-authority.js';
import {manageWorldEncounter,EncounterLibrary,livePcRoster,encounterActors} from './encounter.js';
import {nativeActorControl} from './native-actor-control.js';
import {indexWorldEvent} from './city-calendar.js';
import {conversationPrincipal} from './conversation-principal.js';
import {scenePresence} from './scene-continuity.js';

import {createEncounterActivationRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEncounterActivationRules({capabilities:{principalAllows:(...args)=>principalAllows(...args),manageWorldEncounter:(...args)=>manageWorldEncounter(...args),EncounterLibrary,livePcRoster:(...args)=>livePcRoster(...args),encounterActors:(...args)=>encounterActors(...args),nativeActorControl:(...args)=>nativeActorControl(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),scenePresence:(...args)=>scenePresence(...args)}});}
export function activateDelegatedEncounter(...args){return rules().activateDelegatedEncounter(...args);}
export function inspectNativeEncounterActivation(...args){return rules().inspectNativeEncounterActivation(...args);}
