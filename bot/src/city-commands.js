/** GM-only civic commands. No generic city-state endpoint is available to players. */
import { AttachmentBuilder, PermissionFlagsBits } from "discord.js";
import { PermissionError } from "./errors.js";
import { cityObject, calendarStatus, configureCalendar, indexWorldEvent, scheduleCityEvent, reviewCityEvent } from "./city-calendar.js";
import { updateCityCore, assignDistrictLocation, fileInstitutionReport, addWorldLink, submitInstitutionAction, reviewInstitutionAction,
  establishCommitment, configureCityFlags, proposeCityOpportunity, runInstitutionDirector } from "./city-core.js";
import { CIVIC_KINDS, updateCityCivic, connectCity, changeCityService, reviewCivicChange, transmitCityBelief, historyContext } from "./city-civic.js";
import { recordCityUpkeep, draftMinorNpc, reviewMinorNpc } from "./city-depth.js";
import { reviewOrganization } from "./owned-community.js";

export async function handleCityCommand(interaction,{db,gm}){
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
  else if(sub==="review") result=input?.kind==="change"?reviewCivicChange(db,guildId,input,interaction.user.id)
    :input?.kind==="action"?reviewInstitutionAction(db,guildId,input,interaction.user.id):reviewCityEvent(db,guildId,input,interaction.user.id);
  else if(sub==="update") result=input?.kind==="organization_request"?reviewOrganization(db,guildId,input,interaction.user.id)
    :CIVIC_KINDS.includes(input?.kind)?updateCityCivic(db,guildId,input,interaction.user.id):updateCityCore(db,guildId,input,interaction.user.id);
  else if(sub==="connect") result=connectCity(db,guildId,input,interaction.user.id);
  else if(sub==="service") result=changeCityService(db,guildId,input,interaction.user.id);
  else if(sub==="transmit") result=transmitCityBelief(db,guildId,input,interaction.user.id);
  else if(sub==="history") result=historyContext(db,guildId,interaction.options.getString("query")||"");
  else if(sub==="upkeep") result=recordCityUpkeep(db,guildId,input,interaction.user.id);
  else if(sub==="minor"){
    await interaction.deferReply({ephemeral:true});
    result=await draftMinorNpc({db,gm,content:gm.content,guildId,input,actorId:interaction.user.id});
  }
  else if(sub==="minor-review") result=reviewMinorNpc({db,content:gm.content,guildId,input,actorId:interaction.user.id});
  else if(sub==="membership") result=assignDistrictLocation(db,guildId,input,interaction.user.id);
  else if(sub==="report") result=fileInstitutionReport(db,guildId,input,interaction.user.id);
  else if(sub==="link") result=addWorldLink(db,guildId,input,interaction.user.id);
  else if(sub==="action") result=submitInstitutionAction(db,guildId,input,interaction.user.id);
  else if(sub==="commitment") result=establishCommitment(db,guildId,input,interaction.user.id);
  else if(sub==="flags") result=configureCityFlags(db,guildId,input,interaction.user.id);
  else if(sub==="opportunity") result=proposeCityOpportunity(db,guildId,interaction.options.getString("query")||"",interaction.user.id);
  else if(sub==="run") result=runInstitutionDirector(db,guildId,`manual:${interaction.id}`);
  else if(sub==="records") result=db.listCityRecords(guildId,{kind:interaction.options.getString("kind")||"",includeGM:true});
  else if(sub==="preview") result={clock:calendarStatus(db,guildId),due:db.dueCitySchedules(guildId),mutates:false};
  else throw new Error("Unknown city command.");
  const payload={content:`City ${sub} complete. Civic records are GM-private; no PC actions or mechanics were applied.`,
    files:[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"city-state.json"})]};
  if(interaction.deferred) await interaction.editReply(payload);
  else await interaction.reply({...payload,ephemeral:true});
  return true;
}
