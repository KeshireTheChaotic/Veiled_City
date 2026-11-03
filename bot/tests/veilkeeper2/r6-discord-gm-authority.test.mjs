import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {createDiscordGmAuthority} from '../../src/v2/discord-gm-authority.js';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {createPcBootstrapSource} from '../../src/v2/pc-bootstrap-source.js';
import {createNativeSessionSetup} from '../../src/v2/native-session-setup.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fixture(t){
  let now=1000000,fetches=0;const client=new EventEmitter(),policy={campaignId:'c',revision:'1',gmRoleId:'gm-role',gmUserIds:[],allowAdministrators:false},roles=new Map([['gm-role',{}]]),guild={id:'c'},member={id:'gm',guild,user:{id:'gm',bot:false},roles:{cache:new Map([['gm-role',{}]])},permissions:new PermissionsBitField([])},channel={id:'admin',guildId:'c',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages])};
  guild.members={fetch:async options=>{fetches++;assert.deepEqual(options,{user:'gm',force:true});return member;}};guild.roles={fetch:async()=>roles};guild.channels={fetch:async(id,options)=>{assert.equal(id,'admin');assert.equal(options.force,true);return channel;}};client.guilds={fetch:async options=>{assert.deepEqual(options,{guild:'c',force:true});return guild;}};
  const authority=createDiscordGmAuthority({client,readPolicy:()=>policy,clock:()=>now});t.after(()=>authority.close());
  const event={id:'interaction',client,guildId:'c',channelId:'admin',user:{id:'gm',bot:false},createdTimestamp:now,commandName:'vc-session',isChatInputCommand:()=>true,options:{getSubcommand:()=> 'start',getSubcommandGroup:()=> 'session',getString:name=>name==='title'?'Night watch':name==='assembly'?'auto':null}};
  const observe=()=>client.emit('interactionCreate',event);return {client,policy,roles,member,channel,guild,authority,event,observe,get fetches(){return fetches;},advance(ms){now+=ms;}};
}
test('same-client observed human role produces an exact short native session-start authority',async t=>{
  const f=fixture(t);await assert.rejects(f.authority.authorize(f.event),/observed human/);f.observe();const proof=await f.authority.authorize(f.event);assert.equal(proof.role,'human_gm');assert.equal(proof.operation,'session_start');assert.equal(f.fetches,1);assert.equal(f.authority.check(proof),true);assert.deepEqual(f.authority.readDeclaration(proof).payload,{title:'Night watch',assembly:'auto'});assert.equal(proof.actors,undefined);assert.equal(proof.recipients,undefined);
});
test('forged interaction GM flags do not replace current fetched membership',async t=>{
  const f=fixture(t);f.member.roles.cache.clear();f.event.member={permissions:new PermissionsBitField([P.Administrator]),isGM:true};f.observe();await assert.rejects(f.authority.authorize(f.event),/Configured current human GM/);
});
test('administrator fallback requires explicit native policy and configured users remain human guild members',async t=>{
  const f=fixture(t);f.member.roles.cache.clear();f.member.permissions=new PermissionsBitField([P.Administrator]);f.observe();await assert.rejects(f.authority.authorize(f.event));f.policy.allowAdministrators=true;assert.equal((await f.authority.authorize(f.event)).principal,'gm');f.policy.allowAdministrators=false;f.member.permissions=new PermissionsBitField([]);f.policy.gmUserIds=['gm'];assert.equal((await f.authority.authorize(f.event)).principal,'gm');f.member.user.bot=true;await assert.rejects(f.authority.authorize(f.event),/human GM membership/);
});
test('lease expiry, changed declaration/policy and observed role revocation invalidate synchronous guards',async t=>{
  for(const change of [f=>f.advance(15001),f=>f.event.options.getString=()=> 'Changed',f=>f.policy.revision='2',f=>f.member.roles.cache.clear(),f=>f.roles.clear()]){const f=fixture(t);f.observe();const proof=await f.authority.authorize(f.event);change(f);assert.throws(()=>f.authority.check(proof));}
});
test('explicit refresh fetches live member again and rejects current channel denial or deleted roles',async t=>{
  const f=fixture(t);f.observe();const proof=await f.authority.authorize(f.event);await f.authority.refresh(proof);assert.equal(f.fetches,2);f.channel.permissionsFor=()=>new PermissionsBitField([]);await assert.rejects(f.authority.authorize(f.event),/channel access/);f.channel.permissionsFor=()=>new PermissionsBitField([P.ViewChannel,P.SendMessages]);f.roles.clear();await assert.rejects(f.authority.authorize(f.event));
});
test('policy drift and abort during asynchronous membership refresh cannot issue authority',async t=>{
  const f=fixture(t);f.guild.roles.fetch=async()=>{f.policy.revision='2';return f.roles;};f.observe();await assert.rejects(f.authority.authorize(f.event),/policy changed/);
  const g=fixture(t),controller=new AbortController();g.guild.roles.fetch=async()=>{controller.abort();return g.roles;};g.observe();await assert.rejects(g.authority.authorize(g.event,{signal:controller.signal}));
});
test('old, foreign-client, bot and unrelated operation events cannot become GM authority',async t=>{
  for(const change of [f=>f.advance(300001),f=>f.event.client=new EventEmitter(),f=>f.event.user.bot=true,f=>f.event.commandName='unrelated']){const f=fixture(t);change(f);f.observe();await assert.rejects(f.authority.authorize(f.event));}
});
test('observed exact GM snapshot review authorizes actual atomic native bootstrap without PC control',async t=>{
  const f=fixture(t),scenes=openSceneStore(),actions=openActionStore();t.after(()=>{actions.close();scenes.close();});scenes.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'owner-registration',records:[{kind:'actor',expectedRevision:null,data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}}]},{check:()=>{}});
  const character={id:'pc',guild_id:'c',owner_user_id:'u',status:'active',data:{level:2,resources:{hp:{current:2,max:6},armor:{current:1,max:3},stress:{current:2,max:6},hope:3,hope_max:6}}},readSource=createPcBootstrapSource({sceneStore:scenes,characterRepository:{getCharacter:()=>character}}),source=readSource('c','pc');f.event.commandName='vc-roll';f.event.options={getSubcommand:()=> 'effect',getString:()=>JSON.stringify({op:'pc-bootstrap-review',actor:'pc',snapshotHash:hash(source)})};f.observe();const proof=await f.authority.authorize(f.event),review=f.authority.bootstrapReview(proof,source);assert.equal(review.principal,'gm');assert.equal(review.ownerUserId,'u');assert.throws(()=>f.authority.bootstrapReview(proof,{...source,hope:4}),/Exact explicitly reviewed/);const receipt=actions.initializePcFromReviewedSource('c','pc',{check:()=>f.authority.check(proof),readSource,inspectReview:()=>f.authority.bootstrapReview(proof,readSource('c','pc'))});assert.equal(receipt.review.sourceRevision,proof.sourceRevision);assert.equal(actions.readPcLife('c','pc').life.ownerUserId,'u');assert.equal(scenes.readers.readActor('c','pc').controllerUserId,'u');
});
test('closing invalidates leases and detaches observation without altering registered roles',async t=>{
  const f=fixture(t);f.observe();const proof=await f.authority.authorize(f.event);f.authority.close();assert.throws(()=>f.authority.check(proof));assert.equal(f.client.listenerCount('interactionCreate'),0);assert.equal(f.member.roles.cache.has('gm-role'),true);
});
test('observed human session creation saves provenance and an empty opening occasion without PC attendance',async t=>{
  const f=fixture(t),scenes=openSceneStore();t.after(()=>scenes.close());f.observe();const proof=await f.authority.authorize(f.event),setup=createNativeSessionSetup({sceneStore:scenes,gmAuthority:f.authority}),created=setup.start(proof);assert.equal(created.session.title,'Night watch');assert.equal(created.session.assembly,'auto');assert.equal(created.session.setup.principal,'gm');assert.equal(created.session.setup.sourceRevision,proof.sourceRevision);assert.deepEqual(created.scene.participants,[]);assert.equal(scenes.activeSessions('c').length,1);assert.equal(scenes.activeSessions('other').length,0);assert.deepEqual(setup.start(proof),created);assert.equal(scenes.history('c','session',created.session.id).length,1);assert.equal(scenes.history('c','scene',created.scene.id).length,1);
});
test('another session-start command cannot replace an active session',async t=>{
  const f=fixture(t),scenes=openSceneStore();t.after(()=>scenes.close());f.observe();const proof=await f.authority.authorize(f.event),setup=createNativeSessionSetup({sceneStore:scenes,gmAuthority:f.authority}),first=setup.start(proof),secondEvent={...f.event,id:'second-interaction'};f.client.emit('interactionCreate',secondEvent);const second=await f.authority.authorize(secondEvent);assert.throws(()=>setup.start(second),/Existing active session/);assert.equal(scenes.activeSessions('c').length,1);assert.equal(scenes.activeSessions('c')[0].id,first.session.id);assert.equal(scenes.readers.readSession('c',second.targetRef),null);
});
test('native session and opening scene roll back together when final GM authority is revoked',async t=>{
  const f=fixture(t),scenes=openSceneStore();t.after(()=>scenes.close());f.observe();const proof=await f.authority.authorize(f.event);let checks=0;const setup=createNativeSessionSetup({sceneStore:scenes,gmAuthority:{...f.authority,check(value){if(++checks===2)f.member.roles.cache.clear();return f.authority.check(value);}}});assert.throws(()=>setup.start(proof),/revoked/);assert.equal(scenes.readers.readSession('c',proof.targetRef),null);assert.equal(scenes.readers.readScene('c',`${proof.targetRef}:opening`),null);assert.equal(scenes.activeSessions('c').length,0);
});
test('session-start replay cannot reopen an ended session or displace its successor',async t=>{
  const f=fixture(t),scenes=openSceneStore();t.after(()=>scenes.close());f.observe();const proof=await f.authority.authorize(f.event),setup=createNativeSessionSetup({sceneStore:scenes,gmAuthority:f.authority}),first=setup.start(proof),{revision,...old}=first.session;scenes.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'native-end-fixture',records:[{kind:'session',data:{...old,status:'ended'},expectedRevision:Number(revision)}]},{check:()=>f.authority.check(proof)});const nextEvent={...f.event,id:'next-session'};f.client.emit('interactionCreate',nextEvent);const next=setup.start(await f.authority.authorize(nextEvent));const replay=setup.start(proof);assert.equal(replay.session.status,'ended');assert.deepEqual(replay.receipt,first.receipt);assert.equal(scenes.activeSessions('c')[0].id,next.session.id);assert.equal(scenes.activeSessions('c').length,1);
});
test('native session metadata rejects unsupported assembly and non-provenance fields',t=>{
  const scenes=openSceneStore();t.after(()=>scenes.close());for(const patch of [{assembly:'force_pc_reunion'},{setup:{principal:'gm',gm:true}},{hp:99}])assert.throws(()=>scenes.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'bad',records:[{kind:'session',data:{id:'session',campaignId:'c',status:'active',...patch},expectedRevision:null}]},{check:()=>{}}),/Closed native/);assert.equal(scenes.activeSessions('c').length,0);
});
