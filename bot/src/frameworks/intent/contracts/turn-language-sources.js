/** Intent's original authored-turn quote span and gameplay intake readings, provided at load by their original owning modules; Intent keeps every rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const intentAuthoredTurnSource=createFunctionPort(['sourceSpanInsideQuote'],{code:'INTENT_AUTHORED_TURN_SOURCE_COMPOSITION',label:'Intent authored turn source'});
export const intentGameplayIntakeSource=createFunctionPort(['explicitSilence','semanticResponseObligation'],{code:'INTENT_GAMEPLAY_INTAKE_SOURCE_COMPOSITION',label:'Intent gameplay intake source'});