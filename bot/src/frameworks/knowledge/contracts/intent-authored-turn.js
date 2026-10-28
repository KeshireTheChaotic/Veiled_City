import {createFunctionPort} from '../../../kernel/function-port.js';

/** Knowledge reads the original Intent authenticated turn envelope. */
export const knowledgeIntentAuthoredTurn=createFunctionPort(['authoredTurnEnvelope'],{
 code:'KNOWLEDGE_INTENT_AUTHORED_TURN_COMPOSITION',label:'Knowledge Intent authored turn source'
});
