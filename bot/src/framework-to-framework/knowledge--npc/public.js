import {activeEvidence} from '../../frameworks/knowledge/public.js';
import {npcKnowledgeEvidence} from '../../frameworks/npc/public.js';
export function connectNpcKnowledgeEvidence(){return npcKnowledgeEvidence.bind(activeEvidence);}
