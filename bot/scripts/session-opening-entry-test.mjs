/** Native attendance opportunities, owner-private source projection and real outbox/restart boundaries. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {prepareOpeningEntryOpportunity,registerOpeningAttendance} from '../src/session-opening-attendance.js';
import {deliverOpeningEntry} from '../src/opening-entry.js';
import {prepareOpeningEntryOutput} from '../src/pvp-output.js';
import {queueTurnPublications,deliverTurnOutbox} from '../src/publication-outbox.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {scenePresence} from '../src/scene-continuity.js';
import {configureCityFlags} from '../src/city-core.js';
import {configureSimulationEntity} from '../src/simulation.js';

function setup(f){
  const sent={party:[],private:[]};let n=0;
  f.db.db.prepare('UPDATE campaigns SET play_channel_id=? WHERE guild_id=?').run('entry-play',f.guild);
  const guild={id:f.guild,channels:{fetch:async id=>id==='entry-play'?{id,isTextBased:()=>true,send:async body=>{
    sent.party.push(body.content||body);return {id:`public-${++n}`,channelId:id};}}:null},
    members:{fetch:async user=>({send:async body=>{sent.private.push({user,text:body.content||body});return {id:`private-${++n}`,channelId:`dm-${user}`};}})}};
  const interaction=(sub,user='operator',name=null)=>{const replies=[];return {id:`entry-${++n}`,guildId:f.guild,guild,user:{id:user,username:user},
    commandName:'vc-session',memberPermissions:{has:()=>user==='operator'},member:{roles:{cache:new Map()}},
    isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommand:()=>sub,getSubcommandGroup:()=>null,getString:k=>k==='character'?name:null,getBoolean:()=>null,getInteger:()=>null,getUser:()=>null},
    reply:async body=>replies.push(body),deferReply:async()=>{},editReply:async body=>replies.push(body),followUp:async body=>replies.push(body),replies};};
  const gm={planAssembly:async()=>({public_opening:'Raw proposal only.',public_parts:[],character_entries:[],convergence_goal:'Independent opportunities.',bonds:[],gm_notes:''}),
    planArrival:async()=>{throw Error('Legacy freeform arrival must not be called.');}};
  return {guild,sent,interaction,gm};
}

test('O4 late present privately delivers its own sourced opening through native outbox without changing the shared opening',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=['An unpaid telemetry invoice offers a personal lead.'];});
  f.db.endSession(f.guild,'');await handleCommand(x.interaction('start'),{db:f.db,gm:x.gm});
  assert.equal(x.sent.party.length,1);assert.equal(x.sent.private.length,0);
  const before=f.db.getCharacter(pc.id).data;
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,1,'Late attendance needs a native private opportunity, not just a presence acknowledgement.');
  assert.equal(x.sent.private[0].user,pc.owner_user_id);assert.match(x.sent.private[0].text,/unpaid telemetry invoice/);
  assert.equal(x.sent.party.length,1);assert.deepEqual(f.db.getCharacter(pc.id).data,before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,0);
  f.restart();await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,1);assert.equal(x.sent.party.length,1);
}));

test('O4 independent private entry sources never cross owners or disclose imported GM mysteries',()=>nativeFixture(async f=>{
  const x=setup(f);for(const [n,pc] of f.pcs.slice(0,2).entries()){
    f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=[`OWNER-THREAD-${n}`];});
    f.db.importCharacterGmHooks(f.guild,pc,{hooks:[{key:`mystery-${n}`,premise:`GM-MYSTERY-${n}`,permission:'open_question'}]});
    f.db.upsertCharacterNarrative(f.guild,pc.id,'gm_private',`# Private\nGM-NARRATIVE-${n}`);
    f.db.upsertCharacterNarrative(f.guild,pc.id,'player',`# Background\nPLAYER-NARRATIVE-${n}`);
  }
  f.db.endSession(f.guild,'');await handleCommand(x.interaction('start'),{db:f.db,gm:x.gm});
  for(const pc of f.pcs.slice(0,2))assert.equal(await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm}),true);
  for(const [n,pc] of f.pcs.slice(0,2).entries()){
    const text=x.sent.private.find(p=>p.user===pc.owner_user_id)?.text;assert(text);assert(text.includes(`OWNER-THREAD-${n}`));
    assert(!text.includes(`OWNER-THREAD-${1-n}`));assert(!text.includes('GM-MYSTERY'));assert(!text.includes('GM-NARRATIVE'));
  }
  assert.equal(x.sent.party.length,1);assert(!JSON.stringify(x.sent.party).includes('OWNER-THREAD'));
}));

test('O4 missing entitled material is accurately labelled fallback; manual mode never auto-delivers an entry',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0];assert.equal(await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm}),true);
  assert.equal(x.sent.private.length,1);assert.match(x.sent.private[0].text,/not a delivered character hook/);
  const row=f.db.listCityRecords(f.guild,{kind:'opening_entry_delivery',includeGM:true})[0];assert.equal(row.data.evidence.hook_verified,false);
  assert.equal(row.data.evidence.fallback,true);
  f.db.endSession(f.guild,'');f.db.startSession(f.guild,'Manual','manual');
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});assert.equal(x.sent.private.length,1);
}));

test('O4 real arrive keeps native owner arrival but replaces legacy unverified public-entry prose with private source delivery',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0],before=f.db.getCharacter(pc.id).data;
  configureCityFlags(f.db,f.guild,{scene_continuity:true});
  configureSimulationEntity(f.db,f.guild,'location','terminal',{location_key:'terminal',district_key:'station'});
  assert.equal(await handleCommand(x.interaction('arrive',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm}),true);
  assert.equal(x.sent.private.length,1);assert.equal(x.sent.party.length,0);assert.deepEqual(f.db.getCharacter(pc.id).data,before);
  assert.equal(scenePresence(f.db,f.guild,'character',pc.id)?.data.state,'actually_present');
}));

test('O4 duplicate presents and absent/rejoin reuse an acknowledged identical thread, without resetting position',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=['A retained personal thread.'];});
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  const revision=f.db.activeAssignment(f.session.id,pc.owner_user_id).control_revision;
  await Promise.all([handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm}),handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm})]);
  assert.equal(x.sent.private.length,1);assert.equal(f.db.activeAssignment(f.session.id,pc.owner_user_id).control_revision,revision);
  const absent=x.interaction('absent',pc.owner_user_id);absent.options.getString=k=>k==='mode'?'offscreen':null;
  await handleCommand(absent,{db:f.db,gm:x.gm});
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,1);assert(f.db.listCityRecords(f.guild,{kind:'opening_entry_delivery',includeGM:true}).some(r=>r.status==='retained_acknowledgement'));
  assert.equal(f.db.getCharacter(pc.id).data.location,'terminal');
}));

test('O4 unknown private acknowledgement never retries on repeated present or restart; another owner stays responsive',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0],members=x.guild.members.fetch;let attempts=0;
  x.guild.members.fetch=async user=>user===pc.owner_user_id?{send:async()=>{attempts++;throw Error('Lost acknowledgement');}}:members(user);
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});f.restart();
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  await handleCommand(x.interaction('present',f.pcs[1].owner_user_id,f.pcs[1].name),{db:f.db,gm:x.gm});
  assert.equal(attempts,1);assert.equal(x.sent.private.length,1);assert.equal(x.sent.private[0].user,f.pcs[1].owner_user_id);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'opening_entry_delivery',actor:pc.id,includeGM:true})[0].status,'uncertain');
}));

for(const change of ['owner','proxy','absence','source','hook','audience'])test(`O4 real deferred entry outbox rejects stale ${change} after restart`,()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0],entry=prepareOpeningEntryOpportunity(f.db,f.guild,pc.owner_user_id,pc.id,`deferred-${change}`),
    scope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id},result=prepareOpeningEntryOutput(f.db,f.guild,entry.record_key,scope),
    turn=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:`deferred-entry-${change}`,actorPrincipal:pc.owner_user_id,audience:'private'});
  const rows=queueTurnPublications(f.db,{guild:x.guild,session:f.session,result,scope,turnId:turn.turn_id});
  if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run('other-owner',pc.id);
  if(change==='proxy')f.db.assignCharacter(f.session.id,pc.owner_user_id,pc.id,{controlPolicy:'proxy',proxyUserId:f.pcs[1].owner_user_id});
  if(change==='absence')f.db.setPresence(f.session.id,pc.owner_user_id,'absent');
  if(change==='source')indexWorldEvent(f.db,f.guild,{key:entry.source_event,status:'retracted'});
  if(change==='hook')f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=['Changed source'];});
  if(change==='audience')f.db.db.prepare('UPDATE publication_outbox SET target_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,rows[0].id);
  f.restart();let sends=0;await deliverTurnOutbox(f.db,f.guild,turn.turn_id,async()=>{sends++;return {messageId:'bad',channelId:'bad'};});
  assert.equal(sends,0);assert(f.db.listTurnPublications(f.guild,turn.turn_id).every(r=>r.status!=='delivered'));
}));

test('O4 duplicate check-in retains an actual initial assembly acknowledgement rather than sending a second opening',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=['A lead already delivered at session start.'];});f.db.endSession(f.guild,'');
  registerOpeningAttendance(f.db,f.guild,pc.owner_user_id,'prestart-entry',pc.name);
  x.gm.planAssembly=async()=>({public_opening:'GM proposal.',public_parts:[],convergence_goal:'Independent thread.',bonds:[],gm_notes:'',
    character_entries:[{discord_user_id:pc.owner_user_id,character_name:pc.name,private_hook:'Proposal only.',private_parts:[],public_cue:'',stay_reason:''}]});
  await handleCommand(x.interaction('start'),{db:f.db,gm:x.gm});assert.equal(x.sent.private.length,1);
  const prior=f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true}).find(r=>r.data.scope.mode==='private');assert(prior);
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,1);assert.equal(x.sent.party.length,1);
  const retained=f.db.listCityRecords(f.guild,{kind:'opening_entry_delivery',includeGM:true})[0];
  assert.equal(retained.status,'retained_acknowledgement');assert.equal(retained.data.turn_id,prior.data.turn_id);
}));

for(const kind of ['select','claim'])test(`O4 real owner ${kind} produces a source-verified private entry, not a raw public arrival`,()=>nativeFixture(async f=>{
  const x=setup(f),user=f.pcs[0].owner_user_id,pc=f.db.createCharacter(f.guild,user,`${kind} character`,{entry_hooks:[`${kind.toUpperCase()}-OWNER-THREAD`]},
    {guest:kind==='claim'});f.db.updateCharacterData(pc.id,d=>{d.location='terminal';});f.db.setAssemblyPhase(f.session.id,'party');
  const i=x.interaction(kind,user,pc.name);i.commandName=kind==='select'?'vc-character':'vc-guest';
  assert.equal(await handleCommand(i,{db:f.db,gm:x.gm}),true);assert.equal(x.sent.party.length,0);assert.equal(x.sent.private.length,1);
  assert.match(x.sent.private[0].text,new RegExp(`${kind.toUpperCase()}-OWNER-THREAD`));
  const opportunity=f.db.listCityRecords(f.guild,{kind:'opening_entry_opportunity',includeGM:true})[0],event=f.db.getWorldEvent(f.guild,opportunity.source_event),
    mutation=f.db.getMutation(f.guild,event.source_id);
  assert.equal(mutation.actor_type,'player');assert.equal(mutation.actor_id,user);assert.equal(mutation.source_interaction_id,i.id);
  assert.equal(f.db.getCharacter(pc.id).data.location,'terminal');assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,0);
}));

test('O4 source revocation during real recipient fetch blocks transport without disclosing the old hook',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0],entry=prepareOpeningEntryOpportunity(f.db,f.guild,pc.owner_user_id,pc.id,'toctou-entry');let sends=0;
  x.guild.members.fetch=async()=>{indexWorldEvent(f.db,f.guild,{key:entry.source_event,status:'retracted'});return {send:async()=>{sends++;return {id:'bad',channelId:'bad'};}};};
  const result=await deliverOpeningEntry({db:f.db,guild:x.guild,key:entry.record_key});assert.equal(sends,0);assert.notEqual(result.status,'delivered');
}));
