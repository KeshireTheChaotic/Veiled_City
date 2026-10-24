/** Native control classification only; ownership is not an execution, disclosure or rules capability. */
import {activeCityProxy} from './city-constraints.js';

import {createActorControlRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createActorControlRules({capabilities:{activeCityProxy:(...args)=>activeCityProxy(...args)}});}
export function nativeActorControl(...args){return rules().nativeActorControl(...args);}
