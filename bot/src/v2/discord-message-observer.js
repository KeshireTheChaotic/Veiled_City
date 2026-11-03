/** Records player messages as native evidence; it never replies, infers or grants authority.
 * Only messages in channels already registered in the native scene store, from a human who
 * controls exactly one registered PC in that channel's scene, are ingested.
 */
export function createDiscordMessageObserver({client,intake,sceneStore,readOwnerSession,onError=()=>{}}){
  if(typeof client?.on!=='function'||typeof client?.off!=='function'||typeof intake?.ingest!=='function'||typeof sceneStore?.readers?.readChannel!=='function'||typeof readOwnerSession!=='function')throw new TypeError('Native message observer dependencies required');
  const pending=new Set(),controller=new AbortController();let closed=false;
  const report=(error,message)=>{try{onError(error,{messageId:message?.id??null,stage:'message_intake'});}catch{}};
  function request(m){
    if(closed||!m?.id||!m.guildId||!m.channelId||m.author?.bot!==false||m.webhookId||m.system)return null;
    const channel=sceneStore.readers.readChannel(m.guildId,m.channelId);if(!channel)return null;
    const route=readOwnerSession(m.guildId,m.author.id,'');if(route?.sceneId!==channel.sceneId||route.ownerUserId!==m.author.id)return null;
    return {guildId:m.guildId,channelId:m.channelId,messageId:m.id,userId:m.author.id,actorId:route.actorId,sceneId:channel.sceneId,mode:channel.kind,ownerUserId:channel.ownerUserId??null,gmRoleId:route.gmRoleId??null,participantIds:channel.kind==='party'?channel.recipientIds:[]};
  }
  const listener=m=>{
    let req;try{req=request(m);}catch(error){report(error,m);return;}
    if(!req)return;
    const job=intake.ingest(req,{signal:controller.signal}).catch(error=>report(error,m)).finally(()=>pending.delete(job));pending.add(job);
  };
  client.on('messageCreate',listener);
  return Object.freeze({drain:()=>Promise.allSettled([...pending]),close(){closed=true;controller.abort();client.off('messageCreate',listener);}});
}
