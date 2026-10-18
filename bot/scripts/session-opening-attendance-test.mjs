import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {configureCityFlags} from '../src/city-core.js';
import {configureSimulationEntity} from '../src/simulation.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {registerOpeningAttendance,carryOpeningAttendance,inspectOpeningEntryOpportunity} from '../src/session-opening-attendance.js';
import {consentAction} from '../src/action-consent.js';

function interaction(sub,user,character=null,gm=false,id='attendance'){
  const replies=[];
  return {id,guildId:'v9-synthetic',guild:{id:'v9-synthetic',channels:{fetch:async()=>null},members:{fetch:async recipient=>({
    send:async()=>({id:`attendance-ack-${id}-${recipient}`,channelId:`dm-${recipient}`})})}},commandName:'vc-session',user:{id:user,username:user},memberPermissions:{has:()=>gm},member:{roles:{cache:new Map()}},
    isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommand:()=>sub,getSubcommandGroup:()=>null,getString:key=>key==='character'?character:key==='assembly'?'manual':null,
      getBoolean:()=>null,getInteger:()=>null,getUser:()=>null,getChannel:()=>null},
    reply:async payload=>replies.push(payload),deferReply:async()=>{},editReply:async payload=>replies.push(payload),replies};
}

test('pre-start present registers source-bound attendance and start carries it without arrival or movement',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');
  const pc=f.pcs[0],before=structuredClone(pc);
  const checked=interaction('present',pc.owner_user_id,pc.name,false,'checkin-1');await handleCommand(checked,{db:f.db,gm:{}});
  const registration=f.db.getCityRecord(f.guild,'opening_attendance_registration',`2:${pc.owner_user_id}`);
  assert.equal(registration?.status,'registered',JSON.stringify(checked.replies));
  assert.equal(f.db.getActiveSession(f.guild),undefined);
  await handleCommand(interaction('start','gm',null,true,'start-1'),{db:f.db,gm:{}});
  const active=f.db.getActiveSession(f.guild),roster=f.db.roster(active.id).find(r=>r.discord_user_id===pc.owner_user_id);
  assert.equal(roster.presence,'present');assert.equal(roster.character_id,pc.id);
  assert.equal(f.db.getCityRecord(f.guild,'opening_attendance_registration',registration.record_key).status,'carried');
  const after=f.db.getCharacter(pc.id);
  assert.deepEqual(after.data,before.data);assert.equal(after.data.location,'terminal');
  assert.equal(f.db.cityRecordsBySource(f.guild,`arrival:${pc.id}`).length,0);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.kind==='arrival'&&e.details.entity_key===pc.id).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).some(r=>r.actor_key===`character:${pc.id}`),false);
}));

test('duplicate registration is idempotent; unrelated owners remain absent and no attendance means no arrival',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const pc=f.pcs[0],other=f.pcs[1];
  await handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'checkin-a'),{db:f.db,gm:{}});
  await handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'checkin-b'),{db:f.db,gm:{}});
  await handleCommand(interaction('start','gm',null,true,'start-b'),{db:f.db,gm:{}});
  const s=f.db.getActiveSession(f.guild);
  assert.equal(f.db.roster(s.id).find(r=>r.discord_user_id===pc.owner_user_id).presence,'present');
  assert.equal(f.db.roster(s.id).find(r=>r.discord_user_id===other.owner_user_id).presence,'absent');
  assert.equal(f.db.activeAssignment(s.id,other.owner_user_id),null);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).some(r=>r.actor_key===`character:${pc.id}`),false);
}));

test('active-session present changes attendance only; fictional entry remains on /arrive',()=>nativeFixture(async f=>{
  const pc=f.pcs[0],session=f.session;
  configureCityFlags(f.db,f.guild,{scene_continuity:true});
  configureSimulationEntity(f.db,f.guild,'location','terminal',{location_key:'terminal',district_key:'station'});
  const before=f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length;
  await handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'active-checkin'),{db:f.db,gm:{}});
  assert.equal(f.db.roster(session.id).find(r=>r.discord_user_id===pc.owner_user_id).presence,'present');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,before);
  assert.equal(f.db.getCharacter(pc.id).data.location,'terminal');
  await handleCommand(interaction('arrive',pc.owner_user_id,pc.name,false,'active-arrival'),{db:f.db,gm:{}});
  assert.ok(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length>before);
}));

