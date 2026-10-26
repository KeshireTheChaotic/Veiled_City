/** One original NPC evidence service; source composition grants no new disclosure authority. */
import {createNpcEvidenceProjection} from './evidence-projection.js';
import {npcNarrativeVisibility} from './contracts/narrative-visibility.js';
import {npcSessionPrincipal} from './contracts/session-principal.js';
import {npcWorldEvidenceEvent} from './contracts/world-evidence-event.js';
export const {recordImportedNpcKnowledge,actorEvidenceVisible,actorReferenceVisible}=createNpcEvidenceProjection({narrativeSourceVisible:(...args)=>npcNarrativeVisibility.narrativeSourceVisible(...args),conversationPrincipal:(...args)=>npcSessionPrincipal.conversationPrincipal(...args),indexWorldEvent:(...args)=>npcWorldEvidenceEvent.indexWorldEvent(...args)});
