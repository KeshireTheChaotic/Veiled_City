/** Narrative consumes only Knowledge's established-retention and disclosed-memory selection functions. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const narrativeKnowledgeMemory=createFunctionPort(['retainEstablishedNarrative','selectDisclosedNarrativeMemory'],{
 code:'NARRATIVE_KNOWLEDGE_MEMORY_COMPOSITION',label:'Narrative Knowledge memory'
});