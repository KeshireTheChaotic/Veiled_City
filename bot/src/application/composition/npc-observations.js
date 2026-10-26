import {connectNpcKnowledgeEvidence} from '../../framework-to-framework/knowledge--npc/public.js';
import {connectNpcSessionObservation} from '../../framework-to-framework/npc--session/public.js';
export function initializeNpcObservations(){connectNpcKnowledgeEvidence();return connectNpcSessionObservation();}
