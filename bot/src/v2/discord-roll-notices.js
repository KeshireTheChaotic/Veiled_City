import {createHash} from 'node:crypto';
import {createDiscordAudienceReader} from './discord-audience-reader.js';
import {createDiscordMessageReader} from './discord-message-reader.js';
import {createDiscordIntake} from './discord-intake.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const normalize=request=>({...request,status:'awaiting_notice'});
const odds=r=>({modifier:r.modifier,experience:r.experience,advantage:r.advantage,disadvantage:r.disadvantage});

/** Fixed native terms only. Never announces an action, successful roll or paid cost. */
export function ownerRollNoticeContent(request){
  const trait=request?.termProof?.trait?.name;
  if(typeof trait!=='string'||!trait||!Number.isSafeInteger(request.difficulty)||request.difficulty<0||typeof request.stakes!=='string'||!request.stakes.trim()||!Object.values(odds(request)).every(Number.isSafeInteger))throw new Error('Qualified native roll notice terms required');
  const contextual=request.advantage>request.disadvantage?' Advantage applies.':request.disadvantage>request.advantage?' Disadvantage applies.':'';
  const content=`${trait} roll, Difficulty ${request.difficulty}. Modifier ${request.modifier>=0?'+':''}${request.modifier}${request.experience?`, Experience +${request.experience}`:''}.${contextual}\nStakes: ${request.stakes}\nAwaiting your choice to roll; nothing has been resolved.`;
  if(content.length>1900)throw new Error('Native roll stakes need a shorter reviewed notice');return content;
}

/** Single-attempt Discord delivery for already approved source-qualified requests.
 * This does not adjudicate, roll, spend, create Fear opportunities or commit effects.
 */
