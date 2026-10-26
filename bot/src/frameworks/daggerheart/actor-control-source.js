/** One native classification service; source callbacks are bound only at application startup. */
import {createActorControlRules} from './actor-control-rules.js';
import {nativeWorldProxy} from './contracts/world-proxy.js';
export const {nativeActorControl}=createActorControlRules({capabilities:{activeCityProxy:(...args)=>nativeWorldProxy.activeCityProxy(...args)}});
