import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {createDiscordGmAuthority} from '../../src/v2/discord-gm-authority.js';
import {createDiscordGmSession} from '../../src/v2/discord-gm-session.js';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {createPcBootstrapSource} from '../../src/v2/pc-bootstrap-source.js';
import {openInteractionReceipts} from '../../src/v2/interaction-receipts.js';
function fixture(t,{id='i1',withBootstrap=false}={}){
  let now=1000000;const client=new EventEmitter(),policy={campaignId:'c',revision:'1',gmRoleId:'gm-role',gmUserIds:[],allowAdministrators:false},roles=new Map([['gm-role',{}]]),guild={id:'c'},member={id:'gm',guild,user:{id:'gm',bot:false},roles:{cache:new Map([['gm-role',{}]])},permissions:new PermissionsBitField([])},channel={id:'admin',guildId:'c',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages])};
  guild.members={fetch:async()=>member};guild.roles={fetch:async()=>roles};guild.channels={fetch:async()=>channel};client.guilds={fetch:async()=>guild};
  const gmAuthority=createDiscordGmAuthority({client,readPolicy:()=>policy,clock:()=>now}),sceneStore=openSceneStore(),interactionReceipts=openInteractionReceipts(),errors=[];
  const owners={pc3:'u3'},actions=openActionStore(),character={id:'pc',guild_id:'c',owner_user_id:'u',status:'active',data:{level:2,resources:{hp:{current:2,max:6},armor:{current:1,max:3},stress:{current:2,max:6},hope:3,hope_max:6}}},readSource=createPcBootstrapSource({sceneStore,characterRepository:{getCharacter:()=>character}});sceneStore.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'owner-registration',records:[{kind:'actor',expectedRevision:null,data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}}]},{check:()=>{}});
  const service=createDiscordGmSession({client,sceneStore,gmAuthority,interactionReceipts,bootstrap:withBootstrap?{readSource,actionStore:actions}:null,characters:withBootstrap?{getCharacter:cid=>cid==='pc3'?{id:'pc3',guild_id:'c',owner_user_id:owners.pc3,status:'active'}:cid==='pc'?character:null}:null,onError:e=>errors.push(e.message)});
  t.after(()=>{service.close();actions.close();gmAuthority.close();interactionReceipts.close();sceneStore.close();});
  const replies=[],event={id,client,guildId:'c',channelId:'admin',user:{id:'gm',bot:false},createdTimestamp:now,commandName:'vc-session',deferred:false,replied:false,isChatInputCommand:()=>true,options:{getSubcommand:()=> 'start',getSubcommandGroup:()=> 'session',getString:n=>n==='title'?'Night watch':n==='assembly'?'auto':null},deferReply:async o=>{event.deferred=true;replies.push(['defer',o.flags]);},editReply:async o=>{replies.push(['reply',o.content]);}};
  client.emit('interactionCreate',event);return {owners,actions,readSource,client,member,sceneStore,interactionReceipts,service,event,replies,errors};
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
const roll=(f,id,json)=>{const e={...f.event,id,commandName:'vc-roll',deferred:false,replied:false,options:{getSubcommand:()=> 'effect',getSubcommandGroup:()=>null,getString:()=>JSON.stringify(json)}};e.deferReply=async()=>{e.deferred=true;f.replies.push([id,'defer']);};e.editReply=async o=>{f.replies.push([id,o.content]);};f.client.emit('interactionCreate',e);return e;};
test('GM previews a private snapshot, then exact review atomically initializes the PC once',async t=>{
  const f=fixture(t,{withBootstrap:true}),p=roll(f,'p1',{op:'pc-bootstrap-preview',actor:'pc'});assert.equal((await f.service.handle(p)).status,'committed');const text=f.replies.find(r=>r[0]==='p1'&&r[1]!=='defer')[1],hash=text.match(/snapshotHash ([a-f0-9]{64})/)[1];assert.ok(!f.actions.readPcLife('c','pc')?.life);
  const bad=roll(f,'r0',{op:'pc-bootstrap-review',actor:'pc',snapshotHash:'0'.repeat(64)});assert.equal((await f.service.handle(bad)).status,'native_review_required');assert.ok(!f.actions.readPcLife('c','pc')?.life);
  const r=roll(f,'r1',{op:'pc-bootstrap-review',actor:'pc',snapshotHash:hash});assert.equal((await f.service.handle(r)).status,'committed');assert.equal(f.actions.readPcLife('c','pc').life.ownerUserId,'u');assert.equal(f.sceneStore.readers.readActor('c','pc').controllerUserId,'u');
});
test('bootstrap ops are unclaimed unless native bootstrap dependencies are supplied',async t=>{
  const f=fixture(t),e=roll(f,'p2',{op:'pc-bootstrap-preview',actor:'pc'});assert.equal(f.service.claimsRoute(e),false);
});const endEvent=(f,id)=>{const e={...f.event,id,deferred:false,replied:false,options:{getSubcommand:()=> 'end',getSubcommandGroup:()=> 'session',getString:()=>null}};e.deferReply=async()=>{e.deferred=true;f.replies.push([id,'defer']);};e.editReply=async o=>{f.replies.push([id,o.content]);};f.client.emit('interactionCreate',e);return e;};
test('GM end closes the active session and scenes without deleting history, then a new session can start',async t=>{
  const f=fixture(t);await f.service.handle(f.event);const sid=f.sceneStore.activeSessions('c')[0].id;
  const r=await f.service.handle(endEvent(f,'e1'));assert.equal(r.status,'committed',f.errors.join('|'));assert.equal(f.sceneStore.activeSessions('c').length,0);assert.equal(f.sceneStore.readers.readSession('c',sid).status,'ended');assert.equal(f.sceneStore.readers.readScene('c',`${sid}:opening`).status,'closed');assert.equal(f.sceneStore.history('c','session',sid).length,2);assert.match(f.replies.at(-1)[1],/Nothing was deleted/);
  assert.equal((await f.service.handle(endEvent(f,'e1'))).status,'already_claimed');
  const next={...f.event,id:'i2',deferred:false};next.deferReply=async()=>{next.deferred=true;};next.editReply=async()=>{};f.client.emit('interactionCreate',next);assert.equal((await f.service.handle(next)).status,'committed',f.errors.join('|'));assert.equal(f.sceneStore.activeSessions('c').length,1);
});
test('GM end without exactly one active session is held and changes nothing',async t=>{
  const f=fixture(t),r=await f.service.handle(endEvent(f,'e2'));assert.equal(r.status,'native_review_required');assert.equal(f.interactionReceipts.read('e2').processing,'held');
});
test('a non-GM member cannot end the session',async t=>{
  const f=fixture(t);await f.service.handle(f.event);f.member.roles.cache.clear();assert.equal((await f.service.handle(endEvent(f,'e3'))).status,'native_review_required');assert.equal(f.sceneStore.activeSessions('c').length,1);
});
test('GM registers a character to its repository owner in the sole active scene without resources or attendance',async t=>{
  const f=fixture(t,{withBootstrap:true});await f.service.handle(f.event);
  const none=roll(f,'g0',{op:'pc-register',actor:'nobody'});assert.equal((await f.service.handle(none)).status,'native_review_required');
  const reg=roll(f,'g1',{op:'pc-register',actor:'pc3'});assert.equal((await f.service.handle(reg)).status,'committed',f.errors.join('|'));const a=f.sceneStore.readers.readActor('c','pc3'),sid=f.sceneStore.activeSessions('c')[0].id;assert.equal(a.ownerUserId,'u3');assert.equal(a.controllerUserId,'u3');assert.equal(a.controlRole,'owner');assert.equal(a.sceneId,`${sid}:opening`);assert.deepEqual(f.sceneStore.readers.readScene('c',`${sid}:opening`).participants,[]);assert.ok(!f.actions.readPcLife('c','pc3')?.life);
  const again=roll(f,'g2',{op:'pc-register',actor:'pc'});assert.equal((await f.service.handle(again)).status,'native_review_required');assert.equal(f.sceneStore.readers.readActor('c','pc').sceneId,'s');
});
test('registration needs an active scene and a GM',async t=>{
  const f=fixture(t,{withBootstrap:true});assert.equal((await f.service.handle(roll(f,'g3',{op:'pc-register',actor:'pc3'}))).status,'native_review_required');assert.equal(f.sceneStore.readers.readActor('c','pc3'),null);
  await f.service.handle(f.event);f.member.roles.cache.clear();assert.equal((await f.service.handle(roll(f,'g4',{op:'pc-register',actor:'pc3'}))).status,'native_review_required');assert.equal(f.sceneStore.readers.readActor('c','pc3'),null);
});
const reopenEvent=(f,id,session)=>{const e={...f.event,id,deferred:false,replied:false,options:{getSubcommand:()=> 'reopen',getSubcommandGroup:()=> 'session',getString:()=>session}};e.deferReply=async()=>{e.deferred=true;};e.editReply=async o=>{f.replies.push([id,o.content]);};f.client.emit('interactionCreate',e);return e;};
test('GM reopens a natively ended session with its closed scenes and refuses other cases',async t=>{
  const f=fixture(t);await f.service.handle(f.event);const sid=f.sceneStore.activeSessions('c')[0].id;
  assert.equal((await f.service.handle(reopenEvent(f,'o0',sid))).status,'native_review_required');assert.equal(f.sceneStore.activeSessions('c').length,1);
  await f.service.handle(endEvent(f,'e9'));assert.equal((await f.service.handle(reopenEvent(f,'o1','missing'))).status,'native_review_required');assert.equal(f.sceneStore.activeSessions('c').length,0);
  assert.equal((await f.service.handle(reopenEvent(f,'o2',sid))).status,'committed',f.errors.join('|'));assert.equal(f.sceneStore.activeSessions('c')[0].id,sid);assert.equal(f.sceneStore.readers.readScene('c',`${sid}:opening`).status,'active');assert.equal(f.sceneStore.history('c','session',sid).length,3);
});
test('a session ended outside the native end command cannot reopen',async t=>{
  const f=fixture(t);await f.service.handle(f.event);const sid=f.sceneStore.activeSessions('c')[0].id,s=f.sceneStore.readers.readSession('c',sid),{revision,...old}=s;
  f.sceneStore.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'manual-end',records:[{kind:'session',data:{...old,status:'ended'},expectedRevision:Number(revision)}]},{check:()=>{}});
  assert.equal((await f.service.handle(reopenEvent(f,'o3',sid))).status,'native_review_required');assert.equal(f.sceneStore.activeSessions('c').length,0);
});
test('GM rebinds a registered PC to the changed repository owner in place and refuses unchanged, absent or moved registrations',async t=>{
  const f=fixture(t,{withBootstrap:true});await f.service.handle(f.event);await f.service.handle(roll(f,'b0',{op:'pc-register',actor:'pc3'}));const before=f.sceneStore.readers.readActor('c','pc3');
  assert.equal((await f.service.handle(roll(f,'b1',{op:'pc-rebind',actor:'pc3'}))).status,'native_review_required');assert.equal(f.sceneStore.readers.readActor('c','pc3').revision,before.revision);
  f.owners.pc3='u4';assert.equal((await f.service.handle(roll(f,'b2',{op:'pc-rebind',actor:'pc3'}))).status,'committed',f.errors.join('|'));const after=f.sceneStore.readers.readActor('c','pc3');assert.equal(after.ownerUserId,'u4');assert.equal(after.controllerUserId,'u4');assert.equal(after.sceneId,before.sceneId);assert.notEqual(after.controlRevision,before.controlRevision);assert.equal(after.proxyAuthorized,undefined);
  assert.equal((await f.service.handle(roll(f,'b3',{op:'pc-rebind',actor:'nobody'}))).status,'native_review_required');
  f.owners.pc3='u5';assert.equal((await f.service.handle(roll(f,'b4',{op:'pc-rebind',actor:'pc'}))).status,'native_review_required');assert.equal(f.sceneStore.readers.readActor('c','pc').sceneId,'s');
});
