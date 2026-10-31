/** Original interaction event orchestration. Existing command, storage and error services retain authority. */
export function registerInteractionHandler({client,db,gm,voice,handleCommand,safeStateError,interactionResponseExpired,consoleOutput=console}){
client.on("interactionCreate",async interaction=>{
  try{
    await handleCommand(interaction,{db,gm,voice});
  }catch(err){
    consoleOutput.error(err);
    if(interaction.guild) await safeStateError({guild:interaction.guild,error:err,context:`interaction:${interaction.commandName||"unknown"}`,sessionId:db.getActiveSession(interaction.guildId)?.id||null});
    if(!interactionResponseExpired(interaction,err)&&interaction.isRepliable()){
      if(interaction.deferred||interaction.replied) await interaction.editReply("An internal error occurred.").catch(()=>{});
      else await interaction.reply({content:"An internal error occurred.",ephemeral:true}).catch(()=>{});
    }
  }
});
}
