/** Registered channels and authenticated controlling humans enter a turn. The native root publishes autonomously or selects explicit shadow mode; this observer does not choose recipients or grant rule effects. */
export function createDiscordMessageObserver({client,intake,sceneStore,readOwnerSession,turns=null,allowedGuildIds=null,onDraft=()=>{},onError=()=>{}}){
  if(typeof client?.on!=='function'||typeof client?.off!=='function'||typeof intake?.ingest!=='function'||typeof sceneStore?.readers?.readChannel!=='function'||typeof readOwnerSession!=='function'||turns&&typeof turns.respond!=='function')throw new TypeError('Native message observer dependencies required');
  const pending=new Set(),controller=new AbortController();let closed=false;
  const report=(error,message)=>{try{onError(error,{messageId:message?.id??null,stage:'message_intake'});}catch{}};
  function request(m){
    if(closed||!m?.id||!m.guildId||!m.channelId||m.author?.bot!==false||m.webhookId||m.system||allowedGuildIds&&!allowedGuildIds.has(m.guildId))return null;
    const channel=sceneStore.readers.readChannel(m.guildId,m.channelId);if(!channel)return null;
    const route=readOwnerSession(m.guildId,m.author.id,'');if(route?.sceneId!==channel.sceneId||route.ownerUserId!==m.author.id)return null;
    return {guildId:m.guildId,channelId:m.channelId,messageId:m.id,userId:m.author.id,actorId:route.actorId,sceneId:channel.sceneId,mode:channel.kind,ownerUserId:channel.ownerUserId??null,gmRoleId:route.gmRoleId??null,participantIds:channel.kind==='party'?channel.recipientIds:[]};
  }
  const listener=m=>{
    let req;try{req=request(m);}catch(error){report(error,m);return;}
    if(!req)return;
    const run=turns?turns.respond(req,{signal:controller.signal}).then(result=>onDraft(result,req,{signal:controller.signal})):intake.ingest(req,{signal:controller.signal});
    const job=Promise.resolve(run).catch(error=>report(error,m)).finally(()=>pending.delete(job));pending.add(job);
  };
  client.on('messageCreate',listener);
  return Object.freeze({drain:()=>Promise.allSettled([...pending]),close(){closed=true;controller.abort();client.off('messageCreate',listener);}});
}
