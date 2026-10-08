/** Private seed draft management; callers must enforce GM authorization before invoking this handler. */
import { AttachmentBuilder } from "discord.js";
import { cityObject } from "./city-calendar.js";
import { addSeedDraft, editSeedDraft, reviewSeedDraft } from "./seed-drafts.js";

export async function handleSeedCommand(interaction,{db}){
  const sub=interaction.options.getSubcommand(),guildId=interaction.guildId,actorId=interaction.user.id;
  const id=interaction.options.getString("draft_id");
  let result;
  if(sub==="seed-drafts"){
    if(id){
      result=db.getCityRecord(guildId,"seed_draft",id);
      if(!result) throw new Error("Seed draft not found in this campaign.");
    }else{
      const page=interaction.options.getInteger("page")||1;
      const rows=db.listCityRecords(guildId,{kind:"seed_draft",status:interaction.options.getString("status")||"draft",
        query:interaction.options.getString("query")||"",includeGM:true,limit:21,offset:(page-1)*20});
      result={page,has_more:rows.length>20,drafts:rows.slice(0,20)};
    }
  }else if(sub==="seed-add") result=addSeedDraft(db,guildId,cityObject(JSON.parse(interaction.options.getString("json"))),actorId);
  else if(sub==="seed-edit") result=editSeedDraft(db,guildId,id,cityObject(JSON.parse(interaction.options.getString("json"))),actorId);
  else if(["seed-approve","seed-reject","seed-remove"].includes(sub)) result=reviewSeedDraft(db,guildId,id,sub.slice(5),actorId,{
    reason:interaction.options.getString("reason")||"",publicVoice:interaction.options.getBoolean("public_voice")===true});
  else throw new Error("Unknown seed draft command.");
  const summary=result.drafts?result.drafts.map(row=>`${row.record_key} | ${row.data.proposal.kind} | ${row.data.proposal.key}`).join("\n")
    :`${result.record_key} | ${result.status}`;
  await interaction.reply({content:`${sub} complete (GM-only).\n${summary||"No matching drafts."}`.slice(0,1950),ephemeral:true,
    allowedMentions:{parse:[]},files:[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"seed-drafts.json"})]});
  return true;
}
