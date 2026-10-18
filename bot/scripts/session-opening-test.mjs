/** Opening jobs use actual start, native planner and audience/outbox boundaries; temporary offline fixtures only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {FakeResponses} from './contract-fixtures.mjs';
import {assemblyHookSources,certifyAssemblyPlan} from '../src/assembly-context.js';
import {scheduleSessionOpening,inspectSessionOpening,beginSessionOpeningAttempt,bindSessionOpeningTurn} from '../src/session-opening.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {registerOpeningAttendance} from '../src/session-opening-attendance.js';
import {runSessionOpening,sessionOpeningStatus} from '../src/session-opening-runner.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {assemblyOrientation} from '../src/assembly-state.js';
import {deliverVerifiedAssembly} from '../src/assembly-publications.js';

function startInteraction(f,{mode='auto',id='opening-start'}={}){
  const replies=[];
  return {id,guildId:f.guild,guild:{id:f.guild},commandName:'vc-session',user:{id:'operator',username:'Operator'},
    memberPermissions:{has:()=>true},member:{roles:{cache:new Map()}},isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommand:()=>'start',getSubcommandGroup:()=>null,getString:k=>k==='assembly'?mode:null,getBoolean:()=>null,getInteger:()=>null,getUser:()=>null},
    reply:async p=>replies.push(p),deferReply:async()=>{},editReply:async p=>replies.push(p),followUp:async p=>replies.push(p),replies};
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

function transport(f){
  let n=0;const sent={party:[],private:[]};
  f.db.db.prepare('UPDATE campaigns SET play_channel_id=? WHERE guild_id=?').run('opening-play',f.guild);
  return {sent,guild:{id:f.guild,channels:{fetch:async id=>id==='opening-play'?{id,isTextBased:()=>true,
    send:async body=>{sent.party.push(body.content||body);return {id:`party-${++n}`,channelId:id};}}:null},
    members:{fetch:async user=>({send:async body=>{sent.private.push({user,content:body.content||body});return {id:`dm-${++n}`,channelId:`dm-${user}`};}})}}};
}
function openingPlan(db,guild,session){
  return {public_opening:'UNVERIFIED: Choso apologizes for losing.',public_parts:[],convergence_goal:'Independent opportunities.',bonds:[],gm_notes:'GM PRIVATE',
    character_entries:db.roster(session.id).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence)).map(r=>({
      discord_user_id:r.discord_user_id,character_id:r.character_id,character_name:r.name,private_hook:'UNVERIFIED: You accept the job.',private_parts:[],
      hook_source_refs:assemblyHookSources(db,guild,r.character_id).slice(0,1).map(s=>s.id),public_cue:'',stay_reason:''}))};
}
for(const count of [0,1])test(`O2 actual start automatically plans and delivers ${count}-attendee opening through certified outbox`,()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const x=transport(f),i=startInteraction(f,{id:`auto-start-${count}`});i.guild=x.guild;
  if(count){const pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=['An unpaid telemetry invoice suggests a question.'];});
    registerOpeningAttendance(f.db,f.guild,pc.owner_user_id,'owner-register',pc.name);}
  let calls=0;const gm={planAssembly:async()=>{calls++;assert(i.replies.length,'Acknowledge the command before provider work.');
    return openingPlan(f.db,f.guild,f.db.getActiveSession(f.guild));}};
  await handleCommand(i,{db:f.db,gm});
  assert.equal(calls,1,'Start must execute the queued native opening, not require a separate assemble ritual.');
  const s=f.db.getActiveSession(f.guild),job=inspectSessionOpening(f.db,f.guild,s.id);
  assert.equal(job.status,'completed');assert.equal(job.data.attempts,1);assert.equal(x.sent.party.length,1);assert.equal(x.sent.private.length,count);
  assert(!JSON.stringify(x.sent).includes('UNVERIFIED'));assert(!JSON.stringify(x.sent).includes('GM PRIVATE'));
  if(count)assert.match(x.sent.private[0].content,/unpaid telemetry invoice/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,0);
}));

function queued(f){
  const x=transport(f);scheduleSessionOpening(f.db,startInteraction(f),f.session,()=>true);
  let calls=0;const gm={planAssembly:async()=>{calls++;return openingPlan(f.db,f.guild,f.db.getActiveSession(f.guild));}};
  return {...x,gm,get calls(){return calls;}};
}
test('O2 concurrent automatic/manual execution shares one plan and four independently private deliveries',()=>nativeFixture(async f=>{
  const x=queued(f);let release;const wait=new Promise(r=>{release=r;});const original=x.gm.planAssembly;
  x.gm.planAssembly=async()=>{await wait;return original();};
  const first=runSessionOpening({db:f.db,guild:x.guild,gm:x.gm}),second=runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});
  assert.equal(first,second);release();await Promise.all([first,second]);
  assert.equal(x.calls,1);assert.equal(x.sent.party.length,1);assert.equal(x.sent.private.length,4);
  const before=JSON.stringify(x.sent);f.restart();
  await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});assert.equal(JSON.stringify(x.sent),before);assert.equal(x.calls,1);
}));

for(const change of ['source','owner','roster','session'])test(`O2 ${change} change during planning holds all unsupported output without replay`,()=>nativeFixture(async f=>{
  const x=queued(f),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  x.gm.planAssembly=async()=>{
    const plan=openingPlan(f.db,f.guild,f.db.getActiveSession(f.guild));
    if(change==='source')indexWorldEvent(f.db,f.guild,{key:inspectSessionOpening(f.db,f.guild,f.session.id).source_event,status:'retracted'});
    if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run('new-owner',f.pcs[0].id);
    if(change==='roster')f.db.setPresence(f.session.id,f.pcs[0].owner_user_id,'absent');
    if(change==='session'){f.db.endSession(f.guild,'');f.db.startSession(f.guild,'Other session');}
    return plan;
  };
  const result=await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});
  assert.equal(result.status,'needs_review');assert.equal(x.sent.party.length,0);assert.equal(x.sent.private.length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true}).length,0);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));

test('O2 failed planner is bounded and diagnostics never retain raw private provider content',()=>nativeFixture(async f=>{
  const x=queued(f);let calls=0;x.gm.planAssembly=async()=>{calls++;throw new Error('PRIVATE prompt or secret body');};
  const a=await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});assert.equal(a.status,'needs_review');
  f.restart();await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});assert.equal(calls,1);
  assert(!JSON.stringify(f.db.getCityRecord(f.guild,'session_opening_job',f.session.id)).includes('PRIVATE prompt'));
  assert.equal(x.sent.party.length,0);
}));

test('O2 interrupted planning after restart requires scoped review, not another provider attempt',()=>nativeFixture(async f=>{
  const x=queued(f);const row=inspectSessionOpening(f.db,f.guild,f.session.id);
  f.db.saveCityRecord(f.guild,{...row,key:row.record_key,status:'planning'});f.restart();
  const result=await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});
  assert.equal(result.status,'held_interrupted');assert.equal(x.calls,0);assert.equal(x.sent.private.length,0);
}));

test('O2 manual/pause policy creates no provider work; unpaused never-attempted job can run once',()=>nativeFixture(async f=>{
  const x=queued(f);f.db.setDirectorPaused(f.guild,true);
  assert.equal((await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm})).status,'held_paused');assert.equal(x.calls,0);
  f.db.setDirectorPaused(f.guild,false);assert.equal((await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm})).status,'completed');assert.equal(x.calls,1);
}));

test('O2 unknown Discord acknowledgement holds only that owner and never auto-resends after restart',()=>nativeFixture(async f=>{
  const x=queued(f),fetch=x.guild.members.fetch;let attempts=0;
  x.guild.members.fetch=async user=>user===f.pcs[0].owner_user_id?{send:async()=>{attempts++;throw Error('lost acknowledgement');}}:fetch(user);
  const row=await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});
  assert.equal(row.status,'needs_delivery_review');assert.equal(attempts,1);assert.equal(x.sent.private.length,3);assert.equal(x.sent.party.length,1);
  assert.equal(row.data.slots.find(s=>s.user===f.pcs[0].owner_user_id).status,'uncertain');
  f.restart();await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});assert.equal(attempts,1);assert.equal(x.calls,1);
}));

test('O2 queued opening provenance is rechecked by real deferred outbox after restart',()=>nativeFixture(async f=>{
  const x=queued(f);x.guild.channels.fetch=async()=>null; // confirmed no channel, hence unsent, not uncertain
  const result=await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});assert.equal(result.status,'needs_delivery_review');
  const turn=f.db.listCityRecords(f.guild,{kind:'session_opening_turn',includeGM:true,limit:20})
    .find(r=>f.db.listTurnPublications(f.guild,r.record_key).some(p=>p.surface==='party'));
  assert(turn);assert(f.db.listTurnPublications(f.guild,turn.record_key).some(p=>p.status==='failed'));
  indexWorldEvent(f.db,f.guild,{key:inspectSessionOpening(f.db,f.guild,f.session.id).source_event,status:'retracted'});f.restart();
  let sends=0;await deliverTurnOutbox(f.db,f.guild,turn.record_key,async()=>{sends++;return {messageId:'wrong',channelId:'wrong'};});
  assert.equal(sends,0);assert(f.db.listTurnPublications(f.guild,turn.record_key).every(p=>p.status!=='delivered'));
}));

for(const mode of ['auto','already_together'])test(`O2 returning party ${mode} opens from current continuity without forced reunion`,()=>nativeFixture(async f=>{
  f.db.establishParty(f.guild,f.session.id,{name:'Previously chosen party'});f.db.endSession(f.guild,'');
  const pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.location='private-workshop';d.entry_hooks=['The unresolved telemetry invoice remains a possible lead.'];});
  registerOpeningAttendance(f.db,f.guild,pc.owner_user_id,`return-${mode}`,pc.name);
  const x=transport(f),i=startInteraction(f,{mode,id:`return-start-${mode}`});i.guild=x.guild;
  const before=f.db.getCharacter(pc.id).data,answer={public_opening:'UNVERIFIED: Everyone meets at the station.',public_parts:[],convergence_goal:'Resume independent threads.',
    bonds:[],gm_notes:'No forced reunion.',character_entries:[{discord_user_id:pc.owner_user_id,character_id:pc.id,character_name:pc.name,
      hook_source_refs:assemblyHookSources(f.db,f.guild,pc.id).slice(0,1).map(s=>s.id),private_hook:'A possible follow-up.',private_parts:[],public_cue:'',stay_reason:''}]},
    ai=new FakeResponses([answer]),service=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
      config:{gmModel:'offline',assemblyModel:'offline',assemblyMaxOutputTokens:2000,maxContentChunks:1,maxRecentMessages:0}});
  await handleCommand(i,{db:f.db,gm:{planAssembly:args=>service.planAssembly(args)}});
  const session=f.db.getActiveSession(f.guild),row=inspectSessionOpening(f.db,f.guild,session.id);
  assert.equal(row.data.origin.kind,'resume');assert.equal(row.status,'completed');assert.equal(ai.requests.length,1);
  assert.equal(session.assembly_phase,'party');assert.equal(x.sent.private.length,1);assert.equal(x.sent.party.length,1);
  assert.match(x.sent.private[0].content,/unresolved telemetry invoice/);assert(!JSON.stringify(x.sent).includes('Everyone meets'));
  assert.deepEqual(f.db.getCharacter(pc.id).data,before);assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,0);
  assert.match(String(ai.requests[0].input),/returning.*party|established.*party/i);
  f.restart();await runSessionOpening({db:f.db,guild:x.guild,gm:{planAssembly:()=>{throw Error('Must not replan.');}}});
  assert.equal(x.sent.private.length,1);assert.equal(x.sent.party.length,1);
}));

test('O2 resume output cannot be minted by simply changing phase or presenting an assembly job as party consent',()=>nativeFixture(f=>{
  f.db.setAssemblyPhase(f.session.id,'party');
  assert.throws(()=>assemblyOrientation(f.db,f.guild,f.session.id,{mode:'party'}),/native origin/);
  f.db.setAssemblyPhase(f.session.id,'assembly');scheduleSessionOpening(f.db,startInteraction(f),f.session,()=>true);
  f.db.setAssemblyPhase(f.session.id,'party');
  assert.throws(()=>assemblyOrientation(f.db,f.guild,f.session.id,{mode:'party'}));
  assert.equal(f.db.getPartyState(f.guild).established,false);assert.equal(f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true}).length,0);
}));

test('O2 already_together without saved party membership never manufactures a party or a physical gathering',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const x=transport(f),i=startInteraction(f,{mode:'already_together'});i.guild=x.guild;
  await handleCommand(i,{db:f.db,gm:{planAssembly:async()=>openingPlan(f.db,f.guild,f.db.getActiveSession(f.guild))}});
  assert.equal(inspectSessionOpening(f.db,f.guild,f.db.getActiveSession(f.guild).id).status,'completed');
  assert.equal(f.db.getPartyState(f.guild).established,false);assert.equal(x.sent.party.length,1);assert.equal(x.sent.private.length,0);
  assert.match(x.sent.party[0],/does not establish shared fictional presence/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,0);
}));

test('O3 GM inspection exposes exact unsent-opening recovery and never repeats acknowledged private output',()=>nativeFixture(async f=>{
  const x=queued(f),fetch=x.guild.channels.fetch;x.guild.channels.fetch=async()=>null;
  await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});assert.equal(x.sent.private.length,4);assert.equal(x.sent.party.length,0);
  const inspect=startInteraction(f,{id:'inspect-unsent'});inspect.guild=x.guild;inspect.options.getSubcommand=()=>'assemble';
  await handleCommand(inspect,{db:f.db,gm:x.gm});
  const control=inspect.replies.flatMap(r=>r.components||[]).flatMap(r=>r.components||[]).find(b=>b.custom_id?.startsWith('vcopeningdelivery:'));
  assert(control,'Native-job inspect must provide an authenticated recovery for demonstrably unsent prepared output.');
  x.guild.channels.fetch=fetch;f.restart();
  const click=startInteraction(f,{id:'recover-unsent'});click.guild=x.guild;click.customId=control.custom_id;click.isButton=()=>true;click.isChatInputCommand=()=>false;
  await handleCommand(click,{db:f.db,gm:x.gm});await handleCommand(click,{db:f.db,gm:x.gm});
  assert.equal(x.sent.party.length,1);assert.equal(x.sent.private.length,4);assert.equal(x.calls,1);
  assert.equal(inspectSessionOpening(f.db,f.guild,f.session.id).status,'completed');
}));

async function deliveryReview(f,x){
  const inspect=startInteraction(f,{id:'inspect-recovery'});inspect.guild=x.guild;inspect.options.getSubcommand=()=>'assemble';
  await handleCommand(inspect,{db:f.db,gm:x.gm});
  return inspect.replies.flatMap(r=>r.components||[]).flatMap(r=>r.components||[]).find(b=>b.custom_id?.startsWith('vcopeningdelivery:'));
}
function recoveryClick(f,x,control,{user='operator',allowed=true}={}){
  const i=startInteraction(f,{id:`click-${user}`});i.guild=x.guild;i.user.id=user;i.memberPermissions.has=()=>allowed;
  i.customId=control.custom_id;i.isButton=()=>true;i.isChatInputCommand=()=>false;return i;
}
for(const change of ['source','owner','roster','plan','recipient'])test(`O3 recovery rejects changed ${change} before transport`,()=>nativeFixture(async f=>{
  const x=queued(f),fetch=x.guild.channels.fetch;x.guild.channels.fetch=async()=>null;
  await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});const control=await deliveryReview(f,x);assert(control);
  if(change==='source')indexWorldEvent(f.db,f.guild,{key:inspectSessionOpening(f.db,f.guild,f.session.id).source_event,status:'retracted'});
  if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run('changed-owner',f.pcs[0].id);
  if(change==='roster')f.db.setPresence(f.session.id,f.pcs[0].owner_user_id,'absent');
  if(change==='plan')f.db.setAssemblyPlan(f.session.id,{...f.db.getAssemblyPlan(f.session.id),convergence_goal:'Changed terms'});
  if(change==='recipient'){
    const turn=f.db.listCityRecords(f.guild,{kind:'session_opening_turn',includeGM:true,limit:20}).find(r=>f.db.listTurnPublications(f.guild,r.record_key).some(p=>p.surface==='party')),
      row=f.db.listTurnPublications(f.guild,turn.record_key)[0];
    f.db.db.prepare('UPDATE publication_outbox SET target_user_id=? WHERE id=?').run('wrong-owner',row.id);
  }
  x.guild.channels.fetch=fetch;f.restart();
  if(change==='recipient')await handleCommand(recoveryClick(f,x,control),{db:f.db,gm:x.gm});
  else await assert.rejects(()=>handleCommand(recoveryClick(f,x,control),{db:f.db,gm:x.gm}));
  assert.equal(x.sent.party.length,0);assert.equal(x.sent.private.length,4);assert.equal(x.calls,1);
}));

test('O3 forwarded/revoked GM control cannot authorize delivery; genuine operator resumes once',()=>nativeFixture(async f=>{
  const x=queued(f),fetch=x.guild.channels.fetch;x.guild.channels.fetch=async()=>null;
  await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});const control=await deliveryReview(f,x);assert(control);x.guild.channels.fetch=fetch;
  await assert.rejects(()=>handleCommand(recoveryClick(f,x,control,{user:'other-gm'}),{db:f.db,gm:x.gm}));
  await assert.rejects(()=>handleCommand(recoveryClick(f,x,control,{allowed:false}),{db:f.db,gm:x.gm}));
  assert.equal(x.sent.party.length,0);
  await handleCommand(recoveryClick(f,x,control),{db:f.db,gm:x.gm});assert.equal(x.sent.party.length,1);assert.equal(x.sent.private.length,4);
}));

test('O3 mixed recovery preserves one uncertain owner while independently resuming known-unsent shared output',()=>nativeFixture(async f=>{
  const x=queued(f),fetch=x.guild.channels.fetch,members=x.guild.members.fetch;let attempts=0;
  x.guild.channels.fetch=async()=>null;x.guild.members.fetch=async user=>user===f.pcs[0].owner_user_id?{send:async()=>{attempts++;throw Error('ack lost');}}:members(user);
  await runSessionOpening({db:f.db,guild:x.guild,gm:x.gm});const control=await deliveryReview(f,x);assert(control);
  x.guild.channels.fetch=fetch;f.restart();await handleCommand(recoveryClick(f,x,control),{db:f.db,gm:x.gm});
  assert.equal(attempts,1);assert.equal(x.sent.party.length,1);assert.equal(x.sent.private.length,3);assert.equal(x.calls,1);
  assert.equal(inspectSessionOpening(f.db,f.guild,f.session.id).status,'needs_delivery_review');
  assert.equal(await deliveryReview(f,x),undefined,'No resend control for uncertainty alone.');
}));

test('O3 commit-before-send restart recovers exact native prepared payloads without any provider',()=>nativeFixture(async f=>{
  const x=queued(f);beginSessionOpeningAttempt(f.db,f.guild,f.session.id);
  f.db.setAssemblyPlan(f.session.id,certifyAssemblyPlan(f.db,f.guild,f.session,openingPlan(f.db,f.guild,f.session)));
  const job=inspectSessionOpening(f.db,f.guild,f.session.id);f.db.saveCityRecord(f.guild,{...job,key:job.record_key,status:'publishing'});
  await deliverVerifiedAssembly({db:f.db,guild:x.guild,session:f.session,bindTurn:id=>bindSessionOpeningTurn(f.db,f.guild,f.session.id,id),
    deliver:async({turnId})=>({pending:f.db.listTurnPublications(f.guild,turnId)})});
  assert.equal(x.sent.party.length,0);assert.equal(x.sent.private.length,0);f.restart();
  const control=await deliveryReview(f,x);assert(control);
  await handleCommand(recoveryClick(f,x,control),{db:f.db,gm:{planAssembly:()=>{throw Error('No replan.');},authorAssemblyScene:()=>{throw Error('No writer.');}}});
  assert.equal(x.sent.party.length,1);assert.equal(x.sent.private.length,4);assert.equal(x.calls,0);
  assert.equal(inspectSessionOpening(f.db,f.guild,f.session.id).status,'completed');
}));

test('O3 failed automatic opening ends with a truthful GM-private diagnostic rather than a silent queued acknowledgement',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const x=transport(f),i=startInteraction(f);i.guild=x.guild;
  await handleCommand(i,{db:f.db,gm:{planAssembly:async()=>{throw Error('PRIVATE MODEL BODY');}}});
  const final=i.replies.find(r=>r?.ephemeral&&r.content?.includes('Native opening: needs_review'));
  assert(final,'Operator must receive the final bounded hold status, not merely the initial queued message.');
  assert(!JSON.stringify(i.replies).includes('PRIVATE MODEL BODY'));assert.equal(x.sent.party.length,0);assert.equal(x.sent.private.length,0);
}));

test('O3 operational final report stays below Discord limit even for a large native attendance roster',()=>{
  const text=sessionOpeningStatus({status:'completed',data:{attempts:1,slots:Array.from({length:5000},()=>({audience:'private',narrative_status:'FALLBACK_DELIVERED'}))}});
  assert(text.length<1900);assert.match(text,/5000/);assert.match(text,/FALLBACK_DELIVERED/);
});
