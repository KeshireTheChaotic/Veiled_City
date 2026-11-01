import {createInteractionTextDelivery} from './delivery.js';
import {splitDiscordText} from './chunking.js';

const deliverInteractionText=createInteractionTextDelivery({splitDiscordText});

export function assertCaseboardReadStore(store){
  if(typeof store?.listVisibleActiveThreads!=='function')throw new TypeError('Caseboard display requires the original visible-thread reader.');
  return store;
}

/** Original private caseboard display; thread visibility and lifecycle stay with the existing reader. */
export async function handleCaseboardCommand(interaction,{store}={}){
  const rows=store.listVisibleActiveThreads(interaction.guildId,interaction.user.id);
  await deliverInteractionText(interaction,rows.length?rows.map(x=>`• **${x.label}**${x.notes?`: ${x.notes}`:""}`).join("\n"):"No active recorded threads.");
  return true;
}
