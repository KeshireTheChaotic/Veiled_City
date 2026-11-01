import {createFunctionPort} from '../../../kernel/function-port.js';
/** Existing GM context projection only; no review or execution capability. */
export const operationsIntentContext=createFunctionPort(['intentContext'],{code:'OPERATIONS_INTENT_CONTEXT_COMPOSITION',label:'Operations Intent context'});
