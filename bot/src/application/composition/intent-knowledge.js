import {connectIntentKnowledgeMaintenance,connectIntentKnowledgeActions} from '../../framework-to-framework/intent--knowledge/public.js';

/** Wire Knowledge maintenance readers and the existing Intent action callbacks before AI dispatch; no domain calls or state writes at initialization. */
export function initializeIntentKnowledge(){const maintenance=connectIntentKnowledgeMaintenance();connectIntentKnowledgeActions();return maintenance;}
