import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function splitPublication(text){
 if(typeof text!=='string'||!text.trim()||text.length>20000)throw new Error('Bounded narrative required');const parts=[];let remaining=text;
 while(remaining.length>1900){let end=remaining.lastIndexOf('\n',1900);if(end<950)end=1900;const c=remaining.charCodeAt(end-1);if(c>=0xd800&&c<=0xdbff)end--;parts.push(remaining.slice(0,end));remaining=remaining.slice(end);}
 if(remaining)parts.push(remaining);return parts;
}
/** One native outbox publisher. The runner issues unforgeable source-bound
 * grants; no Human-GM approval, narration tool or model-selected audience exists.
 */
export function createAutonomousPublication({turns,sceneStore,audiences,resolveChannel,readGmRoleId=()=>null}){
 if(['preparePublication','refreshPublication','inspectSend','beginPublication','recordPublicationPart','finishPublication','uncertainPublication'].some(k=>typeof turns?.[k]!=='function')||typeof sceneStore?.readers?.readChannel!=='function'||typeof audiences?.read!=='function'||typeof resolveChannel!=='function')throw new TypeError('Native autonomous publication dependencies required');
 const pending=new Map(),controller=new AbortController();let closed=false;
 async function execute(id,{signal}={}){
  const combined=signal?AbortSignal.any([controller.signal,signal]):controller.signal;combined.throwIfAborted();const prepared=await turns.preparePublication(id,{signal:combined});if(prepared.status!=='ready')return prepared;
  const grant=prepared.grant,initial=turns.inspectSend(grant),parts=splitPublication(initial.text),observed=[];let started=false;
  function scope(p){const channel=sceneStore.readers.readChannel(p.campaignId,p.delivery.channelId),scene=channel&&sceneStore.readers.readScene(p.campaignId,channel.sceneId),session=scene&&sceneStore.readers.readSession(p.campaignId,scene.sessionId);if(!channel||channel.permissionsVerified!==true||channel.sceneId!==p.sceneId||channel.kind!==p.delivery.mode||scene?.status!=='active'||session?.status!=='active'||JSON.stringify([...channel.recipientIds].sort())!==JSON.stringify([...p.audience.recipients].sort()))throw new Error('Current narrative audience unavailable');return {channel,scene,session};}
  const original=scope(initial),scopeHash=hash(original);
  async function fresh(){combined.throwIfAborted();const p=await turns.refreshPublication(grant,{signal:combined}),s=scope(p);if(hash(s)!==scopeHash)throw new Error('Narrative scope changed');const live=await audiences.read({guildId:p.campaignId,channelId:s.channel.id,sceneId:p.sceneId,mode:s.channel.kind,ownerUserId:s.channel.ownerUserId??null,gmRoleId:readGmRoleId(p.campaignId)??null,participantIds:s.channel.kind==='party'?s.channel.recipientIds:[]},{signal:combined});if(JSON.stringify([...live.channelRecord.recipientIds].sort())!==JSON.stringify([...p.audience.recipients].sort()))throw new Error('Live narrative recipients changed');await turns.refreshPublication(grant,{signal:combined});if(hash(scope(p))!==scopeHash)throw new Error('Narrative scope changed');return p;}
  try{
   await fresh();const channel=await resolveChannel(initial.campaignId,initial.delivery.channelId);if(channel?.guildId!==initial.campaignId||channel.id!==initial.delivery.channelId||typeof channel.send!=='function')throw new Error('Narrative destination unavailable');
   await fresh();turns.beginPublication(grant,parts);started=true;
   for(const [index,content] of parts.entries()){await fresh();const sent=await channel.send({content,allowedMentions:{parse:[]},enforceNonce:true,nonce:hash([initial.sourceRef,initial.sourceRevision,initial.reviewHash,index]).slice(0,20)});if(typeof sent?.id!=='string'||!sent.id)throw new Error('Narrative delivery unconfirmed');observed.push({index,messageId:sent.id});turns.recordPublicationPart(grant,index,sent.id);}
   turns.finishPublication(grant);return {status:initial.kind==='system_notice'?'published_notice':'published',sourceRef:initial.sourceRef,messageIds:observed.map(p=>p.messageId),repairCalls:initial.repairCalls,knowledgeAcknowledged:false};
  }catch(error){if(started){turns.uncertainPublication(grant,error?.message??'publication interrupted',observed);return {status:'publication_uncertain',sourceRef:initial.sourceRef,observedParts:observed.length};}throw error;}
 }
 async function publish(id,options={}){if(closed)throw new Error('Autonomous publisher closed');if(pending.has(id))return pending.get(id);const work=execute(id,options);pending.set(id,work);try{return await work;}finally{pending.delete(id);}}
 return Object.freeze({publish,async drain(){await Promise.allSettled([...pending.values()]);},close(){closed=true;controller.abort();}});
}
