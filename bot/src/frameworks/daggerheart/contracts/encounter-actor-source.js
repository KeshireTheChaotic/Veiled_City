import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original current encounter actor reader; no actor, scene, feature or authority is created. */
export const nativeEncounterActorSource=createFunctionPort(['nativeEncounterActor'],{code:'NATIVE_ENCOUNTER_ACTOR_SOURCE_COMPOSITION',label:'Native encounter actor source'});
