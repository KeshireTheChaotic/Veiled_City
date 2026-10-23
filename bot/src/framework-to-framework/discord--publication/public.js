import {createDiscordPublicationCapability} from '../../frameworks/discord/public.js';
import {createPublicationTransportPort} from '../../frameworks/publication/public.js';

/** Publication row → Discord transport → exact acknowledgment; existing native validation stays authoritative. */
export function connectPublicationTransport(transport){
  const discord=createDiscordPublicationCapability(transport);
  return createPublicationTransportPort(row=>discord.sendCommittedPublication(row));
}
