import {createFunctionPort} from '../../../kernel/function-port.js';

/** Fixed Intent requests that delegate their original domain rules to Knowledge. */
export const intentKnowledgeActions=createFunctionPort(['manageEvidence','inviteOrganization'],{
 code:'INTENT_KNOWLEDGE_ACTIONS_COMPOSITION',label:'Intent Knowledge actions'
});
