import {connectPublicationKnowledgePersonal,connectKnowledgePublicationHandout,connectPublicationKnowledgeNarrativeMemory} from '../../framework-to-framework/knowledge--publication/public.js';
let composed=null;
/** Bind Knowledge narrative-memory functions before Publication outbox runtime use. */
export function initializePublicationKnowledgeNarrativeMemory(){connectPublicationKnowledgePersonal();
  connectKnowledgePublicationHandout();
  return composed??=connectPublicationKnowledgeNarrativeMemory();
}