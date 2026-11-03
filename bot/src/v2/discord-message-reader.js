import {createHash} from 'node:crypto';
import {createDiscordAudienceReader} from './discord-audience-reader.js';
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
/** Native read-only intake. Request IDs come from the authenticated Discord event,
 * never model arguments. Returned evidence still needs native scene-store commit.
 */
export function createDiscordMessageReader({client}){
  const audiences=createDiscordAudienceReader({client});
  async function read(request,{signal}={}){
    signal?.throwIfAborted();
    if(!request||![request.guildId,request.channelId,request.messageId,request.userId,request.sceneId].every(id))throw new Error('Native Discord message identity required');
    const guild=await client.guilds.fetch({guild:request.guildId,force:true});
    const channel=await guild.channels.fetch(request.channelId,{force:true});
    if(guild.id!==request.guildId||channel?.guildId!==request.guildId||channel.id!==request.channelId||typeof channel.messages?.fetch!=='function')throw new Error('Native message channel unavailable');
    const message=await channel.messages.fetch({message:request.messageId,force:true});
    signal?.throwIfAborted();
    if(message?.id!==request.messageId||message.guildId!==request.guildId||message.channelId!==request.channelId||message.author?.id!==request.userId
      ||message.author.bot!==false||message.webhookId||message.system||typeof message.content!=='string'||!message.content.trim()||message.content.length>16000)throw new Error('Authenticated authored Discord message required');
    const audience=await audiences.read(request,{signal});
    if(!audience.channelRecord.recipientIds.includes(request.userId)||!audience.channelRecord.writerIds.includes(request.userId))throw new Error('Current message author channel authority required');
    const messageRecord={id:message.id,campaignId:request.guildId,userId:message.author.id,channelId:message.channelId,deleted:false,text:message.content};
    const fingerprint=createHash('sha256').update(JSON.stringify([messageRecord,message.editedTimestamp??null,audience.fingerprint])).digest('hex');
    return Object.freeze({messageRecord:Object.freeze(messageRecord),audience,fingerprint});
  }
  return Object.freeze({read});
}
