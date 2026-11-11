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
  let now=1000000;const sentMessages=[],client=new EventEmitter(),policy={campaignId:'c',revision:'1',gmRoleId:'gm-role',gmUserIds:[],allowAdministrators:false},roles=new Map([['gm-role',{}]]),guild={id:'c'},member={id:'gm',guild,user:{id:'gm',bot:false},roles:{cache:new Map([['gm-role',{}]])},permissions:new PermissionsBitField([])},channel={id:'admin',guildId:'c',type:ChannelType.GuildText,send:async payload=>{sentMessages.push(payload);return {id:'sent-'+sentMessages.length};},permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages])};
  guild.members={fetch:async()=>member};guild.roles={fetch:async()=>roles};guild.channels={fetch:async()=>channel};client.guilds={fetch:async()=>guild};
  const gmAuthority=createDiscordGmAuthority({client,readPolicy:()=>policy,clock:()=>now}),sceneStore=openSceneStore(),interactionReceipts=openInteractionReceipts(),errors=[];
  const liveAudience={recipients:null},draftRows=[],owners={pc3:'u3'},actions=openActionStore(),character={id:'pc',guild_id:'c',owner_user_id:'u',status:'active',data:{level:2,resources:{hp:{current:2,max:6},armor:{current:1,max:3},stress:{current:2,max:6},hope:3,hope_max:6}}},readSource=createPcBootstrapSource({sceneStore,characterRepository:{getCharacter:()=>character}});sceneStore.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'owner-registration',records:[{kind:'actor',expectedRevision:null,data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}}]},{check:()=>{}});
  const service=createDiscordGmSession({client,sceneStore,gmAuthority,interactionReceipts,bootstrap:withBootstrap?{readSource,actionStore:actions}:null,audienceReader:{read:async s=>{await liveAudience.onRead?.();return {channelRecord:{id:s.channelId,campaignId:s.guildId,sceneId:s.sceneId,kind:s.mode,permissionsVerified:true,recipientIds:liveAudience.recipients??s.participantIds,writerIds:[]},fingerprint:'live'};}},drafts:withBootstrap?{refreshSource:async()=>{await liveAudience.onRefresh?.();},inspectSource:(c,s,r)=>{if(liveAudience.sourceRevoked||r!=='source-revision')throw new Error('Draft source revoked');return {campaign:c,id:s,scene:sceneStore.readers.readChannel(c,'admin')?.sceneId,recipients:['u','v']};},recent:(c,n)=>{assert.equal(c,'c');return draftRows.filter(d=>!d.state).slice(0,n);},begin:(c,s,o)=>{const d=draftRows.find(x=>x.source===s&&!x.state);if(!d||d.fingerprint!==o.approvedFingerprint)throw new Error('not current');o.check();d.state='publishing';d.approval=o.approval;return d.draft;},finish:(c,s,m)=>{draftRows.find(x=>x.source===s).state='published:'+m;},uncertain:(c,s,r)=>{draftRows.find(x=>x.source===s).state='uncertain:'+r;}}:null,characters:withBootstrap?{getCharacter:cid=>cid==='pc3'?{id:'pc3',guild_id:'c',owner_user_id:owners.pc3,status:'active'}:cid==='pc'?character:null}:null,onError:e=>errors.push(e.message)});
  t.after(()=>{service.close();actions.close();gmAuthority.close();interactionReceipts.close();sceneStore.close();});
  const replies=[],event={id,client,guildId:'c',channelId:'admin',user:{id:'gm',bot:false},createdTimestamp:now,commandName:'vc-session',deferred:false,replied:false,isChatInputCommand:()=>true,options:{getSubcommand:()=> 'start',getSubcommandGroup:()=> 'session',getString:n=>n==='title'?'Night watch':n==='assembly'?'auto':null},deferReply:async o=>{event.deferred=true;replies.push(['defer',o.flags]);},editReply:async o=>{replies.push(['reply',o.content]);}};
  client.emit('interactionCreate',event);return {liveAudience,sentMessages,draftRows,owners,actions,readSource,client,member,sceneStore,interactionReceipts,service,event,replies,errors};
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
const GM_SUBCOMMANDS={'session-reopen':['session-reopen',{session:'session'}],'pc-register':['register-character',{actor:'character'}],'pc-rebind':['rebind-character',{actor:'character'}],'pc-bootstrap-preview':['bootstrap-preview',{actor:'character'}],'pc-bootstrap-review':['bootstrap-review',{actor:'character',snapshotHash:'snapshot'}],'draft-list':['drafts',{}],'draft-publish':['publish-draft',{source:'source',fingerprint:'fingerprint'}]};
// Drives the typed /vc-gm subcommands; `input` keeps the closed native operation shape the services verify.
const roll=(f,id,input)=>{const [sub,fields]=GM_SUBCOMMANDS[input.op]??['unsupported',{}],values={};for(const [field,option] of Object.entries(fields))values[option]=input[field];const e={...f.event,id,commandName:'vc-gm',deferred:false,replied:false,options:{getSubcommand:()=>sub,getSubcommandGroup:()=>null,getString:name=>values[name]}};e.deferReply=async()=>{e.deferred=true;f.replies.push([id,'defer']);};e.editReply=async o=>{f.replies.push([id,o.content]);};f.client.emit('interactionCreate',e);return e;};
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
const reopenEvent=(f,id,session)=>roll(f,id,{op:'session-reopen',session});
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
test('GM lists withheld drafts privately, and non-GMs and unconfigured services get nothing',async t=>{
  const f=fixture(t,{withBootstrap:true}),texts=f.replies;assert.equal((await f.service.handle(roll(f,'d0',{op:'draft-list'}))).status,'committed');assert.match(texts.at(-1)[1],/No withheld drafts yet/);
  f.draftRows.push({source:'src-1',fingerprint:'c'.repeat(64),draft:{text:'The clerk glances up. '.repeat(40)}},{source:'src-2',fingerprint:'d'.repeat(64),draft:{text:'Rain.'}});assert.equal((await f.service.handle(roll(f,'d1',{op:'draft-list'}))).status,'committed');const out=texts.at(-1)[1];assert.match(out,/GM only\. Withheld drafts, nothing was sent/);assert.match(out,/1\) src-1 fingerprint c{64}: The clerk glances up\./);assert.match(out,/2\) src-2 fingerprint d{64}: Rain\./);assert.ok(out.length<2000);
  f.member.roles.cache.clear();assert.equal((await f.service.handle(roll(f,'d2',{op:'draft-list'}))).status,'native_review_required');assert.doesNotMatch(texts.at(-1)[1],/src-1|clerk/);
  const g=fixture(t);assert.equal(g.service.claimsRoute(roll(g,'d3',{op:'draft-list'})),false);
});
const FP='a'.repeat(64),OTHER_FP='b'.repeat(64);
async function draftFixture(t,over={}){
  const f=fixture(t,{withBootstrap:true});await f.service.handle(f.event);const sid=f.sceneStore.activeSessions('c')[0].id;f.sceneStore.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'chan',records:[{kind:'channel',expectedRevision:null,data:{id:'admin',campaignId:'c',sceneId:`${sid}:opening`,kind:'party',permissionsVerified:true,recipientIds:['u','v'],writerIds:['u','v']}}]},{check:()=>{}});
  f.draftRows.push({source:'src-1',fingerprint:FP,draft:{text:'The clerk waits.',audience:{campaign:'c',scene:`${sid}:opening`,source_ref:'src-1',revision:'source-revision',recipients:['v','u']},delivery:{channelId:'admin',mode:'party',messageId:'m1'},...over}});return f;
}
test('GM approves an exact saved draft and it is sent once to its original audience without knowledge acknowledgement',async t=>{
  const f=await draftFixture(t),r=await f.service.handle(roll(f,'p0',{op:'draft-publish',source:'src-1',fingerprint:FP}));assert.equal(r.status,'committed',f.errors.join('|'));
  assert.deepEqual(f.sentMessages,[{content:'The clerk waits.',allowedMentions:{parse:[]},enforceNonce:true,nonce:'src-1'}]);assert.equal(f.draftRows[0].state,'published:sent-1');assert.equal(f.draftRows[0].approval.principal,'gm');assert.match(f.replies.at(-1)[1],/not acknowledged as knowledge or canon/);
  assert.equal((await f.service.handle(roll(f,'p0',{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'already_claimed');
  assert.equal((await f.service.handle(roll(f,'p1',{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'native_review_required');assert.equal(f.sentMessages.length,1);
});
test('a wrong fingerprint, changed audience, oversize text or non-GM sends nothing',async t=>{
  const f=await draftFixture(t);assert.equal((await f.service.handle(roll(f,'p2',{op:'draft-publish',source:'src-1',fingerprint:OTHER_FP}))).status,'native_review_required');
  f.draftRows[0].draft.audience.recipients=['u'];assert.equal((await f.service.handle(roll(f,'p3',{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'native_review_required');
  f.draftRows[0].draft.audience.recipients=['u','v'];f.draftRows[0].draft.text='x'.repeat(1901);assert.equal((await f.service.handle(roll(f,'p4',{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'native_review_required');
  f.draftRows[0].draft.text='ok';f.member.roles.cache.clear();assert.equal((await f.service.handle(roll(f,'p5',{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'native_review_required');
  assert.equal(f.sentMessages.length,0);assert.equal(f.draftRows[0].state,undefined);
});
test('an unconfirmed send holds the draft as uncertain and is never retried',async t=>{
  const f=await draftFixture(t);let calls=0;const guild=await f.client.guilds.fetch(),channel=await guild.channels.fetch();channel.send=async()=>{calls++;throw new Error('network gone');};
  assert.equal((await f.service.handle(roll(f,'p6',{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'native_review_required');assert.equal(f.draftRows[0].state,'uncertain:network gone');assert.match(f.replies.at(-1)[1],/not confirmed/);
  assert.equal((await f.service.handle(roll(f,'p7',{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'native_review_required');assert.equal(calls,1);
});
test('a /vc-roll command carrying GM operation JSON is not claimed by the GM service',async t=>{
  const f=fixture(t,{withBootstrap:true}),e={...f.event,commandName:'vc-roll',options:{getSubcommand:()=> 'effect',getSubcommandGroup:()=>null,getString:()=>JSON.stringify({op:'pc-register',actor:'pc3'})}};f.client.emit('interactionCreate',e);
  assert.equal(f.service.claimsRoute(e),false);assert.equal(await f.service.handle(e),false);assert.equal(f.sceneStore.readers.readActor('c','pc3'),null);
});
test('publish-draft re-reads the live audience and scene at send time and sends nothing if either changed',async t=>{
  const f=await draftFixture(t);f.liveAudience.recipients=['u'];assert.equal((await f.service.handle(roll(f,'q1',{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'native_review_required');assert.equal(f.sentMessages.length,0);assert.equal(f.draftRows[0].state,undefined);
  f.liveAudience.recipients=null;await f.service.handle(endEvent(f,'q2'));assert.equal((await f.service.handle(roll(f,'q3',{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'native_review_required');assert.equal(f.sentMessages.length,0);
});
test('a scene closed while awaiting publication audience reads prevents a send claim',async t=>{
  const f=await draftFixture(t);f.liveAudience.onRead=async()=>{await f.service.handle(endEvent(f,'race-close'));};
  const result=await f.service.handle(roll(f,'race-publish',{op:'draft-publish',source:'src-1',fingerprint:FP}));
  assert.equal(result.status,'native_review_required');assert.equal(f.sentMessages.length,0);assert.equal(f.draftRows[0].state,undefined);assert.match(f.errors.join('|'),/publication scope changed/);
});

test('a session closed during channel resolution prevents publication',async t=>{
  const f=await draftFixture(t),guild=await f.client.guilds.fetch(),fetch=guild.channels.fetch;
  f.liveAudience.onRead=async()=>{guild.channels.fetch=async(...args)=>{guild.channels.fetch=fetch;await f.service.handle(endEvent(f,'fetch-close'));return fetch(...args);};};
  assert.equal((await f.service.handle(roll(f,'fetch-publish',{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'native_review_required');
  assert.equal(f.sentMessages.length,0);assert.equal(f.draftRows[0].state,undefined);assert.match(f.errors.join('|'),/publication scope changed/);
});

test('matching recipients do not authorize a draft from another campaign, scene or source',async t=>{
  const f=await draftFixture(t),audience=f.draftRows[0].draft.audience;
  for(const [field,value] of [['campaign','other-campaign'],['scene','other-scene'],['source_ref','other-source']]){
    const prior=audience[field];audience[field]=value;
    assert.equal((await f.service.handle(roll(f,`scope-${field}`,{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'native_review_required');
    audience[field]=prior;
  }
  assert.equal(f.sentMessages.length,0);assert.equal(f.draftRows[0].state,undefined);assert.match(f.errors.join('|'),/source audience does not match/);
});

test('revoking the original player source while looking up the channel prevents a draft claim',async t=>{
  const f=await draftFixture(t),guild=await f.client.guilds.fetch(),fetch=guild.channels.fetch;
  f.liveAudience.onRead=async()=>{guild.channels.fetch=async(...args)=>{f.liveAudience.sourceRevoked=true;return fetch(...args);};};
  assert.equal((await f.service.handle(roll(f,'source-revoke',{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'native_review_required');
  assert.equal(f.sentMessages.length,0);assert.equal(f.draftRows[0].state,undefined);assert.match(f.errors.join('|'),/Draft source revoked/);
});

test('a failed original-message refresh prevents send and leaves the saved draft unclaimed',async t=>{
  const f=await draftFixture(t);f.liveAudience.onRefresh=async()=>{throw new Error('Original Discord message deleted');};
  assert.equal((await f.service.handle(roll(f,'refresh-fail',{op:'draft-publish',source:'src-1',fingerprint:FP}))).status,'native_review_required');assert.equal(f.sentMessages.length,0);assert.equal(f.draftRows[0].state,undefined);assert.match(f.errors.join('|'),/message deleted/);
});
