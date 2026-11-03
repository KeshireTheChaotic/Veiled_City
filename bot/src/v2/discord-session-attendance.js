import {createHash} from 'node:crypto';
import {MessageFlags} from 'discord.js';
import {createDiscordAudienceReader} from './discord-audience-reader.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
const plain=row=>{const {revision,...data}=row;return data;};
const normalized=value=>JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,Array.isArray(v)?[...v].sort():v])));
/** Read-only identity adapter for the existing native character repository.
 * Packages/import suggestions cannot register an actor or bootstrap mechanics.
 */
export function createCharacterIdentityReader({repository}){
  if(typeof repository?.getCharacter!=='function')throw new TypeError('Native character repository required');
  return (campaignId,actorId)=>{const c=repository.getCharacter(actorId);return c?.id===actorId&&c.guild_id===campaignId&&id(c.owner_user_id)?{id:c.id,guild_id:c.guild_id,owner_user_id:c.owner_user_id,status:c.status}:null;};
}
/** Attendance only, for an already provisioned active session/scene/actor.
 * No fictional arrival, movement, resource bootstrap, PC proxy or GM override.
 */
export function createDiscordSessionAttendance({client,sceneStore,interactionReceipts,readOwnerSession,readCharacter,onError=()=>{}}){
  if(typeof sceneStore?.commitSnapshot!=='function'||typeof interactionReceipts?.claim!=='function'||typeof readOwnerSession!=='function'||typeof readCharacter!=='function'||typeof client?.on!=='function'||typeof client?.off!=='function')throw new TypeError('Native attendance dependencies required');
  const audiences=createDiscordAudienceReader({client}),observed=new WeakSet(),pending=new Map(),controller=new AbortController();let closed=false;
  const observer=e=>{if(e&&typeof e==='object')observed.add(e);};client.on('interactionCreate',observer);
  const report=(error,id,stage)=>{try{onError(error,{interactionId:id,stage});}catch{}};
  function route(e){try{if(e?.isChatInputCommand?.()!==true||!(e.commandName==='vc-session'||e.commandName==='vc'&&e.options.getSubcommandGroup(false)==='session'))return null;const sub=e.options.getSubcommand();return ['present','arrive','absent','leave'].includes(sub)?sub:null;}catch{return null;}}
  function parse(e){const sub=route(e);if(!sub)return null;const query=e.options.getString('character')??'',mode=['absent','leave'].includes(sub)?e.options.getString('mode')??'offscreen':'offscreen';if(typeof query!=='string'||query.length>256||mode!=='offscreen')throw new Error('Native owner attendance accepts offscreen absence only; no PC proxy grant');return {sub,query,presence:sub==='arrive'?'late':['absent','leave'].includes(sub)?'absent':'present'};}
  function scope(e,input){
    const c=e.guildId,u=e.user?.id,r=structuredClone(readOwnerSession(c,u,input.query)),a=r&&sceneStore.readers.readActor(c,r.actorId),s=r&&sceneStore.readers.readScene(c,r.sceneId),session=s&&sceneStore.readers.readSession(c,s.sessionId),ch=sceneStore.readers.readChannel(c,e.channelId),character=r&&readCharacter(c,r.actorId);
    if(!id(c)||!id(u)||r?.campaignId!==c||r.ownerUserId!==u||!id(r.actorId)||r.sessionId!==s?.sessionId||s?.status!=='active'||session?.status!=='active'||a?.id!==r.actorId||a.campaignId!==c||a.sceneId!==s.id||a.status!=='active'||a.kind!=='pc'||a.controlRole!=='owner'||a.ownerUserId!==u||a.controllerUserId!==u||character?.id!==a.id||character.guild_id!==c||character.owner_user_id!==u||!['active','reserve','guest','dead'].includes(character.status)||ch?.sceneId!==s.id||ch.permissionsVerified!==true||!ch.recipientIds?.includes(u)||!ch.writerIds?.includes(u)||ch.kind==='private'&&(ch.ownerUserId!==u||ch.recipientIds.length!==1))throw new Error('Current owned character, registered control and active session channel required');
    const identity={id:character.id,guild_id:character.guild_id,owner_user_id:character.owner_user_id,status:character.status};
    return {route:r,actor:a,scene:s,channel:ch,fingerprint:hash([r,a,s.id,s.authorityRevision??s.revision,session,ch,identity])};
  }
  async function execute(e,input){
    if(closed||!observed.has(e)||e.client!==client||e.user?.bot!==false||!id(e.id))throw new Error('Observed native owner attendance command required');const initial=scope(e,input),eventId=e.id,signature=hash([eventId,e.guildId,e.user.id,e.channelId,e.commandName,input]);
    const current=()=>{controller.signal.throwIfAborted();if(closed||e.client!==client||e.user?.bot!==false||hash([e.id,e.guildId,e.user.id,e.channelId,e.commandName,parse(e)])!==signature||scope(e,input).fingerprint!==initial.fingerprint)throw new Error('Native owner attendance authority changed');};
    const binding={id:eventId,kind:'discord_command',campaignId:e.guildId,sceneId:initial.scene.id,actorId:initial.actor.id,principal:e.user.id,channelId:e.channelId,requestRef:`attendance:${initial.scene.sessionId}:${initial.scene.id}`,commandHash:hash([e.commandName,input])};const claim=interactionReceipts.claim(binding,{check:current});if(!claim.created)return {handled:true,status:'already_claimed'};const bookkeeping=()=>{};let stage='defer';
    try{
      if(e.deferred||e.replied||typeof e.deferReply!=='function'||typeof e.editReply!=='function')throw new Error('Native private attendance acknowledgement required');await e.deferReply({flags:MessageFlags.Ephemeral});interactionReceipts.acknowledge(eventId,'deferred',{check:bookkeeping});current();stage='decision';
      const ch=initial.channel,audience=await audiences.read({guildId:e.guildId,channelId:e.channelId,sceneId:initial.scene.id,mode:ch.kind,ownerUserId:ch.ownerUserId??null,gmRoleId:initial.route.gmRoleId??null,participantIds:ch.kind==='party'?ch.recipientIds:[]},{signal:controller.signal});current();if(normalized(plain(ch))!==normalized(audience.channelRecord))throw new Error('Attendance channel permissions require reconciliation');
      const s=sceneStore.readers.readScene(e.guildId,initial.scene.id),existing=s.participants.find(p=>p.actorId===initial.actor.id);if(existing&&existing.userId!==e.user.id)throw new Error('Attendance assignment requires owner review');
      const presence=input.presence!=='absent'&&['present','late','guest'].includes(existing?.presence)?existing.presence:input.presence;
      const participant={actorId:initial.actor.id,userId:e.user.id,presence},participants=existing?s.participants.map(p=>p.actorId===participant.actorId?participant:p):[...s.participants,participant];
      stage='effects';const sourceRef=`discord-attendance:${eventId}`,receipt=sceneStore.commitSnapshot({campaignId:e.guildId,principal:e.user.id,sourceRef,records:[{kind:'scene',data:{id:s.id,campaignId:s.campaignId,sessionId:s.sessionId,status:s.status,participants},expectedRevision:Number(s.revision)}]},{check:current});
      stage='receipt';interactionReceipts.complete(eventId,{id:sourceRef,hash:hash(receipt)},{check:bookkeeping});current();interactionReceipts.claimReply(eventId,{check:current});try{await e.editReply({content:input.presence==='absent'?'Your absence is saved. Your PC remains under your control.':'Your attendance is saved. It does not establish fictional arrival, movement, co-location or party membership.',allowedMentions:{parse:[]}});interactionReceipts.finishReply(eventId,'delivered',{check:bookkeeping});}catch(error){interactionReceipts.finishReply(eventId,'uncertain',{check:bookkeeping});report(error,eventId,'reply');}return {handled:true,status:'committed'};
    }catch(error){report(error,eventId,stage);try{const row=interactionReceipts.read(eventId);if(row.ack==='claimed')interactionReceipts.acknowledge(eventId,'uncertain',{check:bookkeeping});const held=interactionReceipts.hold(eventId,closed?'closed':stage,{check:bookkeeping});if(!closed&&held.ack==='deferred'&&held.reply==='not_started'){interactionReceipts.claimReply(eventId,{check:bookkeeping});try{await e.editReply({content:'Attendance needs native review. No fictional arrival or PC action was confirmed.',allowedMentions:{parse:[]}});interactionReceipts.finishReply(eventId,'delivered',{check:bookkeeping});}catch(replyError){interactionReceipts.finishReply(eventId,'uncertain',{check:bookkeeping});report(replyError,eventId,'reply');}}}catch(storageError){report(storageError,eventId,'receipt');}return {handled:true,status:'native_review_required'};}
  }
  async function handle(e){if(!route(e))return false;const input=parse(e),key=e.id;if(pending.has(key))return pending.get(key);const job=execute(e,input);pending.set(key,job);try{return await job;}finally{pending.delete(key);}}
  return Object.freeze({handle,claimsRoute:e=>route(e)!==null,close(){closed=true;controller.abort();client.off('interactionCreate',observer);}});
}
