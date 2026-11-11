import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Fixed publication of a reviewed draft; no knowledge or canon mutation. Transport is injected. */
export function createNativeDraftPublication({sceneStore,gmAuthority,drafts,audiences,resolveChannel,readGmRoleId=()=>null}){
  if(typeof sceneStore?.readers?.readChannel!=='function'||typeof gmAuthority?.check!=='function'||typeof drafts?.begin!=='function'||typeof audiences?.read!=='function'||typeof resolveChannel!=='function')throw new TypeError('Native draft publication dependencies required');
  /** Sends one GM-approved saved draft to its original audience, at most once.
   * It records no knowledge acknowledgement: published narration is not objective truth.
   */
  async function publish(proof,declaration,{signal}={}){
    if(proof.operation!=='draft_publish')throw new Error('Draft publication authority required');
    const c=proof.campaignId,source=proof.targetRef,input=declaration,fingerprint=input.fingerprint;
    const row=drafts.recent(c,20).find(d=>d.source===source);if(!row||row.fingerprint!==fingerprint)throw new Error('Approved draft is not a current saved draft');
    const draft=row.draft,target=draft.delivery,channelRecord=target&&sceneStore.readers.readChannel(c,target.channelId);
    if(typeof draft.text!=='string'||draft.text.length>1900)throw new Error('Draft must fit one message; review needed');
    if(!channelRecord||channelRecord.permissionsVerified!==true||JSON.stringify([...channelRecord.recipientIds].sort())!==JSON.stringify([...draft.audience.recipients].sort())||channelRecord.kind!==target.mode)throw new Error('Draft audience changed; review needed');
    if(draft.audience?.campaign!==c||draft.audience.scene!==channelRecord.sceneId||draft.audience.source_ref!==source)throw new Error('Draft source audience does not match the destination scene');
    // Publish security: re-read the live Discord audience and the scene at send time, not only the stored record.
    const scene=sceneStore.readers.readScene(c,channelRecord.sceneId);if(scene?.status!=='active'||sceneStore.readers.readSession(c,scene.sessionId)?.status!=='active')throw new Error('Draft scene is no longer active; review needed');
    const scopeHash=hash([channelRecord,scene,sceneStore.readers.readSession(c,scene.sessionId)]);
    const current=()=>{signal?.throwIfAborted();gmAuthority.check(proof);const ch=sceneStore.readers.readChannel(c,target.channelId),sc=ch&&sceneStore.readers.readScene(c,ch.sceneId),session=sc&&sceneStore.readers.readSession(c,sc.sessionId);if(sc?.status!=='active'||session?.status!=='active'||hash([ch,sc,session])!==scopeHash)throw new Error('Draft publication scope changed; review needed');};
    current();
    const live=await audiences.read({guildId:c,channelId:target.channelId,sceneId:channelRecord.sceneId,mode:channelRecord.kind,ownerUserId:channelRecord.ownerUserId??null,gmRoleId:readGmRoleId(c)??null,participantIds:channelRecord.kind==='party'?[...channelRecord.recipientIds]:[]},{signal:signal});
    if(JSON.stringify([...live.channelRecord.recipientIds].sort())!==JSON.stringify([...draft.audience.recipients].sort()))throw new Error('Live Discord audience differs from the draft audience; review needed');
    const channel=await resolveChannel(c,target.channelId);
    if(channel?.guildId!==c||channel.id!==target.channelId||typeof channel.send!=='function')throw new Error('Draft channel unavailable');
    current();
    drafts.begin(c,source,{approvedFingerprint:fingerprint,approval:{principal:proof.principal,sourceRef:proof.sourceRef,sourceRevision:proof.sourceRevision},check:current});
    let sent;try{sent=await channel.send({content:draft.text,allowedMentions:{parse:[]},enforceNonce:true,nonce:source.slice(-20)});}catch(error){drafts.uncertain(c,source,error?.message??'send failed');throw new Error('Send was not confirmed; the draft is held and will not be retried');}
    drafts.finish(c,source,sent.id);return {messageId:sent.id};
  }
  return Object.freeze({publish});
}
