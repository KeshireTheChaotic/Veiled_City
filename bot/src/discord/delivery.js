/** Bounded Discord interaction text delivery using one initial response plus follow-ups. */
import { splitDiscordText } from "./chunking.js";

export async function deliverInteractionText(interaction,value,{ephemeral=true,limit=1900}={}){
  const chunks=splitDiscordText(value,limit);
  const first={content:chunks[0],ephemeral};
  if(interaction.deferred||interaction.replied)await interaction.editReply({content:chunks[0]});
  else await interaction.reply(first);
  for(const content of chunks.slice(1))await interaction.followUp({content,ephemeral});
  return chunks.length;
}
