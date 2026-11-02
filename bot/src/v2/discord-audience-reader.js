import {inspectDiscordAudience} from './discord-audience.js';

/** Native read-only refresh. Uses returned member/role collections instead of
 * assuming an existing cache is complete. No message, permission or state writes.
 */
export function createDiscordAudienceReader({client}){
  if(typeof client?.guilds?.fetch!=='function')throw new TypeError('Native Discord client required');
  async function read({guildId,channelId,sceneId,mode='party',ownerUserId=null,gmRoleId=null,participantIds=[]},{signal}={}){
    signal?.throwIfAborted();
    const guild=await client.guilds.fetch({guild:guildId,force:true});
    if(guild?.id!==guildId)throw new Error('Current Discord guild required');
    const [channel,members,roles]=await Promise.all([guild.channels.fetch(channelId,{force:true}),guild.members.fetch(),guild.roles.fetch()]);
    signal?.throwIfAborted();
    if(channel?.id!==channelId||typeof members?.values!=='function'||typeof roles?.has!=='function')throw new Error('Complete Discord audience refresh required');
    const me=members.get(client.user?.id);
    const snapshot={id:guild.id,memberCount:guild.memberCount,members:{cache:members,me},roles:{cache:roles}};
    return inspectDiscordAudience({guild:snapshot,channel,sceneId,mode,ownerUserId,gmRoleId,participantIds});
  }
  return Object.freeze({read});
}
