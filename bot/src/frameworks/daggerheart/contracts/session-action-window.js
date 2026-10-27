import {createFunctionPort} from '../../../kernel/function-port.js';
/** Native combat requests the Session coordination window without owning it. */
export const nativeSessionActionWindow=createFunctionPort(['openActionWindow'],{code:'NATIVE_SESSION_ACTION_WINDOW_COMPOSITION',label:'Native Session action window'});
