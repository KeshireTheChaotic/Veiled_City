import {connectWorldNpcCognition} from '../../framework-to-framework/npc--world/public.js';
import {connectWorldKnowledgeClusters} from '../../framework-to-framework/knowledge--world/public.js';
export function initializeWorldCandidateContext(){connectWorldKnowledgeClusters();return connectWorldNpcCognition();}
