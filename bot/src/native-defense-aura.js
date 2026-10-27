/** Source provider for extracted native-defense-aura native policy. */
import {compileNativeFeatures,compileNativeActors,nativeSignalFeatureTarget} from './native-feature-catalog.js';
import {nativeEncounterActor,nativeNpcAlliance,inspectNativeNpcAllianceReceipt} from './native-encounter-relations.js';
import {nativeScenes} from './frameworks/daggerheart/public.js';
function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}
import {activeCityProxy} from './city-constraints.js';
import {EncounterLibrary} from './encounter.js';
import {nativeHouseErratum} from './native-house-errata.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {createDefensiveFeatureRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createDefensiveFeatureRules({capabilities:{compileNativeFeatures:(...args)=>compileNativeFeatures(...args),compileNativeActors:(...args)=>compileNativeActors(...args),nativeSignalFeatureTarget:(...args)=>nativeSignalFeatureTarget(...args),nativeEncounterActor:(...args)=>nativeEncounterActor(...args),nativeNpcAlliance:(...args)=>nativeNpcAlliance(...args),inspectNativeNpcAllianceReceipt:(...args)=>inspectNativeNpcAllianceReceipt(...args),sceneAccess:(...args)=>sceneAccess(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),activeCityProxy:(...args)=>activeCityProxy(...args),EncounterLibrary,nativeHouseErratum:(...args)=>nativeHouseErratum(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args)}});}
export function nativeFormationDefense(...args){return rules().nativeFormationDefense(...args);}
export function nativeVeilExposureDefense(...args){return rules().nativeVeilExposureDefense(...args);}
export function persistNativeVeilExposureDefense(...args){return rules().persistNativeVeilExposureDefense(...args);}
export function persistNativeFormationDefense(...args){return rules().persistNativeFormationDefense(...args);}
export function inspectNativeFormationDefense(...args){return rules().inspectNativeFormationDefense(...args);}
export function inspectNativeVeilExposureDefense(...args){return rules().inspectNativeVeilExposureDefense(...args);}
export function reconcileNativeFormationBreakdown(...args){return rules().reconcileNativeFormationBreakdown(...args);}
export function nativeDefenseAura(...args){return rules().nativeDefenseAura(...args);}
export function persistNativeDefenseAura(...args){return rules().persistNativeDefenseAura(...args);}
export function inspectNativeDefenseAura(...args){return rules().inspectNativeDefenseAura(...args);}
