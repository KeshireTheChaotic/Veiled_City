import {createInteractionTextDelivery} from './delivery.js';
import {splitDiscordText} from './chunking.js';

const deliverInteractionText=createInteractionTextDelivery({splitDiscordText});

/** Original private recap fallback and text delivery; Publication owns certified source text. */
export async function replyWithSessionRecap(interaction,text){
  await deliverInteractionText(interaction,text||'No completed-session recap yet.',{ephemeral:true});
  return true;
}
