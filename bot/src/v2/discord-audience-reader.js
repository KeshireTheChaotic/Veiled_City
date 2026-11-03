import {inspectDiscordAudience} from './discord-audience.js';

/** Native read-only refresh. Uses returned member/role collections instead of
 * assuming an existing cache is complete. No message, permission or state writes.
 */
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Discord limits the full member listing (gateway opcode 8) to roughly one request per 30 s per guild.
 * Honour the stated delay once, then retry; the membership is never reused from an earlier read.
 */
async function fetchMembers(guild,signal){
  try{return await guild.members.fetch();}
  catch(error){
    const wait=Number(error?.data?.retry_after??/Retry after ([\d.]+) seconds/.exec(String(error?.message))?.[1]);
    if(!(wait>0)||wait>60)throw error;
    signal?.throwIfAborted();await sleep(Math.ceil(wait*1000)+250);signal?.throwIfAborted();
    return guild.members.fetch();
  }
}
export function createDiscordAudienceReader({client}){
  if(typeof client?.guilds?.fetch!=='function')throw new TypeError('Native Discord client required');
  async function read({guildId,channelId,sceneId,mode='party',ownerUserId=null,gmRoleId=null,participantIds=[]},{signal}={}){
    signal?.throwIfAborted();
    const guild=await client.guilds.fetch({guild:guildId,force:true});
    if(guild?.id!==guildId)throw new Error('Current Discord guild required');
    const [channel,members,roles]=await Promise.all([guild.channels.fetch(channelId,{force:true}),fetchMembers(guild,signal),guild.roles.fetch()]);
    signal?.throwIfAborted();
    if(channel?.id!==channelId||typeof members?.values!=='function'||typeof roles?.has!=='function')throw new Error('Complete Discord audience refresh required');
    const me=members.get(client.user?.id);
    const snapshot={id:guild.id,memberCount:guild.memberCount,members:{cache:members,me},roles:{cache:roles}};
    return inspectDiscordAudience({guild:snapshot,channel,sceneId,mode,ownerUserId,gmRoleId,participantIds});
  }
  return Object.freeze({read});
}
