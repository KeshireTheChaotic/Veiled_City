import {connectWorldDelegation,connectIntentWorldNative} from '../../framework-to-framework/intent--world/public.js';
import {connectWorldSessionScene,connectWorldPrincipal} from '../../framework-to-framework/session--world/public.js';
export function initializeWorldExecution(){
 connectIntentWorldNative();
 connectWorldDelegation();
 connectWorldSessionScene();
 return connectWorldPrincipal();
}
