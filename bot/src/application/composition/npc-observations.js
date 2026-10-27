import {connectNpcKnowledgeEvidence,connectKnowledgeNpcActorSource} from '../../framework-to-framework/knowledge--npc/public.js';
import {connectNpcSessionObservation} from '../../framework-to-framework/npc--session/public.js';
export function initializeNpcObservations(){connectKnowledgeNpcActorSource();connectNpcKnowledgeEvidence();return connectNpcSessionObservation();}
