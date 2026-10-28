/** Knowledge's original personal arc and inbox readers, provided by its composing module at load; Knowledge keeps every rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const knowledgePersonalContinuity=createFunctionPort(['personalArc','personalInbox'],{code:'KNOWLEDGE_PERSONAL_CONTINUITY_COMPOSITION',label:'Knowledge personal continuity'});
