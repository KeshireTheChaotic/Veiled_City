/** Publication queues and acknowledges Knowledge narrative memory through the existing outbox lifecycle. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const publicationKnowledgeNarrativeMemory=createFunctionPort(['queueNarrativeMemory','acknowledgeNarrativeMemory'],{
 code:'PUBLICATION_KNOWLEDGE_NARRATIVE_MEMORY_COMPOSITION',label:'Publication Knowledge narrative memory'
});