export function createDiscordRollNotices({client,sceneStore,sourceAuthority,rollStore,preparation,readGmRoleId=()=>null}){
  if(typeof client?.guilds?.fetch!=='function'||typeof client.user?.id!=='string'||typeof sceneStore?.readers?.readChannel!=='function'||typeof sceneStore?.commitSnapshot!=='function'||['revalidate','eventForReference'].some(k=>typeof sourceAuthority?.[k]!=='function')||['claimNotice','readNoticePublication','recordNoticeResponse','markNoticeUncertain','acknowledgeDelivery','readRequest','readResultForRequest'].some(k=>typeof rollStore?.[k]!=='function')||typeof preparation?.inspectRequest!=='function')throw new TypeError('Native qualified roll publication dependencies required');
  const audiences=createDiscordAudienceReader({client}),intake=createDiscordIntake({sceneStore,messageReader:createDiscordMessageReader({client})});
  function inspect(source,ref){
    if(!sourceAuthority.revalidate(source))throw new Error('Current native roll source required');
    const r=preparation.inspectRequest(source,ref);
    if(rollStore.readResultForRequest(source.campaign,ref))throw new Error('Current unrolled owner request required');
    const event=sourceAuthority.eventForReference(source.id),message=sceneStore.readers.readMessage(source.campaign,event.messageId),channel=message&&sceneStore.readers.readChannel(source.campaign,message.channelId);
    if(event.userId!==source.principal||event.actorId!==r.actorId||!message||!['discord_message',undefined].includes(message.origin)||channel?.campaignId!==source.campaign||channel.sceneId!==source.scene||channel.permissionsVerified!==true||!equal([...channel.recipientIds].sort(),[...source.recipients].sort()))throw new Error('Original authored roll audience required');
    const route={guildId:source.campaign,channelId:channel.id,sceneId:source.scene,mode:channel.kind,ownerUserId:channel.ownerUserId??null,gmRoleId:readGmRoleId(source.campaign),participantIds:channel.kind==='party'?[...channel.recipientIds]:[]};
    return {request:normalize(r),event,route,content:ownerRollNoticeContent(r)};
  }
  async function refresh(source,ref,signal){
    const before=inspect(source,ref);
    await intake.ingest({...before.route,messageId:before.event.messageId,userId:before.event.userId,actorId:before.event.actorId},{signal});signal?.throwIfAborted();return inspect(source,ref);
  }
  async function live(source,state,signal){
    const audience=await audiences.read(state.route,{signal});
    if(!equal([...audience.channelRecord.recipientIds].sort(),[...source.recipients].sort()))throw new Error('Live roll audience changed');return audience;
  }
  async function channelFor(state){const guild=await client.guilds.fetch({guild:state.route.guildId,force:true}),channel=await guild.channels.fetch(state.route.channelId,{force:true});if(guild.id!==state.route.guildId||channel?.guildId!==state.route.guildId||channel.id!==state.route.channelId||typeof channel.send!=='function'||typeof channel.messages?.fetch!=='function')throw new Error('Native roll notice channel unavailable');return channel;}
  function confirmMessage(message,state,response){if(message?.id!==response.messageId||message.guildId!==state.route.guildId||message.channelId!==state.route.channelId||message.author?.id!==client.user.id||message.author.bot!==true||message.webhookId||message.system||message.content!==state.content)throw new Error('Exact native roll notice readback required');}
  function acknowledge(source,ref,state,publication,current){
    return rollStore.acknowledgeDelivery(source.campaign,ref,{messageId:publication.response.messageId,recipientIds:publication.recipientIds,publicationRef:publication.id,termHash:state.request.termProof.hash,odds:odds(state.request)},{check:current});
  }
  async function publish(source,ref,{signal}={}){
    signal?.throwIfAborted();const c=source.campaign;if(rollStore.readNoticePublication(c,ref))throw new Error('Native roll notice already attempted; reconcile without resending');
    const state=await refresh(source,ref,signal),fingerprint=hash(state),current=()=>{signal?.throwIfAborted();if(hash(inspect(source,ref))!==fingerprint)throw new Error('Native roll publication source changed');};current();
    if(rollStore.readRequest(c,ref).status!=='awaiting_notice')throw new Error('Unpublished native roll notice required');
    const before=await live(source,state,signal);current();
    const publication=rollStore.claimNotice(c,ref,{channelId:state.route.channelId,recipientIds:source.recipients,payloadHash:hash(state.content),audienceFingerprint:before.fingerprint},{check:current});
    try{
      const channel=await channelFor(state),ready=await live(source,state,signal);current();if(ready.fingerprint!==before.fingerprint)throw new Error('Native roll audience changed before send');
      const sent=await channel.send({content:state.content,allowedMentions:{parse:[]},nonce:hash(publication.id).slice(0,24),enforceNonce:true});
      // Transport bookkeeping retains the response even if scope changed during send.
      const response={attemptId:publication.id,campaignId:c,requestRef:ref,channelId:state.route.channelId,messageId:sent?.id};
      rollStore.recordNoticeResponse(c,ref,publication.id,response,{check(){if(rollStore.readNoticePublication(c,ref)?.id!==publication.id)throw new Error('Native roll attempt changed');}});
      const message=await channel.messages.fetch({message:response.messageId,force:true}),after=await live(source,state,signal);await refresh(source,ref,signal);current();
      if(after.fingerprint!==before.fingerprint)throw new Error('Native roll audience changed after send');confirmMessage(message,state,response);
      return acknowledge(source,ref,state,rollStore.readNoticePublication(c,ref),current);
    }catch(error){try{rollStore.markNoticeUncertain(c,ref,publication.id,{check(){}});}catch{}throw error;}
  }
  async function reconcile(source,ref,{signal}={}){
    signal?.throwIfAborted();const state=await refresh(source,ref,signal),fingerprint=hash(state),p=rollStore.readNoticePublication(source.campaign,ref);
    if(!p?.response||p.channelId!==state.route.channelId||p.payloadHash!==hash(state.content)||!equal(p.recipientIds,[...source.recipients].sort()))throw new Error('Saved native roll send response required; no resend permitted');
    const current=()=>{signal?.throwIfAborted();if(hash(inspect(source,ref))!==fingerprint||hash(rollStore.readNoticePublication(source.campaign,ref)?.response)!==hash(p.response))throw new Error('Native roll reconciliation source changed');};current();
    const before=await live(source,state,signal),channel=await channelFor(state),message=await channel.messages.fetch({message:p.response.messageId,force:true}),after=await live(source,state,signal);await refresh(source,ref,signal);current();
    if(before.fingerprint!==p.audienceFingerprint||after.fingerprint!==p.audienceFingerprint)throw new Error('Native roll reconciliation audience changed');confirmMessage(message,state,p.response);
    return acknowledge(source,ref,state,p,current);
  }
  return Object.freeze({publish,reconcile});
}
