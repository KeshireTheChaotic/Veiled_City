import test from 'node:test';
import assert from 'node:assert/strict';
import {runOpeningCohort,openingCohortStatus} from '../../src/opening-cohort-runner.js';
import {handleCommand} from '../../src/commands.js';
import {beginSessionOpeningAttempt,scheduleSessionOpening} from '../../src/session-opening.js';
import {disposableCampaign} from './p08-correction-fixture.mjs';

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
    assert.match(openingCohortStatus({status:'held_paused'}),/paused/);
    assert.match(openingCohortStatus({status:'needs_review'}),/review/);
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
