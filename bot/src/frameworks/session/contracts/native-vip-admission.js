import {createFunctionPort} from '../../../kernel/function-port.js';
/** Session reads the original native admission proof without granting entry. */
export const sessionNativeVipAdmission=createFunctionPort(['nativeVipAdmission'],{code:'SESSION_NATIVE_VIP_COMPOSITION',label:'Session native VIP admission'});
