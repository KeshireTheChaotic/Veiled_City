import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original legacy native service registers its singleton functions when loaded. */
export const nativeActionConsentSource=createFunctionPort(['consentAction','validateActionConsent','requestActionConsent','respondActionConsent','completedActionSource','historicalActionSource'],{code:'NATIVE_ACTION_CONSENT_COMPOSITION',label:'Native action consent source'});
