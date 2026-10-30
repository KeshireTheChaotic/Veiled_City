/** Original player private-channel/accessibility commands; caller owns identity and receipt lifecycle. */
import {assertPlayerPrivateChannel} from './privacy.js';
export async function handlePlayerSettingsCommand(interaction,{sub,store}){
  const db=store;
  if(sub==="private-channel"){
    const campaign=db.getCampaign(interaction.guildId);
    assertPlayerPrivateChannel({guild:interaction.guild,channel:interaction.channel,userId:interaction.user.id,gmRoleId:campaign?.gm_role_id||null});
    db.setPrivateChannel(interaction.guildId,interaction.user.id,interaction.channelId);
    await interaction.reply({content:"This channel passed Veilkeeper's privacy validation and is now your preferred private GM channel.",ephemeral:true});
    return true;
  }
  if(sub==="accessibility"){
    const patch={};
    for(const k of ["length","mechanics"]) { const v=interaction.options.getString(k); if(v) patch[k==="length"?"response_length":k]=v; }
    const sr=interaction.options.getBoolean("screen_reader"); if(sr!==null) patch.screen_reader=sr;
    const next=db.setAccessibility(interaction.guildId,interaction.user.id,patch);
    await interaction.reply({content:`Accessibility preferences: \`${JSON.stringify(next)}\``,ephemeral:true});
    return true;
  }
  return false;
}
