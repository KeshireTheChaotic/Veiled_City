import {createHash} from 'node:crypto';
import {MessageFlags} from 'discord.js';
import {createDiscordAudienceReader} from './discord-audience-reader.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
const normalized=value=>JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,Array.isArray(v)?[...v].sort():v])));
/** Observes native slash events; the future command router must explicitly call
 * handle and consume handled routes. Observation alone never runs a command.
 * Existing legacy requests/operations pass through until their own migration.
 */
export function createDiscordDeathCommands({client,workflow,actionStore,sceneStore,readActorSnapshot,readRoute,interactionReceipts,onError=()=>{}}){
  if(typeof client?.on!=='function'||typeof client?.off!=='function'||typeof workflow?.present!=='function'||typeof workflow?.reconcile!=='function'||typeof sceneStore?.readers?.readActor!=='function'||typeof readActorSnapshot!=='function'||typeof readRoute!=='function'||typeof interactionReceipts?.claim!=='function')throw new TypeError('Native owner command dependencies required');
  const audiences=createDiscordAudienceReader({client}),observed=new WeakSet(),pending=new Map(),controller=new AbortController();let closed=false;
  const observer=event=>{if(event&&typeof event==='object')observed.add(event);};client.on('interactionCreate',observer);
  const report=(error,interactionId,stage)=>{try{onError(error,{interactionId,stage});}catch{}};
  function parse(event){
    try{
      if(event?.isChatInputCommand?.()!==true||!(event.commandName==='vc-roll'||event.commandName==='vc'&&event.options.getSubcommandGroup(false)==='roll')||event.options.getSubcommand()!=='effect')return null;
      const raw=event.options.getString('json',true);if(typeof raw!=='string'||raw.length>4096)return null;const input=JSON.parse(raw);
      if(input?.op==='death-review'&&Object.keys(input).sort().join(',')==='op,request'&&id(input.request)&&input.request.startsWith('incoming-death:'))return {input,raw};
      if(input?.op==='death-reconcile'&&Object.keys(input).sort().join(',')==='interaction,op'&&id(input.interaction))return {input,raw};
    }catch{}return null;
  }
  function authorize(event,input){
    const campaignId=event.guildId,principal=event.user?.id,target=input.op==='death-review'?actionStore.readIncomingDeath(campaignId,input.request.slice('incoming-death:'.length)):interactionReceipts.read(input.interaction)?.binding;
    const actorId=target?.actorId,sceneId=target?.sceneId,owner=target?.ownerUserId??target?.principal;
    if(!id(campaignId)||!id(principal)||target?.campaignId!==campaignId||owner!==principal||!id(actorId)||!id(sceneId))throw new Error('Current owned native death request required');
    const actor=sceneStore.readers.readActor(campaignId,actorId),scene=sceneStore.readers.readScene(campaignId,sceneId),session=scene&&sceneStore.readers.readSession(campaignId,scene.sessionId),channel=sceneStore.readers.readChannel(campaignId,event.channelId),snapshot=readActorSnapshot(campaignId,actorId);
    const route=structuredClone(readRoute(campaignId,actorId,{requestRef:input.op==='death-review'?input.request:null,interactionRef:input.op==='death-reconcile'?input.interaction:null}));
    if(actor?.id!==actorId||actor.kind!=='pc'||actor.status!=='active'||actor.controlRole!=='owner'||actor.ownerUserId!==principal||actor.controllerUserId!==principal||actor.sceneId!==sceneId||snapshot?.actorId!==actorId||snapshot.ownerUserId!==principal||snapshot.controlRevision!==actor.controlRevision||scene?.status!=='active'||session?.status!=='active'||scene.participants?.filter(p=>p.actorId===actorId&&p.userId===principal&&['present','late','guest'].includes(p.presence)).length!==1||channel?.sceneId!==sceneId||channel.permissionsVerified!==true||!channel.recipientIds?.includes(principal)||!channel.writerIds?.includes(principal)||channel.kind==='private'&&(channel.ownerUserId!==principal||channel.recipientIds.length!==1)||route?.guildId!==campaignId||route.sceneId!==sceneId||route.ownerUserId!==principal)throw new Error('Current owner, attendance and scene command authority required');
    const identity={actorId:snapshot.actorId,ownerUserId:snapshot.ownerUserId,controlRevision:snapshot.controlRevision};
    return {campaignId,principal,actorId,sceneId,channel,route,requestRef:input.op==='death-review'?input.request:`interaction:${input.interaction}`,fingerprint:hash([actor,scene,session,channel,identity,route,target])};
  }
  async function execute(event,parsed){
    if(closed||!observed.has(event)||event.client!==client||event.user?.bot!==false||!id(event.id))throw new Error('Observed native owner slash command required');
    const scope=authorize(event,parsed.input),signature=hash([event.id,event.guildId,event.channelId,event.user.id,event.commandName,parsed.raw]);
    const current=()=>{controller.signal.throwIfAborted();const now=parse(event);if(closed||event.client!==client||event.user?.bot!==false||!now||hash([event.id,event.guildId,event.channelId,event.user.id,event.commandName,now.raw])!==signature||authorize(event,parsed.input).fingerprint!==scope.fingerprint)throw new Error('Native owner command authority changed');};
    const binding={id:event.id,kind:'discord_command',campaignId:scope.campaignId,sceneId:scope.sceneId,actorId:scope.actorId,principal:scope.principal,channelId:event.channelId,requestRef:scope.requestRef,commandHash:hash([event.commandName,parsed.raw])},claim=interactionReceipts.claim(binding,{check:current});if(!claim.created)return {handled:true,status:'already_claimed'};
    let stage='defer';const bookkeeping=()=>{};
    try{
      if(event.deferred||event.replied||typeof event.deferReply!=='function'||typeof event.editReply!=='function')throw new Error('Unclaimed native private command acknowledgement required');
      await event.deferReply({flags:MessageFlags.Ephemeral});interactionReceipts.acknowledge(event.id,'deferred',{check:bookkeeping});current();stage='decision';
      const audience=await audiences.read({guildId:scope.campaignId,channelId:event.channelId,sceneId:scope.sceneId,mode:scope.channel.kind,ownerUserId:scope.channel.ownerUserId??null,gmRoleId:scope.route.gmRoleId??null,participantIds:scope.channel.kind==='party'?scope.channel.recipientIds:[]},{signal:controller.signal});current();
      const {revision,...nativeChannel}=scope.channel;if(normalized(nativeChannel)!==normalized(audience.channelRecord))throw new Error('Native command audience requires reconciliation');
      stage='effects';const result=parsed.input.op==='death-review'?await workflow.present(scope.campaignId,parsed.input.request.slice('incoming-death:'.length),{check:current,signal:controller.signal}):workflow.reconcile(parsed.input.interaction,{check:current});
      stage='receipt';interactionReceipts.complete(event.id,{id:`native-command:${event.id}`,hash:hash(result)},{check:bookkeeping});current();interactionReceipts.claimReply(event.id,{check:current});
      const content=parsed.input.op==='death-reconcile'?'Your saved native receipt was checked. No effects or replies were replayed.':result.status==='presented'?'Your private death controls are available.':result.status==='native_review_required'?'Native review is required before these controls can continue.':'Your saved death request has no further move or recovery choice here.';
      try{await event.editReply({content,allowedMentions:{parse:[]}});interactionReceipts.finishReply(event.id,'delivered',{check:bookkeeping});}catch(error){interactionReceipts.finishReply(event.id,'uncertain',{check:bookkeeping});report(error,event.id,'reply');}
      return {handled:true,status:'committed'};
    }catch(error){
      report(error,event.id,stage);try{
        const old=interactionReceipts.read(event.id);if(old.ack==='claimed')interactionReceipts.acknowledge(event.id,'uncertain',{check:bookkeeping});const held=interactionReceipts.hold(event.id,closed?'closed':stage,{check:bookkeeping});
        if(!closed&&held.ack==='deferred'&&held.reply==='not_started'){
          interactionReceipts.claimReply(event.id,{check:bookkeeping});try{await event.editReply({content:'This native request needs review. Saved choices remain authoritative; do not repeat it to resolve uncertainty.',allowedMentions:{parse:[]}});interactionReceipts.finishReply(event.id,'delivered',{check:bookkeeping});}catch(replyError){interactionReceipts.finishReply(event.id,'uncertain',{check:bookkeeping});report(replyError,event.id,'reply');}
        }
      }catch(storageError){report(storageError,event.id,'receipt');}return {handled:true,status:'native_review_required'};
    }
  }
  async function handle(event){const parsed=parse(event);if(!parsed)return false;if(pending.has(event.id))return pending.get(event.id);const job=execute(event,parsed);pending.set(event.id,job);try{return await job;}finally{pending.delete(event.id);}}
  return Object.freeze({handle,close(){closed=true;controller.abort();client.off('interactionCreate',observer);}});
}
