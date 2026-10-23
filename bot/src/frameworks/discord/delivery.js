/** Discord-owned text-splitting port: same implementation supplied once by application composition. */
export function createInteractionTextDelivery({splitDiscordText}){
  if(typeof splitDiscordText!=='function')throw new TypeError('Interaction delivery requires a text splitting capability.');
  return async function deliverInteractionText(interaction,value,{ephemeral=true,limit=1900,files=[],components=[],beforeSend=null}={}){
  const chunks=splitDiscordText(value,limit);
  const first={content:chunks[0],ephemeral,allowedMentions:{parse:[]},...(files.length?{files}:{}),...(components.length?{components}:{})};
  beforeSend?.();
  if(interaction.deferred||interaction.replied){const {ephemeral:_,...payload}=first;await interaction.editReply(payload);}
  else await interaction.reply(first);
  for(const content of chunks.slice(1)){beforeSend?.();await interaction.followUp({content,ephemeral,allowedMentions:{parse:[]}});}
  return chunks.length;
};
}
