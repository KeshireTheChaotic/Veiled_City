/** Automatic, pinned adversary defense before existing native NPC damage finalization. No dice or PC effects. */
import {compileNativeFeatures} from './native-feature-catalog.js';
import {EncounterLibrary} from './encounter.js';
import {currentScene,scenePresence} from './scene-continuity.js';
import {activeCityProxy} from './city-constraints.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {historicalActionSource} from './action-consent.js';

import {createAdversaryDamageDefenseRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createAdversaryDamageDefenseRules({capabilities:{compileNativeFeatures:(...args)=>compileNativeFeatures(...args),EncounterLibrary,currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),activeCityProxy:(...args)=>activeCityProxy(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),historicalActionSource:(...args)=>historicalActionSource(...args)}});}
export function nativeAdversaryDamageDefense(...args){return rules().nativeAdversaryDamageDefense(...args);}
export function inspectAdversaryDamageDefense(...args){return rules().inspectAdversaryDamageDefense(...args);}
