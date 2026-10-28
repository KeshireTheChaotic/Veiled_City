import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOpeningCohort,openingCohortStatus} from '../../src/opening-cohort-runner.js';
import {handleCommand} from '../../src/commands.js';
import {beginSessionOpeningAttempt,scheduleSessionOpening} from '../../src/session-opening.js';
import {runSessionOpening} from '../../src/session-opening-runner.js';
import {assemblyInputs} from '../../src/assembly-context.js';
import {assemblyNarrativeCandidate} from '../../src/pvp-output.js';
import {openingCohortNarrativeCandidate} from '../../src/frameworks/session/opening-cohort-state.js';
import {authorNarrativeRequests} from '../../src/narrative-authority.js';
import {recordCharacterArrival} from '../../src/scene-continuity.js';
import {disposableCampaign} from './p08-correction-fixture.mjs';
import {initializeSessionWorldEvents} from '../../src/application/composition/public.js';
initializeSessionWorldEvents();

function mockGuild(){
  let next=0,mode='acknowledge';const channel={id:'play-channel',isTextBased:()=>true,send:async()=>{
    next++;if(mode==='uncertain')throw new Error('mock transport lost acknowledgement');
    return {id:`discord-${next}`,channelId:'play-channel'};}};
  return {id:'guild-correction',channels:{cache:new Map(),fetch:async id=>id==='play-channel'?channel:null},members:{fetch:async()=>null},
    sent:()=>next,setSendMode:value=>{mode=value;}};
}
function audienceFirstGM(db,guildId){
  const diagnostics=[];
  const response=()=>({narrative_units:[{id:'camera-detail',kind:'scene',text:'A narrow amber light trembles across the rain-dark glass.',
    subject_key:'',location_key:'',visibility:'party',epistemic:'observation',source_refs:[],receipt_kind:'',receipt_ref:''}],fiction_delta:[]});
  return {
    async planAssembly(){try{const session=db.getActiveSession(guildId),inputs=assemblyInputs(db,guildId,session);
      return {public_opening:'',character_entries:inputs.characters.map(row=>({discord_user_id:row.user,character_name:row.name,
        hook_source_refs:row.sources.slice(0,1).map(source=>source.id),private_hook:''}))};
      }catch(error){diagnostics.push(error.stack||String(error));throw error;}},
    async authorAssemblyScene(guildId,sessionId,scope){try{const {candidate,source}=assemblyNarrativeCandidate(db,guildId,sessionId,scope);
      return await authorNarrativeRequests({db,guild:guildId,result:candidate,scope,sourceRef:source.event_key,budget:{used:false},generate:async()=>response()});
      }catch(error){diagnostics.push(error.stack||String(error));throw error;}},
    async authorOpeningCohort(guildId,key){try{const {candidate,source}=openingCohortNarrativeCandidate(db,guildId,key),scope={mode:'party',actorUserId:null,actorCharacterId:null};
      return await authorNarrativeRequests({db,guild:guildId,result:candidate,scope,sourceRef:source.event_key,budget:{used:false},generate:async()=>response()});
      }catch(error){diagnostics.push(error.stack||String(error));throw error;}},diagnostics
  };
}
async function readyCohort(){
  const context=disposableCampaign(),{db,close}=context,guild=mockGuild(),guildId=guild.id;
  db.configureCampaign(guildId,{playChannelId:'play-channel'});
  db.setCityCalendar(guildId,{flags:{playable_narration:true,narrative_authority:true,narrative_camera:true,scene_continuity:true}});
  const session=db.startSession(guildId,'camera then cohort','auto');
  scheduleSessionOpening(db,{id:'camera-start',guildId,user:{id:'gm'}},session,()=>true);
  const gm=audienceFirstGM(db,guildId),opened=await runSessionOpening({db,guild,gm});
  assert.equal(opened.status,'completed',JSON.stringify({opened,diagnostics:gm.diagnostics}));
  assert.equal(guild.sent(),1,'the initial narrative used a real committed outbox publication');
  const camera=opened.data.slots.find(slot=>slot.audience==='party');assert.equal(camera.status,'delivered');
  db.setSimulationEntity(guildId,'location','market-steps',{display_name:'Market steps',visibility:'party'});
  const characters=[];
  for(const [user,name] of [['owner-a','Aster'],['owner-b','Briar']]){
    db.upsertPlayer(guildId,user,name);const pc=db.createCharacter(guildId,user,name,{background:`${name} seeks an old contact.`});
    db.updateCharacterData(pc.id,data=>{data.location='market-steps';});
    db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,'present');characters.push(pc);
    if(user==='owner-a')assert.ok(recordCharacterArrival(db,guildId,db.getCharacter(pc.id),user,`arrival-${user}`),
      JSON.stringify({character:db.getCharacter(pc.id),location:db.getSimulationEntity(guildId,'location','market-steps'),flags:db.getCityCalendar(guildId).flags}));
  }
  return {context,db,close,guild,guildId,session,gm,opened,characters};
}

