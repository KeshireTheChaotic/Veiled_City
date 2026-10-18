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
import {captureWorldInput} from '../src/autonomous-world.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
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
