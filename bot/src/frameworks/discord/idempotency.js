import {commandKey,isMutatingCommand} from './command-mutations.js';

/**
 * Discord interaction idempotency helpers.
 *
 * Discord may retry an interaction delivery when the initial acknowledgement is
 * delayed. Mutating commands use the immutable interaction ID as an operation
 * receipt key so the same delivery cannot apply campaign state twice.
 */





/** Return a prior interaction response when Discord redelivers the same mutating interaction. */
export async function replayReceiptIfPresent({db,interaction,group,sub}){
  if(!isMutatingCommand(group,sub)||!interaction?.id) return false;
  const prior=db.getOperationReceipt(interaction.guildId,interaction.id);
  if(!prior||prior.status!=="completed") return false;
  const text=prior.response_text||`Operation \`${prior.command_key}\` was already applied.`;
  const content=`↩️ **Already applied** — ${text}`;
  if(interaction.deferred||interaction.replied) await interaction.editReply({content});
  else await interaction.reply({content,ephemeral:true});
  return true;
}

/** Persist the completed operation before attempting its fallible Discord response. */
export function installReceiptCapture({db,interaction,group,sub}){
  if(!isMutatingCommand(group,sub)||!interaction?.id) return ()=>{};
  const originalReply=interaction.reply?.bind(interaction);
  const originalEdit=interaction.editReply?.bind(interaction);
  let recorded=false;
  const record=(payload)=>{
    if(recorded) return;
    const text=typeof payload==="string"?payload:String(payload?.content||"");
    if(/^\s*⚠️/.test(text)) return;
    const key=commandKey(group,sub);
    db.transaction(()=>{
      db.recordOperationReceipt(interaction.guildId,{
        interactionId:interaction.id,commandKey:key,actorUserId:interaction.user.id,
        responseText:text,payload:{commandName:interaction.commandName}
      });
      db.recordMutation(interaction.guildId,{
        sessionId:db.getActiveSession(interaction.guildId)?.id||null,
        actorType:"human",actorId:interaction.user.id,sourceLayer:"command",sourceInteractionId:interaction.id,
        mutationType:`command:${key}`,entityKey:key,visibility:"gm",confidence:100,
        rationale:text,payload:{commandName:interaction.commandName}
      });
    });
    recorded=true;
  };
  if(originalReply) interaction.reply=async payload=>{ record(payload); return originalReply(payload); };
  if(originalEdit) interaction.editReply=async payload=>{ record(payload); return originalEdit(payload); };
  return ()=>{ if(originalReply) interaction.reply=originalReply; if(originalEdit) interaction.editReply=originalEdit; };
}