test('cohort remains inert without immutable acknowledged camera evidence and reports pause/review truthfully',async()=>{
  const {db,close}=disposableCampaign();
  try{
    db.upsertPlayer('guild-correction','a','A');db.upsertPlayer('guild-correction','b','B');
    const a=db.createCharacter('guild-correction','a','A'),b=db.createCharacter('guild-correction','b','B');
    const session=db.startSession('guild-correction','no camera receipt','auto');
    for(const [user,pc] of [['a',a],['b',b]]){db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,'present');}
    let planned=0;
    const result=await runOpeningCohort({db,guild:{id:'guild-correction'},gm:{planAssembly:async()=>{planned++;return {};}}});
    assert.equal(result,null);assert.equal(planned,0);
    assert.match(openingCohortStatus({status:'held_paused',data:{}}),/paused/);
    assert.match(openingCohortStatus({status:'needs_review',data:{}}),/review/);
    assert.equal(db.getCityRecord('guild-correction','opening_cohort_job',session.id),null);
  }finally{close();}
});

test('/vc-session assemble checks the additive cohort after a terminal initial opening without replaying it',async()=>{
  const {db,close}=disposableCampaign();
  try{
    const session=db.startSession('guild-correction','assemble route','auto');
    const interaction={id:'assemble-interaction',guildId:'guild-correction',commandName:'vc-session',user:{id:'gm',username:'GM'},member:{displayName:'GM'},guild:{id:'guild-correction',channels:{cache:new Map()}},
      memberPermissions:{has:()=>true},options:{getSubcommand:()=> 'assemble',getSubcommandGroup:()=>null},
      isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
      deferReply:async()=>{interaction.deferred=true;},editReply:async payload=>{interaction.response=payload.content;},
      followUp:async()=>{},reply:async()=>{}};
    scheduleSessionOpening(db,{...interaction,id:'start-interaction'},session,()=>true);
    beginSessionOpeningAttempt(db,'guild-correction',session.id);
    const job=db.getCityRecord('guild-correction','session_opening_job',session.id);
    db.saveCityRecord('guild-correction',{...job,key:session.id,status:'completed'});
    let cohortLookups=0;const get=db.getCityRecord.bind(db);
    db.getCityRecord=(guild,kind,key)=>{if(kind==='opening_cohort_job')cohortLookups++;return get(guild,kind,key);};
    let plans=0;
    await handleCommand(interaction,{db,gm:{planAssembly:async()=>{plans++;return {};}}});
    assert.ok(cohortLookups>0,'completed initial opening reaches the additive cohort gate');
    assert.equal(plans,0,'missing immutable camera acknowledgement does not run a cohort plan');
    assert.equal(get('guild-correction','session_opening_job',session.id).status,'completed');
    assert.match(interaction.response,/Native opening: completed/);
  }finally{close();}
});

