/** Bounded Discord interaction text delivery using one initial response plus follow-ups. */
import { splitDiscordText } from "./chunking.js";

export async function deliverInteractionText(interaction,value,{ephemeral=true,limit=1900,files=[],beforeSend=null}={}){
  const chunks=splitDiscordText(value,limit);
  const first={content:chunks[0],ephemeral,allowedMentions:{parse:[]},...(files.length?{files}:{})};
  beforeSend?.();
  if(interaction.deferred||interaction.replied){const {ephemeral:_,...payload}=first;await interaction.editReply(payload);}
  else await interaction.reply(first);
  for(const content of chunks.slice(1)){beforeSend?.();await interaction.followUp({content,ephemeral,allowedMentions:{parse:[]}});}
  return chunks.length;
}