test('duplicate active presents preserve the actual owner control revision and independent pending source',()=>nativeFixture(async f=>{
  const pc=f.pcs[0],pending=f.accepted(),before=f.db.activeAssignment(f.session.id,pc.owner_user_id);
  assert.doesNotThrow(()=>consentAction(f.db,f.guild,pending.record_key));
  await handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'active-duplicate-one'),{db:f.db,gm:{}});
  await handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'active-duplicate-two'),{db:f.db,gm:{}});
  assert.equal(f.db.activeAssignment(f.session.id,pc.owner_user_id).control_revision,before.control_revision);
  assert.doesNotThrow(()=>consentAction(f.db,f.guild,pending.record_key));
  assert.equal(f.db.getCityRecord(f.guild,'typed_intent',pending.record_key).status,'accepted_for_adjudication');
}));

test('present in an established party prepares a native entry opportunity without calling the legacy arrival model',()=>nativeFixture(async f=>{
  const pc=f.pcs[0];f.db.setAssemblyPhase(f.session.id,'party');let calls=0;
  const i=interaction('present',pc.owner_user_id,pc.name,false,'party-present');i.guild={id:f.guild};
  await handleCommand(i,{db:f.db,gm:{planArrival:async()=>{calls++;return {};}}});
  assert.equal(calls,0);
  const rows=f.db.listCityRecords(f.guild,{kind:'opening_entry_opportunity',includeGM:true});
  assert.equal(rows.length,1);assert.equal(rows[0].status,'pending');
  assert.equal(rows[0].data.execution_authority,false);assert.equal(rows[0].data.publication_authority,false);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,0);
}));

test('entry opportunity survives restart but revalidates owner/source/audience and never requeues uncertain output',()=>nativeFixture(async f=>{
  const pc=f.pcs[0];await handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'entry-proof-one'),{db:f.db,gm:{}});
  const row=f.db.listCityRecords(f.guild,{kind:'opening_entry_opportunity',includeGM:true})[0];
  assert.equal(inspectOpeningEntryOpportunity(f.db,f.guild,row.record_key).status,'pending');f.restart();
  f.db.saveCityRecord(f.guild,{...row,key:row.record_key,status:'uncertain'});
  await handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'entry-proof-two'),{db:f.db,gm:{}});
  assert.equal(inspectOpeningEntryOpportunity(f.db,f.guild,row.record_key).status,'uncertain');
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.kind==='native_opening_entry_opportunity').length,1);
  f.db.saveCityRecord(f.guild,{...row,key:row.record_key,visibility:'party'});
  assert.throws(()=>inspectOpeningEntryOpportunity(f.db,f.guild,row.record_key));
  f.db.saveCityRecord(f.guild,{...row,key:row.record_key,status:'uncertain'});
  indexWorldEvent(f.db,f.guild,{key:row.source_event,status:'retracted'});
  assert.throws(()=>inspectOpeningEntryOpportunity(f.db,f.guild,row.record_key));
  const other=f.pcs[1];await handleCommand(interaction('present',other.owner_user_id,other.name,false,'independent-entry'),{db:f.db,gm:{}});
  const independent=f.db.listCityRecords(f.guild,{kind:'opening_entry_opportunity',includeGM:true}).find(r=>r.data.character===other.id);
  assert.equal(inspectOpeningEntryOpportunity(f.db,f.guild,independent.record_key).status,'pending');
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(pc.owner_user_id,other.id);
  assert.throws(()=>inspectOpeningEntryOpportunity(f.db,f.guild,independent.record_key));
}));

test('restart preserves registration while changed ownership is explicitly held at start',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const pc=f.pcs[0];
  await handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'restart-checkin'),{db:f.db,gm:{}});
  f.restart();
  const row=f.db.getCityRecord(f.guild,'opening_attendance_registration',`2:${pc.owner_user_id}`);
  assert.equal(row.status,'registered');
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run('new-owner',pc.id);
  await handleCommand(interaction('start','gm',null,true,'restart-start'),{db:f.db,gm:{}});
  const active=f.db.getActiveSession(f.guild);
  assert.equal(f.db.activeAssignment(active.id,pc.owner_user_id),null);
  assert.equal(f.db.roster(active.id).find(r=>r.discord_user_id===pc.owner_user_id).presence,'absent');
  assert.equal(f.db.getCityRecord(f.guild,'opening_attendance_registration',row.record_key).status,'held');
}));

test('foreign character selection is rejected without registering a fallback PC',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const own=f.pcs[0],foreign=f.pcs[1];
  const bad=interaction('present',own.owner_user_id,foreign.name,false,'foreign-checkin');
  await handleCommand(bad,{db:f.db,gm:{}});
  assert.match(bad.replies[0].content,/own/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'opening_attendance_registration',includeGM:true}).length,0);
}));

