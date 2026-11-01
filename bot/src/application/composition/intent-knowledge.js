import {connectIntentKnowledgePersonal,connectIntentKnowledgeSemanticProof,connectIntentKnowledgeMaintenance,connectIntentKnowledgeActions,connectIntentKnowledgeMemory} from '../../framework-to-framework/intent--knowledge/public.js';
import {connectIntentKnowledgeContext} from '../../framework-to-framework/intent--knowledge/public.js';

/** Wire Knowledge maintenance readers and the existing Intent action callbacks before AI dispatch; no domain calls or state writes at initialization. */
export function initializeIntentKnowledge(){connectIntentKnowledgeContext();connectIntentKnowledgePersonal();connectIntentKnowledgeSemanticProof();const maintenance=connectIntentKnowledgeMaintenance();connectIntentKnowledgeActions();connectIntentKnowledgeMemory();return maintenance;}
