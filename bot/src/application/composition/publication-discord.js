import {connectPublicationDiscordChannels,connectPublicationDiscordText} from '../../framework-to-framework/discord--publication/public.js';
/** Transport-only startup wiring; no database/client construction or sends. */
export function initializePublicationDiscord(){connectPublicationDiscordText();return connectPublicationDiscordChannels();}
