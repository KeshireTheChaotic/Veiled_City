import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;

/** Registers a private channel for its current PC owner. Discord transport grants no control. */
export function createNativePrivateChannelRegistration({sceneStore,readOwnerSession,audienceReader}){
  if(typeof sceneStore?.commitSnapshot!=='function'||typeof readOwnerSession!=='function'||typeof audienceReader?.read!=='function')throw new TypeError('Native private-channel dependencies required');
  function scope({campaignId:c,ownerUserId:u,channelId}){
    const r=structuredClone(readOwnerSession(c,u,'')),actor=r&&sceneStore.readers.readActor(c,r.actorId),scene=r&&sceneStore.readers.readScene(c,r.sceneId);
    if(![c,u,channelId].every(id)||r?.campaignId!==c||r.ownerUserId!==u||actor?.kind!=='pc'||actor.status!=='active'||actor.controlRole!=='owner'||actor.ownerUserId!==u||actor.sceneId!==scene?.id||scene.status!=='active'||sceneStore.readers.readSession(c,scene.sessionId)?.status!=='active')throw new Error('Current owned character, registered control and active session required');
    return {route:r,actor,scene,fingerprint:hash([r,actor,scene.id,scene.authorityRevision??scene.revision])};
  }
  async function register(input,{check,signal}={}){
    if(typeof check!=='function')throw new TypeError('Native authority check required');
    const {campaignId:c,ownerUserId:u,channelId,sourceRef,initial}=input;
    const current=()=>{signal?.throwIfAborted();check();if(scope(input).fingerprint!==initial.fingerprint)throw new Error('Native private-channel authority changed');};
    current();
    const request={guildId:c,channelId,sceneId:initial.scene.id,mode:'private',ownerUserId:u,gmRoleId:initial.route.gmRoleId??null};
    const first=await audienceReader.read(request,{signal}),second=await audienceReader.read(request,{signal});current();
    if(first.fingerprint!==second.fingerprint)throw new Error('Discord audience changed during registration');
    const existing=sceneStore.readers.readChannel(c,channelId);
    if(existing&&(existing.sceneId!==initial.scene.id||existing.kind!=='private'||existing.ownerUserId!==u))throw new Error('Channel is bound to another scene or owner; review needed');
    return sceneStore.commitSnapshot({campaignId:c,principal:u,sourceRef,records:[{kind:'channel',data:first.channelRecord,expectedRevision:existing?Number(existing.revision):null}]},{check:current});
  }
  return Object.freeze({scope,register});
}