test('retracted and payload-forged native receipts are held, never carried',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const pc=f.pcs[0];
  await handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'source-checkin'),{db:f.db,gm:{}});
  const row=f.db.getCityRecord(f.guild,'opening_attendance_registration',`2:${pc.owner_user_id}`);
  indexWorldEvent(f.db,f.guild,{key:row.source_event,status:'retracted'});
  await handleCommand(interaction('start','gm',null,true,'retract-start'),{db:f.db,gm:{}});
  let active=f.db.getActiveSession(f.guild);
  assert.equal(f.db.activeAssignment(active.id,pc.owner_user_id),null);
  assert.equal(f.db.getCityRecord(f.guild,'opening_attendance_registration',row.record_key).status,'held');
  f.db.endSession(f.guild,'');
  await handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'forged-checkin'),{db:f.db,gm:{}});
  const forged=f.db.getCityRecord(f.guild,'opening_attendance_registration',`3:${pc.owner_user_id}`);
  f.db.saveCityRecord(f.guild,{...forged,key:forged.record_key,data:{...forged.data,binding:{...forged.data.binding,character_id:f.pcs[1].id}}});
  await handleCommand(interaction('start','gm',null,true,'forged-start'),{db:f.db,gm:{}});
  active=f.db.getActiveSession(f.guild);
  assert.equal(f.db.activeAssignment(active.id,pc.owner_user_id),null);
  assert.equal(f.db.getCityRecord(f.guild,'opening_attendance_registration',forged.record_key).status,'held');
}));

test('explicit character switch supersedes prior selection and carries only the latest PC',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const owner=f.pcs[0].owner_user_id;
  const second=f.db.createCharacter(f.guild,owner,'Second PC',{traits:{},resources:{}});
  await handleCommand(interaction('present',owner,f.pcs[0].name,false,'switch-first'),{db:f.db,gm:{}});
  const original=f.db.getCityRecord(f.guild,'opening_attendance_registration',`2:${owner}`);
  await handleCommand(interaction('present',owner,second.name,false,'switch-second'),{db:f.db,gm:{}});
  assert.equal(f.db.getWorldEvent(f.guild,original.source_event).status,'superseded');
  assert.equal(f.db.getCityRecord(f.guild,'opening_attendance_registration',`2:${owner}`).status,'registered');
  await handleCommand(interaction('start','gm',null,true,'switch-start'),{db:f.db,gm:{}});
  const active=f.db.getActiveSession(f.guild);
  assert.equal(f.db.activeAssignment(active.id,owner).character_id,second.id);
  assert.equal(f.db.roster(active.id).filter(r=>r.discord_user_id===owner&&r.character_id).length,1);
}));

test('carry replay preserves later owner attendance and control choices, without another assignment revision',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const pc=f.pcs[0];
  registerOpeningAttendance(f.db,f.guild,pc.owner_user_id,'carry-once',pc.name);
  const session=f.db.startSession(f.guild),first=carryOpeningAttendance(f.db,f.guild,session),assignment=f.db.activeAssignment(session.id,pc.owner_user_id);
  f.db.setPresence(session.id,pc.owner_user_id,'absent','offscreen');f.restart();
  assert.deepEqual(carryOpeningAttendance(f.db,f.guild,session),first);
  assert.equal(f.db.activeAssignment(session.id,pc.owner_user_id).control_revision,assignment.control_revision);
  assert.equal(f.db.roster(session.id).find(r=>r.discord_user_id===pc.owner_user_id).presence,'absent');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'opening_attendance_carry',includeGM:true}).length,1);
  assert.throws(()=>carryOpeningAttendance(f.db,f.guild,{...session,guild_id:'foreign-guild'}),/Current new session/);
}));

