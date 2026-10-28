import {connectWorldDelegation,connectIntentWorldNative,connectWorldIntentDispatch} from '../../framework-to-framework/intent--world/public.js';
import {connectWorldSessionScene,connectWorldPrincipal,connectWorldSessionContinuation,connectWorldStoryContinuity} from '../../framework-to-framework/session--world/public.js';
export function initializeWorldExecution(){
 connectIntentWorldNative();
 connectWorldDelegation();
 connectWorldIntentDispatch();
 connectWorldSessionScene();
 connectWorldSessionContinuation();
 connectWorldStoryContinuity();
 return connectWorldPrincipal();
}
