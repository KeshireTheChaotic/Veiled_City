/** Session's original action continuation drain, provided by its composing module at load; Session keeps every continuation rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const sessionActionContinuation=createFunctionPort(['drainActionContinuations'],{code:'SESSION_ACTION_CONTINUATION_COMPOSITION',label:'Session action continuation'});
