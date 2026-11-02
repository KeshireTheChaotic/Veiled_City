import {ChannelType,PermissionFlagsBits} from 'discord.js';
import {createHash} from 'node:crypto';
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const has=(set,permission)=>set?.has?.(permission)===true;
const fail=code=>{throw Object.assign(new Error(code),{code});};
/** Read-only native permission projection. Caller must refresh the guild/channel
 * and full membership snapshot before invoking; cached flags are not live proof.
 * GM/admin operational observers are explicit and never become PC knowledge.
 */
export function inspectDiscordAudience({guild,channel,sceneId,mode='party',ownerUserId=null,gmRoleId=null,participantIds=[]}){
  if(!id(guild?.id)||channel?.guildId!==guild.id||!id(channel?.id)||!id(sceneId)||!['party','private'].includes(mode)
    ||!Array.isArray(participantIds)||participantIds.some(x=>!id(x))||new Set(participantIds).size!==participantIds.length)fail('invalid_discord_audience_scope');
  if(channel.type!==ChannelType.GuildText)fail('discord_channel_type_not_qualified');
  const members=[...(guild.members?.cache?.values?.()??[])];
  if(!Number.isSafeInteger(guild.memberCount)||guild.memberCount<1||members.length!==guild.memberCount||members.some(m=>!id(m.id))
    ||new Set(members.map(m=>m.id)).size!==members.length||!id(guild.members?.me?.id))fail('incomplete_discord_membership');
  if(mode==='private'&&(!id(ownerUserId)||!members.some(m=>m.id===ownerUserId)))fail('private_owner_unavailable');
  if(gmRoleId!==null&&(!id(gmRoleId)||!guild.roles?.cache?.has?.(gmRoleId)))fail('configured_gm_role_unavailable');
  const recipients=[],writers=[],observers=[],terms=[];let botReady=false;
  for(const member of members){
    const permissions=channel.permissionsFor(member);
    if(!permissions||typeof permissions.has!=='function')fail('discord_permissions_unavailable');
    const view=has(permissions,PermissionFlagsBits.ViewChannel),send=view&&has(permissions,PermissionFlagsBits.SendMessages);
    const privileged=has(member.permissions,PermissionFlagsBits.Administrator)||has(member.permissions,PermissionFlagsBits.ManageGuild)||Boolean(gmRoleId&&member.roles?.cache?.has?.(gmRoleId));
    terms.push([member.id,view,send,privileged]);
    if(member.id===guild.members.me.id){botReady=view&&send;continue;}
    if(!view)continue;
    if(privileged&&member.id!==ownerUserId&&!participantIds.includes(member.id)){observers.push(member.id);continue;}
    recipients.push(member.id);if(send)writers.push(member.id);
  }
  recipients.sort();writers.sort();observers.sort();terms.sort((a,b)=>a[0].localeCompare(b[0]));
  if(!botReady)fail('bot_channel_access_unavailable');
  if(!recipients.length||mode==='private'&&(recipients.length!==1||recipients[0]!==ownerUserId))fail('private_channel_audience_mismatch');
  const channelRecord={id:channel.id,campaignId:guild.id,sceneId,kind:mode,permissionsVerified:true,recipientIds:recipients,writerIds:writers,
    ...(mode==='private'?{ownerUserId}:{})};
  const fingerprint=createHash('sha256').update(JSON.stringify([channelRecord,observers,terms,gmRoleId,participantIds.slice().sort()])).digest('hex');
  return Object.freeze({channelRecord:Object.freeze({...channelRecord,recipientIds:Object.freeze(recipients),writerIds:Object.freeze(writers)}),privilegedObserverIds:Object.freeze(observers),fingerprint});
}
