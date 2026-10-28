/** Knowledge's original history reconciliation, provided by its composing module at load; Knowledge keeps every history rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const knowledgeHistoryReconciliationSource=createFunctionPort(['reconcileHistory'],{code:'KNOWLEDGE_HISTORY_RECONCILIATION_SOURCE_COMPOSITION',label:'Knowledge history reconciliation source'});
