/** W2 phase fixtures: authored, intentionally not executed before the complete framework freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate} from './narrative-fixtures.mjs';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../src/gm-unified-arbitration.js';
import {prepareOrdinaryRollModifier,inspectOrdinaryRollModifier} from '../src/native-roll-modifiers.js';
import {rollBreakdown,rollRevision} from '../src/roll-requests.js';
import {contributeRoll,adjudicateRollSource} from '../src/roll-collaboration.js';
import {typedRollProof} from '../src/typed-roll-proof.js';
import {indexWorldEvent} from '../src/city-calendar.js';

function scenario(f,{privateScene=false,disadvantage=false}={}){
  const x=setup(f,{text:'I inspect the counter.',privateScene});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true}});
  const i={...candidate(x.text).player_intents[0],type:'search',operation:'inspect',resolution:'conversational'};
  const [a]=persistPlayerIntents(f.db,f.guild,[i],x.scope,{messageId:x.messageId});
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[a],[]);
  const p={intent_ref:board.data.entries[0].intent_ref,disposition:'request_pc_action_roll',rule_basis_refs:['srd:action-rolls'],
    difficulty:12,trait:'Instinct',stakes_kind:'attempt_only',stakes:'The inspection may fail.',reason:'Current visible circumstances affect this inspection.',
    difficulty_reason:'A current ordinary inspection.',feature_ref:'',experience_ref:'',advantage:!disadvantage,disadvantage};
  return {x,a,origin,board,p,run:()=>adjudicateSceneBoard(f.db,f.guild,origin,board,[p])};
}
for(const disadvantage of [false,true])test(`W2 native ordinary ${disadvantage?'disadvantage':'advantage'} reaches the private owner request without rolling or spending`,()=>nativeFixture(f=>{
  const s=scenario(f,{disadvantage}),before=structuredClone(s.x.pc.data.resources);s.run();
  const q=f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true})[0];
  assert.equal(q.status,'pending');assert.equal(q.visibility,'character');assert.equal(q.subject_key,s.x.pc.id);
  assert.equal(q.data.breakdown[disadvantage?'disadvantage':'advantage'],1);
  assert.equal(q.data.roll_id,undefined);assert.deepEqual(f.db.getCharacter(s.x.pc.id).data.resources,before);
  const source=f.db.getWorldEvent(f.guild,q.data.input.modifier_keys[0]);
  assert.equal(source.source_kind,'mutation');assert.equal(source.details.human_reviewed,undefined);
  assert.equal(f.db.getMutation(f.guild,source.source_id).actor_type,'ai_gm');
}));

test('W2 contextual modifier cannot be minted from model JSON posing as a native origin',()=>nativeFixture(f=>{
  const s=scenario(f);
  assert.throws(()=>prepareOrdinaryRollModifier(f.db,f.guild,{gm:true},s.board.data.entries[0],s.p),/native_origin/i);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true}).filter(e=>e.details.issuer==='native:ordinary-roll-modifier').length,0);
}));

test('W2 contextual modifier does not enroll unrelated declarations or another owner',()=>nativeFixture(f=>{
  const s=scenario(f);s.run();const q=f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true})[0];
  assert.equal(f.db.rollModifierSources(f.guild,s.x.pc.id,'Instinct','action','other-intent').length,0);
  assert.throws(()=>rollBreakdown(f.db,f.guild,q.data.input,f.pcs[1]),/ancestry|owner|source|modifier/i);
  assert.throws(()=>prepareOrdinaryRollModifier(f.db,f.guild,s.origin,s.board.data.entries[0],{...s.p,feature_ref:'invented-feature'}),/nonfeature/i);
}));

test('W2 modifier survives restart for the exact owner; source revocation holds before RNG',()=>nativeFixture(f=>{
  const s=scenario(f,{privateScene:true});s.run();f.restart();
  const q=f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true})[0];
  assert.deepEqual(rollBreakdown(f.db,f.guild,q.data.input,f.db.getCharacter(s.x.pc.id)),q.data.breakdown);
  indexWorldEvent(f.db,f.guild,{key:q.data.input.modifier_keys[0],status:'retracted'},'fixture-revoke');
  let rngCalls=0;
  assert.throws(()=>contributeRoll(f.db,f.guild,s.x.pc.owner_user_id,{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:'revoked-modifier'},
    {rng:()=>{rngCalls++;return 1;}}),/source|current|modifier|rule revision changed/i);
  assert.equal(rngCalls,0);
}));

test('W2 saved roll reader revalidates the immutable modifier, not a model safety flag',()=>nativeFixture(f=>{
  const s=scenario(f);s.run();const q=f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true})[0];
  const rolled=contributeRoll(f.db,f.guild,s.x.pc.owner_user_id,{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:'native-modified-roll'},
    {rng:sides=>Math.min(sides,8)});
  assert.notEqual(typedRollProof(f.db,f.guild,rolled).outcome,'needs_review');f.restart();
  const current=f.db.getCityRecord(f.guild,'roll_request',q.record_key),event=f.db.getWorldEvent(f.guild,q.data.input.modifier_keys[0]);
  inspectOrdinaryRollModifier(f.db,f.guild,current.data.input,f.db.getCharacter(s.x.pc.id),event,{historical:true});
  f.db.saveWorldEvent(f.guild,{...event,key:event.event_key,details:{...event.details,roll_modifier:{...event.details.roll_modifier,amount:20}}});
  assert.throws(()=>typedRollProof(f.db,f.guild,current),/ancestry|modifier/i);
}));

test('W2 ordinary native preparation includes an existing sourced flat modifier once without inventing a new rule',()=>nativeFixture(f=>{
  const s=scenario(f);
  f.db.upsertRulesRuling(f.guild,{key:'scoped-flat',question:'Exact flat source',ruling:'This scoped inspection has a +2 modifier.',createdBy:'fixture-gm'});
  const source=adjudicateRollSource(f.db,f.guild,{key:'inspection-flat',character_id:s.x.pc.id,kind:'modifier',ruling_key:'scoped-flat',
    data:{trait:'Instinct',roll_kind:'action',kind:'flat',amount:2,name:'Scoped source modifier'}},'fixture-gm');
  s.run();const q=f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true})[0];
  assert(q.data.input.modifier_keys.includes(source.event_key));
  assert.equal(q.data.breakdown.modifiers.filter(m=>m.source===source.event_key).length,1);
  assert.equal(q.data.breakdown.subtotal,f.db.getCharacter(s.x.pc.id).data.traits.Instinct+2);
  assert.equal(q.data.breakdown.advantage,1,'contextual odds remain independent of the approved flat source');
  assert.equal(q.data.roll_id,undefined);
  f.db.upsertRulesRuling(f.guild,{key:'scoped-flat',ruling:'Changed scoped terms; the old prepared permission is stale.',createdBy:'fixture-gm'});
  let rng=0;
  assert.throws(()=>contributeRoll(f.db,f.guild,s.x.pc.owner_user_id,{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:'stale-flat'},
    {rng:()=>{rng++;return 1;}}),/rule|revision|changed/i);
  assert.equal(rng,0);
}));

test('W2 stale-scene flat sources neither contaminate a new native request nor bypass explicit scope validation',()=>nativeFixture(f=>{
  const s=scenario(f);
  f.db.upsertRulesRuling(f.guild,{key:'old-flat',ruling:'An earlier scene modifier.',createdBy:'fixture-gm'});
  const original=adjudicateRollSource(f.db,f.guild,{key:'old-scene-flat',character_id:s.x.pc.id,kind:'modifier',ruling_key:'old-flat',
    data:{trait:'Instinct',roll_kind:'action',kind:'flat',amount:2,name:'Old scene modifier'}},'fixture-gm');
  indexWorldEvent(f.db,f.guild,{key:original.event_key,status:'retracted'},'fixture-gm');
  const source=f.db.saveWorldEvent(f.guild,{...original,key:'earlier-scene-flat-source',scene:'earlier-scene'});
  s.run();const q=f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true})[0];
  assert(!q.data.input.modifier_keys.includes(source.event_key));
  assert.throws(()=>rollBreakdown(f.db,f.guild,{...q.data.input,modifier_keys:[...q.data.input.modifier_keys,source.event_key]},s.x.pc),/modifier|scope|source/i);
}));
