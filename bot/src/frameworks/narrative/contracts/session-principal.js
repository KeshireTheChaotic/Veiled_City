/** Narrative authenticates conversational control through Session; no consent or spending authority. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const narrativeSessionPrincipal=createFunctionPort(['conversationPrincipal'],{
 code:'NARRATIVE_SESSION_PRINCIPAL_COMPOSITION',label:'Narrative Session principal'
});
