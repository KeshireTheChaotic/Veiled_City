/** GM-only civic commands. No generic city-state endpoint is available to players. */
import { AttachmentBuilder, PermissionFlagsBits } from "discord.js";
import { PermissionError } from "./errors.js";
import { cityObject, calendarStatus, configureCalendar, indexWorldEvent, scheduleCityEvent, reviewCityEvent } from "./city-calendar.js";

export async function handleCityCommand(interaction,{db}){
  const guildId=interaction.guildId;
  if(!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
    && !interaction.member?.roles?.cache?.has(db.getCampaign(guildId)?.gm_role_id)) throw new PermissionError("GM/admin permission required.");
  const sub=interaction.options.getSubcommand();
  const raw=interaction.options.getString("json");
  const input=raw?cityObject(JSON.parse(raw)):null;
  let result;
  if(sub==="status") result={calendar:calendarStatus(db,guildId),due:db.dueCitySchedules(guildId)};
  else if(sub==="calendar") result=input?configureCalendar(db,guildId,input,interaction.user.id):calendarStatus(db,guildId);
  else if(sub==="events") result=db.listWorldEvents(guildId,{includeGM:true,query:interaction.options.getString("query")||""});
  else if(sub==="event") result=indexWorldEvent(db,guildId,input,interaction.user.id);
  else if(sub==="schedule") result=scheduleCityEvent(db,guildId,input,interaction.user.id);
  else if(sub==="review") result=reviewCityEvent(db,guildId,input,interaction.user.id);
  else if(sub==="preview") result={clock:calendarStatus(db,guildId),due:db.dueCitySchedules(guildId),mutates:false};
  else throw new Error("Unknown city command.");
  await interaction.reply({content:`City ${sub} complete. Civic records are GM-private; no PC actions or mechanics were applied.`,
    files:[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"city-state.json"})],ephemeral:true});
  return true;
}
