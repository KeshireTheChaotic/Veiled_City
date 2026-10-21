/** Native attendance opportunities, owner-private source projection and real outbox/restart boundaries. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {prepareOpeningEntryOpportunity,registerOpeningAttendance} from '../src/session-opening-attendance.js';
import {deliverOpeningEntry} from '../src/opening-entry.js';
import {prepareOpeningEntryOutput} from '../src/pvp-output.js';
import {queueTurnPublications,deliverTurnOutbox,reconcilePublication} from '../src/publication-outbox.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {scenePresence} from '../src/scene-continuity.js';
import {configureCityFlags} from '../src/city-core.js';
import {configureSimulationEntity} from '../src/simulation.js';
import {operationalReport} from '../src/operations/health.js';
import {withOpeningWriter} from './opening-writer-fixture.mjs';

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
  const gm=withOpeningWriter(f,{planAssembly:async()=>({public_opening:'Raw proposal only.',public_parts:[],character_entries:[],convergence_goal:'Independent opportunities.',bonds:[],gm_notes:''}),
    planArrival:async()=>{throw Error('Legacy freeform arrival must not be called.');}});
  return {guild,sent,interaction,gm};
}

test('transport acknowledgements for orientation alone never complete the native opening job',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0];f.db.endSession(f.guild,'');
  registerOpeningAttendance(f.db,f.guild,pc.owner_user_id,'orientation-checkin',pc.name);
  delete x.gm.authorAssemblyScene;
  x.gm.planAssembly=async()=>({public_opening:'Unverified proposal.',public_parts:[],convergence_goal:'Independent opportunities.',bonds:[],gm_notes:'',
    character_entries:[{discord_user_id:pc.owner_user_id,character_id:pc.id,character_name:pc.name,private_hook:'Unverified secret.',private_parts:[],public_cue:'',stay_reason:''}]});
  await handleCommand(x.interaction('start'),{db:f.db,gm:x.gm});
  const session=f.db.getActiveSession(f.guild),job=f.db.getCityRecord(f.guild,'session_opening_job',session.id);
  assert.equal(job.status,'needs_narrative_review');assert(job.data.slots.every(s=>s.narrative_status==='FALLBACK_DELIVERED'));
  const count=x.sent.private.length;f.restart();await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,count,'Explicit narrative review is required; attendance must not resend acknowledged orientation.');
}));

test('O4 late present privately delivers its own sourced opening through native outbox without changing the shared opening',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=['An unpaid telemetry invoice offers a personal lead.'];});
  f.db.endSession(f.guild,'');await handleCommand(x.interaction('start'),{db:f.db,gm:x.gm});
  assert.equal(x.sent.party.length,1);assert.equal(x.sent.private.length,0);
  const before=f.db.getCharacter(pc.id).data;
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,1,'Late attendance needs a native private opportunity, not just a presence acknowledgement.');
  assert.equal(x.sent.private[0].user,pc.owner_user_id);assert.match(x.sent.private[0].text,/maintenance listing/);
  assert(!x.sent.private[0].text.includes('An unpaid telemetry invoice'));
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
    const text=x.sent.private.find(p=>p.user===pc.owner_user_id)?.text;assert(text);assert(text.includes('service window'));
    assert(!text.includes(`OWNER-THREAD-${n}`),'The writer does not recite the source.');
    assert(!text.includes(`OWNER-THREAD-${1-n}`));assert(!text.includes('GM-MYSTERY'));assert(!text.includes('GM-NARRATIVE'));
  }
  assert.equal(x.sent.party.length,1);assert(!JSON.stringify(x.sent.party).includes('OWNER-THREAD'));
}));

test('O4 missing personal material still permits verified ordinary circumstances; manual mode never auto-delivers an entry',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0];assert.equal(await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm}),true);
  assert.equal(x.sent.private.length,1);assert.match(x.sent.private[0].text,/service window/);
  const row=f.db.listCityRecords(f.guild,{kind:'opening_entry_delivery',includeGM:true})[0];assert.equal(row.data.evidence.hook_verified,false);
  assert.equal(row.data.evidence.fallback,false);assert.equal(row.data.evidence.narrative_verified,true);
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
  assert.equal(attempts,1);assert.equal(x.sent.private.length,1,JSON.stringify(f.db.listCityRecords(f.guild,{kind:'opening_entry_delivery',includeGM:true})));assert.equal(x.sent.private[0].user,f.pcs[1].owner_user_id);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'opening_entry_delivery',actor:pc.id,includeGM:true})[0].status,'uncertain');
}));

for(const change of ['owner','proxy','absence','source','hook','audience'])test(`O4 real deferred entry outbox rejects stale ${change} after restart`,()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0],entry=prepareOpeningEntryOpportunity(f.db,f.guild,pc.owner_user_id,pc.id,`deferred-${change}`),
    scope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  await x.gm.authorOpeningEntry(f.guild,entry.record_key,scope);
  const result=prepareOpeningEntryOutput(f.db,f.guild,entry.record_key,scope),
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
  const x=setup(f),pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=['A lead already delivered at session start.','An independent second source need not trigger duplicate entry.'];});f.db.endSession(f.guild,'');
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
  assert.match(x.sent.private[0].text,/service window/);assert(!x.sent.private[0].text.includes(`${kind.toUpperCase()}-OWNER-THREAD`));
  const opportunity=f.db.listCityRecords(f.guild,{kind:'opening_entry_opportunity',includeGM:true})[0],event=f.db.getWorldEvent(f.guild,opportunity.source_event),
    mutation=f.db.getMutation(f.guild,event.source_id);
  assert.equal(mutation.actor_type,'player');assert.equal(mutation.actor_id,user);assert.equal(mutation.source_interaction_id,i.id);
  assert.equal(f.db.getCharacter(pc.id).data.location,'terminal');assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,0);
}));

test('O4 source revocation during real recipient fetch blocks transport without disclosing the old hook',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0],entry=prepareOpeningEntryOpportunity(f.db,f.guild,pc.owner_user_id,pc.id,'toctou-entry');let sends=0;
  x.guild.members.fetch=async()=>{indexWorldEvent(f.db,f.guild,{key:entry.source_event,status:'retracted'});return {send:async()=>{sends++;return {id:'bad',channelId:'bad'};}};};
  const result=await deliverOpeningEntry({db:f.db,guild:x.guild,key:entry.record_key,gm:x.gm});assert.equal(sends,0);assert.notEqual(result.status,'delivered');
}));

test('O5 native opening and entry incidents appear in GM-only operational reports without private text or recovery side effects',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0];f.db.endSession(f.guild,'');
  await handleCommand(x.interaction('start'),{db:f.db,gm:{planAssembly:async()=>{throw Error('PRIVATE-PLANNER-CONTENT');}}});
  f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=['PRIVATE-CHARACTER-THREAD'];});
  x.guild.members.fetch=async()=>({send:async()=>{throw Error('uncertain transport');}});
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  const before=f.db.db.prepare('SELECT total_changes() n').get().n,report=operationalReport(f.db,f.guild,{authorized:true});
  assert(report.native.counts.some(r=>r.kind==='session_opening_job'&&r.status==='needs_review'&&r.count===1),'Opening failures must not disappear from operational health.');
  assert(report.native.counts.some(r=>r.kind==='opening_entry_delivery'&&r.status==='uncertain'&&r.count===1));
  assert(report.incidents.some(r=>r.kind==='opening_entry_delivery'&&r.status==='uncertain'&&/never.*retry|never.*resend/i.test(r.recovery)));
  assert(!JSON.stringify(report).includes('PRIVATE-'));assert(!JSON.stringify(report).includes(pc.id));assert(!JSON.stringify(report).includes(pc.owner_user_id));
  const ops=x.interaction('ops');ops.commandName='vc-admin';
  assert.equal(await handleCommand(ops,{db:f.db,gm:{runTurn:()=>{throw Error('No model execution allowed.');}}}),true);
  assert(ops.replies.some(r=>r.files?.length));assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,before);
  const denied=x.interaction('ops',pc.owner_user_id);denied.commandName='vc-admin';
  await assert.rejects(()=>handleCommand(denied,{db:f.db,gm:{}}),/GM|permission/);
}));

test('O5 completed, retained and manual opening records remain counted without becoming pending incidents',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0];f.db.endSession(f.guild,'');
  await handleCommand(x.interaction('start'),{db:f.db,gm:x.gm});
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  const absent=x.interaction('absent',pc.owner_user_id);absent.options.getString=k=>k==='mode'?'offscreen':null;
  await handleCommand(absent,{db:f.db,gm:x.gm});
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  f.db.endSession(f.guild,'');
  const manual=x.interaction('start');manual.options.getString=k=>k==='assembly'?'manual':null;
  await handleCommand(manual,{db:f.db,gm:x.gm});
  const before=f.db.db.prepare('SELECT total_changes() n').get().n,report=operationalReport(f.db,f.guild,{authorized:true});
  for(const [kind,status] of [['session_opening_job','completed'],['session_opening_job','held_manual'],['opening_entry_delivery','retained_acknowledgement']]){
    assert(report.native.counts.some(r=>r.kind===kind&&r.status===status&&r.count>=1),`${kind}/${status} must stay identifiable.`);
    assert(!report.incidents.some(r=>r.kind===kind&&r.status===status),`${kind}/${status} is not a pending recovery.`);
  }
  assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,before);
}));

test('O5 four owners retain uncertain initial delivery across duplicate attendance, late entry and restart/rejoin without freezing siblings',()=>nativeFixture(async f=>{
  const x=setup(f),[uncertain,returning,steady,late]=f.pcs,resources=f.pcs.map(pc=>structuredClone(pc.data.resources));
  for(const [n,pc] of f.pcs.entries())f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=[`OWNER-${n}-PRIVATE-THREAD`];});
  f.db.endSession(f.guild,'');
  for(const pc of f.pcs.slice(0,3))registerOpeningAttendance(f.db,f.guild,pc.owner_user_id,`o5-register-${pc.name}`,pc.name);
  x.gm.planAssembly=async()=>({public_opening:'Proposal only.',public_parts:[],bonds:[],gm_notes:'PRIVATE-GM-PREMISE',convergence_goal:'Independent openings.',
    character_entries:f.db.roster(f.db.getActiveSession(f.guild).id).filter(r=>r.character_id&&r.presence==='present').map(r=>({
      discord_user_id:r.discord_user_id,character_id:r.character_id,character_name:r.name,private_hook:'Proposal only.',private_parts:[],public_cue:'',stay_reason:''}))});
  const members=x.guild.members.fetch;let unknownAttempts=0;
  x.guild.members.fetch=async user=>user===uncertain.owner_user_id?{send:async()=>{unknownAttempts++;throw Error('Lost initial acknowledgement');}}:members(user);
  await handleCommand(x.interaction('start'),{db:f.db,gm:x.gm});
  const session=f.db.getActiveSession(f.guild),initial=f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true})
    .find(r=>r.data.scope?.actorCharacterId===uncertain.id),original=f.db.listTurnPublications(f.guild,initial.data.turn_id);
  assert.equal(original.length,1);assert.equal(original[0].status,'uncertain');assert.equal(unknownAttempts,1);
  assert.equal(x.sent.private.length,2);assert.equal(x.sent.party.length,1);
  await Promise.all([handleCommand(x.interaction('present',uncertain.owner_user_id,uncertain.name),{db:f.db,gm:x.gm}),
    handleCommand(x.interaction('present',uncertain.owner_user_id,uncertain.name),{db:f.db,gm:x.gm})]);
  assert.equal(unknownAttempts,1,'A new entry route cannot resend an initial opening whose acknowledgement is unknown.');
  const accepted=f.accepted(1,'I ask about my own invoice.',steady.id),revision=f.db.activeAssignment(session.id,returning.owner_user_id).control_revision;
  const leave=x.interaction('leave',returning.owner_user_id);leave.options.getString=k=>k==='mode'?'offscreen':null;
  await handleCommand(leave,{db:f.db,gm:x.gm});f.restart();
  await handleCommand(x.interaction('present',returning.owner_user_id,returning.name),{db:f.db,gm:x.gm});
  const returningInitial=f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true}).find(r=>r.data.scope?.actorCharacterId===returning.id);
  assert.notEqual(f.db.activeAssignment(session.id,returning.owner_user_id).control_revision,revision);
  assert.equal(returningInitial.data.evidence.narrative_verified,true);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'opening_entry_delivery',actor:returning.id,includeGM:true})[0].status,'retained_acknowledgement');
  await handleCommand(x.interaction('present',late.owner_user_id,late.name),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,3,JSON.stringify(f.db.listCityRecords(f.guild,{kind:'opening_entry_delivery',includeGM:true})
    .map(r=>({actor:r.actor_key,status:r.status,refs:r.data.evidence?.source_refs,hold:r.data.hold_code}))));assert.equal(x.sent.private.at(-1).user,late.owner_user_id);
  assert.match(x.sent.private.at(-1).text,/service window/);assert(!x.sent.private.at(-1).text.includes('OWNER-0-'));
  assert.notEqual(f.db.activeAssignment(session.id,returning.owner_user_id).control_revision,revision);
  assert.deepEqual(f.db.getCityRecord(f.guild,'typed_intent',accepted.record_key),accepted);
  const absent=x.interaction('absent',uncertain.owner_user_id);absent.options.getString=k=>k==='mode'?'offscreen':null;
  await handleCommand(absent,{db:f.db,gm:x.gm});f.restart();
  await handleCommand(x.interaction('present',uncertain.owner_user_id,uncertain.name),{db:f.db,gm:x.gm});
  assert.equal(unknownAttempts,1);assert.equal(x.sent.party.length,1);
  assert.deepEqual(f.db.listTurnPublications(f.guild,initial.data.turn_id),original);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),resources);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,0);
  assert.notEqual(f.db.getPartyState(f.guild).established,true);
  assert(!JSON.stringify(x.sent).includes('PRIVATE-GM-PREMISE'));
}));

test('O5 a new principal and changed hook cannot bypass an uncertain earlier private entry after restart',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0];let attempts=0;
  x.guild.members.fetch=async()=>({send:async()=>{attempts++;throw Error('Unknown acknowledgement');}});
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  const original=f.db.listCityRecords(f.guild,{kind:'opening_entry_delivery',includeGM:true})[0],parts=f.db.listTurnPublications(f.guild,original.data.turn_id);
  const absent=x.interaction('absent',pc.owner_user_id);absent.options.getString=k=>k==='mode'?'offscreen':null;
  await handleCommand(absent,{db:f.db,gm:x.gm});f.restart();
  f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=['A newly imported hook is not resend authorization.'];});
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  assert.equal(attempts,1);assert.deepEqual(f.db.listTurnPublications(f.guild,original.data.turn_id),parts);
  const held=f.db.listCityRecords(f.guild,{kind:'opening_entry_delivery',includeGM:true}).find(r=>r.record_key!==original.record_key);
  assert.equal(held.status,'needs_review');assert.equal(held.data.held_turn_id,original.data.turn_id);assert(!held.data.turn_id);
}));

test('O5 exact native delivered reconciliation releases the hold as retained acknowledgement without another send',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0];let attempts=0;
  f.db.endSession(f.guild,'');registerOpeningAttendance(f.db,f.guild,pc.owner_user_id,'o5-reconcile-register',pc.name);
  x.gm.planAssembly=async()=>({public_opening:'Private proposal.',public_parts:[],bonds:[],gm_notes:'',convergence_goal:'Independent thread.',
    character_entries:[{discord_user_id:pc.owner_user_id,character_id:pc.id,character_name:pc.name,private_hook:'Proposal only.',private_parts:[]}]});
  x.guild.members.fetch=async()=>({send:async()=>{attempts++;throw Error('Unknown acknowledgement');}});
  await handleCommand(x.interaction('start'),{db:f.db,gm:x.gm});
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});assert.equal(attempts,1);
  const initial=f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true}).find(r=>r.data.scope.mode==='private'),
    publication=f.db.listTurnPublications(f.guild,initial.data.turn_id)[0];
  await reconcilePublication(f.db,f.guild,publication.id,{actor:'operator',gm:true,decision:'delivered',reason:'Exact synthetic Discord receipt verified.',
    message:{id:'verified-original',channelId:`dm-${pc.owner_user_id}`,author:{bot:true,id:'offline-bot'},verifiedBotId:'offline-bot',
      verifiedRecipient:pc.owner_user_id,content:publication.payload}});
  f.restart();await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  assert.equal(attempts,1);assert.equal(f.db.listCityRecords(f.guild,{kind:'opening_entry_delivery',includeGM:true})[0].status,'retained_acknowledgement');
  assert.equal(f.db.listTurnPublications(f.guild,initial.data.turn_id)[0].discord_message_id,'verified-original');
}));

test('O5 owner entry does not race a still-planning initial opening into two private messages',()=>nativeFixture(async f=>{
  const x=setup(f),pc=f.pcs[0];f.db.endSession(f.guild,'');
  registerOpeningAttendance(f.db,f.guild,pc.owner_user_id,'o5-planning-register',pc.name);
  let release,entered;const wait=new Promise(r=>{release=r;}),ready=new Promise(r=>{entered=r;});
  x.gm.planAssembly=async()=>{entered();await wait;return {public_opening:'Proposal only.',public_parts:[],bonds:[],gm_notes:'',convergence_goal:'Independent thread.',
    character_entries:[{discord_user_id:pc.owner_user_id,character_id:pc.id,character_name:pc.name,private_hook:'Proposal only.',private_parts:[]}]};};
  const started=handleCommand(x.interaction('start'),{db:f.db,gm:x.gm});
  try{
    await ready;await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
    assert.equal(x.sent.private.length,0,'The already scheduled owner slot must not have a competing entry send.');
  }finally{release();await started;}
  assert.equal(x.sent.private.length,1);f.restart();
  await handleCommand(x.interaction('present',pc.owner_user_id,pc.name),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,1);
}));
