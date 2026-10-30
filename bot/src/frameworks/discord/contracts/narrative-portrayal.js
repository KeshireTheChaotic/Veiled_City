import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original Narrative voice-direction reader; caller retains its publicVoice option and transport responsibilities. */
export const discordNarrativePortrayal=createFunctionPort(['portrayalPacket'],{code:'DISCORD_NARRATIVE_PORTRAYAL_COMPOSITION',label:'Discord Narrative portrayal'});
