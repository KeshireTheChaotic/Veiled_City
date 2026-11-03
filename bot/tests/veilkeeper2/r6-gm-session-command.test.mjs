import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {createDiscordGmAuthority} from '../../src/v2/discord-gm-authority.js';
import {createDiscordGmSession} from '../../src/v2/discord-gm-session.js';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openInteractionReceipts} from '../../src/v2/interaction-receipts.js';
function fixture(t,{id='i1'}={}){
  let now=1000000;const client=new EventEmitter(),policy={campaignId:'c',revision:'1',gmRoleId:'gm-role',gmUserIds:[],allowAdministrators:false},roles=new Map([['gm-role',{}]]),guild={id:'c'},member={id:'gm',guild,user:{id:'gm',bot:false},roles:{cache:new Map([['gm-role',{}]])},permissions:new PermissionsBitField([])},channel={id:'admin',guildId:'c',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages])};
  guild.members={fetch:async()=>member};guild.roles={fetch:async()=>roles};guild.channels={fetch:async()=>channel};client.guilds={fetch:async()=>guild};
  const gmAuthority=createDiscordGmAuthority({client,readPolicy:()=>policy,clock:()=>now}),sceneStore=openSceneStore(),interactionReceipts=openInteractionReceipts(),errors=[];
  const service=createDiscordGmSession({client,sceneStore,gmAuthority,interactionReceipts,onError:e=>errors.push(e.message)});
  t.after(()=>{service.close();gmAuthority.close();interactionReceipts.close();sceneStore.close();});
  const replies=[],event={id,client,guildId:'c',channelId:'admin',user:{id:'gm',bot:false},createdTimestamp:now,commandName:'vc-session',deferred:false,replied:false,isChatInputCommand:()=>true,options:{getSubcommand:()=> 'start',getSubcommandGroup:()=> 'session',getString:n=>n==='title'?'Night watch':n==='assembly'?'auto':null},deferReply:async o=>{event.deferred=true;replies.push(['defer',o.flags]);},editReply:async o=>{replies.push(['reply',o.content]);}};
  client.emit('interactionCreate',event);return {client,member,sceneStore,interactionReceipts,service,event,replies,errors};
}
test('observed GM start creates the session privately and replays once',async t=>{
  const f=fixture(t),r=await f.service.handle(f.event);assert.equal(r.status,'committed');assert.equal(f.sceneStore.activeSessions('c').length,1);assert.equal(f.replies.length,2);assert.match(f.replies[1][1],/Nothing was announced/);const row=f.interactionReceipts.read('i1');assert.equal(row.processing,'committed');assert.equal(row.reply,'delivered');
  assert.equal((await f.service.handle(f.event)).status,'already_claimed');assert.equal(f.replies.length,2);assert.equal(f.sceneStore.activeSessions('c').length,1);
});
test('a non-GM member is denied privately with no session or retry',async t=>{
  const f=fixture(t);f.member.roles.cache.clear();const r=await f.service.handle(f.event);assert.equal(r.status,'native_review_required');assert.equal(f.sceneStore.activeSessions('c').length,0);assert.equal(f.interactionReceipts.read('i1').processing,'held');assert.match(f.replies.at(-1)[1],/not confirmed/);
});
test('uncertain reply delivery is recorded and not retried',async t=>{
  const f=fixture(t);f.event.editReply=async()=>{throw new Error('send failed');};const r=await f.service.handle(f.event);assert.equal(r.status,'committed');assert.equal(f.interactionReceipts.read('i1').reply,'uncertain');assert.equal((await f.service.handle(f.event)).status,'already_claimed');assert.equal(f.sceneStore.activeSessions('c').length,1);
});
test('unrelated and attendance subcommands are not claimed',async t=>{
  const f=fixture(t);f.event.options.getSubcommand=()=> 'present';assert.equal(f.service.claimsRoute(f.event),false);assert.equal(await f.service.handle(f.event),false);
});
