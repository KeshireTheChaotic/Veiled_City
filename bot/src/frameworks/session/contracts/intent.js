import {createFunctionPort} from '../../../kernel/function-port.js';
/** Session asks Intent to plan, transition and signal actions and to interpret authored text without owning those rules. */
export const sessionIntent=createFunctionPort(['buildActionPlan','transitionAction','signalActionContinuation','interpretAuthoredText','captureDeclaration'],{code:'SESSION_INTENT_COMPOSITION',label:'Session Intent'});
