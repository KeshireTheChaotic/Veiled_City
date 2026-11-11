import {createHash} from 'node:crypto';
import {MessageFlags} from 'discord.js';
import {createDiscordAudienceReader} from './discord-audience-reader.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
const normalized=value=>JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,Array.isArray(v)?[...v].sort():v])));
/** Observed owner diagnostic only. No expense, consent replay or inference. */
export function createDiscordCostCommands({client,workflow,sceneStore,readGmRoleId=()=>null,interactionReceipts,onError=()=>{}}){
  if(typeof workflow?.reconcileInteraction!=='function'||typeof workflow?.latestUncertain!=='function'||typeof readGmRoleId!=='function')throw new TypeError('Native owner cost command authorities required');
  const observed=new WeakSet(),audiences=createDiscordAudienceReader({client}),controller=new AbortController();let closed=false;
  const observer=event=>{if(event&&typeof event==='object')observed.add(event);};client.on('interactionCreate',observer);
  function claimsRoute(event){try{return event.isChatInputCommand?.()===true&&(event.commandName==='vc-player'||event.commandName==='vc'&&event.options.getSubcommandGroup(false)==='player')&&event.options.getSubcommand()==='cost-reconcile';}catch{return false;}}
  function authorize(event,ref){
    const target=interactionReceipts.read(ref)?.binding,campaignId=event.guildId,principal=event.user?.id;
    if(!target||target.campaignId!==campaignId||target.principal!==principal||!id(target.actorId)||!id(target.sceneId)||!id(target.promptRef))throw new Error('Owned saved cost interaction required');
    // Viewer authorization is the captured paying account, not present PC control. No actor
    // snapshot is loaded and this query can never create a source handle or a new decision.
    const channel=sceneStore.readers.readChannel(campaignId,event.channelId),gmRoleId=readGmRoleId(campaignId);
    if(!channel||!id(channel.sceneId)||channel.permissionsVerified!==true||!channel.recipientIds.includes(principal)||!channel.writerIds.includes(principal)||channel.kind==='private'&&(channel.ownerUserId!==principal||channel.recipientIds.length!==1))throw new Error('Current cost receipt viewer channel required');
    return {campaignId,principal,actorId:target.actorId,sceneId:target.sceneId,channel,gmRoleId,fingerprint:hash([channel,target,gmRoleId])};
  }
  async function handle(event){
    if(!claimsRoute(event))return false;
    if(closed||!observed.has(event)||event.client!==client||event.user?.bot!==false||!id(event.id))throw new Error('Observed native owner cost command required');
    const requested=event.options.getString('interaction',false),ref=requested??workflow.latestUncertain({campaignId:event.guildId,principal:event.user.id,channelId:event.channelId});if(!id(ref))throw new Error('Bounded native cost interaction reference required');
    const scope=authorize(event,ref),signature=hash([event.id,event.guildId,event.channelId,event.user.id,event.commandName,requested]);
    const current=()=>{controller.signal.throwIfAborted();if(closed||!claimsRoute(event)||event.client!==client||event.user?.bot!==false||hash([event.id,event.guildId,event.channelId,event.user.id,event.commandName,event.options.getString('interaction',false)])!==signature||authorize(event,ref).fingerprint!==scope.fingerprint)throw new Error('Owner cost receipt command changed');};
    const binding={id:event.id,kind:'discord_command',campaignId:scope.campaignId,sceneId:scope.sceneId,actorId:scope.actorId,principal:scope.principal,channelId:event.channelId,requestRef:`interaction:${ref}`,commandHash:hash(['cost-reconcile',requested,ref])},claim=interactionReceipts.claim(binding,{check:current});if(!claim.created)return {handled:true,status:'already_claimed'};
    let stage='defer';
    try{
      if(event.deferred||event.replied||typeof event.deferReply!=='function'||typeof event.editReply!=='function')throw new Error('Unclaimed private owner cost acknowledgement required');
      await event.deferReply({flags:MessageFlags.Ephemeral});interactionReceipts.acknowledge(event.id,'deferred',{check:()=>{}});current();stage='source';
      const audience=await audiences.read({guildId:scope.campaignId,channelId:event.channelId,sceneId:scope.channel.sceneId,mode:scope.channel.kind,ownerUserId:scope.channel.ownerUserId??null,gmRoleId:scope.gmRoleId,participantIds:scope.channel.kind==='party'?scope.channel.recipientIds:[]},{signal:controller.signal});current();const {revision,...nativeChannel}=scope.channel;if(normalized(nativeChannel)!==normalized(audience.channelRecord))throw new Error('Cost receipt command audience changed');
      stage='receipt';const result=workflow.reconcileInteraction(ref,{check:current});interactionReceipts.complete(event.id,{id:`cost-check:${event.id}`,hash:hash(result)},{check:()=>{}});current();interactionReceipts.claimReply(event.id,{check:current});
      try{await event.editReply({content:'Your saved cost decision and outcome were checked. No expense or earlier reply was replayed.',allowedMentions:{parse:[]}});interactionReceipts.finishReply(event.id,'delivered',{check:()=>{}});}catch(error){interactionReceipts.finishReply(event.id,'uncertain',{check:()=>{}});onError(error,{interactionId:event.id,stage:'reply'});}
      return {handled:true,status:'committed'};
    }catch(error){try{onError(error,{interactionId:event.id,stage});}catch{}try{const row=interactionReceipts.read(event.id);if(row.ack==='claimed')interactionReceipts.acknowledge(event.id,'uncertain',{check:()=>{}});const held=interactionReceipts.hold(event.id,stage,{check:()=>{}});if(!closed&&held.ack==='deferred'&&held.reply==='not_started'){interactionReceipts.claimReply(event.id,{check:()=>{}});try{await event.editReply({content:'This saved cost needs review. No expense was retried.',allowedMentions:{parse:[]}});interactionReceipts.finishReply(event.id,'delivered',{check:()=>{}});}catch(replyError){interactionReceipts.finishReply(event.id,'uncertain',{check:()=>{}});try{onError(replyError,{interactionId:event.id,stage:'reply'});}catch{}}}}catch{}return {handled:true,status:'native_review_required'};}
  }
  return Object.freeze({claimsRoute,handle,close(){closed=true;controller.abort();client.off('interactionCreate',observer);}});
}
