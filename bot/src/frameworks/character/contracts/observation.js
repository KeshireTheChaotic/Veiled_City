import {createFunctionPort} from '../../../kernel/function-port.js';
/** Character observation asks World and native rules for their original renderings; it owns neither. */
export const characterWorldObservation=createFunctionPort(['renderWorldObservation'],{code:'CHARACTER_WORLD_OBSERVATION_COMPOSITION',label:'Character World observation'});
export const characterIncomingInjury=createFunctionPort(['visibleIncomingInjury'],{code:'CHARACTER_INCOMING_INJURY_COMPOSITION',label:'Character incoming injury'});
/** Character's original departure witness capture, provided at load by character-observation.js; Character keeps every rule. */
export const characterObservationSource=createFunctionPort(['captureDepartureWitnesses'],{code:'CHARACTER_OBSERVATION_SOURCE_COMPOSITION',label:'Character observation source'});