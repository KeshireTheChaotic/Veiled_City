import {createHash} from 'node:crypto';
import {ownerRollNoticeContent} from './discord-roll-notices.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalize=r=>({...r,status:'awaiting_notice'});
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/** Native evidence of an explicit owner's choice, never a readiness/activation grant.
 * The caller acknowledges the SDK command first; this read/record service sends no reply or dice.
 * The resolve command must not be registered/enabled until the full controller is composed.
 */
export function createDiscordOwnerRollChoices({client,sceneStore,sourceAuthority,rollStore,preparation,notices,decisionStore,clock=()=>Date.now()}){
  if(typeof client?.on!=='function'||typeof client?.off!=='function'||typeof client?.guilds?.fetch!=='function'||typeof sceneStore?.readers?.readMessage!=='function'||['inspectReference','eventForReference'].some(k=>typeof sourceAuthority?.[k]!=='function')||['readRequest','readDelivery','readNoticePublication','readResultForRequest'].some(k=>typeof rollStore?.[k]!=='function')||typeof preparation?.inspectRequest!=='function'||typeof notices?.reconcile!=='function'||['putCommand','get','readCommand','sequenceFor'].some(k=>typeof decisionStore?.[k]!=='function')||typeof clock!=='function')throw new TypeError('Native owner choice observation dependencies required');
  const observed=new WeakSet();let closed=false;const observe=e=>{if(e&&typeof e==='object')observed.add(e);};client.on('interactionCreate',observe);
  function declaration(e){
    if(closed||!observed.has(e)||e.client!==client||e.user?.bot!==false||e.isChatInputCommand?.()!==true||![e.id,e.guildId,e.channelId,e.user.id].every(id)||!Number.isSafeInteger(e.createdTimestamp)||clock()-e.createdTimestamp>300000||e.createdTimestamp>clock()+5000)throw new Error('Recent observed human roll command required');
    const group=e.commandName==='vc'?e.options.getSubcommandGroup(false):null;
    if(!(e.commandName==='vc-roll'||e.commandName==='vc'&&group==='roll')||e.options.getSubcommand()!=='resolve')throw new Error('Exact native owner resolve command required');
    const requestRef=e.options.getString('request',true);if(!id(requestRef))throw new Error('Native owner roll request reference required');
    return {interactionId:e.id,campaignId:e.guildId,ownerUserId:e.user.id,channelId:e.channelId,requestRef,createdAt:e.createdTimestamp,commandHash:hash([e.commandName,group,'resolve',requestRef])};
  }
  function scope(c,ref,owner,channelId,{allowRolled=false}={}){
    const saved=rollStore.readRequest(c,ref);if(!saved)throw new Error('Saved native owner roll request required');
    const source=sourceAuthority.inspectReference(saved.sourceRef,saved.sourceRevision),request=preparation.inspectRequest(source,ref),notice=rollStore.readDelivery(c,request.noticeRef),p=rollStore.readNoticePublication(c,ref),event=sourceAuthority.eventForReference(source.id),message=sceneStore.readers.readMessage(c,event.messageId);
    if(source.campaign!==c||source.principal!==owner||request.ownerUserId!==owner||message?.channelId!==channelId||notice?.status!=='delivered'||notice.channelId!==channelId||p?.status!=='delivered'||p.channelId!==channelId||p.id!==notice.publicationRef||p.response?.messageId!==notice.messageId||p.payloadHash!==notice.payloadHash||notice.termHash!==request.termProof.hash||!equal([...notice.recipientIds].sort(),[...source.recipients].sort())||!allowRolled&&rollStore.readResultForRequest(c,ref))throw new Error('Exact delivered current owner roll choice required');
    return {source,request,notice,publication:p};
  }
  function readNative(ref){
    if(closed)return null;const envelope=decisionStore.readCommand(ref);if(!envelope)return null;
    const r=envelope.record;if(r.interactionId!==ref||![hash(['vc-roll',null,'resolve',r.requestRef]),hash(['vc','roll','resolve',r.requestRef])].includes(envelope.commandHash))throw new Error('Saved roll interaction identity conflict');
    const current=scope(r.campaignId,r.requestRef,r.ownerUserId,r.channelId,{allowRolled:true});
    if(r.sceneId!==current.source.scene||r.actorId!==current.request.actorId||r.noticeRef!==current.notice.id||r.noticeMessageId!==current.notice.messageId||r.publicationRef!==current.publication.id||r.sourceRef!==current.source.id||r.sourceRevision!==current.source.revision||r.termHash!==current.request.termProof.hash||r.requestHash!==hash(normalize(current.request))||r.deliveryHash!==hash(current.notice))throw new Error('Saved native owner roll choice changed');
    const sequence=decisionStore.sequenceFor(ref);if(!Number.isSafeInteger(sequence)||sequence<1)throw new Error('Native roll observation sequence required');
    return Object.freeze({...r,commandHash:envelope.commandHash,bindingHash:hash(envelope),sequence,purpose:'owner_roll_choice_evidence',executionAuthority:false,effectsCommitted:false});
  }
  function noticeVersion(message,first,d){
    const revision=message?.editedTimestamp??message?.createdTimestamp;
    if(message?.id!==first.notice.messageId||message.guildId!==d.campaignId||message.channelId!==d.channelId||message.author?.id!==client.user?.id||message.author.bot!==true||message.webhookId||message.system||message.content!==ownerRollNoticeContent(first.request)||!Number.isSafeInteger(message.createdTimestamp)||!Number.isSafeInteger(revision)||revision<message.createdTimestamp||d.createdAt<revision)throw new Error('Owner roll choice must follow exact delivered stakes');
    return {createdAt:message.createdTimestamp,revisionAt:revision};
  }
  async function accept(e,{signal}={}){
    signal?.throwIfAborted();const d=declaration(e),old=decisionStore.get(d.interactionId);
    if(old){if(old.commandHash!==d.commandHash||['campaignId','ownerUserId','channelId','requestRef','createdAt'].some(k=>old.record?.[k]!==d[k]))throw new Error('Native owner roll replay conflict');return readNative(d.interactionId);}
    const first=scope(d.campaignId,d.requestRef,d.ownerUserId,d.channelId),fingerprint=hash(first);
    await notices.reconcile(first.source,d.requestRef,{signal});signal?.throwIfAborted();
    const guild=await client.guilds.fetch({guild:d.campaignId,force:true}),channel=await guild.channels.fetch(d.channelId,{force:true});
    if(guild.id!==d.campaignId||channel?.guildId!==d.campaignId||channel.id!==d.channelId||typeof channel.messages?.fetch!=='function')throw new Error('Current native roll choice channel required');
    const message=await channel.messages.fetch({message:first.notice.messageId,force:true}),version=noticeVersion(message,first,d);
    await notices.reconcile(first.source,d.requestRef,{signal});signal?.throwIfAborted();
    const confirmed=await channel.messages.fetch({message:first.notice.messageId,force:true});signal?.throwIfAborted();if(hash(noticeVersion(confirmed,first,d))!==hash(version))throw new Error('Native roll notice changed during choice verification');
    if(hash(declaration(e))!==hash(d)||hash(scope(d.campaignId,d.requestRef,d.ownerUserId,d.channelId))!==fingerprint)throw new Error('Native owner roll choice changed');
    const record={version:1,kind:'owner_roll_choice',decision:'roll',interactionId:d.interactionId,campaignId:d.campaignId,sceneId:first.source.scene,actorId:first.request.actorId,ownerUserId:d.ownerUserId,channelId:d.channelId,requestRef:d.requestRef,noticeRef:first.notice.id,noticeMessageId:first.notice.messageId,publicationRef:first.publication.id,sourceRef:first.source.id,sourceRevision:first.source.revision,termHash:first.request.termProof.hash,requestHash:hash(normalize(first.request)),deliveryHash:hash(first.notice),createdAt:d.createdAt,observedAt:clock(),noticeCreatedAt:version.createdAt,noticeRevisionAt:version.revisionAt};
    decisionStore.putCommand({record,commandHash:d.commandHash});return readNative(d.interactionId);
  }
  return Object.freeze({accept,readNative,close(){closed=true;client.off('interactionCreate',observe);}});
}
