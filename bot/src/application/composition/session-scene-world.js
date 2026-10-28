import {connectSessionSceneWorld,connectSessionWorldInstitution,connectSessionWorldActorState,connectSessionWorldAutonomy} from '../../framework-to-framework/session--world/public.js';
export function initializeSessionSceneWorld(){connectSessionWorldInstitution();connectSessionWorldActorState();connectSessionWorldAutonomy();return connectSessionSceneWorld();}
