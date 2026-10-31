/** Source-pinned Memory Leech passive. Completed PC receipts precede this separately validated NPC consequence. */
import {compileNativeFeatures} from './native-feature-catalog.js';
import {nativeEncounterActor} from './native-encounter-relations.js';
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {validateGroupReactionEffect} from './native-group-features.js';
import {validateFeatureReactionEffect} from './native-feature-effects.js';
import {inspectManyDeathsEffect} from './native-feature-hit.js';
import {validatedPcEffectProjection} from './pc-effects.js';
import {nativeActorControl} from './frameworks/daggerheart/public.js';
import {assertNonPvpCombatant} from './pvp-authority.js';

import {createStressPassiveRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createStressPassiveRules({capabilities:{compileNativeFeatures:(...args)=>compileNativeFeatures(...args),nativeEncounterActor:(...args)=>nativeEncounterActor(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),validateGroupReactionEffect:(...args)=>validateGroupReactionEffect(...args),validateFeatureReactionEffect:(...args)=>validateFeatureReactionEffect(...args),inspectManyDeathsEffect:(...args)=>inspectManyDeathsEffect(...args),validatedPcEffectProjection:(...args)=>validatedPcEffectProjection(...args),nativeActorControl:(...args)=>nativeActorControl(...args),assertNonPvpCombatant:(...args)=>assertNonPvpCombatant(...args)}});}
export function inspectNativeStressPassive(...args){return rules().inspectNativeStressPassive(...args);}
export function applyNativeStressPassive(...args){return rules().applyNativeStressPassive(...args);}
