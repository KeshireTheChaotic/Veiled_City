import {createHash} from 'node:crypto';
import {MessageFlags} from 'discord.js';
import {createNativeSessionSetup} from './native-session-setup.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Routes an observed human `session start` command: private acknowledgement,
 * durable closed claim, fresh GM authority, then the fixed native creation.
 * It publishes nothing to the table and never retries after an uncertain effect or reply.
 */
export function createDiscordGmSession({client,sceneStore,gmAuthority,interactionReceipts,onError=()=>{}}){
  if(typeof client?.on!=='function'||typeof interactionReceipts?.claim!=='function'||typeof gmAuthority?.authorize!=='function')throw new TypeError('Native GM session dependencies required');
  const setup=createNativeSessionSetup({sceneStore,gmAuthority}),pending=new Map(),controller=new AbortController();let closed=false;
  const report=(error,id,stage)=>{try{onError(error,{interactionId:id,stage});}catch{}};
  const route=e=>{try{return e?.isChatInputCommand?.()===true&&(e.commandName==='vc-session'||e.commandName==='vc'&&e.options.getSubcommandGroup(false)==='session')&&e.options.getSubcommand()==='start';}catch{return false;}};
  async function reply(e,content,check){const id=e.id;interactionReceipts.claimReply(id,{check});try{await e.editReply({content,allowedMentions:{parse:[]}});interactionReceipts.finishReply(id,'delivered',{check});}catch(error){interactionReceipts.finishReply(id,'uncertain',{check});report(error,id,'reply');}}
  async function execute(e){
    const id=e.id,bookkeeping=()=>{},alive=()=>{controller.signal.throwIfAborted();if(closed||e.client!==client||e.user?.bot!==false)throw new Error('Native GM session command closed');};
    const binding={id,kind:'discord_command',campaignId:String(e.guildId),sceneId:`gm-operation:${id}`,actorId:`human-gm:${e.user?.id}`,principal:String(e.user?.id),channelId:String(e.channelId),requestRef:'session-start',commandHash:hash([e.commandName,e.options.getString('title')??'',e.options.getString('assembly')??'auto'])};
    const claim=interactionReceipts.claim(binding,{check:alive});if(!claim.created)return {handled:true,status:'already_claimed'};let stage='defer';
    try{
      if(e.deferred||e.replied||typeof e.deferReply!=='function'||typeof e.editReply!=='function')throw new Error('Native private acknowledgement required');
      await e.deferReply({flags:MessageFlags.Ephemeral});interactionReceipts.acknowledge(id,'deferred',{check:bookkeeping});alive();stage='decision';
      const proof=await gmAuthority.authorize(e,{signal:controller.signal});stage='effects';const created=setup.start(proof);
      stage='receipt';interactionReceipts.complete(id,{id:`session-start:${proof.sourceRef}`,hash:hash(created.receipt)},{check:bookkeeping});
      await reply(e,'Session saved. Nothing was announced; owner attendance and opening prose are separate steps.',bookkeeping);return {handled:true,status:'committed'};
    }catch(error){
      report(error,id,stage);
      try{const row=interactionReceipts.read(id);if(row.ack==='claimed')interactionReceipts.acknowledge(id,'uncertain',{check:bookkeeping});const held=interactionReceipts.hold(id,closed?'closed':stage,{check:bookkeeping});if(!closed&&held.ack==='deferred'&&held.reply==='not_started')await reply(e,'This session command was not confirmed and needs native review. No session was announced.',bookkeeping);}catch(storageError){report(storageError,id,'receipt');}
      return {handled:true,status:'native_review_required'};
    }
  }
  async function handle(e){if(!route(e))return false;if(pending.has(e.id))return pending.get(e.id);const job=execute(e);pending.set(e.id,job);try{return await job;}finally{pending.delete(e.id);}}
  return Object.freeze({handle,claimsRoute:route,close(){closed=true;controller.abort();}});
}
