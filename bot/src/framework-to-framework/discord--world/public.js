import {discordWorldEvents} from '../../frameworks/discord/public.js';
import {indexWorldEvent} from '../../frameworks/world/public.js';
export function connectDiscordWorldEvents(){return discordWorldEvents.bind({indexWorldEvent});}
