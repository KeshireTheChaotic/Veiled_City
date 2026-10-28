import {createFunctionPort} from '../../../kernel/function-port.js';
/** World asks Character to capture departure witnesses without owning observation rules. */
export const worldCharacterObservation=createFunctionPort(['captureDepartureWitnesses'],{code:'WORLD_CHARACTER_OBSERVATION_COMPOSITION',label:'World character observation'});