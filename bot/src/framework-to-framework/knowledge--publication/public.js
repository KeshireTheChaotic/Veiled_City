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

import {publicationKnowledgeDisclosure} from '../../frameworks/publication/public.js';
import {activeEvidence as publicationDisclosureActiveEvidence,evidenceType as publicationDisclosureEvidenceType,factVisibleTo as publicationDisclosureFactVisibleTo,objectiveEvidence as publicationDisclosureObjectiveEvidence} from '../../frameworks/knowledge/public.js';
export function connectPublicationKnowledgeDisclosure(){return publicationKnowledgeDisclosure.bind({activeEvidence:publicationDisclosureActiveEvidence,evidenceType:publicationDisclosureEvidenceType,factVisibleTo:publicationDisclosureFactVisibleTo,objectiveEvidence:publicationDisclosureObjectiveEvidence});}
