/** MET01–MET12: offline operational measurements, tenant isolation and read-only native recovery reports. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {OperationalMetrics,operationalMetrics,parseModelPricing,measureStage,measureNative} from '../src/operational-metrics.js';
import {GMService} from '../src/gm.js';
import {nativeFixture,pvpTerms} from './v9-fixtures.mjs';
import {operationalReport} from '../src/operations/health.js';
import {handleCommand} from '../src/commands.js';
import {buildCommands} from '../src/command-definitions.js';
import {proposePvp,reviewPvp,respondPvp,choosePvp,rollPvp,progressPvp} from '../src/narrative-pvp.js';
import {prepareAuthorizedTurnOutput} from '../src/pvp-output.js';
import {queueTurnPublications,deliverTurnOutbox} from '../src/publication-outbox.js';
import {interactionFailure} from '../src/discord/interaction-lifecycle.js';
import {VoiceNarrator} from '../src/voice.js';
import {applyFearMove} from '../src/pvp-fear-moves.js';
import {captureWorldInput} from '../src/autonomous-world.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene} from '../src/scene-continuity.js';

function nativeMetricsOutput(f,quote){
  const key='operational-announcer',scene=currentScene(f.db,f.guild);
  f.db.upsertNpcProfile(f.guild,{npcKey:key,displayName:'Operational announcer'});
  f.db.setSimulationEntity(f.guild,'npc',key,{location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:`metrics-quote:${quote}`,kind:'observation',source_id:'human_gm',
    title:'Synthetic public quotation for telemetry redaction',visibility:'party',truth_status:'observed',session_id:scene.session_id,
    scene:scene.key,location_key:'terminal',details:{npc_key:key,quote}},'offline-gm');
  f.db.upsertNpcKnowledge(f.guild,{npcKey:key,knowledgeKey:quote,content:quote,sourceRef:source.event_key,beliefState:'known',isSecret:false});
  const result={narration:'Unverified metric fixture candidate',gm_world_parts:[{version:2,kind:'npc_composition',entity_key:key,tone:'plain',
    beats:[{op:'quote',source_ref:source.event_key,knowledge_key:quote,source_span:quote}]}]};
  return prepareAuthorizedTurnOutput(f.db,f.guild,result,{mode:'party'});
}

test('MET01/09/11 real reported usage, bounded samples and closed telemetry fields',()=>{
  const metrics=new OperationalMetrics({sampleLimit:3,guildLimit:2});
  metrics.record('model_request',{guildId:'one',durationMs:10,inputTokens:12,outputTokens:4,
    errorCode:'SECRET_PLAYER_TEXT',prompt:'PRIVATE_MARKER'});
  metrics.record('model_request',{guildId:'two',durationMs:99});
  const one=metrics.snapshot('one');
  assert.equal(one.stages.model_request.count,1,'another guild must not contaminate the report');
  assert.equal(one.stages.model_request.input_tokens,12);
  assert.equal(metrics.snapshot('two').stages.model_request.usage_unknown,1,'missing usage is not reported zero');
  assert.doesNotMatch(JSON.stringify(one),/SECRET_PLAYER_TEXT|PRIVATE_MARKER|one|two/);
});

test('MET01/06 provider retries are bounded, independently measured and cannot hide SDK attempts',async()=>{
  const metrics=new OperationalMetrics();let calls=0;
  const gm=new GMService({db:{},content:{},config:{openaiMaxRetries:1},metrics,ai:{responses:{create:async(req,options)=>{
    assert.equal(options.maxRetries,0);calls++;
    if(calls===1)throw Object.assign(new Error('PRIVATE_MARKER'),{status:429,code:'SECRET_API_KEY'});
    return {output_text:'{}'};
  }}}});
  await gm.requestStructured({model:'PRIVATE_MODEL_MARKER',input:'PRIVATE_PROMPT'},{guildId:'retry'});
  const report=metrics.snapshot('retry'),row=report.stages.model_request;
  assert.equal(calls,2);assert.equal(row.count,2);assert.equal(row.retries,1);assert.equal(row.failures,1);
  assert.equal(row.usage_unknown,2);assert.equal(row.usage_reported,0);
  assert.equal(row.cost_estimate_usd,0);assert.doesNotMatch(JSON.stringify([report,metrics.incidents('retry')]),/PRIVATE|SECRET/);
});

test('MET01/09 configured prices estimate reported usage only; unknown is not billed zero',()=>{
  const metrics=new OperationalMetrics({pricing:{offline:{input:2,output:8,cached_input:1}}});
  metrics.record('model_request',{guildId:'g',model:'offline',inputTokens:100,outputTokens:10,cachedInputTokens:50});
  metrics.record('model_request',{guildId:'g',model:'offline'});
  metrics.record('model_request',{guildId:'g',model:'unknown',inputTokens:100,outputTokens:10});
  const row=metrics.snapshot('g').stages.model_request;
  assert.equal(row.input_tokens,200);assert.equal(row.cost_estimate_usd,0.00023);
  assert.equal(row.models.offline.requests,2);assert.equal(row.models.offline.usage_unknown,1);
  assert.equal(row.unpriced_requests,1);assert.match(metrics.snapshot('g').costs,/NOT billed charges/);
  assert.throws(()=>parseModelPricing('{bad'),/valid JSON/);
  assert.throws(()=>parseModelPricing({offline:{input:-1,output:0}}),/nonnegative/);
  assert.throws(()=>parseModelPricing({offline:{input:1,output:1,secret:'PRIVATE'}}),/nonnegative/);
  metrics.configurePricing(Object.fromEntries(Array.from({length:32},(_,i)=>[`offline${i}`,{input:1,output:1}])));
  const bounded=new OperationalMetrics({pricing:metrics.pricing});
  bounded.record('model_request',{model:'UNKNOWN'});
  for(let i=0;i<32;i++)bounded.record('model_request',{model:`offline${i}`,inputTokens:1,outputTokens:1});
  assert.equal(Object.keys(bounded.snapshot().stages.model_request.models).length,33);
  assert.equal(bounded.snapshot().stages.model_request.models.offline31.requests,1);
});

test('MET02/09 concurrent measurements retain exact counts and bounded nearest-rank quantiles',async()=>{
  const metrics=new OperationalMetrics({sampleLimit:100,guildLimit:2,incidentLimit:3});
  await Promise.all(Array.from({length:1000},(_,i)=>Promise.resolve().then(()=>{
    metrics.record('gm',{guildId:'a',durationMs:i+1});
    metrics.incident('model',{guildId:'a',reference:`private-source-${i}`,code:'SECRET'});
  })));
  const row=metrics.snapshot('a').stages.gm;
  assert.equal(row.count,1000);assert.deepEqual(row.latency_ms,{samples:100,p50:950,p95:995,p99:999});
  row.count=0;row.error_codes.SECRET=1;row.models.private={requests:10};
  assert.equal(metrics.snapshot('a').stages.gm.count,1000);assert.deepEqual(metrics.snapshot('a').stages.gm.error_codes,{});
  assert.deepEqual(metrics.snapshot('a').stages.gm.models,{});
  assert.equal(metrics.incidents('a').length,3);
  for(const id of ['b','c'])metrics.record('gm',{guildId:id});
  assert.equal(metrics.tenants.size,2);assert.deepEqual(metrics.snapshot('a').stages,{});
  assert.equal(metrics.tenants.size,2,'read does not allocate or evict');
  metrics.record('PRIVATE_STAGE',{guildId:'c',errorCode:'SECRET'});
  const serialized=JSON.stringify([metrics.snapshot('c'),metrics.incidents('c')]);assert.doesNotMatch(serialized,/PRIVATE|SECRET/);
});

test('MET02 stage instrumentation propagates results/errors without repeating native work',async()=>{
  const metrics=new OperationalMetrics();let effects=0;
  assert.equal(await measureStage(metrics,'router',async()=>{effects++;return 3;},{guildId:'g'}),3);
  await assert.rejects(measureStage(metrics,'gm',async()=>{effects++;throw new Error('PRIVATE');},{guildId:'g'}),/PRIVATE/);
  assert.equal(measureNative('commit','stage-fixture',()=>{effects++;return 4;}),4);
  assert.throws(()=>measureNative('validate','stage-fixture',()=>{effects++;throw new Error('PRIVATE');}),/PRIVATE/);
  assert.equal(effects,4);assert.equal(metrics.snapshot('g').stages.gm.failures,1);
  assert.equal(operationalMetrics.snapshot('stage-fixture').stages.validate.failures,1);
});

test('MET02 native commit and router latency reflect production boundaries, not a second execution',()=>nativeFixture(async f=>{
  const pc=f.pcs[2],scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id},metrics=new OperationalMetrics();
  const gm=new GMService({db:f.db,content:{},config:{},metrics,ai:{responses:{create:async()=>({output_text:'{}'})}}});
  await gm.requestStructured({input:'PRIVATE'},{guildId:f.guild,label:'message router'});
  assert.equal(metrics.snapshot(f.guild).stages.router.count,1);
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,'metric-commit','I wait.');
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:'metric-commit',actorPrincipal:pc.owner_user_id,audience:'party'});
  const before=operationalMetrics.snapshot(f.guild).stages.commit?.count||0,resources=f.db.getCharacter(pc.id).data.resources;
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,scope,result:{respond:true,narration:'The terminal remains quiet.',
    player_intents:[],narrative_claims:[]},speaker:pc.name,label:'Offline metrics',
    meta:{messageId:'metric-commit',triggerText:'I wait.',turnId:attempt.turn_id}});
  const row=operationalMetrics.snapshot(f.guild).stages.commit;
  assert.equal(row.count-before,1);assert(row.latency_ms.p95>=0);
  assert.equal(f.db.getTurnAttempt(attempt.turn_id).committed,'yes');
  assert.equal(f.db.listTurnPublications(f.guild,attempt.turn_id).length,1);
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources,resources);
}));

function proposal(f){return proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{
  accepted_intent:f.accepted().record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});}
function pairedFear(f,p){
  const op=i=>{const view=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);return {
    proposal:p.record_key,expected_revision:p.data.terms_hash,round:view.round,expected_window_revision:view.window_revision,
    interaction_id:`metric-roll-${i}-${view.window_revision}`};};
  for(let i=0;i<2;i++){
    reviewPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);
    respondPvp(f.db,f.guild,f.pcs[i].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
      decision:'accept',interaction_id:`metrics-consent-${i}`});
  }
  for(let i=0;i<2;i++)choosePvp(f.db,f.guild,f.pcs[i].owner_user_id,{...op(i),trait:'Agility',attempt:'A harmless feint.'});
  for(let i=0;i<2;i++){let n=0;rollPvp(f.db,f.guild,f.pcs[i].owner_user_id,op(i),{rng:()=>[[3,10],[4,2]][i][n++]});}
}
const changes=db=>db.db.prepare('SELECT total_changes() AS n').get().n;
test('MET04/05/10/12 native Fear, consent and restart health are source-bound and strictly read-only',()=>nativeFixture(f=>{
  const p=proposal(f);pairedFear(f,p);
  const before=changes(f.db),report=operationalReport(f.db,f.guild,{authorized:true});
  assert.equal(changes(f.db),before);
  assert.equal(report.native.counts.find(r=>r.kind==='pvp_fear_trigger'&&r.status==='awaiting_move').count,1);
  assert.equal(report.native.counts.find(r=>r.kind==='pvp_consent'&&r.status==='accepted').count,2);
  const fear=report.incidents.find(r=>r.kind==='pvp_fear_trigger');
  assert.equal(fear.source_status,'active');assert.equal(fear.age_basis,'native_roll_created_at');assert(fear.age_seconds>=0);
  assert.match(fear.recovery,/due now/);assert.doesNotMatch(JSON.stringify(report),/Jaxon|Choso|player-0|source_span|terms_hash/);
  f.restart();const reopened=operationalReport(f.db,f.guild,{authorized:true,metrics:new OperationalMetrics()});
  assert.deepEqual(reopened.native,report.native);assert.equal(reopened.incidents.find(r=>r.kind==='pvp_fear_trigger').status,'awaiting_move');
  assert.notEqual(reopened.incidents[0].reference,report.incidents[0].reference,'salt rotation on restart');
}));

test('MET03/11 native quarantine and neutral projection telemetry contain no fictional content',()=>nativeFixture(f=>{
  const p=proposal(f),pc=f.pcs[2],scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const before=operationalMetrics.snapshot(f.guild).stages,result={narration:'PRIVATE_MARKER Choso apologizes for losing.',private_messages:[]};
  prepareAuthorizedTurnOutput(f.db,f.guild,result,scope,{sourceRef:p.source_event});
  const after=operationalMetrics.snapshot(f.guild).stages;
  assert.equal(after.narrative_projection.count-(before.narrative_projection?.count||0),1);
  assert.equal(after.narrative_quarantine.count-(before.narrative_quarantine?.count||0),1);
  assert.equal(after.neutral_fallback.count-(before.neutral_fallback?.count||0),1);
  const report=operationalReport(f.db,f.guild,{authorized:true});
  assert.equal(report.incidents.find(r=>r.kind==='pvp_output_quarantine').age_seconds,null);
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE_MARKER|apologizes|Choso/);
}));

test('MET05 declined and withdrawn native signatures are aggregate-only, never participation authority',()=>nativeFixture(f=>{
  let p=proposal(f),user=f.pcs[1].owner_user_id;
  reviewPvp(f.db,f.guild,user,p.record_key);
  respondPvp(f.db,f.guild,user,{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:'decline',interaction_id:'metrics-decline'});
  p=proposal(f);
  for(let i=0;i<2;i++){
    reviewPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);
    respondPvp(f.db,f.guild,f.pcs[i].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
      decision:'accept',interaction_id:`metrics-lock-${i}`});
  }
  respondPvp(f.db,f.guild,user,{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:'withdraw',interaction_id:'metrics-withdraw'});
  const before=changes(f.db),report=operationalReport(f.db,f.guild,{authorized:true});
  assert.equal(report.native.counts.find(r=>r.kind==='pvp_consent'&&r.status==='declined').count,1);
  assert.equal(report.native.counts.find(r=>r.kind==='pvp_consent'&&r.status==='revoked').count,1);
  assert.equal(changes(f.db),before);assert.doesNotMatch(JSON.stringify(report),/Jaxon|Choso|player-/);
}));

test('MET04/11 unsupported consequence stays due in GM reference-only review; inspection never reconciles',()=>nativeFixture(f=>{
  const p=proposal(f);pairedFear(f,p);
  const trigger=f.db.listCityRecords(f.guild,{kind:'pvp_fear_trigger',includeGM:true})[0];
  assert.throws(()=>applyFearMove(f.db,f.guild,'gm',{trigger:trigger.record_key,expected_revision:trigger.data.revision,
    decision:'untrusted-domain-cost',resource_delta:{hope:-1,stress:1}},{gm:true}),/closed native Fear move fields/i);
  const before=changes(f.db),report=operationalReport(f.db,f.guild,{authorized:true});
  const held=report.incidents.find(r=>r.kind==='pvp_fear_trigger');
  assert.equal(held.status,'needs_review');assert.match(held.recovery,/Fear is still due/);assert.equal(report.native.fear_review_events,1);
  assert.deepEqual(operationalReport(f.db,f.guild,{authorized:true,reference:held.reference}).incident,held);
  assert.equal(operationalReport(f.db,'other',{authorized:true,reference:held.reference}).incident,null);
  assert.equal(changes(f.db),before);assert.equal(f.db.getCityRecord(f.guild,'pvp_fear_trigger',trigger.record_key).status,'needs_review');
  assert(!report.native.counts.some(r=>r.kind==='pvp_fear_effect_receipt'));assert.doesNotMatch(JSON.stringify(report),/resource_delta|source_event|roller_character/);
}));

test('MET08/10/11/12 uncertain Discord delivery stays uncertain across queries/restart; successful sends are distinct',()=>nativeFixture(async f=>{
  const turn=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:'metrics-delivery',actorPrincipal:'offline',audience:'party'});
  queueTurnPublications(f.db,{guild:{id:f.guild},session:f.session,scope:{mode:'party'},turnId:turn.turn_id,
    result:nativeMetricsOutput(f,'PRIVATE_MARKER')});
  assert(f.db.listTurnPublications(f.guild,turn.turn_id)[0].payload.replaceAll('\\','').includes('PRIVATE_MARKER'));
  let calls=0;const before=operationalMetrics.snapshot(f.guild).stages.discord?.count||0;
  await deliverTurnOutbox(f.db,f.guild,turn.turn_id,async()=>{calls++;throw new Error('SECRET_KEY');});
  const n=changes(f.db),report=operationalReport(f.db,f.guild,{authorized:true});
  assert.equal(changes(f.db),n);assert.equal(report.native.publications.find(r=>r.status==='uncertain').count,1);
  assert.match(report.incidents.find(r=>r.kind==='publication').recovery,/Never blindly retry/);
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE_MARKER|SECRET_KEY/);
  assert.doesNotMatch(JSON.stringify(report).replaceAll('\\',''),/PRIVATE_MARKER|SECRET_KEY/);
  f.restart();assert.equal(operationalReport(f.db,f.guild,{authorized:true}).native.publications.find(r=>r.status==='uncertain').count,1);
  await deliverTurnOutbox(f.db,f.guild,turn.turn_id,async()=>{calls++;});assert.equal(calls,1);
  assert.equal(operationalMetrics.snapshot(f.guild).stages.discord.count-before,1);
  const done=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:'metrics-delivered',actorPrincipal:'offline',audience:'party'});
  queueTurnPublications(f.db,{guild:{id:f.guild},session:f.session,scope:{mode:'party'},turnId:done.turn_id,result:nativeMetricsOutput(f,'Safe output')});
  await deliverTurnOutbox(f.db,f.guild,done.turn_id,async()=>({ok:true,messageId:'acknowledged',channelId:'table'}));
  assert.equal(operationalReport(f.db,f.guild,{authorized:true}).native.publications.find(r=>r.status==='delivered').count,1);
}));

test('MET07/10 GM ops command denies players before writes and never publishes continuations or invokes models',()=>nativeFixture(async f=>{
  let calls=0;const files=[],interaction={guildId:f.guild,id:'ops-command',commandName:'vc-admin',
    user:{id:'not-a-player'},memberPermissions:{has:()=>false},member:{roles:{cache:new Map()}},isChatInputCommand:()=>true,
    options:{getSubcommand:()=> 'ops',getString:()=>null},
    deferReply:async p=>{assert.equal(p.ephemeral,true);interaction.deferred=true;},editReply:async p=>files.push(p)};
  const dependencies={db:f.db,gm:new Proxy({},{get(){calls++;throw new Error('must not access GM');}})};
  const before=changes(f.db);
  await assert.rejects(handleCommand(interaction,dependencies),/GM\/admin/);assert.equal(changes(f.db),before);
  interaction.memberPermissions.has=()=>true;
  await handleCommand(interaction,dependencies);assert.equal(calls,0);assert.equal(changes(f.db),before);
  assert.equal(files.length,1);assert.equal(files[0].files[0].name,'veilkeeper-operations.json');
  const data=JSON.parse(files[0].files[0].attachment.toString());assert(data.metrics);assert.equal(files[0].content.length<2000,true);
  assert.throws(()=>operationalReport(f.db,f.guild),/GM\/admin/);
  assert.equal(operationalReport(f.db,'another-guild',{authorized:true,reference:'absent'}).incident,null);
  const ops=buildCommands().find(r=>r.name==='vc-admin').options.find(r=>r.name==='ops');assert(ops);
}));

test('MET08 interaction failures are deduplicated and only opaque tenant-bound references survive',()=>{
  const interaction={guildId:'interaction-fixture',id:'PRIVATE_ID',createdTimestamp:Date.now()};
  const error=Object.assign(new Error('PRIVATE_MARKER'),{code:10062});
  interactionFailure(interaction,error);interactionFailure(interaction,error);
  const report=operationalMetrics.snapshot(interaction.guildId),incidents=operationalMetrics.incidents(interaction.guildId);
  assert.equal(report.stages.interaction_failure.count,1);assert.equal(incidents[0].code,'DISCORD_EXPIRED');
  assert.doesNotMatch(JSON.stringify([report,incidents]),/PRIVATE/);
  assert.notEqual(operationalMetrics.reference('another-guild','interaction',interaction.id),incidents[0].reference);
});

test('MET01/06 speech request has unknown token usage, and telemetry does not synthesize extra audio',async()=>{
  let calls=0;const fake={config:{voiceModel:'offline'},_speechRequest:async()=>{calls++;return Buffer.from('synthetic');}};
  await VoiceNarrator.prototype._synthesize.call(fake,'PRIVATE',{},'speech-fixture');
  const row=operationalMetrics.snapshot('speech-fixture').stages.model_request;
  assert.equal(calls,1);assert.equal(row.count,1);assert.equal(row.usage_unknown,1);assert.equal(row.cost_estimate_usd,0);
});

test('MET01/06 structured retry records each synthetic provider attempt exactly once',async()=>{
  const metrics=new OperationalMetrics();let calls=0;
  const gm=new GMService({db:{},content:{},config:{gmModel:'offline'},metrics,ai:{responses:{create:async()=>{
    calls++;return {output_text:calls===1?'invalid':'{}',usage:{input_tokens:10,output_tokens:2}};
  }}}});
  await gm.requestStructured({model:'offline',input:'PRIVATE_MARKER'},{guildId:'one'});
  assert.equal(calls,2);const row=metrics.snapshot('one').stages.model_request;
  assert.equal(row.count,2);assert.equal(row.retries,1);assert.equal(row.input_tokens,20);assert.equal(row.output_tokens,4);
  assert.equal(row.latency_ms.samples,2);assert(row.latency_ms.p95>=row.latency_ms.p50);
  assert.equal(metrics.snapshot('one').stages.gm.latency_ms.samples,1);
});
