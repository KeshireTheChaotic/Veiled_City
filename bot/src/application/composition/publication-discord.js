import {connectPublicationDiscordChannels} from '../../framework-to-framework/discord--publication/public.js';
/** Transport-only startup wiring; no database/client construction or sends. */
export function initializePublicationDiscord(){return connectPublicationDiscordChannels();}
