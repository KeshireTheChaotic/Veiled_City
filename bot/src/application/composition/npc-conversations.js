import {connectNpcWorldConversations} from '../../framework-to-framework/npc--world/public.js';
import {connectNpcKnowledgePlanner} from '../../framework-to-framework/knowledge--npc/public.js';
export function initializeNpcConversations(){connectNpcKnowledgePlanner();return connectNpcWorldConversations();}
