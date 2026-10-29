import {publicationKnowledgeNarrativeMemory} from '../../frameworks/publication/public.js';
import {queueNarrativeMemory,acknowledgeNarrativeMemory} from '../../frameworks/knowledge/public.js';
/** Bind only the outbox's observed Knowledge narrative-memory operations. */
export function connectPublicationKnowledgeNarrativeMemory(){
  return publicationKnowledgeNarrativeMemory.bind({queueNarrativeMemory,acknowledgeNarrativeMemory});
}
import {knowledgePublicationHandout} from '../../frameworks/knowledge/public.js';
import {handoutPlayerView} from '../../frameworks/publication/public.js';
export function connectKnowledgePublicationHandout(){return knowledgePublicationHandout.bind({handoutPlayerView});}

import {publicationKnowledgeDiscovery} from '../../frameworks/publication/public.js';
import {discoverPersonal} from '../../frameworks/knowledge/public.js';
export function connectPublicationKnowledgePersonal(){return publicationKnowledgeDiscovery.bind({discoverPersonal});}
