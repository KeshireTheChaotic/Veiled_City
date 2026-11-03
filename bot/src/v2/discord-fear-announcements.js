import {createHash} from 'node:crypto';
import {createDiscordAudienceReader} from './discord-audience-reader.js';
const content='The GM reserves 1 Fear for an NPC interruption before your pending roll. Wait for the interruption to resolve before rolling.';
/** Opt-in native transport. Never installed by default; no model arguments or
 * prose enter this path. A claimed/uncertain attempt is never automatically retried.
 */
export function createDiscordFearAnnouncements({client,coordinator,fearStore,readRoute}){
  const audiences=createDiscordAudienceReader({client});
  if(typeof coordinator?.claimAnnouncement!=='function'||typeof coordinator?.acknowledgeAnnouncement!=='function'||typeof readRoute!=='function')throw new TypeError('Native Fear announcement dependencies required');
  async function publish(c,q,{check,signal}={}){
    if(typeof check!=='function')throw new Error('Native Fear publication authority required');
    signal?.throwIfAborted();check();
    const row=fearStore.read(c,q),route=structuredClone(readRoute(c,q));
    if(!row||route?.guildId!==c||route.sceneId!==row.terms.sceneId||route.ownerUserId!==row.terms.ownerUserId||typeof route.channelId!=='string'||!route.channelId)throw new Error('Exact native owner announcement route required');
    const request={guildId:c,channelId:route.channelId,sceneId:route.sceneId,ownerUserId:route.ownerUserId,gmRoleId:route.gmRoleId??null,mode:'private'};
    const before=await audiences.read(request,{signal});
    const current=()=>{check();signal?.throwIfAborted();if(JSON.stringify(readRoute(c,q))!==JSON.stringify(route))throw new Error('Fear announcement route changed');};
    current();const attempt=coordinator.claimAnnouncement(c,q,{check:current});
    try{
      const guild=await client.guilds.fetch({guild:c,force:true}),channel=await guild.channels.fetch(route.channelId,{force:true});
      if(guild.id!==c||channel?.guildId!==c||channel.id!==route.channelId||typeof channel.send!=='function'||typeof channel.messages?.fetch!=='function')throw new Error('Native Fear publication channel unavailable');
      const fresh=await audiences.read(request,{signal});current();
      if(fresh.fingerprint!==before.fingerprint)throw new Error('Fear announcement audience changed');
      const sent=await channel.send({content,allowedMentions:{parse:[]},nonce:createHash('sha256').update(attempt.attemptId).digest('hex').slice(0,24),enforceNonce:true});
      if(typeof sent?.id!=='string'||!sent.id)throw new Error('Native Fear send acknowledgement missing');
      const message=await channel.messages.fetch({message:sent.id,force:true}),after=await audiences.read(request,{signal});current();
      if(after.fingerprint!==before.fingerprint||message?.id!==sent.id||message.guildId!==c||message.channelId!==route.channelId||message.author?.id!==client.user?.id||message.author.bot!==true||message.webhookId||message.system||message.content!==content)throw new Error('Exact native Fear delivery evidence unavailable');
      const notice={attemptId:attempt.attemptId,status:'delivered',kind:'pre_roll_fear',requestRef:q,bindingHash:row.bindingHash,baseCost:1,printedFearCost:0,npcId:row.terms.npcId,actorId:row.terms.actorId,recipientIds:[route.ownerUserId],messageId:message.id};
      return coordinator.acknowledgeAnnouncement(c,q,{check:current,readNotice:()=>notice});
    }catch(error){
      // Preserve ambiguity even when authorization/cancellation changed. This
      // bookkeeping grants no publication or effects; failure still leaves a
      // durable delivering attempt which cannot be retried.
      try{coordinator.markAnnouncementUncertain(c,q,attempt.attemptId,{check});}catch{}
      throw error;
    }
  }
  return Object.freeze({publish});
}
