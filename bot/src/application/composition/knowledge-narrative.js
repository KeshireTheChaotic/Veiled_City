import {connectNarrativeKnowledgePersonal,connectKnowledgeNarrative,connectNarrativeKnowledgeReaders,connectNarrativeKnowledgeEvidence,connectKnowledgeNarrativeSources,connectNarrativeKnowledgeMemory} from '../../framework-to-framework/knowledge--narrative/public.js';
import {knowledgeNarrativeVisibility} from '../../frameworks/knowledge/public.js';
let composed=null;
/** Compose after native Narrative source registration; no database/model/client construction. */
export function initializeKnowledgeNarrative(){connectNarrativeKnowledgePersonal();connectNarrativeKnowledgeEvidence();connectNarrativeKnowledgeReaders();connectKnowledgeNarrativeSources();connectNarrativeKnowledgeMemory();return composed??=connectKnowledgeNarrative({consumer:knowledgeNarrativeVisibility});}