test('registration failure rolls back its native source and mutation',()=>nativeFixture(f=>{
  f.db.endSession(f.guild,'');const pc=f.pcs[0],save=f.db.saveCityRecord.bind(f.db);
  f.db.saveCityRecord=(guild,input)=>{if(input.kind==='opening_attendance_registration')throw new Error('injected registration failure');return save(guild,input);};
  try{assert.throws(()=>registerOpeningAttendance(f.db,f.guild,pc.owner_user_id,'registration-failure',pc.name),/injected registration/);}
  finally{f.db.saveCityRecord=save;}
  assert.equal(f.db.openingAttendanceRegistrations(f.guild).length,0);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.kind==='native_session_attendance').length,0);
  assert.equal(f.db.db.prepare("SELECT COUNT(*) n FROM mutation_ledger WHERE guild_id=? AND mutation_type='session_attendance_register'").get(f.guild).n,0);
  registerOpeningAttendance(f.db,f.guild,pc.owner_user_id,'rollback-first-selection',pc.name);
  const original=f.db.getCityRecord(f.guild,'opening_attendance_registration',`2:${pc.owner_user_id}`),second=f.db.createCharacter(f.guild,pc.owner_user_id,'Second choice',{});
  f.db.saveCityRecord=(guild,input)=>{if(input.kind==='opening_attendance_registration')throw new Error('injected switch failure');return save(guild,input);};
  try{assert.throws(()=>registerOpeningAttendance(f.db,f.guild,pc.owner_user_id,'rollback-second-selection',second.name),/switch failure/);}
  finally{f.db.saveCityRecord=save;}
  assert.deepEqual(f.db.getCityRecord(f.guild,'opening_attendance_registration',original.record_key),original);
  assert.equal(f.db.getWorldEvent(f.guild,original.source_event).status,'active');
  assert.equal(f.db.getWorldEvent(f.guild,'attendance-registration:rollback-second-selection'),null);
}));

test('direct carry rolls back independent earlier assignments on a native write failure',()=>nativeFixture(f=>{
  f.db.endSession(f.guild,'');
  for(const [i,pc] of f.pcs.slice(0,2).entries())registerOpeningAttendance(f.db,f.guild,pc.owner_user_id,`direct-${i}`,pc.name);
  const session=f.db.startSession(f.guild),assign=f.db.assignCharacter.bind(f.db);let calls=0;
  f.db.assignCharacter=(...args)=>{if(++calls===2)throw new Error('injected second assignment failure');return assign(...args);};
  try{assert.throws(()=>carryOpeningAttendance(f.db,f.guild,session),/second assignment/);}finally{f.db.assignCharacter=assign;}
  assert.equal(calls,2);assert.equal(f.db.openingAttendanceRegistrations(f.guild).length,2);
  for(const pc of f.pcs.slice(0,2))assert.equal(f.db.activeAssignment(session.id,pc.owner_user_id),null);
  assert.equal(f.db.getCityRecord(f.guild,'opening_attendance_carry',session.id),null);
}));

test('registration beyond the first reader page is carried, never silently dropped',()=>nativeFixture(f=>{
  f.db.endSession(f.guild,'');
  for(let n=0;n<101;n++){
    const user=`attendance-scale-${n}`;f.db.upsertPlayer(f.guild,user,user);
    const pc=f.db.createCharacter(f.guild,user,`Attendee ${n}`,{});registerOpeningAttendance(f.db,f.guild,user,`scale-${n}`,pc.name);
  }
  const session=f.db.startSession(f.guild),result=carryOpeningAttendance(f.db,f.guild,session);
  assert.equal(result.carried.length,101);assert.equal(result.held.length,0);
  assert.equal(f.db.roster(session.id).filter(r=>r.presence==='present').length,101);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:500}).filter(e=>e.kind==='arrival').length,0);
}));

test('start and attendance carry roll back atomically when native assignment fails',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const pc=f.pcs[0];
  await handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'rollback-checkin'),{db:f.db,gm:{}});
  const assign=f.db.assignCharacter.bind(f.db);f.db.assignCharacter=()=>{throw new Error('injected assignment failure');};
  await handleCommand(interaction('start','gm',null,true,'rollback-start'),{db:f.db,gm:{}});
  f.db.assignCharacter=assign;
  assert.equal(f.db.getActiveSession(f.guild),undefined);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM sessions WHERE guild_id=? AND session_number=2').get(f.guild).n,0);
  assert.equal(f.db.openingAttendanceRegistrations(f.guild).length,1);
}));

test('concurrent duplicate registrations leave one current owner-PC selection',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const pc=f.pcs[0];
  await Promise.all([
    handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'concurrent-a'),{db:f.db,gm:{}}),
    handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'concurrent-b'),{db:f.db,gm:{}})
  ]);
  const current=f.db.openingAttendanceRegistrations(f.guild);
  assert.equal(current.length,1);assert.equal(current[0].data.binding.character_id,pc.id);
  await handleCommand(interaction('start','gm',null,true,'concurrent-start'),{db:f.db,gm:{}});
  const active=f.db.getActiveSession(f.guild);
  assert.equal(f.db.roster(active.id).filter(r=>r.discord_user_id===pc.owner_user_id&&r.character_id).length,1);
}));
