import {createHash} from 'node:crypto';
import {MessageFlags} from 'discord.js';
import {createDiscordAudienceReader} from './discord-audience-reader.js';
import {createNativePrivateChannelRegistration} from './native-private-channel-registration.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
/** Native `/vc-player private-channel`, as in the legacy command: the owner runs it in their own
 * channel and the bot verifies that only they can see it. The audience is read twice from Discord
 * and must match; administrators and the GM role are observers, not recipients. A channel bound
 * to another scene or owner is refused for review, never reassigned. Grants no PC control.
 */
export function createDiscordPlayerChannel({client,sceneStore,interactionReceipts,readOwnerSession,audienceReader=null,onError=()=>{}}){
  if(typeof client?.on!=='function'||typeof client?.off!=='function'||typeof sceneStore?.commitSnapshot!=='function'||typeof interactionReceipts?.claim!=='function'||typeof readOwnerSession!=='function')throw new TypeError('Native private-channel dependencies required');
  const audiences=audienceReader??createDiscordAudienceReader({client}),observed=new WeakSet(),pending=new Map(),controller=new AbortController();let closed=false;
  const registration=createNativePrivateChannelRegistration({sceneStore,readOwnerSession,audienceReader:audiences});
  const observer=e=>{if(e&&typeof e==='object')observed.add(e);};client.on('interactionCreate',observer);
  const report=(error,eventId,stage)=>{try{onError(error,{interactionId:eventId,stage});}catch{}};
  const route=e=>{try{return e?.isChatInputCommand?.()===true&&(e.commandName==='vc-player'||e.commandName==='vc'&&e.options.getSubcommandGroup(false)==='player')&&e.options.getSubcommand()==='private-channel';}catch{return false;}};
  async function reply(e,content,check){const eventId=e.id;interactionReceipts.claimReply(eventId,{check});try{await e.editReply({content,allowedMentions:{parse:[]}});interactionReceipts.finishReply(eventId,'delivered',{check});}catch(error){interactionReceipts.finishReply(eventId,'uncertain',{check});report(error,eventId,'reply');}}
  async function execute(e){
    if(closed||!observed.has(e)||e.client!==client||e.user?.bot!==false||!id(e.id))throw new Error('Observed native owner command required');
    const initial=registration.scope({campaignId:e.guildId,ownerUserId:e.user.id,channelId:e.channelId}),eventId=e.id,bookkeeping=()=>{},current=()=>{controller.signal.throwIfAborted();if(closed||e.client!==client||registration.scope({campaignId:e.guildId,ownerUserId:e.user.id,channelId:e.channelId}).fingerprint!==initial.fingerprint)throw new Error('Native private-channel authority changed');};
    const binding={id:eventId,kind:'discord_command',campaignId:e.guildId,sceneId:initial.scene.id,actorId:initial.actor.id,principal:e.user.id,channelId:e.channelId,requestRef:`private-channel:${initial.scene.id}`,commandHash:hash([e.commandName,'private-channel'])};
    if(!interactionReceipts.claim(binding,{check:current}).created)return {handled:true,status:'already_claimed'};let stage='defer';
    try{
      if(e.deferred||e.replied||typeof e.deferReply!=='function'||typeof e.editReply!=='function')throw new Error('Native private acknowledgement required');
      await e.deferReply({flags:MessageFlags.Ephemeral});interactionReceipts.acknowledge(eventId,'deferred',{check:bookkeeping});current();stage='decision';
      const sourceRef=`discord-private-channel:${eventId}`;stage='effects';
      const receipt=await registration.register({campaignId:e.guildId,ownerUserId:e.user.id,channelId:e.channelId,sourceRef,initial},{check:current,signal:controller.signal});
      stage='receipt';interactionReceipts.complete(eventId,{id:sourceRef,hash:hash(receipt)},{check:bookkeeping});
      await reply(e,'This channel passed Veilkeeper\'s privacy check and is now your private GM channel for the active scene. Administrators and the GM role can still see it as observers.',bookkeeping);return {handled:true,status:'committed'};
    }catch(error){
      report(error,eventId,stage);
      try{const row=interactionReceipts.read(eventId);if(row.ack==='claimed')interactionReceipts.acknowledge(eventId,'uncertain',{check:bookkeeping});const held=interactionReceipts.hold(eventId,closed?'closed':stage,{check:bookkeeping});if(!closed&&held.ack==='deferred'&&held.reply==='not_started')await reply(e,'This channel could not be confirmed as private to you and needs native review. Nothing was changed.',bookkeeping);}catch(storageError){report(storageError,eventId,'receipt');}
      return {handled:true,status:'native_review_required'};
    }
  }
  async function handle(e){if(!route(e))return false;if(pending.has(e.id))return pending.get(e.id);const job=execute(e);pending.set(e.id,job);try{return await job;}finally{pending.delete(e.id);}}
  return Object.freeze({handle,claimsRoute:route,close(){closed=true;controller.abort();client.off('interactionCreate',observer);}});
}
