import {connectSessionSceneWorld,connectSessionWorldInstitution,connectSessionWorldActorState} from '../../framework-to-framework/session--world/public.js';
export function initializeSessionSceneWorld(){connectSessionWorldInstitution();connectSessionWorldActorState();return connectSessionSceneWorld();}
