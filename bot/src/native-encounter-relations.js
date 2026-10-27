/** Source provider for extracted native-encounter-relations native policy. */
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}
import {nativeWorldProxy} from './frameworks/daggerheart/public.js';
function activeCityProxy(...args){return nativeWorldProxy.activeCityProxy(...args);}
import {nativeActorTaxonomy} from './native-feature-catalog.js';
import {EncounterLibrary} from './encounter.js';
import {inspectNativeGmDecision} from './gm-action-capability.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {createEncounterRelationRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEncounterRelationRules({capabilities:{currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),activeCityProxy:(...args)=>activeCityProxy(...args),nativeActorTaxonomy:(...args)=>nativeActorTaxonomy(...args),EncounterLibrary,inspectNativeGmDecision:(...args)=>inspectNativeGmDecision(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args)}});}
export function nativeEncounterActor(...args){return rules().nativeEncounterActor(...args);}
export function nativeAlliancePlan(...args){return rules().nativeAlliancePlan(...args);}
export function commitNativeNpcAlliance(...args){return rules().commitNativeNpcAlliance(...args);}
export function inspectNativeNpcAllianceReceipt(...args){return rules().inspectNativeNpcAllianceReceipt(...args);}
export function nativeNpcAlliance(...args){return rules().nativeNpcAlliance(...args);}
