/** Explicitly delegated bookkeeping activation. No actor creation, spotlight, PC action, dice or damage. */
import {principalAllows} from '../../kernel/application-authority.js';
import {nativeEncounterManagement} from './contracts/encounter-management.js';
function manageWorldEncounter(...args){return nativeEncounterManagement.manageWorldEncounter(...args);}
import {EncounterLibrary} from './encounter-library.js';
import {livePcRoster} from './encounter-composition-source.js';
import {encounterActors} from './encounter-actors-source.js';
import {nativeActorControl} from './actor-control-source.js';
import {nativeWorldEvents} from './contracts/world-events.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {nativePrincipals} from './contracts/principals.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {nativeScenes} from './contracts/scenes.js';
function scenePresence(...args){return nativeScenes.scenePresence(...args);}

import {createEncounterActivationRules} from './encounter-activation-rules.js';
let nativeRules;
function rules(){return nativeRules??=createEncounterActivationRules({capabilities:{principalAllows:(...args)=>principalAllows(...args),manageWorldEncounter:(...args)=>manageWorldEncounter(...args),EncounterLibrary,livePcRoster:(...args)=>livePcRoster(...args),encounterActors:(...args)=>encounterActors(...args),nativeActorControl:(...args)=>nativeActorControl(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),scenePresence:(...args)=>scenePresence(...args)}});}
export function activateDelegatedEncounter(...args){return rules().activateDelegatedEncounter(...args);}
export function inspectNativeEncounterActivation(...args){return rules().inspectNativeEncounterActivation(...args);}
