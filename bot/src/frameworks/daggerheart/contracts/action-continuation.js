import {createFunctionPort} from '../../../kernel/function-port.js';
/** Native rules ask Session to drain its action continuations without owning them. */
export const nativeActionContinuation=createFunctionPort(['drainActionContinuations'],{code:'NATIVE_ACTION_CONTINUATION_COMPOSITION',label:'Native action continuation'});
