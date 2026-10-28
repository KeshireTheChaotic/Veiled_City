/** Session source composition; native World issuance is supplied by its fixed consumer port. */
import {createSceneSetup} from './scene-setup.js';
import {sessionWorldEvents} from './contracts/world-events.js';
import {currentScene,recordScenePresence} from './scene-source.js';
const setup=createSceneSetup({currentScene:(...args)=>currentScene(...args),recordScenePresence:(...args)=>recordScenePresence(...args),indexWorldEvent:(...args)=>sessionWorldEvents.indexWorldEvent(...args)});
export function sceneSetupAvailability(...args){return setup.sceneSetupAvailability(...args);}
export function prepareSceneSetup(...args){return setup.prepareSceneSetup(...args);}
export function confirmSceneSetup(...args){return setup.confirmSceneSetup(...args);}
export function applyAuthoredInitialPosition(...args){return setup.applyAuthoredInitialPosition(...args);}
