/** Intent authenticates conversational control through Session; no consent or spending authority. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const intentSessionPrincipal=createFunctionPort(['conversationPrincipal'],{
 code:'INTENT_SESSION_PRINCIPAL_COMPOSITION',label:'Intent Session principal'
});
