import {createFunctionPort} from '../../../kernel/function-port.js';
/** Discord owns channel transport/permission inspection; Publication retains source, audience, payload and recovery authority. */
export const publicationDiscordChannels=createFunctionPort(['textChannel','assertGmOnlyChannel','assertPlayerPrivateChannel'],{code:'PUBLICATION_DISCORD_CHANNELS_COMPOSITION',label:'Publication Discord channel transport'});
