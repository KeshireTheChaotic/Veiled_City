/** Opening completion: real planner/output/outbox and scoped native Director evidence, no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {FakeResponses,fakeInteraction} from './contract-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {scheduleSessionOpening,inspectSessionOpening} from '../src/session-opening.js';
import {runSessionOpening,sessionOpeningStatus} from '../src/session-opening-runner.js';
import {assemblyHookSources} from '../src/assembly-context.js';
import {assemblyReadiness} from '../src/assembly-readiness.js';
import {prepareOpeningEntryOpportunity} from '../src/session-opening-attendance.js';
import {bindDirectorNarrativeSource} from '../src/narrative-director-source.js';
import {openingWorldOpportunities} from '../src/opening-world-bridge.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {incomingFixture} from './v94-incoming-fixtures.mjs';
import {setup,candidate} from './narrative-fixtures.mjs';
import {recordScenePresence} from '../src/scene-continuity.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {adjudicateAcceptedIntent} from '../src/rules-arbitration.js';
import {createArbitrationOrigin,arbitrationPromptBoard,bindArbitrationTurn} from '../src/scene-intent-board.js';
import {applyUnifiedArbitration} from '../src/gm-unified-arbitration.js';
import {executeUnifiedGmActions} from '../src/gm-native-rolls.js';
import {publishPreRollFearNotice} from '../src/pre-roll-fear-notice.js';
import {inspectPreRollFear,assertPreRollFearRollAllowed} from '../src/pre-roll-fear.js';
import {reviewIncomingAttack,confirmIncomingDefense,rollArbitratedIncomingAttack,resolveIncomingDamage} from '../src/pc-incoming.js';
import {reviewPcDeathMove,choosePcDeathMove} from '../src/pc-death.js';
import {handleCommand} from '../src/commands.js';
import {worldNarrativeBridgePacket,revalidateWorldNarrativeSignal,canonicalNarrativeCause} from '../src/world-narrative-bridge.js';

function fixture(f){
  const sent={party:[],private:[]};let sequence=0;
  f.db.db.prepare('UPDATE campaigns SET play_channel_id=? WHERE guild_id=?').run('opening-integration-play',f.guild);
  for(const [i,pc] of f.pcs.entries())f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=[`Personal owner thread ${i}: investigate your unpaid invoice.`];});
  const guild={id:f.guild,channels:{fetch:async id=>id==='opening-integration-play'?{id,isTextBased:()=>true,
    send:async body=>{sent.party.push(body.content||body);return{id:`public-${++sequence}`,channelId:id};}}:null},
    members:{fetch:async user=>({send:async body=>{sent.private.push({user,text:body.content||body});return{id:`private-${++sequence}`,channelId:`dm-${user}`};}})}};
  scheduleSessionOpening(f.db,{id:'opening-integration-start',guildId:f.guild,user:{id:'operator'}},f.session,()=>true);
  const plan={public_opening:'RAW UNVERIFIED SHARED DRAFT',public_parts:[],convergence_goal:'Independent inquiries in a shared camera.',bonds:[],gm_notes:'GM SECRET',
    character_entries:f.pcs.map(pc=>({discord_user_id:pc.owner_user_id,character_id:pc.id,character_name:pc.name,
      hook_source_refs:assemblyHookSources(f.db,f.guild,pc.id).slice(0,1).map(s=>s.id),private_hook:'You decide to follow Choso.',private_parts:[],public_cue:'',stay_reason:''}))};
  return{guild,sent,plan};
}
const emptyWriter={version:9,acts:[],fiction_delta:[]};

test('opening writer failure holds only its expressive draft; independent exact-source hooks and public delivery continue',()=>nativeFixture(async f=>{
  const x=fixture(f),provider=Object.assign(new Error('GM SECRET provider body must never enter telemetry'),{status:400}),
    ai=new FakeResponses([x.plan,emptyWriter,provider,emptyWriter,emptyWriter,emptyWriter]),
    gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,config:{assemblyModel:'offline',gmModel:'offline',
      assemblyMaxOutputTokens:3000,maxContentChunks:1,maxRecentMessages:0,openaiMaxRetries:0}}),
    before=f.pcs.map(pc=>structuredClone(f.db.getCharacter(pc.id).data.resources));
  const job=await runSessionOpening({db:f.db,guild:x.guild,gm});
  assert.equal(x.sent.private.length,4,'a failed isolated writer cannot discard other owner openings');
  for(const [i,pc] of f.pcs.entries()){
    const own=x.sent.private.find(r=>r.user===pc.owner_user_id);assert(own);assert(own.text.includes(`Personal owner thread ${i}`));
    for(let other=0;other<4;other++)if(other!==i)assert(!own.text.includes(`Personal owner thread ${other}`));
  }
  assert.equal(x.sent.party.length,1);assert(!JSON.stringify(x.sent).includes('GM SECRET'));
  assert(!JSON.stringify(x.sent).includes('You decide to follow Choso.'));
  assert.equal(ai.requests.length,6,'no repair/provider retry is added for a failed owner');
  assert.match(sessionOpeningStatus(job),/authoring.*held|held.*authoring/i);
  const inspection=fakeInteraction({sub:'assembly-status'});
  Object.assign(inspection,{id:'opening-integration-status',guildId:f.guild,guild:x.guild,commandName:'vc-session',isChatInputCommand:()=>true});
  inspection.user.username='Operator';
  await handleCommand(inspection,{db:f.db,gm});
  assert(inspection.deliveries.every(d=>d.ephemeral));assert.match(inspection.deliveries.map(d=>d.content).join('\n'),/quarantined=true/);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
  f.restart();await runSessionOpening({db:f.db,guild:x.guild,gm});
  assert.equal(ai.requests.length,6);assert.equal(x.sent.private.length,4);assert.equal(x.sent.party.length,1);
}));

test('read-only opening readiness reports revoked job proof as held without blocking unrelated status/gameplay',()=>nativeFixture(f=>{
  fixture(f);const job=inspectSessionOpening(f.db,f.guild,f.session.id);
  indexWorldEvent(f.db,f.guild,{key:job.source_event,status:'retracted'},'gm');
  const before=f.pcs.map(pc=>structuredClone(f.db.getCharacter(pc.id).data));
  const readiness=assemblyReadiness(f.db,f.session);
  assert.equal(readiness.opening_status,'source_review_required');assert.equal(readiness.pending,true);
  assert.match(readiness.guidance,/review/i);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data),before);
}));

test('the initial opening requests scoped world opportunities in the existing planner call and acknowledged coverage closes them',()=>nativeFixture(async f=>{
  const x=fixture(f),scope={mode:'private',actorUserId:f.pcs[0].owner_user_id,actorCharacterId:f.pcs[0].id},
    signal=worldNarrativeBridgePacket(f.db,f.guild,scope).signals.find(s=>s.kind==='opening_opportunity_request');
  assert(signal,'initial attendance must not depend on a second post-start check-in to request world opportunities');
  assert.equal(signal.source_refs[0].kind,'session_opening_job');assert.equal(signal.execution_authority,false);assert.equal(signal.publication_authority,false);
  assert.equal(revalidateWorldNarrativeSignal(f.db,f.guild,signal,scope),true);
  assert(openingWorldOpportunities(f.db,f.guild,scope).requests.some(s=>s.id===signal.id));
  const publicSignals=worldNarrativeBridgePacket(f.db,f.guild,{mode:'party'}).signals;
  assert(publicSignals.some(s=>s.kind==='opening_opportunity_request'));
  assert(!JSON.stringify(publicSignals).includes('Personal owner thread'));
  const director=bindDirectorNarrativeSource(f.db,f.guild,{act:false},scope,'round',{},new ContentIndex(path.resolve('../content')));
  assert.equal(canonicalNarrativeCause(f.db,f.guild,director,scope),null,'opening requests cannot bootstrap fictional interest or canon');
  const ai=new FakeResponses([x.plan]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{assemblyModel:'offline',assemblyMaxOutputTokens:3000,maxContentChunks:1,maxRecentMessages:0}});
  await gm.planAssembly({guildId:f.guild});assert.equal(ai.requests.length,1);
  assert(ai.requests[0].input.includes(signal.id),'same planner request consumes the native opening diagnostic');
  await runSessionOpening({db:f.db,guild:x.guild,gm:{planAssembly:async()=>x.plan}});
  assert.equal(revalidateWorldNarrativeSignal(f.db,f.guild,signal,scope),false,'delivered source hook is not an unfulfilled request');
  assert(!worldNarrativeBridgePacket(f.db,f.guild,scope).signals.some(s=>s.kind==='opening_opportunity_request'));
  assert(!worldNarrativeBridgePacket(f.db,f.guild,{mode:'party'}).signals.some(s=>s.kind==='opening_opportunity_request'),
    'a completed job cannot keep requesting initial camera generation after its bounded attempt');
  assert.equal(inspectSessionOpening(f.db,f.guild,f.session.id).data.slots.find(s=>s.audience==='party').fallback,true,
    'retiring the operational request is not proof that original prose was delivered');
}));

test('assembly readiness reflects native automatic completion, not a mandatory manual assemble ritual',()=>nativeFixture(async f=>{
  const x=fixture(f),queued=assemblyReadiness(f.db,f.session);
  assert(!/GM.*runs?[^\n]*assemble|run[^\n]*assemble[^\n]*create/i.test(queued.guidance),'queued automatic work is not a required manual command');
  await runSessionOpening({db:f.db,guild:x.guild,gm:{planAssembly:async()=>x.plan}});
  assert.equal(inspectSessionOpening(f.db,f.guild,f.session.id).status,'completed');
  const completed=assemblyReadiness(f.db,f.session);
  assert.equal(completed.pending,false);assert.match(completed.guidance,/completed|delivered/i);
}));

test('opening opportunity lookup is audience-scoped before its bound, not hidden by unrelated private event traffic',()=>nativeFixture(f=>{
  const pc=f.pcs[0],scope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  prepareOpeningEntryOpportunity(f.db,f.guild,pc.owner_user_id,pc.id,'opening-bridge-live-request');
  const ref=bindDirectorNarrativeSource(f.db,f.guild,{act:false},scope,'round',{},new ContentIndex(path.resolve('../content')));
  const before=openingWorldOpportunities(f.db,f.guild,scope);assert.equal(before.beats.length,1);
  for(let i=0;i<120;i++)indexWorldEvent(f.db,f.guild,{key:`other-private-traffic-${i}`,kind:'observation',title:'Unrelated private event',
    source_id:'gm',session_id:f.session.id,visibility:'character',subject_key:f.pcs[1].id},'gm');
  assert.deepEqual(openingWorldOpportunities(f.db,f.guild,scope).beats,before.beats);
  assert.equal(openingWorldOpportunities(f.db,f.guild,{mode:'party'}).beats.length,0);
  assert.equal(openingWorldOpportunities(f.db,f.guild,{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}).beats.length,0);
  indexWorldEvent(f.db,f.guild,{key:ref,status:'retracted'},'gm');
  assert.equal(openingWorldOpportunities(f.db,f.guild,scope).beats.length,0,'old ranking hints cannot survive source revocation');
}));

function nativeInterrupt(f,{lastHp=false}={}){
  const encounter=incomingFixture({...f,pcs:[f.pcs[1],f.pcs[0],...f.pcs.slice(2)]}),
    x=setup(f,{text:'I inspect the counter.',privateScene:true});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,
    roll_collaboration:true,narrative_encounters:true}});
  f.db.changeFear(f.guild,2);f.db.updateCharacterData(x.pc.id,d=>{d.level=1;if(lastHp)d.resources.hp.current=5;});
  const placement=indexWorldEvent(f.db,f.guild,{key:'opening-interrupt-guard-placement',kind:'observation',source_id:'gm',
    title:'GM-established local guard position',session_id:f.session.id,scene:f.db.getWorldEvent(f.guild,encounter.input.source).scene,
    location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:placement.event_key,
    location_key:'terminal',zone:'interior',range:'Close',visibility:'party'},'gm');
  const [accepted]=persistPlayerIntents(f.db,f.guild,[{...candidate(x.text).player_intents[0],type:'search',operation:'inspect'}],x.scope,{messageId:x.messageId}),
    adjudicated=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:accepted.record_key,mode:'roll_required',trait:'Instinct',kind:'action',
      difficulty:12,risk:'Visible clue may be missed.',stakes:'Find visible evidence; no guaranteed success.',rawRefs:['srd:action-rolls'],
      explanation:'A current source-owned uncertain investigation.'},'native:unified-gm',{scope:x.scope}),
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),ref=arbitrationPromptBoard(f.db,f.guild,origin).npc_candidates.find(n=>n.actor_key==='guard').intent_refs.attack,
    result={unified_arbitration:{version:2,npc_intents:[{actor_key:'guard',operation:'attack',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]}],
      decisions:[{intent_ref:ref,disposition:'gm_attack_roll',rule_basis_refs:['srd:adversary-attacks'],difficulty:null,trait:null,
        stakes_kind:'native_attack',stakes:'The guard attempts a native standard attack.',reason:'One native interruption.',difficulty_reason:'Current Evasion.',
        feature_ref:'standard_attack',experience_ref:'',advantage:false,disadvantage:false}],
      pre_roll_fear:[{request_ref:adjudicated.roll_request_ref,npc_intent_ref:ref}]}};
  bindArbitrationTurn(result,origin);const decisions=applyUnifiedArbitration(f.db,f.guild,result,[accepted]);
  assert.equal(decisions[0].status,'gm_action_ready',decisions[0].data.reason);
  const [attack]=executeUnifiedGmActions(f.db,f.guild,decisions,{library:encounter.lib});
  assert.equal(attack.kind,'pc_incoming_attack');
  return{...x,attack,library:encounter.lib,request:f.db.getCityRecord(f.guild,'roll_request',adjudicated.roll_request_ref),
    key:`pre-roll-fear:${adjudicated.roll_request_ref}`};
}

for(const terminal of ['miss','owner_death'])test(`opening coexistence with a real pre-roll Fear ${terminal} preserves native gates, choices and acknowledged openings`,()=>nativeFixture(async f=>{
  const x=fixture(f),fear=nativeInterrupt(f,{lastHp:terminal==='owner_death'}),before=f.pcs.map(pc=>structuredClone(f.db.getCharacter(pc.id).data.resources));
  let calls=0;const gm={planAssembly:async()=>{calls++;return x.plan;}};
  const job=await runSessionOpening({db:f.db,guild:x.guild,gm});assert.equal(job.status,'completed');
  assert.equal(x.sent.private.length,4);assert.equal(f.db.getCampaign(f.guild).fear,2);
  assert.equal(inspectPreRollFear(f.db,f.guild,fear.key).row.status,'awaiting_announcement');
  assert.throws(()=>assertPreRollFearRollAllowed(f.db,f.guild,fear.request),/Fear|interrupt/i);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
  assert(!JSON.stringify(x.sent).includes(fear.attack.record_key),'assembly does not replay a private attack notice into other openings');
  await publishPreRollFearNotice(f.db,f.guild,fear.key,async()=>({ok:true,messageId:'opening-fear-ack',channelId:'owner-private'}));
  reviewIncomingAttack(f.db,f.guild,fear.pc.owner_user_id,fear.attack.record_key,{library:fear.library});
  confirmIncomingDefense(f.db,f.guild,fear.pc.owner_user_id,fear.attack.record_key);
  rollArbitratedIncomingAttack(f.db,f.guild,fear.attack.record_key,{library:fear.library,rng:s=>terminal==='miss'?1:Math.min(12,s)});
  if(terminal==='owner_death'){
    assert.equal(inspectPreRollFear(f.db,f.guild,fear.key).row.status,'executing');
    resolveIncomingDamage(f.db,f.guild,fear.pc.owner_user_id,fear.attack.record_key,{armor:false,library:fear.library});
    assert.throws(()=>assertPreRollFearRollAllowed(f.db,f.guild,fear.request),/death|pending/i);
    const death=`${fear.attack.record_key}:death`,view=reviewPcDeathMove(f.db,f.guild,fear.pc.owner_user_id,death);let n=0;
    choosePcDeathMove(f.db,f.guild,fear.pc.owner_user_id,{request:death,expected_revision:view.revision,move:'risk_it_all'},
      {interactionId:'opening-fear-death',rng:()=>[1,2][n++]});
    assert.equal(f.db.getCharacter(fear.pc.id).status,'dead');
  }
  assert.equal(inspectPreRollFear(f.db,f.guild,fear.key,{current:false}).row.status,'completed');
  assert.equal(f.db.getCampaign(f.guild).fear,1);f.restart();await runSessionOpening({db:f.db,guild:x.guild,gm});
  assert.equal(calls,1);assert.equal(x.sent.private.length,4);assert.equal(x.sent.party.length,1,'native terminal effects do not authorize opening replay');
}));
