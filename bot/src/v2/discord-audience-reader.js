import {inspectDiscordAudience} from './discord-audience.js';

/** Native read-only refresh. Uses returned member/role collections instead of
 * assuming an existing cache is complete. No message, permission or state writes.
 */
/** Fresh REST pages avoid the gateway full-roster request throttle. No cached roster,
 * partial page, duplicate member or unbounded cursor walk can qualify an audience. */
async function fetchMembers(guild,signal){
  if(typeof guild.members?.list!=='function'||!Number.isSafeInteger(guild.memberCount)||guild.memberCount<1)throw new Error('Complete Discord REST membership required');
  const members=new Map(),maxPages=Math.ceil(guild.memberCount/1000)+1;let after;
  for(let pageNumber=0;pageNumber<maxPages;pageNumber++){
    signal?.throwIfAborted();
    const page=await guild.members.list({limit:1000,cache:false,...(after?{after}:{})});
    signal?.throwIfAborted();
    if(typeof page?.entries!=='function'||!Number.isSafeInteger(page.size)||page.size>1000)throw new Error('Incomplete Discord REST membership page');
    let highest=after??'0';
    for(const [key,member] of page.entries()){
      if(typeof key!=='string'||member?.id!==key||members.has(key)||after&&(!/^\d+$/.test(key)||BigInt(key)<=BigInt(after)))throw new Error('Inconsistent Discord REST membership page');
      members.set(key,member);
      if(/^\d+$/.test(key)&&BigInt(key)>BigInt(highest))highest=key;
    }
    if(members.size>guild.memberCount)throw new Error('Incomplete Discord membership count');
    if(page.size<1000)return members;
    if(highest===(after??'0'))throw new Error('Discord membership cursor did not advance');
    after=highest;
  }
  throw new Error('Incomplete Discord REST membership pagination');
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
