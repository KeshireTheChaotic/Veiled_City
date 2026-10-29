
import {discordSessionPrincipal} from '../../frameworks/discord/public.js';
import {conversationPrincipal} from '../../frameworks/session/public.js';
/** Bind the original Session reader without evaluating player state. */
export function connectDiscordSessionPrincipal(){return discordSessionPrincipal.bind({conversationPrincipal});}
