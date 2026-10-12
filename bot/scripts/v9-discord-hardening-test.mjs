/** V9-07 real read-only adapters; temporary native fixtures, never live Discord. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {configureCityFlags} from '../src/city-core.js';
import {pendingRollRequests} from '../src/roll-requests.js';
import {handleCommand} from '../src/commands.js';
import * as discovery from '../src/continuity-routing.js';
import {captureDeclaration} from '../src/player-language.js';
import {prepareRollRequest} from '../src/roll-requests.js';

function interaction(f,group,sub,strings={}){
  const events=[],sent=[],user=f.pcs[0].owner_user_id;
  const i={id:`native-${group}-${sub}`,commandName:`vc-${group}`,guildId:f.guild,guild:{id:f.guild},user:{id:user,username:'Fixture'},
    isChatInputCommand:()=>true,memberPermissions:{has:()=>false},
    options:{getSubcommand:()=>sub,getString:k=>strings[k]??null},events,sent,
    deferReply:async p=>{events.push('ack');assert.equal(p.ephemeral,true);i.deferred=true;},
    reply:async p=>{assert(!i.deferred,'second acknowledgement');sent.push(p);},
    editReply:async p=>sent.push(p),followUp:async p=>sent.push(p)};
  return i;
}
function setup(f){
  configureCityFlags(f.db,f.guild,{discovery:true},'gm');
  const text='VISIBLE '+('🌧️'.repeat(700))+'\n```text\n'+('long knowledge '.repeat(300))+'\n```\n<@123456789> END';
  f.db.addFact(f.guild,{key:'long-visible',content:text,visibility:'character',subjectCharacterId:f.pcs[0].id});
  f.db.addFact(f.guild,{key:'never-visible',content:'SECRET_OTHER_PC',visibility:'character',subjectCharacterId:f.pcs[1].id});
  return text;
}
test('N01 ended session pending service is empty without campaign writes',()=>nativeFixture(f=>{
  f.db.endSession(f.guild);const changes=f.db.db.prepare('SELECT total_changes() n').get().n;
  assert.deepEqual(pendingRollRequests(f.db,f.guild,f.pcs[0].owner_user_id),[]);
  assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,changes);
}));
for(const sub of ['pending','result'])test(`N02 ${sub} no-session command is explicit, read-only and early private acknowledged`,()=>nativeFixture(async f=>{
  f.db.endSession(f.guild);const i=interaction(f,'roll',sub,{request:'old-history'}),changes=f.db.db.prepare('SELECT total_changes() n').get().n;
  await handleCommand(i,{db:f.db,gm:{}});assert.deepEqual(i.events,['ack']);
  assert.match(i.sent[0].content,/No active session/);assert.doesNotMatch(i.sent[0].content,/⚠|assignment|required/);
  assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,changes);
}));
test('N03 discovery preserves complete selected facts with bounded Unicode/fenced interaction delivery and attachment',()=>nativeFixture(async f=>{
  const text=setup(f),i=interaction(f,'intel','discover'),read=f.db.getPlayer.bind(f.db);
  f.db.getPlayer=(...a)=>{assert.equal(i.events[0],'ack');return read(...a);};
  await handleCommand(i,{db:f.db,gm:{}});
  assert(i.sent.length>1);assert(i.sent.every(p=>p.content.length<=2000&&p.allowedMentions.parse.length===0));
  assert(i.sent.every(p=>p.content.isWellFormed()));assert(i.sent.at(-1).content.includes('Unknown is not disproven'));
  assert(i.sent.map(p=>p.content).join('').includes('END'));assert(!JSON.stringify(i.sent).includes('SECRET_OTHER_PC'));
  assert(i.sent[0].files?.length);assert(text.length>2000);
}));
test('N04 discovery transport uncertainty is not recorded as delivery success or a world action',()=>nativeFixture(async f=>{
  setup(f);const message={guild:{id:f.guild},author:{id:f.pcs[0].owner_user_id},content:'What do I know?'};
  const r=await discovery.routeDiscoveryMessage({db:f.db,message,detailed:true,deliver:async()=>({ok:false,certainty:'uncertain',messages:[{messageId:'part1',channelId:'dm'}]})});
  assert.equal(r.delivery_status,'uncertain');assert.equal(r.committed,false);assert.equal(r.delivery.messages.length,1);
}));
test('N05 actual message discovery uses bounded private sender, never archives query output as campaign memory',()=>nativeFixture(async f=>{
  setup(f);const sent=[],message={guild:{id:f.guild,members:{fetch:async()=>({send:async p=>{sent.push(p);return {id:`d-${sent.length}`,channelId:'dm'};}})}},
    author:{id:f.pcs[0].owner_user_id},content:'What do I know?'};
  const changes=f.db.db.prepare('SELECT total_changes() n').get().n;
  assert.equal(typeof discovery.deliverDiscoveryMessage,'function');
  const r=await discovery.routeDiscoveryMessage({db:f.db,message,detailed:true,deliver:(text,proof)=>discovery.deliverDiscoveryMessage({db:f.db,message,text,proof})});
  assert.equal(r.delivery_status,'delivered');assert(sent.length>1);assert(sent.every(p=>p.content.length<=2000&&p.content.isWellFormed()&&p.allowedMentions.parse.length===0));
  assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,changes);
}));
test('N06 partial discovery stops after control changes, retains receipt and has no public fallback',()=>nativeFixture(async f=>{
  setup(f);let sends=0;const message={guild:{id:f.guild,members:{fetch:async()=>({send:async()=>{
    sends++;f.db.setPresence(f.session.id,f.pcs[0].owner_user_id,'absent');return {id:'first',channelId:'dm'};}})}},
    author:{id:f.pcs[0].owner_user_id},content:'What do I know?',reply:()=>assert.fail('no public fallback')};
  assert.equal(typeof discovery.deliverDiscoveryMessage,'function');
  const r=await discovery.routeDiscoveryMessage({db:f.db,message,detailed:true,deliver:(text,proof)=>discovery.deliverDiscoveryMessage({db:f.db,message,text,proof})});
  assert.equal(sends,1);assert.equal(r.delivery_status,'uncertain');assert.equal(r.delivery.messages.length,1);
}));
test('N07 disabled DM is recoverable metadata only and does not become gameplay',()=>nativeFixture(async f=>{
  setup(f);const message={guild:{id:f.guild,members:{fetch:async()=>{throw Error('DM unavailable');}}},author:{id:f.pcs[0].owner_user_id},content:'What do I know?',reply:()=>assert.fail('no public fallback')};
  assert.equal(typeof discovery.deliverDiscoveryMessage,'function');const changes=f.db.db.prepare('SELECT total_changes() n').get().n;
  const r=await discovery.routeDiscoveryMessage({db:f.db,message,detailed:true,deliver:(text,proof)=>discovery.deliverDiscoveryMessage({db:f.db,message,text,proof})});
  assert.equal(r.delivery_status,'not_sent');assert.equal(r.committed,false);assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,changes);
}));
test('N08 caseboard native reply is bounded, complete and mention safe',()=>nativeFixture(async f=>{
  f.db.upsertThread(f.guild,{id:'long-thread',label:'Known case',notes:'🌧️'.repeat(1500)+' CASE_END'});
  const i=interaction(f,'intel','caseboard');await handleCommand(i,{db:f.db,gm:{}});
  assert(i.sent.length>1);assert(i.sent.every(p=>p.content.length<=2000&&p.content.isWellFormed()&&p.allowedMentions.parse.length===0));
  assert(i.sent.map(p=>p.content).join('').includes('CASE_END'));
}));
test('N09 read-only result never exposes a previous controlled character or another owner',()=>nativeFixture(async f=>{
  configureCityFlags(f.db,f.guild,{roll_requests:true},'gm');const pc=f.pcs[0];
  const source=captureDeclaration(f.db,f.guild,pc.owner_user_id,pc.id,'history','I try inspecting the terminal.');
  const q=prepareRollRequest(f.db,f.guild,{source_event:source.event_key,character_id:pc.id,trait:'Knowledge',kind:'action',modifier_keys:[],difficulty_source:'',adjudication:'Inspect.',operation:'inspect'},'gm');
  const other=f.db.createCharacter(f.guild,pc.owner_user_id,'Other PC',{});f.db.assignCharacter(f.session.id,pc.owner_user_id,other.id);
  const i=interaction(f,'roll','result',{request:q.record_key}),changes=f.db.db.prepare('SELECT total_changes() n').get().n;
  await handleCommand(i,{db:f.db,gm:{}});assert.match(i.sent[0].content,/No saved request|attendance|current owned/);
  assert(!JSON.stringify(i.sent).includes('Inspect.'));assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,changes);
}));
test('N10 native acknowledgment failure happens before any DB access or effects',()=>nativeFixture(async f=>{
  const i=interaction(f,'roll','pvp',{json:'{"op":"inbox"}'});i.deferReply=async()=>{throw Object.assign(Error('Expired'),{code:10062});};
  f.db.upsertPlayer=()=>assert.fail('no writes after failed acknowledgement');
  await assert.rejects(()=>handleCommand(i,{db:f.db,gm:{}}),e=>e.code===10062);assert.deepEqual(i.sent,[]);
}));
test('N11 read-only discovery cannot resume pending delivery or mutate an unrelated action',()=>nativeFixture(async f=>{
  setup(f);const i=interaction(f,'intel','discover');
  f.db.pendingContinuationTurns=()=>assert.fail('read-only query must not resume an unrelated turn');
  await handleCommand(i,{db:f.db,gm:{}});assert(i.sent.length>1);
}));
test('N12 changed selected evidence stops later discovery chunks with no fallback',()=>nativeFixture(async f=>{
  setup(f);let n=0;const message={guild:{id:f.guild,members:{fetch:async()=>({send:async()=>{
    n++;f.db.addFact(f.guild,{key:'long-visible',content:'Updated authorized evidence.',visibility:'character',subjectCharacterId:f.pcs[0].id});
    return {id:'first',channelId:'dm'};}})}},author:{id:f.pcs[0].owner_user_id},content:'What do I know?'};
  const r=await discovery.routeDiscoveryMessage({db:f.db,message,detailed:true,deliver:(text,proof)=>discovery.deliverDiscoveryMessage({db:f.db,message,text,proof})});
  assert.equal(n,1);assert.equal(r.delivery_status,'uncertain');assert.equal(r.delivery.messages.length,1);
}));
test('N13 explicitly selected current proxy discovery retains role scope, never owner-private knowledge',()=>nativeFixture(async f=>{
  setup(f);const pc=f.pcs[1];f.db.assignCharacter(f.session.id,pc.owner_user_id,pc.id,{controlPolicy:'proxy',proxyUserId:f.pcs[0].owner_user_id});
  const i=interaction(f,'intel','discover',{json:JSON.stringify({character_id:pc.id})});
  await handleCommand(i,{db:f.db,gm:{}});
  assert.match(i.sent[0].content,/no matching knowledge|recorded knowledge/i);assert(!JSON.stringify(i.sent).includes('SECRET_OTHER_PC'));
  assert(i.sent[0].files?.length,'scoped proxy packet remains accessible');
}));
