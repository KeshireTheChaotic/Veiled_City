import {activeEvidence} from '../../frameworks/knowledge/public.js';
import {npcKnowledgeEvidence} from '../../frameworks/npc/public.js';
export function connectNpcKnowledgeEvidence(){return npcKnowledgeEvidence.bind(activeEvidence);}

import {npcKnowledgeClusters} from '../../frameworks/npc/public.js';
import {clusterContext} from '../../frameworks/knowledge/public.js';
export function connectNpcKnowledgeClusters(){return npcKnowledgeClusters.bind(clusterContext);}
