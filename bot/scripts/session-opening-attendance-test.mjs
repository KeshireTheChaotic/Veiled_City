import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {configureCityFlags} from '../src/city-core.js';
import {configureSimulationEntity} from '../src/simulation.js';

function interaction(sub,user,character=null,gm=false,id='attendance'){
  const replies=[];
  return {id,guildId:'v9-synthetic',commandName:'vc-session',user:{id:user,username:user},memberPermissions:{has:()=>gm},member:{roles:{cache:new Map()}},
    isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommand:()=>sub,getSubcommandGroup:()=>null,getString:key=>key==='character'?character:key==='assembly'?'manual':null,
      getBoolean:()=>null,getInteger:()=>null,getUser:()=>null,getChannel:()=>null},
    reply:async payload=>replies.push(payload),deferReply:async()=>{},editReply:async payload=>replies.push(payload),replies};
}

test('pre-start present registers source-bound attendance and start carries it without arrival or movement',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');
  const pc=f.pcs[0],before=structuredClone(pc);
  const checked=interaction('present',pc.owner_user_id,pc.name,false,'checkin-1');await handleCommand(checked,{db:f.db,gm:{}});
  const registration=f.db.getCityRecord(f.guild,'opening_attendance_registration',`2:${pc.owner_user_id}:${pc.id}`);
  assert.equal(registration?.status,'registered',JSON.stringify(checked.replies));
  assert.equal(f.db.getActiveSession(f.guild),undefined);
  const session=await handleCommand(interaction('start','gm',null,true,'start-1'),{db:f.db,gm:{}});
  const active=f.db.getActiveSession(f.guild),roster=f.db.roster(active.id).find(r=>r.discord_user_id===pc.owner_user_id);
  assert.equal(roster.presence,'present');assert.equal(roster.character_id,pc.id);
  assert.equal(f.db.getCityRecord(f.guild,'opening_attendance_registration',registration.record_key).status,'carried');
  const after=f.db.getCharacter(pc.id);
  assert.deepEqual(after.data,before.data);assert.equal(after.data.location,'terminal');
  assert.equal(f.db.cityRecordsBySource(f.guild,`arrival:${pc.id}`).length,0);
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

test('restart preserves registration while changed ownership is explicitly held at start',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const pc=f.pcs[0];
  await handleCommand(interaction('present',pc.owner_user_id,pc.name,false,'restart-checkin'),{db:f.db,gm:{}});
  f.restart();
  const row=f.db.getCityRecord(f.guild,'opening_attendance_registration',`2:${pc.owner_user_id}:${pc.id}`);
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
