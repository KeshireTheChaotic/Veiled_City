import {createFunctionPort} from '../../../kernel/function-port.js';
/** Session forwards native consent checks without granting or interpreting consent. */
export const sessionNativeActionConsent=createFunctionPort(['consentAction','validateActionConsent'],{code:'SESSION_NATIVE_CONSENT_COMPOSITION',label:'Session native action consent'});
