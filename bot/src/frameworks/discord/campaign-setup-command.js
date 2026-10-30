/** Original campaign setup; application owns identity/GM check and receipt lifecycle. */
export async function handleCampaignSetupCommand(interaction,{store,isGm}){
  const db=store;
      if(!isGm()) throw new Error("Manage Server or the configured GM role is required.");
      const ch=interaction.options.getChannel("play_channel",true);
      const role=interaction.options.getRole("gm_role");
      const mode=interaction.options.getString("mode")||process.env.DEFAULT_RESPONSE_MODE||"assisted";
      const c=db.configureCampaign(interaction.guildId,{playChannelId:ch.id,gmRoleId:role?.id||null,responseMode:mode});
      await interaction.reply({content:`Configured **${c.name}**. Play channel: <#${ch.id}>. Response mode: **${c.response_mode}**.`,ephemeral:true});
      return true;

}
