/** Knowledge's original organization request and evidence custody operations, provided at load by their Knowledge-owned services; Knowledge keeps every rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const knowledgeOrganizationSource=createFunctionPort(['organizationRequest'],{code:'KNOWLEDGE_ORGANIZATION_SOURCE_COMPOSITION',label:'Knowledge organization source'});
export const knowledgeEvidenceCustodySource=createFunctionPort(['manageEvidence'],{code:'KNOWLEDGE_EVIDENCE_CUSTODY_SOURCE_COMPOSITION',label:'Knowledge evidence custody source'});