test('zero-attendee camera is acknowledged through the real outbox and still enables one additive cohort after check-in',async()=>{
  const {db,close,guild,guildId,session,gm}=await readyCohort();
  try{
    assert.equal(session.assembly_phase,'assembly');
    const interaction={id:'assemble-after-checkin',guildId,commandName:'vc-session',user:{id:'gm',username:'GM'},member:{displayName:'GM'},
      guild,memberPermissions:{has:()=>true},
      options:{getSubcommand:()=> 'assemble',getSubcommandGroup:()=>null},isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
      deferReply:async()=>{interaction.deferred=true;},editReply:async payload=>{interaction.response=payload.content;},followUp:async()=>{},reply:async()=>{}};
    await handleCommand(interaction,{db,gm});
    const job=db.getCityRecord(guildId,'opening_cohort_job',session.id);
    assert.ok(job,'GM command reached and claimed the eligible cohort');
    assert.equal(job.status,'delivered',JSON.stringify({job,diagnostics:gm.diagnostics}));
    assert.equal(job.data.evidence.transport_acknowledged,true);
    assert.equal(job.data.evidence.dramatic_coverage,'unverified');
    assert.equal(guild.sent(),2,'one additional public cohort was acknowledged');
    assert.equal(db.listCityRecords(guildId,{kind:'opening_cohort_attempt',includeGM:true,limit:10}).length,0);
    assert.equal(db.getCityRecord(guildId,'session_opening_job',session.id).status,'completed','the immutable initial job was not replayed');
    const publications=db.listTurnPublications(guildId,job.data.turn_id);
    assert.equal(publications.length,1);assert.equal(publications[0].status,'delivered');
    assert.ok(publications[0].discord_message_id);assert.equal(publications[0].visibility,'party');
  }finally{close();}
});

test('stale unsent planner work is archived and refreshed without changing the original camera or duplicating publication',async()=>{
  const {db,close,guild,guildId,session,gm,characters}=await readyCohort();
  try{
    let start,release;const started=new Promise(resolve=>{start=resolve;}),gate=new Promise(resolve=>{release=resolve;});let calls=0;
    const base=audienceFirstGM(db,guildId).planAssembly;
    gm.planAssembly=async args=>{calls++;start();await gate;return base(args);};
    const pending=runOpeningCohort({db,guild,gm});await started;
    db.assignCharacter(session.id,'owner-b',characters[1].id);release();
    const stale=await pending;assert.equal(stale.status,'needs_review');assert.equal(stale.data.turn_id,null);
    const oldAttempt=stale.data.attempt_id;gm.planAssembly=async args=>{calls++;return base(args);};
    const refreshed=await runOpeningCohort({db,guild,gm});
    assert.equal(refreshed.status,'delivered');assert.notEqual(refreshed.data.attempt_id,oldAttempt);
    assert.equal(calls,2);assert.equal(db.listCityRecords(guildId,{kind:'opening_cohort_attempt',includeGM:true,limit:10}).length,1);
    assert.equal(guild.sent(),2);assert.equal(db.listTurnPublications(guildId,refreshed.data.turn_id).filter(row=>row.status==='delivered').length,1);
  }finally{close();}
});

test('Director pause during planner await holds before commit and resumes from a fresh unsent attempt',async()=>{
  const {db,close,guild,guildId,session,gm}=await readyCohort();
  try{
    let start,release;const started=new Promise(resolve=>{start=resolve;}),gate=new Promise(resolve=>{release=resolve;});let plans=0;
    const base=audienceFirstGM(db,guildId).planAssembly;
    gm.planAssembly=async args=>{plans++;start();await gate;return base(args);};
    const pending=runOpeningCohort({db,guild,gm});await started;db.setDirectorPaused(guildId,true);release();
    const held=await pending;assert.equal(held.status,'held_paused');assert.equal(held.data.turn_id,null);
    assert.equal(db.listTurnPublications(guildId,held.data.turn_id||'').length,0);assert.equal(guild.sent(),1);
    db.setDirectorPaused(guildId,false);gm.planAssembly=async args=>{plans++;return base(args);};
    const resumed=await runOpeningCohort({db,guild,gm});assert.equal(resumed.status,'delivered');
    assert.equal(plans,2);assert.equal(guild.sent(),2);assert.equal(resumed.data.evidence.transport_acknowledged,true);
  }finally{close();}
});

