import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original Native action ancestry readers only; never request/respond/execute consent. */
export const narrativeNativeActionConsent=createFunctionPort(['consentAction','historicalActionSource'],{code:'NARRATIVE_NATIVE_ACTION_CONSENT_COMPOSITION',label:'Narrative Native action ancestry'});
