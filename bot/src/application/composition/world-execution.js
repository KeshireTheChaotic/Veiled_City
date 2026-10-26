import {connectWorldDelegation} from '../../framework-to-framework/intent--world/public.js';
import {connectWorldPrincipal} from '../../framework-to-framework/session--world/public.js';
export function initializeWorldExecution(){
 connectWorldDelegation();
 return connectWorldPrincipal();
}
