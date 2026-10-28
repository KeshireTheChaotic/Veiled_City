import {createFunctionPort} from '../../../kernel/function-port.js';
/** Native consent responses ask Knowledge for its original organization request and evidence custody operations without owning them. */
export const nativeKnowledgeActions=createFunctionPort(['organizationRequest','manageEvidence'],{code:'NATIVE_KNOWLEDGE_ACTIONS_COMPOSITION',label:'Native Knowledge actions'});