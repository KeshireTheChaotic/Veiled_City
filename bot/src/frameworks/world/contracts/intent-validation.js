import {createFunctionPort} from '../../../kernel/function-port.js';
/** World asks Intent to validate an AI intent envelope without owning intent contracts. */
export const worldIntentValidation=createFunctionPort(['validateIntent'],{code:'WORLD_INTENT_VALIDATION_COMPOSITION',label:'World Intent validation'});