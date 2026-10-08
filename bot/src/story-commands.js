/** GM-only expansion operations; read-only diagnostics never create command receipts or campaign state. */
import { AttachmentBuilder, PermissionFlagsBits } from "discord.js";
import { PermissionError } from "./errors.js";
import { cityObject } from "./city-calendar.js";
import { ContextPlanner } from "./context-planner.js";
import { resolveNpcConversation } from "./npc-conversations.js";
import { validateNarrativeClaims } from "./narrative-integrity.js";
export async function handleStoryCommand(interaction,{db}){
  if(!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)&&
    !interaction.member?.roles?.cache?.has(db.getCampaign(interaction.guildId)?.gm_role_id)) throw new PermissionError("GM/admin permission required.");
  const sub=interaction.options.getSubcommand(),raw=interaction.options.getString("json"),input=cityObject(JSON.parse(raw||"{}")),guild=interaction.guildId;
  let result;
  if(sub==="context") result=new ContextPlanner(db).plan(guild,input);
  else if(sub==="conversation") result=resolveNpcConversation(db,guild,input,interaction.user.id);
  else if(sub==="diagnose"){
    try{result=validateNarrativeClaims(db,guild,input.result||{},input.scope||{mode:"party"});}
    catch(error){if(error.code!=="NARRATIVE_INTEGRITY") throw error;result={ok:false,...error.diagnostic};}
  }else throw new Error("Unknown story operation.");
  await interaction.reply({ephemeral:true,content:`Story ${sub}: GM-private result.`,
    files:[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"story-result.json"})]});
}
