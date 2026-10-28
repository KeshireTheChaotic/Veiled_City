import {createFunctionPort} from '../../../kernel/function-port.js';

/** Native witness rules read original Knowledge evidence classification. */
export const nativeKnowledgeEvidence=createFunctionPort(['objectiveEvidence','evidenceType'],{
 code:'NATIVE_KNOWLEDGE_EVIDENCE_COMPOSITION',label:'Native Knowledge evidence source'
});
