/** Native Discord event boundary. Prompt tokens and terms are server-owned;
 * observation never replies, spends, changes permissions or infers consent.
 */
export function createDiscordCostDecisions({client,readPrompt,readActionTerms,decisionStore=null}){
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
    const record={interactionId:interaction.id,principal:interaction.user.id,campaignId:prompt.campaignId,sceneId:prompt.sceneId,channelId:interaction.channelId,messageId:interaction.message.id,
      actorId:prompt.actorId,actionRef:prompt.actionRef,termsRevision:prompt.termsRevision,amount:prompt.amount,costSlot:prompt.costSlot,decision:prompt.decision,promptRef:prompt.id};
    const old=decisions.get(interaction.id);if(old&&JSON.stringify(old)!==JSON.stringify(record))throw new Error('Component decision replay conflict');
    decisionStore?.put({record,customId:interaction.customId});decisions.set(interaction.id,Object.freeze(record));interactions.set(interaction.id,interaction);return decisions.get(interaction.id);
  }
  function readNative(id){
    if(closed)return null;const interaction=interactions.get(id);if(interaction)return accept(interaction);
    const envelope=decisionStore?.get(id);if(!envelope)return null;const r=envelope.record,p=readPrompt(envelope.customId),terms=p&&readActionTerms(p.campaignId,p.actionRef);
    if(!p||p.status!=='active'||!terms||r.interactionId!==id||r.promptRef!==p.id||r.principal!==p.ownerUserId||r.campaignId!==p.campaignId||r.sceneId!==p.sceneId||r.channelId!==p.channelId||r.messageId!==p.messageId
      ||r.actorId!==p.actorId||r.actionRef!==p.actionRef||r.termsRevision!==p.termsRevision||r.amount!==p.amount||r.costSlot!==p.costSlot||r.decision!==p.decision
      ||terms.id!==p.actionRef||terms.revision!==p.termsRevision||terms.ownerUserId!==r.principal||terms.actorId!==r.actorId||terms.campaignId!==r.campaignId||terms.sceneId!==r.sceneId||terms.cost?.amount!==r.amount||terms.cost?.slot!==r.costSlot)throw new Error('Persisted owner decision requires reconciliation');
    return Object.freeze(r);
  }
  return Object.freeze({accept,readNative,close(){closed=true;client.off('interactionCreate',listener);decisions.clear();interactions.clear();}});
}
