import {createHash} from 'node:crypto';
import {MessageFlags} from 'discord.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const confirmations={death_review:'Your risk review is saved. Choose your death move using the native controls.',death_choice:'Your death move choice is saved.',death_allocation:'Your recovery allocation is saved.'};
/** Opt-in native listener. No natural-language routing, inference or fate dice.
 * A claimed interaction is never automatically processed or replied to again.
 */
export function createDiscordDeathDispatcher({client,promptStore,decisionReader,choiceSources,ingress,receipts,onError=()=>{},onCommitted=async()=>{}}){
  if(typeof client?.on!=='function'||typeof client?.off!=='function'||typeof promptStore?.readPrompt!=='function'||typeof decisionReader?.accept!=='function'||typeof choiceSources?.ingest!=='function'||typeof ingress?.record!=='function'||typeof receipts?.claim!=='function'||typeof onError!=='function'||typeof onCommitted!=='function')throw new TypeError('Native death dispatch dependencies required');
  const pending=new Set(),controller=new AbortController();let closed=false;
  const report=(error,interactionId,stage)=>{try{onError(error,{interactionId,stage});}catch{}};
  const bookkeeping=()=>{};
  function bindingFor(event,prompt){return {id:event.id,campaignId:event.guildId,sceneId:prompt.terms.sceneId,actorId:prompt.terms.actorId,principal:event.user.id,channelId:event.channelId,messageId:event.message?.id,promptRef:prompt.id,tokenHash:hash(event.customId)};}
  async function process(event,prompt){
    const binding=bindingFor(event,prompt),signature=hash(binding);let claimed=false,stage='defer';
    const current=()=>{controller.signal.throwIfAborted();if(closed||event.client!==client||event.isButton?.()!==true||event.user?.bot!==false||hash(bindingFor(event,prompt))!==signature)throw new Error('Observed native death interaction changed');};
    try{
      current();const claim=receipts.claim(binding,{check:current});if(!claim.created)return claim.row;claimed=true;
      if(event.deferred||event.replied||typeof event.deferReply!=='function'||typeof event.editReply!=='function')throw new Error('Unclaimed native private acknowledgement required');
      await event.deferReply({flags:MessageFlags.Ephemeral});receipts.acknowledge(binding.id,'deferred',{check:bookkeeping});current();
      stage='decision';const decision=await decisionReader.accept(event,{signal:controller.signal});current();
      stage='source';const source=await choiceSources.ingest(binding.id,{signal:controller.signal});current();
      stage='effects';const receipt=ingress.record(source);stage='receipt';
      const evidence=decision.purpose==='death_allocation'?receipt?.allocation?.evidence:receipt?.evidence;
      if(!Object.hasOwn(confirmations,decision.purpose)||evidence?.id!==binding.id||evidence.sourceRef!==source.id||evidence.sourceRevision!==source.revision||evidence.actorId!==binding.actorId||evidence.campaignId!==binding.campaignId||evidence.sceneId!==binding.sceneId||evidence.ownerUserId!==binding.principal||evidence.requestRef!==decision.requestRef||typeof receipt?.id!=='string'||!receipt.id)throw new Error('Exact native owner interaction outcome required');
      receipts.complete(binding.id,{id:receipt.id,hash:hash(receipt)},{check:bookkeeping});
      current();stage='progression';await onCommitted({decision:structuredClone(decision),source:structuredClone(source),receipt:structuredClone(receipt)},{signal:controller.signal});
      current();receipts.claimReply(binding.id,{check:current});
      try{await event.editReply({content:confirmations[decision.purpose],allowedMentions:{parse:[]}});receipts.finishReply(binding.id,'delivered',{check:bookkeeping});}catch(error){receipts.finishReply(binding.id,'uncertain',{check:bookkeeping});report(error,binding.id,'reply');}
    }catch(error){
      report(error,binding.id,closed?'closed':stage);
      if(!claimed)return null;
      try{
        let row=receipts.read(binding.id);if(row.ack==='claimed')receipts.acknowledge(binding.id,'uncertain',{check:bookkeeping});
        row=receipts.hold(binding.id,closed?'closed':stage,{check:bookkeeping});
        if(!closed&&row.ack==='deferred'&&row.reply==='not_started'){
          receipts.claimReply(binding.id,{check:bookkeeping});
          try{await event.editReply({content:row.processing==='committed'?'Your decision is saved, but confirmation needs native reconciliation.':'This control needs native review. No new decision was confirmed. Do not repeat it to resolve uncertainty.',allowedMentions:{parse:[]}});receipts.finishReply(binding.id,'delivered',{check:bookkeeping});}catch(replyError){receipts.finishReply(binding.id,'uncertain',{check:bookkeeping});report(replyError,binding.id,'reply');}
        }
      }catch(storageError){report(storageError,binding.id,'receipt');}
    }
    return receipts.read(binding.id);
  }
  const listener=event=>{
    if(closed||event?.client!==client||event.isButton?.()!==true||event.user?.bot!==false||typeof event.customId!=='string'||!/^vk2death:[a-f0-9]{48}$/.test(event.customId))return;
    let prompt;try{prompt=promptStore.readPrompt(event.customId);}catch(error){report(error,event.id,'decision');return;}if(!prompt)return;
    const job=process(event,prompt);pending.add(job);void job.catch(error=>report(error,event.id,'receipt')).finally(()=>pending.delete(job));
  };
  client.on('interactionCreate',listener);
  return Object.freeze({async drain(){return Promise.allSettled([...pending]);},close(){if(closed)return;closed=true;controller.abort();client.off('interactionCreate',listener);}});
}
