import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeSpellcastFixture as fixture} from './helpers/native-spellcast-fixture.mjs';
import {attachOwnerClear} from './helpers/condition-history-fixture.mjs';
test('real condition window and durable identity supply compulsory nonstacking Spellcast disadvantage after cold reopen',t=>{
  const f=fixture(t),before=f.actions.readHope('g','pc');f.decision.modifierRefs=f.modifiers.previewMandatoryRefs(f.source,f.decision,f.locator);assert.equal(f.decision.modifierRefs.length,1);assert.equal(f.adjudications.read('g','spellcast'),null);assert.throws(()=>f.terms.inspect(f.source,f.decision),/reviewed native Spellcast/);
  f.adjudications.save(f.source,f.decision,{check:f.check,spellcast:f.locator});f.reopen();const terms=f.terms.inspect(f.source,f.adjudications.read('g','spellcast'));assert.equal(terms.modifier,2);assert.equal(terms.disadvantage,1);assert.equal(terms.termProof.modifiers.length,1);assert.equal(JSON.stringify(terms).includes('native-only-condition-canary'),false);
  const request=f.prepare().commitRequest(f.source,'pc',{adjudication_ref:'spellcast'});assert.equal(request.disadvantage,1);assert.equal(request.sourceRef,f.source.id);assert.equal(f.rolls.readResultForRequest('g',request.id),null);assert.deepEqual(f.actions.readHope('g','pc'),before);
});
test('persisted identity cannot omit actual compulsory condition reference from accepted roll terms',t=>{const f=fixture(t);f.adjudications.save(f.source,f.decision,{check:f.check,spellcast:f.locator});assert.throws(()=>f.prepare().commitRequest(f.source,'pc',{adjudication_ref:'spellcast'}),/modifier references/);assert.equal(f.rolls.readResultForRequest('g','spellcast'),null);});
test('exact native owner clear ends current odds; saved stale modifier references cannot survive it',t=>{
  const f=fixture(t);f.decision.modifierRefs=f.modifiers.previewMandatoryRefs(f.source,f.decision,f.locator);f.adjudications.save(f.source,f.decision,{check:f.check,spellcast:f.locator});assert.equal(f.terms.inspect(f.source,f.decision).disadvantage,1);attachOwnerClear(f);assert.throws(()=>f.terms.inspect(f.source,f.decision),/modifier reference/);
  const fresh={...f.decision,id:'after-clear',modifierRefs:[]};assert.deepEqual(f.modifiers.previewMandatoryRefs(f.source,fresh,f.locator),[]);f.adjudications.save(f.source,fresh,{check:f.check,spellcast:f.locator});assert.equal(f.terms.inspect(f.source,fresh).disadvantage,0);
});
test('unproven termination, broken original ancestry and misindexed discovery hold instead of granting zero disadvantage',t=>{
  for(const sql of ["UPDATE city_records SET status='cleared' WHERE kind='pc_native_condition'","UPDATE world_events SET status='revoked' WHERE event_key='request:source'","UPDATE city_records SET actor_key='another-pc' WHERE kind='pc_native_condition'"]){const f=fixture(t);f.db.exec(sql);assert.throws(()=>f.modifiers.previewMandatoryRefs(f.source,f.decision,f.locator));assert.equal(f.adjudications.read('g','spellcast'),null);}
});
test('native source revocation and caller-supplied forged actor snapshots cannot enter modifier qualification',t=>{
  const f=fixture(t),actor=f.canonical.readActorSnapshot('g','pc');assert.throws(()=>f.modifiers.readMandatoryRefs(f.source,f.decision,{...actor,data:{...actor.data,domain_cards:[{name:'invented',active:true}]}}),/current native roll actor/);
  const old=f.scenes.readers.readMessage('g','new-attempt'),{revision,...data}=old;f.scenes.commitSnapshot({campaignId:'g',principal:'transport',sourceRef:'message-revoked',records:[{kind:'message',expectedRevision:Number(revision),data:{...data,deleted:true}}]},{check(){}});assert.throws(()=>f.modifiers.previewMandatoryRefs(f.source,f.decision,f.locator),/source required/);
});