test('uncertain cohort send survives a new database connection without automatic resend or replanning',async()=>{
  const {context,db,close,guild,guildId,session,gm}=await readyCohort();
  try{
    guild.setSendMode('uncertain');let plans=0;const base=gm.planAssembly;gm.planAssembly=async args=>{plans++;return base(args);};
    const uncertain=await runOpeningCohort({db,guild,gm});assert.equal(uncertain.status,'uncertain');assert.equal(uncertain.data.evidence.transport_acknowledged,false);
    const sends=guild.sent(),turn=uncertain.data.turn_id,peer=context.openPeer();
    try{db.close();guild.setSendMode('acknowledge');const resumed=await runOpeningCohort({db:peer,guild,gm});
      assert.equal(resumed.status,'uncertain');assert.equal(guild.sent(),sends);assert.equal(plans,1);
      assert.equal(peer.listTurnPublications(guildId,turn).length,1);assert.equal(peer.listTurnPublications(guildId,turn)[0].status,'uncertain');
    }finally{peer.close();}
  }finally{close();}
});

test('independent Node worker processes claim one session cohort and publish at most once',async()=>{
  const {context,db,close,guildId}=await readyCohort();
  const worker=path.join(path.dirname(fileURLToPath(import.meta.url)),'p08-f04-worker.mjs');
  const children=[fork(worker,[context.dbPath,context.schemaPath],{stdio:['ignore','ignore','ignore','ipc']}),
    fork(worker,[context.dbPath,context.schemaPath],{stdio:['ignore','ignore','ignore','ipc']})];
  const waiters=new Map(children.map(child=>[child,[]])),queued=new Map(children.map(child=>[child,[]]));
  const wait=(child,type)=>new Promise((resolve,reject)=>{
    const messages=queued.get(child),index=messages.findIndex(message=>message.type===type);
    if(index>=0)return resolve(messages.splice(index,1)[0]);
    waiters.get(child).push({type,resolve,reject});
  });
  for(const child of children){child.on('message',message=>{
    const pending=waiters.get(child).findIndex(item=>item.type===message.type);
    if(pending>=0)waiters.get(child).splice(pending,1)[0].resolve(message);else queued.get(child).push(message);
  });child.on('error',error=>waiters.get(child).splice(0).forEach(item=>item.reject(error)));}
  try{
    db.close();
    const ready=Promise.all(children.map(child=>wait(child,'ready'))),results=Promise.all(children.map(child=>wait(child,'result'))),
      planner=Promise.race(children.map(child=>wait(child,'planner-start')));
    await ready;for(const child of children)child.send({type:'start'});
    await planner;for(const child of children)child.send({type:'release'});
    const completed=await results;assert.equal(completed.reduce((sum,row)=>sum+row.plannerCalls,0),1);
    assert.equal(completed.filter(row=>row.status==='delivered').length,1);
    const verify=context.openPeer(),jobs=verify.listCityRecords(guildId,{kind:'opening_cohort_job',includeGM:true,limit:10});
    try{assert.equal(jobs.length,1);assert.equal(verify.listTurnPublications(guildId,jobs[0].data.turn_id).filter(row=>row.status==='delivered').length,1);}
    finally{verify.close();}
  }finally{
    await Promise.all(children.map(child=>child.exitCode!==null||child.signalCode!==null?null:new Promise(resolve=>{child.once('exit',resolve);child.kill();})));
    close();
  }
});
