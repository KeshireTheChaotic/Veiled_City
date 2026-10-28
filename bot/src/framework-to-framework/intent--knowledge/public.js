import {authoredTurnEnvelope} from '../../frameworks/intent/public.js';
import {knowledgeIntentAuthoredTurn} from '../../frameworks/knowledge/public.js';

/** Bind the original saved reader; the adapter creates no authorization. */
export function connectKnowledgeIntentAuthoredTurn(){return knowledgeIntentAuthoredTurn.bind({authoredTurnEnvelope});}
