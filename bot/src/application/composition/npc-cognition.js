import {connectNpcNarrativeContext} from '../../framework-to-framework/narrative--npc/public.js';
import {connectNpcKnowledgeClusters} from '../../framework-to-framework/knowledge--npc/public.js';
import {connectNpcSessionView} from '../../framework-to-framework/npc--session/public.js';
export function initializeNpcCognition(){connectNpcKnowledgeClusters();connectNpcSessionView();return connectNpcNarrativeContext();}
