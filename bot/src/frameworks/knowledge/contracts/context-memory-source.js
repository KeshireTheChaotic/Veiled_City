/** Knowledge's original scoped context memory reader, provided by its composing module at load; Knowledge keeps every memory rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const knowledgeContextMemorySource=createFunctionPort(['contextMemoriesForScope'],{code:'KNOWLEDGE_CONTEXT_MEMORY_SOURCE_COMPOSITION',label:'Knowledge context memory source'});
