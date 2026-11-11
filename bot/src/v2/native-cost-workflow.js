import {createCostInteractionReconciliation} from './cost-interaction-reconciliation.js';
import {createHash} from 'node:crypto';
import {MessageFlags} from 'discord.js';
import {createDiscordAudienceReader} from './discord-audience-reader.js';
import {createDiscordCostDecisions} from './discord-cost-decisions.js';
import {createComponentChoiceSources} from './component-choice-sources.js';
import {createHopeConsentIngress} from './rules/hope-consent-ingress.js';
import {deathPromptPayload as buttonPayload} from './death-prompts.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const payload=row=>({content:`This action costs ${row.amount} Hope. Spend it? Declining cancels this action.`,components:[{type:1,components:[{type:2,style:1,label:`Spend ${row.amount} Hope`,custom_id:row.acceptToken},{type:2,style:2,label:'Decline',custom_id:row.rejectToken}]}]});
/** Native owner consent and fixed cost execution. No model text can set terms or accept a prompt. */
export function createNativeCostWorkflow({client,actionStore,sceneStore,sourceAuthority,sourceRegistry,readActor,readRoute,promptStore,decisionStore,interactionReceipts,nativeActions,allowedGuildIds=null,clock=()=>Date.now(),onError=()=>{}}){
  if(typeof promptStore?.ensure!=='function'||typeof nativeActions?.propose!=='function'||typeof readRoute!=='function'||typeof readActor!=='function')throw new TypeError('Native cost workflow dependencies required');
  const audiences=createDiscordAudienceReader({client}),decisions=createDiscordCostDecisions({client,readPrompt:promptStore.readPrompt,readActionTerms:actionStore.readActionTerms,decisionStore}),sources=createComponentChoiceSources({decisionReader:decisions,sceneStore,sourceAuthority,audienceReader:audiences}),ingress=createHopeConsentIngress({sourceAuthority,readActor,readDecision:sources.readDecision,actionStore});
  const reconciliation=createCostInteractionReconciliation({interactionReceipts,decisionStore,promptStore,actionStore,sourceRegistry});
  const pending=new Set(),publications=new Map(),controller=new AbortController();let closed=false;
  const report=(error,id,stage)=>{try{onError(error,{interactionId:id,stage});}catch{}};
  function inspect(source,actionRef){
    controller.signal.throwIfAborted();
    const action=actionStore.read(source.campaign,actionRef),terms=actionStore.readActionTerms(source.campaign,actionRef),actor=terms&&readActor(source.campaign,terms.actorId),route=terms&&readRoute(source.campaign,terms.actorId);
    if(closed||allowedGuildIds&&!allowedGuildIds.has(source.campaign)||!sourceAuthority.revalidate(source)||!action||action.kind!=='hope_cost'||!terms||terms.id!==actionRef||action.sourceRef!==source.id||action.sourceRevision!==source.revision||terms.sourceRef!==source.id||terms.sourceRevision!==source.revision||terms.campaignId!==source.campaign||terms.sceneId!==source.scene||terms.ownerUserId!==source.principal||!source.actors.includes(terms.actorId)||actor?.kind!=='pc'||actor.status!=='active'||actor.ownerUserId!==source.principal||actor.controllerUserId!==source.principal||actor.controlRole!=='owner'||actor.controlRevision!==terms.controlRevision||route?.guildId!==source.campaign||route.sceneId!==source.scene||route.ownerUserId!==source.principal||!route.channelId||terms.cost?.resource!=='hope')throw new Error('Current owner native cost and private route required');
    return {action,terms,route};
  }
  function context(row){
    const source=sourceAuthority.inspectReference(row.sourceRef,row.sourceRevision),snapshot=inspect(source,row.actionRef),{terms,route}=snapshot;
    if(snapshot.action.status!=='awaiting_consent'||row.campaignId!==source.campaign||row.sceneId!==source.scene||row.ownerUserId!==source.principal||row.actorId!==terms.actorId||row.termsRevision!==terms.revision||row.amount!==terms.cost.amount||row.costSlot!==terms.cost.slot||row.channelId!==route.channelId||row.expiresAt<=clock())throw new Error('Current pending native cost terms required');
    const current=()=>{const saved=promptStore.read(row.id);if(!saved||!['awaiting_delivery','delivering','uncertain','active'].includes(saved.status)||saved.bindingHash!==row.bindingHash||hash(payload(saved))!==hash(payload(row)))throw new Error('Native cost prompt revoked or changed');const next=inspect(source,row.actionRef);if(next.action.status!=='awaiting_consent'||hash(next.terms)!==hash(terms)||hash(next.route)!==hash(route)||row.expiresAt<=clock())throw new Error('Native cost changed');};current();
    return {current,request:{guildId:route.guildId,channelId:route.channelId,sceneId:route.sceneId,ownerUserId:route.ownerUserId,mode:'private'}};
  }
  async function channelFor(row){const guild=await client.guilds.fetch({guild:row.campaignId,force:true}),channel=await guild.channels.fetch(row.channelId,{force:true});if(guild.id!==row.campaignId||channel?.id!==row.channelId||channel.guildId!==row.campaignId||typeof channel.messages?.fetch!=='function')throw new Error('Native cost channel required');return channel;}
  async function verifyMessage(row,ctx,channel){
    const message=await channel.messages.fetch({message:row.publication.response.messageId,force:true}),audience=await audiences.read(ctx.request,{signal:controller.signal});ctx.current();
    if(audience.fingerprint!==row.publication.audienceFingerprint||message?.id!==row.publication.response.messageId||message.guildId!==row.campaignId||message.channelId!==row.channelId||message.author?.id!==client.user?.id||message.author?.bot!==true||message.webhookId||message.system||hash(buttonPayload(message))!==row.publication.payloadHash)throw new Error('Exact delivered native cost required');return message;
  }
  async function publish(ref){
    let row=promptStore.read(ref);const ctx=context(row),before=await audiences.read(ctx.request,{signal:controller.signal});ctx.current();
    if(row.publication){
      if(row.status==='active')return row;
      if(!row.publication.response)throw new Error('Uncertain native cost send requires review; no resend');
      if(before.fingerprint!==row.publication.audienceFingerprint)throw new Error('Saved cost audience changed');
      await verifyMessage(row,ctx,await channelFor(row));return promptStore.acknowledge(ref,row.publication.response.messageId,{check:ctx.current});
    }
    const expected=payload(row);row=promptStore.claim(ref,{check:ctx.current,audienceFingerprint:before.fingerprint,payloadHash:hash(buttonPayload(expected))});
    try{
      const channel=await channelFor(row),fresh=await audiences.read(ctx.request,{signal:controller.signal});ctx.current();if(fresh.fingerprint!==before.fingerprint||typeof channel.send!=='function')throw new Error('Cost audience changed before send');
      const sent=await channel.send({...expected,allowedMentions:{parse:[]},nonce:hash(row.publication.attemptId).slice(0,24),enforceNonce:true});
      row=promptStore.recordResponse(ref,row.publication.attemptId,sent?.id,{check:ctx.current});await verifyMessage(row,ctx,channel);return promptStore.acknowledge(ref,sent.id,{check:ctx.current});
    }catch(error){try{promptStore.markUncertain(ref,row.publication.attemptId);}catch{}throw error;}
  }
  function track(job){pending.add(job);void job.catch(()=>{}).finally(()=>pending.delete(job));return job;}
  function request(source,actionRef){
    const initial=inspect(source,actionRef),signature=hash([initial.terms,initial.route]);
    const check=()=>{const next=inspect(source,actionRef);if(hash([next.terms,next.route])!==signature)throw new Error('Native cost request changed');};
    if(initial.action.status==='pending')actionStore.transition({campaignId:source.campaign,actionId:actionRef,expectedRevision:initial.action.revision,sourceRef:`${actionRef}:consent-window`,to:'awaiting_consent'},{check});
    if(actionStore.read(source.campaign,actionRef).status!=='awaiting_consent')throw new Error('Native consent window closed');
    const {terms,route}=initial,row=promptStore.ensure({campaignId:source.campaign,sceneId:source.scene,channelId:route.channelId,ownerUserId:source.principal,actorId:terms.actorId,actionRef,termsRevision:terms.revision,costSlot:terms.cost.slot,amount:terms.cost.amount,sourceRef:source.id,sourceRevision:source.revision,expiresAt:clock()+600000},{check});
    if(row.expiresAt<=clock()||['revoked','uncertain','delivering'].includes(row.status))return {status:'native_review_required',request_ref:row.id,effects_committed:false};
    if(row.status==='awaiting_delivery'&&!publications.has(row.id)){const job=track(Promise.resolve().then(()=>publish(row.id)));publications.set(row.id,job);void job.catch(error=>report(error,row.id,'cost_delivery')).finally(()=>publications.delete(row.id));}
    return {status:'awaiting_consent',request_ref:row.id,effects_committed:false};
  }
  async function process(event,prompt){
    const binding={id:event.id,campaignId:event.guildId,sceneId:prompt.sceneId,actorId:prompt.actorId,principal:event.user.id,channelId:event.channelId,messageId:event.message?.id,promptRef:prompt.id,tokenHash:hash(event.customId)},signature=hash(binding);let claimed=false,stage='defer';
    const current=()=>{controller.signal.throwIfAborted();if(closed||event.client!==client||event.user?.bot!==false||event.isButton?.()!==true||event.id!==binding.id||event.guildId!==binding.campaignId||event.channelId!==binding.channelId||event.user.id!==binding.principal||event.message?.id!==binding.messageId||hash(event.customId)!==binding.tokenHash||hash(binding)!==signature)throw new Error('Observed owner cost event changed');};
    try{
      current();const claim=interactionReceipts.claim(binding,{check:current});if(!claim.created)return;claimed=true;
      if(event.deferred||event.replied||typeof event.deferReply!=='function'||typeof event.editReply!=='function')throw new Error('Fresh native cost acknowledgement required');
      await event.deferReply({flags:MessageFlags.Ephemeral});interactionReceipts.acknowledge(event.id,'deferred',{check:()=>{}});current();stage='decision';
      const ctx=context(prompt);if(event.message?.author?.id!==client.user?.id||event.message.author.bot!==true||event.user.id!==prompt.ownerUserId||event.guildId!==prompt.campaignId||event.channelId!==prompt.channelId||event.message?.id!==prompt.messageId||hash(buttonPayload(event.message))!==prompt.publication?.payloadHash)throw new Error('Exact observed owner cost payload required');
      await verifyMessage(prompt,ctx,await channelFor(prompt));current();decisions.accept(event);stage='source';const source=await sources.ingest(event.id,{signal:controller.signal});current();await verifyMessage(prompt,ctx,await channelFor(prompt));current();
      stage='effects';const consent=ingress.record(source,prompt.actionRef);
      const outcome=consent.status==='accepted'?nativeActions.propose(source,{source_ref:source.id,actor_ref:prompt.actorId,action:{kind:'hope_cost.commit',parameters:{action_ref:prompt.actionRef,consent_ref:consent.id}}}):{status:'cancelled',effects_committed:false};
      if(consent.status==='accepted'&&outcome.effects_committed!==true)throw new Error('Native cost commit unavailable');
      interactionReceipts.complete(event.id,{id:consent.id,hash:hash([consent,outcome])},{check:()=>{}});stage='receipt';current();interactionReceipts.claimReply(event.id,{check:current});
      try{await event.editReply({content:consent.status==='accepted'?`${prompt.amount} Hope spent.`:'Declined. This action was cancelled.',allowedMentions:{parse:[]}});interactionReceipts.finishReply(event.id,'delivered',{check:()=>{}});}catch(error){interactionReceipts.finishReply(event.id,'uncertain',{check:()=>{}});report(error,event.id,'reply');}
    }catch(error){report(error,event.id,stage);if(claimed){try{const row=interactionReceipts.read(event.id);if(row.ack==='claimed')interactionReceipts.acknowledge(event.id,'uncertain',{check:()=>{}});const held=interactionReceipts.hold(event.id,stage,{check:()=>{}});if(!closed&&held.ack==='deferred'&&held.reply==='not_started'){interactionReceipts.claimReply(event.id,{check:()=>{}});try{await event.editReply({content:'This control needs native review. Check the saved action before trying again.',allowedMentions:{parse:[]}});interactionReceipts.finishReply(event.id,'delivered',{check:()=>{}});}catch(replyError){interactionReceipts.finishReply(event.id,'uncertain',{check:()=>{}});report(replyError,event.id,'reply');}}}catch(storageError){report(storageError,event.id,'receipt');}}}
  }
  const listener=event=>{if(closed||event?.client!==client||event.user?.bot!==false||event.isButton?.()!==true||typeof event.id!=='string'||allowedGuildIds&&!allowedGuildIds.has(event.guildId)||!/^vk2cost:[a-f0-9]{48}$/.test(event.customId??''))return;const prompt=promptStore.readPrompt(event.customId);if(prompt)track(process(event,prompt));};client.on('interactionCreate',listener);
  function latestUncertain({campaignId,principal,channelId}){
    const rows=interactionReceipts.recentUncertain(campaignId,principal,channelId);if(rows.length>100)throw new Error('Choose a specific saved cost interaction');
    const eligible=rows.filter(row=>{const b=row.binding;if(typeof b?.promptRef!=='string')return false;const p=promptStore.read(b.promptRef);if(!p||p.campaignId!==campaignId||p.ownerUserId!==principal||p.actorId!==b.actorId||p.channelId!==channelId)return false;return true;});
    const unresolved=eligible.filter(row=>!row.reconciliation),chosen=unresolved.length?unresolved:eligible.slice(0,1);if(chosen.length!==1)throw new Error('Choose the specific saved cost interaction to check');return chosen[0].binding.id;
  }
  return Object.freeze({request,latestUncertain,reconcileInteraction:(ref,options)=>reconciliation.reconcile(ref,options),async present(source,actionRef){const result=request(source,actionRef);await publications.get(result.request_ref);return {result,prompt:promptStore.read(result.request_ref)};},reconcile:ref=>track(publish(ref)),async drain(){while(pending.size)await Promise.allSettled([...pending]);},close(){if(closed)return;closed=true;controller.abort();client.off('interactionCreate',listener);decisions.close();}});
}
