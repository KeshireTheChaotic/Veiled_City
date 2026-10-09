/** Interaction acknowledgement timing and terminal response failures. No tokens, command arguments or campaign writes. */
const states=new WeakMap();
export function beginInteraction(interaction){
  if(!states.has(interaction)) states.set(interaction,{started:Date.now(),created:Number.isFinite(interaction.createdTimestamp)?interaction.createdTimestamp:Date.now()});
  return states.get(interaction);
}
export function terminalInteractionError(error){
  return [10062,10015,40060].includes(Number(error?.code??error?.rawError?.code));
}
export function interactionResponseExpired(interaction,error){
  return terminalInteractionError(error)||states.get(interaction)?.terminal===true;
}
export function interactionFailure(interaction,error,{phase="command",responseError=null}={}){
  const state=beginInteraction(interaction),original=error instanceof Error?error:new Error(String(error));
  if(terminalInteractionError(original)||terminalInteractionError(responseError)) state.terminal=true;
  original.interaction_diagnostic={command:String(interaction.commandName||""),subcommand:state.subcommand||"",phase,
    age_ms:Math.max(0,Date.now()-state.created),handler_elapsed_ms:Math.max(0,Date.now()-state.started),
    acknowledged:!!(interaction.deferred||interaction.replied),ack_started_age_ms:state.ack_started_age_ms??null,
    ack_completed_age_ms:state.ack_completed_age_ms??null,
    ...(original.interaction_diagnostic||{}),
    ...(responseError?{response_error:{code:String(responseError.code??responseError.rawError?.code??""),message:String(responseError.message||responseError).slice(0,300)}}:{})};
  return original;
}
export async function acknowledgeRules(interaction,subcommand){
  const state=beginInteraction(interaction);state.subcommand=subcommand;
  if(interaction.deferred||interaction.replied) return;
  if(state.acknowledgement) return state.acknowledgement;
  state.ack_started_age_ms=Math.max(0,Date.now()-state.created);
  state.acknowledgement=(async()=>{
    try{
      await interaction.deferReply({ephemeral:subcommand!=="ask"});
      state.ack_completed_age_ms=Math.max(0,Date.now()-state.created);
    }catch(error){throw interactionFailure(interaction,error,{phase:"acknowledgement"});}
  })();
  return state.acknowledgement;
}
export async function replyOrEdit(interaction,payload){
  if(interaction.deferred||interaction.replied) return interaction.editReply(typeof payload==="string"?payload:{content:payload.content});
  return interaction.reply(payload);
}
