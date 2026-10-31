import {createFunctionPort} from '../../../kernel/function-port.js';
/** Discord owns channel transport/permission inspection; Publication retains source, audience, payload and recovery authority. */
export const publicationDiscordChannels=createFunctionPort(['textChannel','assertGmOnlyChannel','assertPlayerPrivateChannel'],{code:'PUBLICATION_DISCORD_CHANNELS_COMPOSITION',label:'Publication Discord channel transport'});

/** Separate original text-splitting contract; channel consumer API remains unchanged. */
export const publicationDiscordText=createFunctionPort(['splitDiscordText'],{code:'PUBLICATION_DISCORD_TEXT_COMPOSITION',label:'Publication Discord text'});

/** Original SDK attachment construction only; no content, recipient or delivery policy. */
export const publicationDiscordAttachments=createFunctionPort(['createAttachment'],{code:'PUBLICATION_DISCORD_ATTACHMENTS_COMPOSITION',label:'Publication Discord attachments'});
