import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original Narrative context reader; no new builder or native grant. */
export const nativeNarrativeContext=createFunctionPort(['buildNarrativeContext'],{code:'NATIVE_NARRATIVE_CONTEXT_COMPOSITION',label:'Native Narrative context'});
