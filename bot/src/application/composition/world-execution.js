import {connectWorldDelegation,connectIntentWorldNative,connectIntentWorldOperations,connectWorldIntentDispatch,connectWorldIntentValidation} from '../../framework-to-framework/intent--world/public.js';
import {connectWorldSessionScene,connectWorldPrincipal,connectWorldSessionContinuation,connectWorldStoryContinuity} from '../../framework-to-framework/session--world/public.js';
import {registerWorldObservation} from '../../frameworks/world/public.js';
export function initializeWorldExecution(){
 registerWorldObservation();
 connectIntentWorldNative();
 connectIntentWorldOperations();
 connectWorldDelegation();
 connectWorldIntentDispatch();
 connectWorldIntentValidation();
 connectWorldSessionScene();
 connectWorldSessionContinuation();
 connectWorldStoryContinuity();
 return connectWorldPrincipal();
}
