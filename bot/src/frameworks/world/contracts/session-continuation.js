import {createFunctionPort} from '../../../kernel/function-port.js';
/** World asks Session to authorize an action continuation without owning continuation rules. */
export const worldSessionContinuation=createFunctionPort(['continuationAuthorization'],{code:'WORLD_SESSION_CONTINUATION_COMPOSITION',label:'World Session continuation'});
