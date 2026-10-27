/** Reviewed passive modifiers from native encounter/presence, never model numeric proposals. */
import {compileNativeFeatures} from './native-feature-catalog.js';
import {nativeScenes} from './frameworks/daggerheart/public.js';
function scenePresence(...args){return nativeScenes.scenePresence(...args);}function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}
import {nativeHouseErratum} from './native-house-errata.js';
import {nativeWorldProxy} from './frameworks/daggerheart/public.js';
function activeCityProxy(...args){return nativeWorldProxy.activeCityProxy(...args);}
import {createAdversaryAttackPassiveRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createAdversaryAttackPassiveRules({capabilities:{compileNativeFeatures:(...args)=>compileNativeFeatures(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),nativeHouseErratum:(...args)=>nativeHouseErratum(...args),activeCityProxy:(...args)=>activeCityProxy(...args)}});}
export function nativeDamageBonusExpression(...args){return rules().nativeDamageBonusExpression(...args);}
export function nativeStandardDamage(...args){return rules().nativeStandardDamage(...args);}
export function nativeAttackPassives(...args){return rules().nativeAttackPassives(...args);}
