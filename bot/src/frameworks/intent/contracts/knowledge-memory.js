/** Intent resolves audience-visible Knowledge memory as interpretation evidence only. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const intentKnowledgeMemory=createFunctionPort(['resolveScopedMemoryReference'],{
 code:'INTENT_KNOWLEDGE_MEMORY_COMPOSITION',label:'Intent Knowledge memory'
});