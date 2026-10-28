/** The original lazy encounter actor source over already-composed native capabilities. */
import {createEncounterActors} from './encounter-actors.js';
import {nativeWorldSource} from './contracts/world-source.js';
import {nativeWorldEvents} from './contracts/world-events.js';
import {nativeScenes} from './contracts/scenes.js';
import {nativeNpcEvidence} from './contracts/npc-evidence.js';
let rules;
function actorRules(){return rules??=createEncounterActors({requireCitySource:(...args)=>nativeWorldSource.requireCitySource(...args),currentScene:(...args)=>nativeScenes.currentScene(...args),scenePresence:(...args)=>nativeScenes.scenePresence(...args),actorSource:(...args)=>nativeNpcEvidence.actorSource(...args),cityKey:(...args)=>nativeWorldEvents.cityKey(...args)});}
export function encounterActors(...args){return actorRules()(...args);}
