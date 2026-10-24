/** Original World authority provider. Exactly one shared service retains all live grants and strategy frames. */
import {actorSource} from './simulation-motivation.js';
import {conversationPrincipal} from './conversation-principal.js';
import {assertWorldActorControl} from './city-constraints.js';
import {createWorldOperationAuthority} from './frameworks/world/public.js';
let worldAuthority;
function authority(){return worldAuthority??=createWorldOperationAuthority({actorSource:(...args)=>actorSource(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),assertWorldActorControl:(...args)=>assertWorldActorControl(...args)});}
export function nativeWorldCoordinatorReady(...args){return authority().nativeWorldCoordinatorReady(...args);}
export function nativeWorldOperationCatalog(...args){return authority().nativeWorldOperationCatalog(...args);}
export function prepareNativeWorldOperation(...args){return authority().prepareNativeWorldOperation(...args);}
export function nativeWorldOperationAllows(...args){return authority().nativeWorldOperationAllows(...args);}
export function nativeWorldOperationOrigin(...args){return authority().nativeWorldOperationOrigin(...args);}
export function inspectNativeWorldOperationReceipt(...args){return authority().inspectNativeWorldOperationReceipt(...args);}
export function nativeWorldStrategyAllowed(...args){return authority().nativeWorldStrategyAllowed(...args);}
export function nativeWorldStrategyScope(...args){return authority().nativeWorldStrategyScope(...args);}
export function withNativeStrategyExecution(...args){return authority().withNativeStrategyExecution(...args);}
export function nativeWorldStrategyStepAllowed(...args){return authority().nativeWorldStrategyStepAllowed(...args);}
