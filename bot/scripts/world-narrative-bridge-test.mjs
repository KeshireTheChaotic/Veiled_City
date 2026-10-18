/** Read-only native causal bridge: real adjudication, existing GM context, no model/Discord/network calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {actionFixture} from './v96-action-fixture.mjs';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision} from '../src/roll-requests.js';
import {setup,run} from './narrative-fixtures.mjs';
import {adjudicateAcceptedIntent} from '../src/rules-arbitration.js';
import {FakeResponses} from './contract-fixtures.mjs';
import {candidate} from './narrative-fixtures.mjs';
import {revalidateWorldNarrativeSignal,worldNarrativeBridgePacket} from '../src/world-narrative-bridge.js';
import {captureWorldInput,applyAutonomousWorld,configureWorldAuthority} from '../src/autonomous-world.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {bindDirectorNarrativeSource,directorBriefForAudience} from '../src/narrative-director-source.js';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {authorNarrativeRequests,establishNarrativeUnits} from '../src/narrative-authority.js';
import {establishNarrativeEntity} from '../src/autonomous-world.js';
import {canonicalInterestEvidence,noteNarrativeInterest} from '../src/narrative-salience.js';
import {unit} from './narrative-fixtures.mjs';
import {indexWorldEvent} from '../src/city-calendar.js';
import {sceneFictionHash} from '../src/scene-fiction-context.js';
import {currentScene,scenePresence} from '../src/scene-continuity.js';
function packet(f,pc=f.pcs[0],mode='party'){
  const gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai:null,config:{maxRecentMessages:2,maxContentChunks:1}});
  return gm.buildContext(f.guild,pc.owner_user_id,'What happens next?',null,{scope:mode}).world_narrative_bridge;
}
function resolve(f,privateScene=false){
  const x=actionFixture(f,privateScene?'I privately improvise with the cart.':'I improvise with the cart.',{privateScene});x.run();
  const q=f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true})[0];let index=0;
  contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:'bridge-native-roll'},
    {rng:()=>[8,5][index++]});return x;
}
function move(f,{id='bridge-move',text='I move to the terminal.',privateScene=false}={}){
  configureWorldAuthority(f.db,f.guild,{gm_authority_mode:'autonomous',auto_create_locations:true,auto_create_npcs:true},'fixture-gm');
  const x=setup(f,{text,privateScene,messageId:id}),intent={type:'move',source_span:text,target_name:'terminal',target_key:'terminal',
    destination:'unspecified',operation:'move',utterance:'',excluded_targets:[],framing:'immediate',resolution:'auto',reason:'Owner move.'};
  const [accepted]=persistPlayerIntents(f.db,f.guild,[intent],x.scope,{messageId:x.messageId});
  const results=applyAutonomousWorld(f.db,f.guild,{scene_actions:[{kind:'move',entity_ref:'terminal',source_span:text,zone:'scene'}],player_intents:[intent]},
    x.scope,{messageId:x.messageId});
  assert.equal(results?.[0]?.status,'arrived',JSON.stringify({accepted,results}));
  return {x,accepted,results};
}
test('WD bridge emits a scene transition only from the persisted native movement result and arrival receipt',()=>nativeFixture(f=>{
  const {x,accepted,results}=move(f),p=packet(f,x.pc),signal=p.signals.find(s=>s.kind==='scene_transition');
  assert(signal);assert.equal(signal.authority_disposition,'ranking_only');assert.equal(signal.origin_kind,'human_action');
  assert.equal(signal.causation_ref,x.sourceRef);assert(signal.source_refs.some(r=>r.kind==='typed_intent'&&r.key===accepted.record_key));
  assert(signal.source_refs.some(r=>r.kind==='world_event'&&r.key===results[0].source_event));
  assert.equal(signal.execution_authority,false);assert.equal(signal.publication_authority,false);
  assert.equal(packet(f,x.pc,'private').signals.filter(s=>s.kind==='scene_transition').length,1);
  f.restart();assert.equal(packet(f,x.pc).signals.filter(s=>s.id===signal.id).length,1);
}));
test('WD bridge holds scene transition on forged, stale, owner-mismatched, scene-mismatched, or private-audience receipts',()=>nativeFixture(f=>{
  const {x,accepted,results}=move(f),arrival=f.db.getWorldEvent(f.guild,results[0].source_event);
  assert.equal(packet(f,x.pc).signals.filter(s=>s.kind==='scene_transition').length,1);
  f.db.saveCityRecord(f.guild,{kind:'autonomous_turn',key:`forged:${x.messageId}`,source_event:x.sourceRef,visibility:'party',data:{results:[{...results[0],status:'arrived'}],session_id:f.session.id}});
  f.db.saveCityRecord(f.guild,{...accepted,key:accepted.record_key,data:{...accepted.data,arrival:'forged-arrival'}});
  assert.equal(packet(f,x.pc).signals.filter(s=>s.kind==='scene_transition').length,0);
  f.db.saveCityRecord(f.guild,{...accepted,key:accepted.record_key,data:{...accepted.data,arrival:arrival.event_key}});
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,arrival.event_key);
  assert.equal(packet(f,x.pc).signals.filter(s=>s.kind==='scene_transition').length,0);
}));
test('WD bridge holds scene transition for mismatched owner, scene, private audience, and duplicate receipts',()=>nativeFixture(f=>{
  const {x,results}=move(f),arrival=f.db.getWorldEvent(f.guild,results[0].source_event),turn=f.db.listCityRecords(f.guild,{kind:'autonomous_turn',includeGM:true})[0];
  assert.equal(packet(f,x.pc).signals.filter(s=>s.kind==='scene_transition').length,1);
  f.db.saveCityRecord(f.guild,{...turn,key:turn.record_key,data:{...turn.data,results:[...turn.data.results,...turn.data.results]}});
  assert.equal(packet(f,x.pc).signals.filter(s=>s.kind==='scene_transition').length,0,'duplicate native outcome pairing is ambiguous');
  f.db.saveCityRecord(f.guild,{...turn,key:turn.record_key,data:{...turn.data,results:turn.data.results}});
  f.db.db.prepare("UPDATE world_events SET details_json=json_set(details_json,'$.owner_user_id','somebody-else') WHERE guild_id=? AND event_key=?").run(f.guild,arrival.event_key);
  assert.equal(packet(f,x.pc).signals.filter(s=>s.kind==='scene_transition').length,0);
  f.db.db.prepare("UPDATE world_events SET details_json=json_set(details_json,'$.owner_user_id',?) WHERE guild_id=? AND event_key=?").run(x.pc.owner_user_id,f.guild,arrival.event_key);
  f.db.db.prepare("UPDATE world_events SET scene='stale-scene' WHERE guild_id=? AND event_key=?").run(f.guild,arrival.event_key);
  assert.equal(packet(f,x.pc).signals.filter(s=>s.kind==='scene_transition').length,0,'arrival must belong to current scene');
  f.db.db.prepare("UPDATE world_events SET scene=? WHERE guild_id=? AND event_key=?").run(currentScene(f.db,f.guild).key,f.guild,arrival.event_key);
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,arrival.details.input_source);
  assert.equal(packet(f,x.pc).signals.filter(s=>s.kind==='scene_transition').length,0,'stale owner source holds transition');
}));
test('WD bridge keeps an owner private arrival out of party signals and retains it for the same private owner',()=>nativeFixture(f=>{
  const {x}=move(f,{id:'bridge-private-move',text:'I privately move to the terminal.',privateScene:true});
  assert.equal(packet(f,x.pc,'party').signals.filter(s=>s.kind==='scene_transition').length,0);
  assert.equal(packet(f,x.pc,'private').signals.filter(s=>s.kind==='scene_transition').length,1);
}));
test('WD bridge sends a genuine native result once per original cause without exposing the declaration or replaying effects',()=>nativeFixture(f=>{
  const x=resolve(f),before=f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,resources=f.db.getCharacter(x.pc.id).data.resources,
    a=packet(f,x.pc,'private');assert(a);assert.equal(a.version,1);assert.equal(a.signals.length,1);
  assert.equal(a.signals[0].kind,'resolved_player_intent');assert.equal(a.signals[0].authority_disposition,'ranking_only');
  assert.equal(a.signals[0].origin_kind,'human_action');assert(!JSON.stringify(a).includes(x.intent.source_span));
  assert.equal(packet(f).signals.length,0,'Public declaration does not disclose the owner-private native roll result');
  f.restart();assert.deepEqual(packet(f,x.pc,'private'),a);assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,before);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
}));
test('WD bridge public native no-roll attempt completion is a source-grounded ranking signal, not an invented effect',()=>nativeFixture(f=>{
  const a=f.accepted(0,'I look at the counter.','terminal',{type:'observe',operation:'look',target:{kind:'location',key:'terminal',phrase:'counter',grounding:'known'}}),
    scope={mode:'party',actorUserId:f.pcs[0].owner_user_id,actorCharacterId:f.pcs[0].id};
  adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:a.record_key,mode:'no_roll',risk:'none',stakes:'none',rawRefs:['srd:action-rolls'],explanation:'Costless ordinary attempt.'},'ai_gm',{scope});
  const p=packet(f);assert.equal(p.signals.length,1);assert.equal(p.signals[0].authority_disposition,'ranking_only');
  assert.equal(f.db.listFactsForGM(f.guild).length,0);assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,0);
}));
test('WD bridge pending native rolls are not completed outcomes and background actors do not create signal or per-actor writes',()=>nativeFixture(f=>{
  const x=actionFixture(f);x.run();for(let i=0;i<120;i++)f.db.setSimulationEntity(f.guild,'npc',`background-${i}`,{name:`Background ${i}`,location_key:'remote'});
  const count=()=>f.db.db.prepare('SELECT COUNT(*) n FROM city_records').get().n,before=count();
  const p=packet(f);assert(p);assert.equal(p.signals.length,0);assert.equal(count(),before);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,0);
}));
test('WD bridge private native results stay with the current entitled owner, never another owner or public Director context',()=>nativeFixture(f=>{
  resolve(f,true);assert.equal(packet(f,f.pcs[0],'private').signals.length,1);
  assert.equal(packet(f,f.pcs[1],'private').signals.length,0);assert.equal(packet(f).signals.length,0);
}));
test('WD bridge native unfinished-task coverage requests help without declaring an event or granting a consequence',()=>nativeFixture(async f=>{
  const x=setup(f);await run(f,x,{fiction_delta:[],narrative_units:[]});
  const p=packet(f);assert(p);assert(p.signals.some(s=>s.kind==='unresolved_narrative_task'));
  assert(p.signals.every(s=>s.authority_disposition==='ranking_only'||s.authority_disposition==='diagnostic_only'));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,0);
}));
test('WD bridge forged outcome objects and accepted intent labels never become native completion',()=>nativeFixture(f=>{
  const a=f.accepted(0,'I look at the counter.','terminal',{type:'observe',operation:'look',target:{kind:'location',key:'terminal',phrase:'counter',grounding:'known'}});
  f.db.saveCityRecord(f.guild,{...a,key:a.record_key,status:'resolved',data:{...a.data,outcome_receipt:'fake-success'}});
  f.db.saveCityRecord(f.guild,{kind:'action_outcome_receipt',key:'fake-success',status:'resolved',source_event:a.source_event,visibility:'party',
    data:{action_id:a.record_key,actor_ref:a.data.actor,outcome:'resolved_no_roll',state_mutations:[],native_roll_refs:[],rule_refs:['srd:action-rolls'],gm:true}});
  assert.equal(packet(f).signals.length,0);assert.equal(f.db.listFactsForGM(f.guild).length,0);
}));
test('WD bridge restart proof is bound to exact native source, owner and recipient; revocation holds metadata without rerolling',()=>nativeFixture(f=>{
  const x=resolve(f,true),scope=x.scope,signal=packet(f,x.pc,'private').signals[0],saved=f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n;
  assert(revalidateWorldNarrativeSignal(f.db,f.guild,signal,scope));f.restart();assert(revalidateWorldNarrativeSignal(f.db,f.guild,signal,scope));
  assert.equal(revalidateWorldNarrativeSignal(f.db,f.guild,signal,{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}),false);
  assert.equal(revalidateWorldNarrativeSignal(f.db,f.guild,{...signal,origin_kind:'director',depth:0},scope),false);
  const action=f.db.listCityRecords(f.guild,{kind:'typed_intent',includeGM:true}).find(r=>r.data.outcome_receipt);
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,action.source_event);
  assert.equal(revalidateWorldNarrativeSignal(f.db,f.guild,signal,scope),false);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,saved);
}));
test('WD bridge cannot replay an earlier-scene signal or revive control following an ownership transfer',()=>nativeFixture(f=>{
  const x=resolve(f,true),signal=packet(f,x.pc,'private').signals[0];
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,x.pc.id);
  assert.equal(revalidateWorldNarrativeSignal(f.db,f.guild,signal,x.scope),false);
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(x.pc.owner_user_id,x.pc.id);
  f.db.setDirectorState(f.session.id,{scene_number:2});assert.equal(revalidateWorldNarrativeSignal(f.db,f.guild,signal,x.scope),false);
  assert(f.db.getCityRecord(f.guild,'action_outcome_receipt',signal.source_refs.find(r=>r.kind==='action_outcome_receipt').key));
}));
test('WD bridge metadata reaches the existing GM provider request without another router, judge or writer invocation',()=>nativeFixture(async f=>{
  const x=resolve(f,true),text='What happens next?',response=candidate(text);response.narration='What would you like to notice or do next?';response.gm_world_parts=[];
  const ai=new FakeResponses([response]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',maxRecentMessages:2,maxContentChunks:1,gmMaxOutputTokens:2000}});
  captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,'bridge-next',text,{privateScene:true});
  try{await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,messageId:'bridge-next',messageText:text,scope:'private'});}
  catch(error){throw new Error(`${error.message}; correction: ${ai.requests.at(-1)?.input.split('STRUCTURED TURN CORRECTION:').at(-1).slice(0,550)}`,{cause:error});}
  assert.equal(ai.requests.length,1);assert(ai.requests[0].input.includes('narrative_signal_v1'));
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,1);
}));
test('WD bridge no-session reports remain empty rather than breaking unrelated operational reads',()=>nativeFixture(f=>{
  f.db.endSession(f.guild);assert.deepEqual(worldNarrativeBridgePacket(f.db,f.guild,{mode:'party'}).signals,[]);
}));
test('WD bridge malformed legacy native receipt is held locally without suppressing technical errors or inventing success',()=>nativeFixture(f=>{
  const x=resolve(f,true),a=f.db.listCityRecords(f.guild,{kind:'typed_intent',includeGM:true}).find(r=>r.data.outcome_receipt),
    r=f.db.getCityRecord(f.guild,'action_outcome_receipt',a.data.outcome_receipt);
  f.db.saveCityRecord(f.guild,{...r,key:r.record_key,data:{...r.data,native_roll_refs:null}});
  assert.equal(packet(f,x.pc,'private').signals.length,0);assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,1);
}));
test('WD bridge preserves independent native action occurrences from the same declaration instead of collapsing their receipts',()=>nativeFixture(f=>{
  const text='I inspect the counter. I watch the door.',x=setup(f,{text}),base=candidate(text).player_intents[0],
    rows=persistPlayerIntents(f.db,f.guild,['I inspect the counter.','I watch the door.'].map(source_span=>({...base,source_span})),x.scope,{messageId:x.messageId});
  assert.equal(rows.length,2);
  for(const a of rows)adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:a.record_key,mode:'no_roll',risk:'none',stakes:'none',
    rawRefs:['srd:action-rolls'],explanation:'Independent ordinary attempt.'},'ai_gm',{scope:x.scope});
  const signals=packet(f).signals;assert.equal(signals.length,2);assert.equal(new Set(signals.map(s=>s.id)).size,2);
  assert.equal(new Set(signals.map(s=>s.causation_ref)).size,1);assert.equal(new Set(signals.map(s=>s.world_cycle_ref)).size,1);
  assert.equal(new Set(signals.map(s=>s.source_refs.find(r=>r.kind==='action_outcome_receipt').key)).size,2);
}));
test('WD bridge native Director source carries versioned nonauthorizing beats to the actual audience writer context',()=>nativeFixture(f=>{
  const x=resolve(f,true);setup(f,{privateScene:true,messageId:'outbound-camera'});
  const shell={act:false},content=new ContentIndex(path.resolve('../content')),
    ref=bindDirectorNarrativeSource(f.db,f.guild,shell,x.scope,'round',{},content),source=f.db.getWorldEvent(f.guild,ref),
    ctx=buildNarrativeContext(f.db,f.guild,x.scope,ref),bridge=ctx.packet.director_brief.world_bridge;
  assert.equal(source.details.version,2);assert(bridge);assert.equal(bridge.beats.length,1);
  assert.equal(bridge.beats[0].protocol,'world_beat_v1');assert.equal(bridge.beats[0].kind,'pacing_hint');
  assert.equal(bridge.beats[0].depth,1);assert.equal(bridge.beats[0].execution_authority,false);
  assert.equal(bridge.beats[0].publication_authority,false);assert.equal(bridge.beats[0].source_ref,ref);
  assert.equal(packet(f,x.pc,'private').signals.length,1,'Director exposition does not create another inbound native event');
  assert.throws(()=>buildNarrativeContext(f.db,f.guild,{...x.scope,actorUserId:f.pcs[1].owner_user_id},ref),/owner|source|audience/i);
}));
test('WD bridge revalidates deferred beat basis while preserving independent scene fiction and saved native results',()=>nativeFixture(f=>{
  const x=resolve(f,true);setup(f,{privateScene:true,messageId:'outbound-stale-camera'});
  const ref=bindDirectorNarrativeSource(f.db,f.guild,{act:false},x.scope,'round',{},new ContentIndex(path.resolve('../content'))),source=f.db.getWorldEvent(f.guild,ref),
    a=f.db.listCityRecords(f.guild,{kind:'typed_intent',includeGM:true}).find(r=>r.data.outcome_receipt);
  assert.equal(directorBriefForAudience(f.db,f.guild,source,x.scope).world_bridge.beats.length,1);
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,a.source_event);f.restart();
  const b=directorBriefForAudience(f.db,f.guild,source,x.scope).world_bridge;assert.equal(b.beats.length,0);assert.equal(b.held,1);
  assert(buildNarrativeContext(f.db,f.guild,x.scope,ref).packet.place.key);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,1);
}));
for(const causes of [1,2])test(`WD bridge Director-to-writer echo with ${causes} owner cause(s) never adds fresh canonical interest`,()=>nativeFixture(async f=>{
  const base=setup(f,{messageId:'causal-npc-birth'}),content=new ContentIndex(path.resolve('../content'));
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_salience:true}});
  const identity=establishNarrativeEntity(f.db,f.guild,{kind:'npc',key:'mara-lane',name:'Mara Lane',aliases:[],summary:'An ordinary parcel porter.',
    role:'porter',location_key:'terminal',parent_location_key:''},buildNarrativeContext(f.db,f.guild,base.scope,base.sourceRef),{content}),
    x=setup(f,{text:'I look toward Mara Lane.',messageId:'causal-owner-action'}),raw=candidate(x.text),
    [a]=persistPlayerIntents(f.db,f.guild,raw.player_intents,x.scope,{messageId:x.messageId});
  noteNarrativeInterest(f.db,f.guild,x.scope,x.sourceRef);
  adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:a.record_key,mode:'no_roll',risk:'none',stakes:'none',rawRefs:['srd:action-rolls'],explanation:'Ordinary attempt.'},'ai_gm',{scope:x.scope});
  if(causes===2){
    const other=setup(f,{text:'I look again toward Mara Lane.',messageId:'causal-other-action'}),
      [b]=persistPlayerIntents(f.db,f.guild,candidate(other.text).player_intents,other.scope,{messageId:other.messageId});
    noteNarrativeInterest(f.db,f.guild,other.scope,other.sourceRef);
    adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:b.record_key,mode:'no_roll',risk:'none',stakes:'none',rawRefs:['srd:action-rolls'],explanation:'Another ordinary attempt.'},'ai_gm',{scope:other.scope});
  }
  const ref=bindDirectorNarrativeSource(f.db,f.guild,{act:true},x.scope,'round',{},content),input={version:8,kind:'narrative_request',operation:'conversation',source_refs:[]},
    result={act:true,gm_world_parts:[input],player_intents:[]};
  await authorNarrativeRequests({db:f.db,guild:f.guild,result,scope:x.scope,sourceRef:ref,budget:{used:false},
    generate:async()=>({fiction_delta:[],narrative_units:[unit('answer','npc_speech','My counter closes at midnight.',{subject_key:'mara-lane',epistemic:'testimony'})]})});
  const rows=establishNarrativeUnits(f.db,f.guild,input,x.scope,ref,{content});assert.equal(rows.length,1);
  assert.equal(canonicalInterestEvidence(f.db,f.guild,identity.record_key,x.scope).reduce((sum,e)=>sum+e.weight,0),causes*3);
  assert.equal(packet(f).signals.length,causes);assert.equal(f.db.listCanon(f.guild,{includeGM:true}).length,0);
}));
test('WD bridge cannot downgrade a current source object to bypass its sidecar; genuine historical v1 keeps its old projection',()=>nativeFixture(f=>{
  const x=setup(f),ref=bindDirectorNarrativeSource(f.db,f.guild,{act:false},x.scope,'round',{},new ContentIndex(path.resolve('../content'))),
    source=f.db.getWorldEvent(f.guild,ref),forged=structuredClone(source);forged.details.version=1;
  assert.throws(()=>directorBriefForAudience(f.db,f.guild,forged,x.scope),/source|director|bridge/i);
  const details={...structuredClone(source.details),version:1};delete details.world_bridge;
  const historical=indexWorldEvent(f.db,f.guild,{key:`director-fiction:${sceneFictionHash(details)}`,kind:'native_director_narrative_scope',
    title:'Historical source fixture',source_id:'native:director',visibility:'party',session_id:f.session.id,scene:details.scene,details},'native:director');
  assert.deepEqual(directorBriefForAudience(f.db,f.guild,historical,x.scope),details.dramatic_brief);
}));
for(const boundary of ['prepared_draft','creation_capability'])test(`WD bridge changed causal basis invalidates the old ${boundary}, not independent native outcomes`,()=>nativeFixture(async f=>{
  const x=resolve(f,true);setup(f,{privateScene:true,messageId:`revision-camera-${boundary}`});
  const content=new ContentIndex(path.resolve('../content')),ref=bindDirectorNarrativeSource(f.db,f.guild,{act:true},x.scope,'round',{},content),
    ctx=buildNarrativeContext(f.db,f.guild,x.scope,ref),input={version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]};
  if(boundary==='prepared_draft')await authorNarrativeRequests({db:f.db,guild:f.guild,result:{act:true,gm_world_parts:[input],player_intents:[]},scope:x.scope,
    sourceRef:ref,budget:{used:false},generate:async()=>({fiction_delta:[],narrative_units:[unit('bell','scene','A small brass bell rests beside the counter.',{visibility:'character'})]})});
  const a=f.db.listCityRecords(f.guild,{kind:'typed_intent',includeGM:true}).find(r=>r.data.outcome_receipt),before=f.db.getCharacter(x.pc.id).data.resources;
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,a.source_event);
  if(boundary==='prepared_draft')assert.throws(()=>establishNarrativeUnits(f.db,f.guild,input,x.scope,ref,{content}),/draft|stale|scope|source/i);
  else{
    const definition={kind:'npc',key:'red-sparrow-porter',name:'Red Sparrow Porter',aliases:[],summary:'An ordinary porter.',role:'porter',location_key:'terminal',parent_location_key:''};
    assert.throws(()=>establishNarrativeEntity(f.db,f.guild,definition,ctx,{content}),/scope|context|source|stale/i);
    assert.equal(f.db.getNpcProfile(f.guild,definition.key),null);
    assert(establishNarrativeEntity(f.db,f.guild,definition,buildNarrativeContext(f.db,f.guild,x.scope,ref),{content}));
  }
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,1);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
}));
