import test from 'node:test';
import assert from 'node:assert/strict';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {createDiscordAudienceReader} from '../../src/v2/discord-audience-reader.js';
function fixture(){
  const calls=[],members=new Map(['bot','owner'].map(id=>[id,{id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}]));
  const channel={id:'ch',guildId:'g',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages])};
  const guild={id:'g',memberCount:2,members:{list:async options=>{assert.deepEqual(options,{limit:1000,cache:false});calls.push('members');return members;}},roles:{fetch:async()=>{calls.push('roles');return new Map();}},channels:{fetch:async(id,options)=>{assert.equal(id,'ch');assert.equal(options.force,true);calls.push('channel');return channel;}}};
  const client={user:{id:'bot'},guilds:{fetch:async options=>{assert.deepEqual(options,{guild:'g',force:true});calls.push('guild');return guild;}}};
  return {calls,members,guild,channel,client,reader:createDiscordAudienceReader({client}),args:{guildId:'g',channelId:'ch',sceneId:'s',mode:'private',ownerUserId:'owner'}};
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
  f.guild.members.list=async()=>{throw new Error('refresh failed');};await assert.rejects(f.reader.read(f.args),/refresh failed/);
});
test('REST errors return no cached proof and never fall back to the gateway',async()=>{
  const f=fixture();let calls=0;f.guild.members.fetch=async()=>{throw new Error('gateway must not run');};f.guild.members.list=async()=>{calls++;throw new Error('Missing Access');};await assert.rejects(f.reader.read(f.args),/Missing Access/);assert.equal(calls,1);
});

test('fresh uncached REST pagination includes every member on every read',async()=>{
  const f=fixture(),roster=new Map(Array.from({length:1002},(_,i)=>{const id=String(i+1);return [id,{id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}];})),pages=[];
  f.client.user.id='1';f.guild.memberCount=1002;f.args.ownerUserId='2';f.channel.permissionsFor=m=>new PermissionsBitField(['1','2'].includes(m.id)?[P.ViewChannel,P.SendMessages]:[]);
  f.guild.members.list=async options=>{assert.equal(options.limit,1000);assert.equal(options.cache,false);pages.push(options.after??null);return new Map([...roster].filter(([key])=>BigInt(key)>BigInt(options.after??0)).slice(0,1000));};
  assert.deepEqual((await f.reader.read(f.args)).channelRecord.recipientIds,['2']);assert.deepEqual(pages,[null,'1000']);
  await f.reader.read(f.args);assert.deepEqual(pages,[null,'1000',null,'1000']);
  roster.delete('1001');roster.delete('1002');f.guild.memberCount=1000;await f.reader.read(f.args);assert.deepEqual(pages.slice(-2),[null,'1000']);
});

test('duplicate or nonadvancing pages and cancellation during a page cannot qualify',async()=>{
  const f=fixture(),roster=new Map(Array.from({length:1000},(_,i)=>[String(i+1),{id:String(i+1)}]));f.guild.memberCount=1001;let calls=0;
  f.guild.members.list=async()=>{calls++;return roster;};await assert.rejects(f.reader.read(f.args),/Inconsistent/);assert.equal(calls,2);
  const g=fixture(),controller=new AbortController();g.guild.members.list=async()=>{controller.abort();return g.members;};await assert.rejects(g.reader.read(g.args,{signal:controller.signal}));
});
