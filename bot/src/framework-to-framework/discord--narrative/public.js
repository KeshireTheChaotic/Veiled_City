import {portrayalPacket} from '../../frameworks/narrative/public.js';
import {discordNarrativePortrayal} from '../../frameworks/discord/public.js';
export function connectDiscordNarrativePortrayal(){return discordNarrativePortrayal.bind({portrayalPacket});}
