import {connectIntentKnowledgeMaintenance} from '../../framework-to-framework/intent--knowledge/public.js';

/** Wire Knowledge maintenance readers into Intent before AI intent dispatch; no state writes. */
export function initializeIntentKnowledge(){return connectIntentKnowledgeMaintenance();}
