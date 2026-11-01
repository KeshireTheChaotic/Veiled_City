import {createFunctionPort} from '../../../kernel/function-port.js';
/** Existing actor-context planning only; Knowledge retains selection and audience rules. */
export const intentKnowledgeContext=createFunctionPort(['planContext'],{code:'INTENT_KNOWLEDGE_CONTEXT_COMPOSITION',label:'Intent Knowledge context'});
