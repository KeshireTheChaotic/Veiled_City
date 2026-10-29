import {connectDiscordSessionPrincipal} from '../../framework-to-framework/discord--session/public.js';
import {connectDiscordWorldEvents} from '../../framework-to-framework/discord--world/public.js';
/** Compose Discord principal reads before constructing runtime services. */
export function initializeDiscordSessionPrincipal(){connectDiscordWorldEvents();return connectDiscordSessionPrincipal();}
