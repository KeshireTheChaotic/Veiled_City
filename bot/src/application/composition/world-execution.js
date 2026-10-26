import {connectWorldDelegation} from '../../framework-to-framework/intent--world/public.js';
import {connectWorldSessionScene,connectWorldPrincipal} from '../../framework-to-framework/session--world/public.js';
export function initializeWorldExecution(){
 connectWorldDelegation();
 connectWorldSessionScene();
 return connectWorldPrincipal();
}
