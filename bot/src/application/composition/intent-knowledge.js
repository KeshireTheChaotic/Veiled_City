import {connectIntentKnowledgePersonal,connectIntentKnowledgeSemanticProof,connectIntentKnowledgeMaintenance,connectIntentKnowledgeActions,connectIntentKnowledgeMemory} from '../../framework-to-framework/intent--knowledge/public.js';

/** Wire Knowledge maintenance readers and the existing Intent action callbacks before AI dispatch; no domain calls or state writes at initialization. */
export function initializeIntentKnowledge(){connectIntentKnowledgePersonal();connectIntentKnowledgeSemanticProof();const maintenance=connectIntentKnowledgeMaintenance();connectIntentKnowledgeActions();connectIntentKnowledgeMemory();return maintenance;}
