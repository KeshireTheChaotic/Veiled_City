/** Publication authenticates conversational control through Session; no consent or spending authority. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const publicationSessionPrincipal=createFunctionPort(['conversationPrincipal'],{
 code:'PUBLICATION_SESSION_PRINCIPAL_COMPOSITION',label:'Publication Session principal'
});
