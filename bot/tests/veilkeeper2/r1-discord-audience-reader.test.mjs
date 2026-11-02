import test from 'node:test';
import assert from 'node:assert/strict';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {createDiscordAudienceReader} from '../../src/v2/discord-audience-reader.js';
function fixture(){
  const calls=[],members=new Map(['bot','owner'].map(id=>[id,{id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}]));
  const channel={id:'ch',guildId:'g',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages])};
  const guild={id:'g',memberCount:2,members:{fetch:async()=>{calls.push('members');return members;}},roles:{fetch:async()=>{calls.push('roles');return new Map();}},channels:{fetch:async(id,options)=>{assert.equal(id,'ch');assert.equal(options.force,true);calls.push('channel');return channel;}}};
  const client={user:{id:'bot'},guilds:{fetch:async options=>{assert.deepEqual(options,{guild:'g',force:true});calls.push('guild');return guild;}}};
  return {calls,members,guild,channel,reader:createDiscordAudienceReader({client}),args:{guildId:'g',channelId:'ch',sceneId:'s',mode:'private',ownerUserId:'owner'}};
}
test('refreshes all native inputs and uses the returned membership snapshot',async()=>{
  const f=fixture(),proof=await f.reader.read(f.args);assert.deepEqual(proof.channelRecord.recipientIds,['owner']);assert.deepEqual(f.calls,['guild','channel','members','roles']);
});
test('new outsiders and incomplete refreshes cannot qualify a private channel',async()=>{
  const f=fixture();f.members.set('outsider',{id:'outsider',permissions:new PermissionsBitField([]),roles:{cache:new Map()}});f.guild.memberCount=3;
  await assert.rejects(f.reader.read(f.args),/audience_mismatch/);f.guild.memberCount=4;await assert.rejects(f.reader.read(f.args),/incomplete/);
});
test('cancellation skips dispatch and refresh failure returns no cached proof',async()=>{
  const f=fixture(),abort=new AbortController();abort.abort();await assert.rejects(f.reader.read(f.args,{signal:abort.signal}));assert.deepEqual(f.calls,[]);
  f.guild.members.fetch=async()=>{throw new Error('refresh failed');};await assert.rejects(f.reader.read(f.args),/refresh failed/);
});
