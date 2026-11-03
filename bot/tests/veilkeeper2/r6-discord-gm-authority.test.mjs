import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {createDiscordGmAuthority} from '../../src/v2/discord-gm-authority.js';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {createPcBootstrapSource} from '../../src/v2/pc-bootstrap-source.js';
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
