import {authoredTurnEnvelope} from '../../frameworks/intent/public.js';
import {knowledgeIntentAuthoredTurn} from '../../frameworks/knowledge/public.js';

/** Bind the original saved reader; the adapter creates no authorization. */
export function connectKnowledgeIntentAuthoredTurn(){return knowledgeIntentAuthoredTurn.bind({authoredTurnEnvelope});}

import {intentKnowledgeMaintenance} from '../../frameworks/intent/public.js';
import {reconcileHistory,manageMemoryCluster,memoryMaintenanceCandidate} from '../../frameworks/knowledge/public.js';
/** Bind Knowledge's original history reconciliation and memory cluster maintenance to Intent's fixed consumer. */
export function connectIntentKnowledgeMaintenance(){return intentKnowledgeMaintenance.bind({reconcileHistory,manageMemoryCluster,memoryMaintenanceCandidate});}
