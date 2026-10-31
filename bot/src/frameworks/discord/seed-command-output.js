import {AttachmentBuilder} from 'discord.js';

/** Build the existing GM seed command response without making command or audience decisions. */
export function seedCommandReply(sub,result){
  const summary=result.drafts?result.drafts.map(row=>`${row.record_key} | ${row.data.proposal.kind} | ${row.data.proposal.key}`).join("\n")
    :`${result.record_key||result.name||"Validated package"} | ${result.status||"read-only definitions"}`;
  return {content:`${sub} complete (GM-only).\n${summary||"No matching drafts."}`.slice(0,1950),ephemeral:true,
    allowedMentions:{parse:[]},files:[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"seed-drafts.json"})]};
}
