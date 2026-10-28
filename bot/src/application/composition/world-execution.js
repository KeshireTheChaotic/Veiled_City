import {connectWorldDelegation,connectIntentWorldNative} from '../../framework-to-framework/intent--world/public.js';
import {connectWorldSessionScene,connectWorldPrincipal,connectWorldSessionContinuation} from '../../framework-to-framework/session--world/public.js';
export function initializeWorldExecution(){
 connectIntentWorldNative();
 connectWorldDelegation();
 connectWorldSessionScene();
 connectWorldSessionContinuation();
 return connectWorldPrincipal();
}
