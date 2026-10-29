import {connectDiscordSessionPrincipal} from '../../framework-to-framework/discord--session/public.js';
/** Compose Discord principal reads before constructing runtime services. */
export function initializeDiscordSessionPrincipal(){return connectDiscordSessionPrincipal();}
