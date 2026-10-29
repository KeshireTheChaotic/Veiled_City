/** Discord authenticates conversational control through Session; no consent or spending authority. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const discordSessionPrincipal=createFunctionPort(['conversationPrincipal'],{
 code:'DISCORD_SESSION_PRINCIPAL_COMPOSITION',label:'Discord Session principal'
});
