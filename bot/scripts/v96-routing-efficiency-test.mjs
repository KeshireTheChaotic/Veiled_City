/** TOK05–07: actual injected GM requests/native cycles; counts are synthetic, no live provider or Discord. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {OperationalMetrics} from '../src/operational-metrics.js';
import {ContentIndex} from '../src/content.js';
import {FakeResponses} from './contract-fixtures.mjs';
import {configureSimulationEntity,runNpcDirector,simulationCandidates} from '../src/simulation.js';
import {queueDirectorAfterPartyTurn} from '../src/director.js';
import {pendingRollRequests} from '../src/roll-requests.js';
import {actionReviewInbox} from '../src/gm-action-review.js';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {captureWorldInput} from '../src/autonomous-world.js';
import {isTurnReplay} from '../src/turn-attempts.js';
import {configureCityFlags} from '../src/city-core.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';

const make=(f,ai)=>new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
  metrics:new OperationalMetrics(),config:{gmModel:'offline-unchanged',routerModel:'offline-router',
    openaiMaxRetries:0,maxRecentMessages:5,maxContentChunks:1}});
function waiting(){
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,{decision:'no_change',reason:'No change.',confidence:100}]));
  state_review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  return {respond:true,narration:'What would you like to do next?',narrative_claims:[],gm_world_parts:[],private_messages:[],events:[],
    relationships:[],handouts:[],npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],
    player_intents:[{type:'other',source_span:'I wait.',target_name:'',target_key:'',destination:'unspecified',operation:'wait',utterance:'',
      excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Owner waits.'}],state_review};
}
function npcs(f,guild=f.guild){
  f.db.ensureCampaign(guild);
  for(let i=0;i<3;i++){
    f.db.upsertNpcProfile(guild,{npcKey:`witness-${i}`,displayName:`Witness ${i}`,activityTier:'active'});
    f.db.upsertNpcGoal(guild,{npcKey:`witness-${i}`,goalKey:'observe',objective:'Watch the terminal',status:'active'});
    configureSimulationEntity(f.db,guild,'npc',`witness-${i}`,{activity_tier:'active',location_key:'terminal'});
  }
}

test('TOK06 already cancelled logical operation dispatches zero provider requests',async()=>{
  let calls=0;const controller=new AbortController();controller.abort();
  const metrics=new OperationalMetrics(),gm=new GMService({db:{},content:{},metrics,config:{openaiMaxRetries:5},
    ai:{responses:{create:async()=>{calls++;return {output_text:'{}'};}}}});
  await assert.rejects(()=>gm.requestStructured({model:'offline',input:'synthetic'},{guildId:'g',signal:controller.signal}),
    error=>error.code==='AI_GENERATION_DEADLINE');
  assert.equal(calls,0);assert.equal(metrics.snapshot('g').stages.model_request,undefined);
});

test('TOK06 late provider success is unusable but its reported usage is counted once',async()=>{
  let calls=0;const controller=new AbortController(),metrics=new OperationalMetrics();
  const gm=new GMService({db:{},content:{},metrics,config:{openaiMaxRetries:5},ai:{responses:{create:async(req,options)=>{
    calls++;assert.equal(options.maxRetries,0);assert.equal(options.signal,controller.signal);controller.abort();
    return {output_text:'{}',usage:{input_tokens:12,output_tokens:4,input_tokens_details:{cached_tokens:6}}};
  }}}});
  await assert.rejects(()=>gm.requestStructured({model:'offline',input:'synthetic'},{guildId:'g',signal:controller.signal}),
    error=>error.code==='AI_GENERATION_DEADLINE');
  const row=metrics.snapshot('g').stages.model_request;
  assert.equal(calls,1);assert.equal(row.count,1);assert.equal(row.failures,1);assert.equal(row.usage_reported,1);
  assert.equal(row.input_tokens,12);assert.equal(row.cached_input_tokens,6);assert.equal(row.retries,0);
});

test('TOK06 actual combined late turn never returns generated state or enters native commit',()=>nativeFixture(async f=>{
  const controller=new AbortController();let calls=0;
  captureWorldInput(f.db,f.guild,f.pcs[0].owner_user_id,f.pcs[0].id,'expired','I wait.');
  const gm=make(f,{responses:{create:async()=>{calls++;controller.abort();return {output_text:JSON.stringify(waiting())};}}});
  const resources=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  await assert.rejects(()=>gm.runTurn({guildId:f.guild,actorUserId:f.pcs[0].owner_user_id,actorName:f.pcs[0].name,
    messageText:'I wait.',messageId:'expired',signal:controller.signal}),error=>error.code==='AI_GENERATION_DEADLINE');
  assert.equal(calls,1);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),resources);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'typed_intent',includeGM:true}).length,0);
}));

test('TOK07 identical concurrent native NPC cycle shares one actual batch request and one committed tick',()=>nativeFixture(async f=>{
  npcs(f);const ai=new FakeResponses([{actions:[]},{actions:[]}]),gm=make(f,ai),before=f.db.getSimulationClock(f.guild).tick;
  const options={db:f.db,gm,guildId:f.guild,layer:'round',cycleKey:'same-native-cycle',query:'terminal'};
  await Promise.all([runNpcDirector(options),runNpcDirector(options)]);
  assert.equal(ai.requests.length,1,'concurrent preparation must not pay twice for the same native cycle');
  assert.equal(f.db.getSimulationClock(f.guild).tick,before+1);
  assert.equal(gm.npcPlanFlights.size,0,'completed proposals are not cached');
  for(let i=0;i<3;i++)assert(ai.requests[0].input.includes(`witness-${i}`),'eligible NPCs remain batched');
  f.restart();await runNpcDirector({...options,db:f.db});
  assert.equal(ai.requests.length,1,'durable completed cycle remains zero-call after restart');
  assert.equal(f.db.getSimulationClock(f.guild).tick,before+1);
}));

test('TOK07 failed shared generation clears its in-flight slot without a native tick or stranded retry',()=>nativeFixture(async f=>{
  npcs(f);const ai=new FakeResponses([new Error('synthetic unavailable'),{actions:[]}]),gm=make(f,ai);
  const options={db:f.db,gm,guildId:f.guild,layer:'scene',cycleKey:'retry-native-cycle',query:'terminal'};
  const before=f.db.getSimulationClock(f.guild).tick,results=await Promise.allSettled([runNpcDirector(options),runNpcDirector(options)]);
  assert(results.every(r=>r.status==='rejected'));assert.equal(ai.requests.length,1);
  assert.equal(gm.npcPlanFlights.size,0,'failure cannot strand a future retry');
  assert.equal(f.db.getSimulationClock(f.guild).tick,before);
  await runNpcDirector(options);assert.equal(ai.requests.length,2);assert.equal(f.db.getSimulationClock(f.guild).tick,before+1);
}));

test('TOK07 different guilds and real new cycles remain independent, quiet/paused paths need no provider',()=>nativeFixture(async f=>{
  npcs(f);npcs(f,'other-guild');const ai=new FakeResponses([{actions:[]},{actions:[]},{actions:[]}]),gm=make(f,ai);
  const options={db:f.db,gm,guildId:f.guild,layer:'scene',cycleKey:'shared-name',query:'terminal'};
  await Promise.all([runNpcDirector(options),runNpcDirector({...options,guildId:'other-guild'})]);
  assert.equal(ai.requests.length,2);
  await runNpcDirector({...options,cycleKey:'genuinely-new'});assert.equal(ai.requests.length,3);
  const tick=f.db.getSimulationClock(f.guild).tick;
  configureCityFlags(f.db,f.guild,{narrative_relevance:true},'gm');
  await runNpcDirector({...options,cycleKey:'quiet',query:'OOC hello'});assert.equal(ai.requests.length,3);
  assert.equal(f.db.getSimulationClock(f.guild).tick,tick);
  f.db.setDirectorPaused(f.guild,true);await runNpcDirector({...options,cycleKey:'paused'});
  assert.equal(ai.requests.length,3);assert.equal(f.db.getSimulationClock(f.guild).tick,tick);
}));

test('TOK05 native queries zero; direct combined one; assisted router plus combined two; no postcommit replay',()=>nativeFixture(async f=>{
  const pc=f.pcs[0],ai=new FakeResponses([waiting(),{respond:true,reason:'Synthetic in-world input'},waiting()]),gm=make(f,ai);
  pendingRollRequests(f.db,f.guild,pc.owner_user_id);actionReviewInbox(f.db,f.guild,pc.owner_user_id);
  assert.equal(ai.requests.length,0);
  const directStart=performance.now();
  const message={id:'direct-one',content:'I wait.',author:{id:pc.owner_user_id,username:pc.name}};
  assert(await gm.shouldRespond({guildId:f.guild,message,mode:'assisted',directMention:true}));
  const assignment=f.db.controlledAssignment(f.session.id,pc.owner_user_id),scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,message.id,message.content);
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:message.id,actorPrincipal:pc.owner_user_id,audience:'party'});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,messageText:message.content,
    actorAssignment:assignment,messageId:message.id});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:'call budget',
    meta:{messageId:message.id,turnId:attempt.turn_id,channelId:'offline-play'}});
  await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,async()=>({messageId:'direct-sent',channelId:'offline-play'}));
  const directMs=performance.now()-directStart,assistedStart=performance.now();
  assert.equal(ai.requests.length,1);assert(isTurnReplay(f.db.getTurnAttempt(attempt.turn_id)));
  assert(await gm.shouldRespond({guildId:f.guild,message:{...message,id:'assisted-two'},mode:'assisted'}));
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,'assisted-two','I wait.');
  const assisted=await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,messageText:'I wait.',actorAssignment:assignment,messageId:'assisted-two'});
  const next=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:'assisted-two',actorPrincipal:pc.owner_user_id,audience:'party'});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:assisted,scope,speaker:pc.name,label:'assisted call budget',
    meta:{messageId:'assisted-two',turnId:next.turn_id,channelId:'offline-play'}});
  await deliverTurnOutbox(f.db,f.guild,next.turn_id,async()=>({messageId:'assisted-sent',channelId:'offline-play'}));
  assert.equal(ai.requests.length,3,'one direct plus a distinct two-call assisted turn');
  assert.equal(ai.requests[0].model,'offline-unchanged');assert.equal(ai.requests[2].model,'offline-unchanged');
  assert.equal(gm.metrics.snapshot(f.guild).stages.model_request.usage_unknown,3);
  const metrics=gm.metrics.snapshot(f.guild),assistedMs=performance.now()-assistedStart;
  console.log(JSON.stringify({measurement:'TOK05_synthetic_full_turn',native_requests:0,direct_requests:1,assisted_requests:2,
    full_turn_including_fake_delivery_ms:{direct:directMs,assisted:assistedMs},samples_per_flow:1,
    model_stage:metrics.stages.model_request.latency_ms,reported_tokens:null,cached_tokens:null,usage_unknown:3,
    retries:metrics.stages.model_request.retries,live_requests:0,billable_tokens:0}));
}));

test('TOK07 native four-owner cadence queues once, persists across restart and does not invent a per-message pass',()=>nativeFixture(f=>{
  const review={scene:{decision:'continue',label:'',reason:'Same scene'}};
  for(const pc of f.pcs.slice(0,3))assert.equal(queueDirectorAfterPartyTurn(f.db,f.session,pc.owner_user_id,review),null);
  const pending=queueDirectorAfterPartyTurn(f.db,f.session,f.pcs[3].owner_user_id,review);
  assert.equal(pending.layer,'round');f.restart();assert.deepEqual(f.db.getPendingDirectorPass(f.session.id),pending);
  assert.deepEqual(queueDirectorAfterPartyTurn(f.db,f.session,f.pcs[0].owner_user_id,review),pending);
  assert.equal(f.db.getDirectorState(f.session.id).pass_counts.round,0);
}));

test('TOK07 in-flight proposal sharing invalidates on current owner/context and model; no GM-secret promotion',()=>nativeFixture(async f=>{
  npcs(f);f.db.addFact(f.guild,{content:'UNOWNED_GM_SECRET_MARKER',visibility:'gm'});
  const ai=new FakeResponses([{actions:[]},{actions:[]},{actions:[]}]),gm=make(f,ai);
  const request=()=>gm.planNpcActions({guildId:f.guild,layer:'scene',query:'terminal',cycleKey:'same-locator',
    candidates:simulationCandidates(f.db,f.guild,{layer:'scene',query:'terminal'})});
  const first=request();
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,f.pcs[0].id);
  f.db.upsertNpcKnowledge(f.guild,{npcKey:'witness-0',knowledgeKey:'current',content:'Current native NPC testimony.',beliefState:'known'});
  const second=request();gm.config.gmModel='explicit-offline-model-change';const third=request();
  const results=await Promise.all([first,second,third]);
  assert.equal(ai.requests.length,3,'changed full requests must not share stale preparation');
  assert.notEqual(ai.requests[0].input,ai.requests[1].input);assert.equal(ai.requests[2].model,'explicit-offline-model-change');
  assert(ai.requests.every(r=>!r.input.includes('UNOWNED_GM_SECRET_MARKER')));
  assert.notStrictEqual(results[0],results[1]);assert.equal(gm.npcPlanFlights.size,0);
  assert.equal(f.db.listSimulationRecords(f.guild,{kind:'cycle'}).length,0,'proposal preparation is never outcome authority');
}));

test('TOK06 structured repair keeps the same operation signal and no hidden SDK retry fan-out',async()=>{
  const controller=new AbortController(),metrics=new OperationalMetrics(),seen=[];
  const gm=new GMService({db:{},content:{},metrics,config:{openaiMaxRetries:0},ai:{responses:{create:async(req,options)=>{
    seen.push(options);return {output_text:seen.length===1?'{malformed':'{}'};
  }}}});
  assert.deepEqual(await gm.requestStructured({model:'offline',input:'synthetic'},{guildId:'g',signal:controller.signal}),{});
  assert.equal(seen.length,2);assert(seen.every(options=>options.signal===controller.signal&&options.maxRetries===0));
  const report=metrics.snapshot('g');assert.equal(report.stages.structured_retry.count,1);
  assert.equal(report.stages.model_request.count,2);assert.equal(report.stages.model_request.usage_unknown,2);
});

test('TOK06 a valid server retry delay beyond the bounded wait is deferred, never retried early',async()=>{
  for(const hint of ['120',new Date(Date.now()+120000).toUTCString()]){
    let calls=0;const error=Object.assign(new Error('Synthetic rate limit'),{status:429,headers:new Headers({'retry-after':hint})});
    const gm=new GMService({db:{},content:{},config:{openaiMaxRetries:1},ai:{responses:{create:async()=>{
      calls++;if(calls===1)throw error;return {output_text:'{}'};
    }}}});
    await assert.rejects(()=>gm.requestStructured({model:'offline',input:'synthetic'},{guildId:'g'}),error);
    assert.equal(calls,1,'bounded deferral must not turn a long server wait into an early duplicate request');
  }
});
