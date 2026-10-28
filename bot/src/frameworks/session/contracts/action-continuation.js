/** Session's original action continuation drain, provided by its composing module at load; Session keeps every continuation rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const sessionActionContinuation=createFunctionPort(['drainActionContinuations'],{code:'SESSION_ACTION_CONTINUATION_COMPOSITION',label:'Session action continuation'});
/** Session's original continuation authorization reader, provided by the same composing module at load. */
export const sessionContinuationAuthorization=createFunctionPort(['continuationAuthorization'],{code:'SESSION_CONTINUATION_AUTHORIZATION_COMPOSITION',label:'Session continuation authorization'});
