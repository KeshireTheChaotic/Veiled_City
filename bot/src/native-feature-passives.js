/** Reviewed passive modifiers from native encounter/presence, never model numeric proposals. */
import {compileNativeFeatures} from './native-feature-catalog.js';
import {scenePresence,sceneAccess} from './scene-continuity.js';
import {nativeHouseErratum} from './native-house-errata.js';
import {activeCityProxy} from './city-constraints.js';
import {createAdversaryAttackPassiveRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createAdversaryAttackPassiveRules({capabilities:{compileNativeFeatures:(...args)=>compileNativeFeatures(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),nativeHouseErratum:(...args)=>nativeHouseErratum(...args),activeCityProxy:(...args)=>activeCityProxy(...args)}});}
export function nativeDamageBonusExpression(...args){return rules().nativeDamageBonusExpression(...args);}
export function nativeStandardDamage(...args){return rules().nativeStandardDamage(...args);}
export function nativeAttackPassives(...args){return rules().nativeAttackPassives(...args);}
