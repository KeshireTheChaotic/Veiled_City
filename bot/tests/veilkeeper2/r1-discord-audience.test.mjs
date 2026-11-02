import test from 'node:test';
import assert from 'node:assert/strict';
import {ChannelType,PermissionFlagsBits as P,PermissionsBitField} from 'discord.js';
import {inspectDiscordAudience} from '../../src/v2/discord-audience.js';
function fixture(){
  const member=(id,permissions=[])=>({id,permissions:new PermissionsBitField(permissions),roles:{cache:new Map()}});
  const bot=member('bot'),owner=member('owner'),outsider=member('outsider'),gm=member('gm',[P.ManageGuild]);
  const members=new Map([bot,owner,outsider,gm].map(m=>[m.id,m])),rights=new Map([['bot',[P.ViewChannel,P.SendMessages]],['owner',[P.ViewChannel,P.SendMessages]],['outsider',[]],['gm',[P.ViewChannel,P.SendMessages]]]);
  const guild={id:'c',memberCount:4,members:{cache:members,me:bot},roles:{cache:new Map()}},channel={id:'ch',guildId:'c',type:ChannelType.GuildText,permissionsFor:m=>new PermissionsBitField(rights.get(m.id))};
  const args={guild,channel,sceneId:'s',mode:'private',ownerUserId:'owner'};return {args,guild,channel,members,rights};
}
test('owner-private projection distinguishes privileged observers from the recipient and writer',()=>{
  const f=fixture(),r=inspectDiscordAudience(f.args);assert.deepEqual(r.channelRecord.recipientIds,['owner']);assert.deepEqual(r.channelRecord.writerIds,['owner']);assert.deepEqual(r.privilegedObserverIds,['gm']);assert.ok(Object.isFrozen(r.channelRecord.recipientIds));
});
test('ordinary member access, including other bots, prevents private-channel qualification',()=>{
  const f=fixture();f.rights.set('outsider',[P.ViewChannel]);assert.throws(()=>inspectDiscordAudience(f.args),/audience_mismatch/);
  f.members.get('outsider').user={bot:true};assert.throws(()=>inspectDiscordAudience(f.args),/audience_mismatch/);
});
test('party audience includes actual ordinary readers, separately tracks writers and includes GM participants',()=>{
  const f=fixture();f.args.mode='party';f.args.ownerUserId=null;f.args.participantIds=['gm'];f.rights.set('outsider',[P.ViewChannel]);
  const r=inspectDiscordAudience(f.args);assert.deepEqual(r.channelRecord.recipientIds,['gm','outsider','owner']);assert.deepEqual(r.channelRecord.writerIds,['gm','owner']);assert.deepEqual(r.privilegedObserverIds,[]);
});
test('incomplete membership, unresolved permissions, missing owner and unqualified channel types fail closed',()=>{
  for(const change of [f=>f.guild.memberCount++,f=>f.channel.permissionsFor=()=>null,f=>f.args.ownerUserId='missing',f=>f.channel.type=ChannelType.PrivateThread]){
    const f=fixture();change(f);assert.throws(()=>inspectDiscordAudience(f.args));
  }
});
test('bot access and configured GM role must be available; role changes alter proof',()=>{
  const f=fixture();f.args.gmRoleId='role';assert.throws(()=>inspectDiscordAudience(f.args),/role_unavailable/);f.guild.roles.cache.set('role',{});
  const first=inspectDiscordAudience(f.args);f.members.get('gm').permissions=new PermissionsBitField([]);f.members.get('gm').roles.cache.set('role',{});
  assert.equal(inspectDiscordAudience(f.args).fingerprint,first.fingerprint);
  f.rights.set('owner',[P.ViewChannel]);assert.notEqual(inspectDiscordAudience(f.args).fingerprint,first.fingerprint);
  f.rights.set('bot',[P.ViewChannel]);assert.throws(()=>inspectDiscordAudience(f.args),/bot_channel_access/);
});
