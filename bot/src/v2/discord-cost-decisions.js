/** Native Discord event boundary. Prompt tokens and terms are server-owned;
 * observation never replies, spends, changes permissions or infers consent.
 */
export function createDiscordCostDecisions({client,readPrompt,readActionTerms}){
  if(typeof client?.on!=='function'||typeof client?.off!=='function'||typeof readPrompt!=='function'||typeof readActionTerms!=='function')throw new TypeError('Native Discord client and prompt readers required');
  const observed=new WeakSet(),decisions=new Map(),interactions=new Map();let closed=false;
  const listener=interaction=>{if(interaction&&typeof interaction==='object')observed.add(interaction);};
  client.on('interactionCreate',listener);
  function accept(interaction){
    if(closed||!observed.has(interaction)||interaction.client!==client||interaction.isButton?.()!==true||interaction.user?.bot!==false||typeof interaction.id!=='string'||!interaction.id)throw new Error('Observed native owner component required');
    const prompt=readPrompt(interaction.customId),terms=prompt&&readActionTerms(prompt.campaignId,prompt.actionRef);
    if(!prompt||prompt.status!=='active'||!['accept','reject'].includes(prompt.decision)||prompt.customId!==interaction.customId||prompt.campaignId!==interaction.guildId
      ||prompt.channelId!==interaction.channelId||prompt.messageId!==interaction.message?.id||prompt.ownerUserId!==interaction.user.id
      ||!terms||terms.id!==prompt.actionRef||terms.revision!==prompt.termsRevision||terms.ownerUserId!==interaction.user.id||terms.actorId!==prompt.actorId||terms.sceneId!==prompt.sceneId
      ||terms.campaignId!==prompt.campaignId||terms.cost?.amount!==prompt.amount||terms.cost?.slot!==prompt.costSlot)throw new Error('Exact native owner cost prompt required');
    const record={interactionId:interaction.id,principal:interaction.user.id,campaignId:prompt.campaignId,sceneId:prompt.sceneId,channelId:interaction.channelId,
      actorId:prompt.actorId,actionRef:prompt.actionRef,termsRevision:prompt.termsRevision,amount:prompt.amount,costSlot:prompt.costSlot,decision:prompt.decision,promptRef:prompt.id};
    const old=decisions.get(interaction.id);if(old&&JSON.stringify(old)!==JSON.stringify(record))throw new Error('Component decision replay conflict');
    decisions.set(interaction.id,Object.freeze(record));interactions.set(interaction.id,interaction);return decisions.get(interaction.id);
  }
  return Object.freeze({accept,readNative(id){const interaction=interactions.get(id);return interaction?accept(interaction):null;},close(){closed=true;client.off('interactionCreate',listener);decisions.clear();interactions.clear();}});
}
