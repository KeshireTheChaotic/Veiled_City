/** Original source composition; World event adapter adoption remains RF04-F05. */
import {createSceneSetup} from './frameworks/session/public.js';
import {currentScene,recordScenePresence} from './scene-continuity.js';
import {indexWorldEvent} from './city-calendar.js';
const setup=createSceneSetup({currentScene:(...args)=>currentScene(...args),recordScenePresence:(...args)=>recordScenePresence(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args)});
export function sceneSetupAvailability(...args){return setup.sceneSetupAvailability(...args);}
export function prepareSceneSetup(...args){return setup.prepareSceneSetup(...args);}
export function confirmSceneSetup(...args){return setup.confirmSceneSetup(...args);}
export function applyAuthoredInitialPosition(...args){return setup.applyAuthoredInitialPosition(...args);}
