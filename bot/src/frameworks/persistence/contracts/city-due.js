import {createFunctionPort} from '../../../kernel/function-port.js';

/** Persistence delegates due city schedule processing to the original World calendar function. */
export const persistenceCityDue=createFunctionPort(['processCityDue'],{
 code:'PERSISTENCE_CITY_DUE_COMPOSITION',label:'Persistence World due city schedule processing'
});
