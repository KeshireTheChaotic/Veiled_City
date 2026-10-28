import {createFunctionPort} from '../../../kernel/function-port.js';
/** Session forwards native consent checks without granting or interpreting consent. */
export const sessionNativeActionConsent=createFunctionPort(['consentAction','validateActionConsent','requestActionConsent','respondActionConsent','completedActionSource','historicalActionSource'],{code:'SESSION_NATIVE_CONSENT_COMPOSITION',label:'Session native action consent'});
