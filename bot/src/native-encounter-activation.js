/** Explicitly delegated bookkeeping activation. No actor creation, spotlight, PC action, dice or damage. */
import {principalAllows} from './kernel/application-authority.js';
import {manageWorldEncounter,EncounterLibrary,livePcRoster,encounterActors} from './encounter.js';
import {nativeActorControl} from './native-actor-control.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {nativeScenes} from './frameworks/daggerheart/public.js';
function scenePresence(...args){return nativeScenes.scenePresence(...args);}

import {createEncounterActivationRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEncounterActivationRules({capabilities:{principalAllows:(...args)=>principalAllows(...args),manageWorldEncounter:(...args)=>manageWorldEncounter(...args),EncounterLibrary,livePcRoster:(...args)=>livePcRoster(...args),encounterActors:(...args)=>encounterActors(...args),nativeActorControl:(...args)=>nativeActorControl(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),scenePresence:(...args)=>scenePresence(...args)}});}
export function activateDelegatedEncounter(...args){return rules().activateDelegatedEncounter(...args);}
export function inspectNativeEncounterActivation(...args){return rules().inspectNativeEncounterActivation(...args);}
