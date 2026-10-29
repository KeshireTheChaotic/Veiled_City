import {connectIntentWorldProjects,connectIntentWorldInputKey,connectWorldDelegation,connectIntentWorldNative,connectIntentWorldOperations,connectIntentWorldConstraints,connectWorldIntentDispatch,connectWorldIntentValidation} from '../../framework-to-framework/intent--world/public.js';
import {connectWorldRoundEligibility,connectWorldSessionScene,connectWorldPrincipal,connectWorldSessionContinuation,connectWorldStoryContinuity} from '../../framework-to-framework/session--world/public.js';
import {registerWorldObservation} from '../../frameworks/world/public.js';
export function initializeWorldExecution(){connectWorldRoundEligibility();connectIntentWorldProjects();connectIntentWorldInputKey();
 registerWorldObservation();
 connectIntentWorldNative();
 connectIntentWorldOperations();
 connectIntentWorldConstraints();
 connectWorldDelegation();
 connectWorldIntentDispatch();
 connectWorldIntentValidation();
 connectWorldSessionScene();
 connectWorldSessionContinuation();
 connectWorldStoryContinuity();
 return connectWorldPrincipal();
}
