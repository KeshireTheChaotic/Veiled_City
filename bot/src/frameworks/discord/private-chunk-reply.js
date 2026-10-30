/** Original ordered private response transport for chunks already formed by the owning framework. */
export async function replyWithPrivateChunks(interaction,chunks){
  await interaction.reply({content:chunks[0],ephemeral:true});
  for(const content of chunks.slice(1))await interaction.followUp({content,ephemeral:true});
  return true;
}
