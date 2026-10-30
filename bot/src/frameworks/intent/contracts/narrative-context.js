import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original Narrative context and visibility query; no copied grant, intent, consent or execution policy. */
export const intentNarrativeContext=createFunctionPort(['buildNarrativeContext','narrativeSourceVisible'],{code:'INTENT_NARRATIVE_CONTEXT_COMPOSITION',label:'Intent Narrative context'});
