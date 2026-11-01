import {createAttachment} from './attachment.js';

/** Original private brief payload; Session owns packet scope and formatted continuity text. */
export async function replyWithSessionBrief(interaction,packet,content){
  await interaction.reply({content,ephemeral:true,allowedMentions:{parse:[]},
    files:[createAttachment(Buffer.from(JSON.stringify(packet,null,2)),{name:'scoped-session-brief.json'})]});
  return true;
}
