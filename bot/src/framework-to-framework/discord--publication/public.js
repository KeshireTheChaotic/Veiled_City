import {createDiscordPublicationCapability} from '../../frameworks/discord/public.js';
import {createPublicationTransportPort} from '../../frameworks/publication/public.js';

/** Publication row → Discord transport → exact acknowledgment; existing native validation stays authoritative. */
export function connectPublicationTransport(transport){
  const discord=createDiscordPublicationCapability(transport);
  return createPublicationTransportPort(row=>discord.sendCommittedPublication(row));
}

import {textChannel,assertGmOnlyChannel,assertPlayerPrivateChannel} from '../../frameworks/discord/public.js';
import {publicationDiscordChannels} from '../../frameworks/publication/public.js';
/** Bind original Discord channel capabilities; never choose an audience or retry a send. */
export function connectPublicationDiscordChannels(){return publicationDiscordChannels.bind({textChannel,assertGmOnlyChannel,assertPlayerPrivateChannel});}

import {splitDiscordText} from '../../frameworks/discord/public.js';
import {publicationDiscordText} from '../../frameworks/publication/public.js';
export function connectPublicationDiscordText(){return publicationDiscordText.bind({splitDiscordText});}

/** Stateless original SDK construction; caller retains files, audience and delivery authority. */
import {createAttachment} from '../../frameworks/discord/public.js';
import {publicationDiscordAttachments} from '../../frameworks/publication/public.js';
export function connectPublicationDiscordAttachments(){return publicationDiscordAttachments.bind({createAttachment});}
