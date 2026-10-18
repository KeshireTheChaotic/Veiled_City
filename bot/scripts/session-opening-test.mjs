/** Opening jobs use actual start, native planner and audience/outbox boundaries; temporary offline fixtures only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {FakeResponses} from './contract-fixtures.mjs';
import {assemblyHookSources} from '../src/assembly-context.js';
import {scheduleSessionOpening,inspectSessionOpening} from '../src/session-opening.js';
import {indexWorldEvent} from '../src/city-calendar.js';

function startInteraction(f,{mode='auto',id='opening-start'}={}){
  const replies=[];
  return {id,guildId:f.guild,guild:{id:f.guild},commandName:'vc-session',user:{id:'operator',username:'Operator'},
    memberPermissions:{has:()=>true},member:{roles:{cache:new Map()}},isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommand:()=>'start',getSubcommandGroup:()=>null,getString:k=>k==='assembly'?mode:null,getBoolean:()=>null,getInteger:()=>null,getUser:()=>null},
    reply:async p=>replies.push(p),deferReply:async()=>{},editReply:async p=>replies.push(p),replies};
}

test('O2 actual session start queues one durable native opening job even with zero attendees',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const i=startInteraction(f);
  await handleCommand(i,{db:f.db,gm:{}});
  const session=f.db.getActiveSession(f.guild),rows=f.db.listCityRecords(f.guild,{kind:'session_opening_job',includeGM:true});
  assert(session,JSON.stringify(i.replies));assert.equal(rows.length,1);assert.equal(rows[0].data.origin.session,session.id);
  assert.equal(rows[0].data.origin.roster.length,0);assert.equal(rows[0].visibility,'gm');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,0);
  const before=f.db.getCharacter(f.pcs[0].id).data;f.restart();
  assert.equal(f.db.getCityRecord(f.guild,'session_opening_job',rows[0].record_key).source_event,rows[0].source_event);
  assert.deepEqual(f.db.getCharacter(f.pcs[0].id).data,before);
}));

test('O2 scheduling authenticates the real operator and never treats a JSON GM flag as authority',()=>nativeFixture(f=>{
  const i=startInteraction(f);
  assert.throws(()=>scheduleSessionOpening(f.db,i,f.session,{gm:true}),/authenticated GM/);
  assert.throws(()=>scheduleSessionOpening(f.db,i,f.session,()=>false),/authenticated GM/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'session_opening_job',includeGM:true}).length,0);
  const row=scheduleSessionOpening(f.db,i,f.session,()=>true);
  assert.equal(row.data.origin.roster.length,4);assert.equal(row.data.attempts,0);
  assert.equal(scheduleSessionOpening(f.db,startInteraction(f,{id:'duplicate-start'}),f.session,()=>true).source_event,row.source_event);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'session_opening_job',includeGM:true}).length,1);
}));

test('O2 native job proof survives restart and rejects source or audience tampering without replacing it',()=>nativeFixture(f=>{
  const row=scheduleSessionOpening(f.db,startInteraction(f),f.session,()=>true);f.restart();
  assert.equal(inspectSessionOpening(f.db,f.guild,row.record_key).source_event,row.source_event);
  f.db.saveCityRecord(f.guild,{...row,key:row.record_key,visibility:'party'});
  assert.throws(()=>inspectSessionOpening(f.db,f.guild,row.record_key));
  f.db.saveCityRecord(f.guild,{...row,key:row.record_key,data:{...row.data,origin:{...row.data.origin,kind:'gm_approved_damage'}}});
  assert.throws(()=>inspectSessionOpening(f.db,f.guild,row.record_key));
  f.db.saveCityRecord(f.guild,{...row,key:row.record_key});
  indexWorldEvent(f.db,f.guild,{key:row.source_event,status:'retracted'});
  assert.throws(()=>inspectSessionOpening(f.db,f.guild,row.record_key));
  assert.throws(()=>scheduleSessionOpening(f.db,startInteraction(f,{id:'cannot-replace-source'}),f.session,()=>true));
  assert.equal(f.db.getCityRecord(f.guild,'session_opening_job',row.record_key).source_event,row.source_event);
}));

test('O2 manual mode retains an explicit held native job without generation or publication',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');await handleCommand(startInteraction(f,{mode:'manual'}),{db:f.db,gm:{}});
  const row=f.db.listCityRecords(f.guild,{kind:'session_opening_job',includeGM:true})[0];
  assert.equal(row.status,'held_manual');assert.equal(row.data.attempts,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true}).length,0);
}));

test('O2 failed native job scheduling rolls session start back, never leaving an untracked live session',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const save=f.db.saveCityRecord.bind(f.db);
  f.db.saveCityRecord=(guild,row)=>{if(row.kind==='session_opening_job')throw new Error('injected opening schedule failure');return save(guild,row);};
  try{await handleCommand(startInteraction(f),{db:f.db,gm:{}});}finally{f.db.saveCityRecord=save;}
  assert.equal(f.db.getActiveSession(f.guild),undefined);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'session_opening_job',includeGM:true}).length,0);
  assert.equal(f.db.db.prepare("SELECT COUNT(*) n FROM mutation_ledger WHERE guild_id=? AND mutation_type='session_opening_schedule'").get(f.guild).n,0);
}));

for(const count of [0,1])test(`O2 native assembly planner accepts ${count} attendees without inventing other PCs`,()=>nativeFixture(async f=>{
  for(const [n,pc] of f.pcs.entries())f.db.setPresence(f.session.id,pc.owner_user_id,n<count?'present':'absent');
  if(count)f.db.updateCharacterData(f.pcs[0].id,d=>{d.entry_hooks=['An unpaid telemetry invoice suggests a question to investigate.'];});
  const pcs=f.pcs.slice(0,count),answer={public_opening:'An ordinary station camera opening, not a PC arrival.',public_parts:[],
    convergence_goal:count?'One independent opening; no party membership.':'A camera scene without a PC.',bonds:[],gm_notes:'No invented participants.',
    character_entries:pcs.map(pc=>({discord_user_id:pc.owner_user_id,character_id:pc.id,character_name:pc.name,
      hook_source_refs:assemblyHookSources(f.db,f.guild,pc.id).slice(0,1).map(s=>s.id),private_hook:'An opportunity to ask about your invoice.',
      private_parts:[],public_cue:'',stay_reason:''}))},ai=new FakeResponses([answer]),
    gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
      config:{gmModel:'offline',assemblyModel:'offline',assemblyMaxOutputTokens:2000,maxContentChunks:1,maxRecentMessages:0}});
  const plan=await gm.planAssembly({guildId:f.guild});
  assert.equal(plan.character_entries.length,count);assert.equal(plan.bonds.length,0);assert.equal(ai.requests.length,1);
  assert.equal(plan.assembly_contract.version,2);assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,0);
}));
