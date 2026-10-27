import {createFunctionPort} from '../../../kernel/function-port.js';

/** Original Session owner withdrawal ancestry check; no authority is created here. */
export const knowledgeSessionOwnerTerminal=createFunctionPort(['overlapsOwnerActionTerminal'],{
 code:'KNOWLEDGE_SESSION_TERMINAL_COMPOSITION',label:'Knowledge Session owner terminal'
});
