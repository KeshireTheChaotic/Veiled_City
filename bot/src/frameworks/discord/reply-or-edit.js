/** Original response adapter only; acknowledgement tracking remains in its existing module. */
export async function replyOrEdit(interaction,payload){
  if(interaction.deferred||interaction.replied) return interaction.editReply(typeof payload==="string"?payload:{content:payload.content});
  return interaction.reply(payload);
}
