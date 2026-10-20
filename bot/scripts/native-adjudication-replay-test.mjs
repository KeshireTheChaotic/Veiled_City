/** W2 replay boundary fixtures. Authored during phase construction; run only in the W2 freeze batch. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeFixture} from './v9-fixtures.mjs';
import {actionFixture} from './v96-action-fixture.mjs';
import {adjudicateAcceptedIntent} from '../src/rules-arbitration.js';
import {indexWorldEvent} from '../src/city-calendar.js';

function setup(f){
  const x=actionFixture(f);x.run();
  const saved=f.db.listCityRecords(f.guild,{kind:'native_adjudication',includeGM:true})[0];
  const accepted=f.db.getCityRecord(f.guild,'typed_intent',saved.data.action_id);
  const input={savedRulingKey:'',overrideRefs:[],rawRefs:['srd:action-rolls'],houseRefs:[],homebrewRefs:[],kind:'action',
    acceptedIntent:accepted.record_key,mode:'roll_required',risk:x.ruling.risk,stakes:x.ruling.stakes,
    trait:x.ruling.trait,difficulty:x.ruling.difficulty,modifierKeys:[],attackSource:'',explanation:x.ruling.explanation};
  const ruling=f.db.listCityRecords(f.guild,{kind:'gm_action_ruling',includeGM:true}).find(r=>r.data.accepted_intent===accepted.record_key);
  const context={scope:x.scope,gmRulingRef:ruling.record_key};
  return {x,saved,accepted,input,context,replay:(changes={},scope=x.scope)=>adjudicateAcceptedIntent(f.db,f.guild,
    {...input,...changes},'ai_gm',{...context,scope})};
}

test('W2 exact native adjudication replay reads its saved request without writes, dice or resource changes',()=>nativeFixture(f=>{
  const s=setup(f),before=f.db.db.prepare('SELECT total_changes() AS n').get().n;
  assert.deepEqual(s.replay(),s.saved.data);
  assert.equal(f.db.db.prepare('SELECT total_changes() AS n').get().n,before);
  f.restart();assert.deepEqual(s.replay(),s.saved.data);
}));

test('W2 saved adjudication cannot be read as another owner or wider audience',()=>nativeFixture(f=>{
  const s=setup(f);
  assert.throws(()=>s.replay({}, {...s.x.scope,actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}),/owner|scope/i);
  assert.throws(()=>s.replay({}, {...s.x.scope,mode:'private'}),/audience|scope/i);
}));

test('W2 replay rejects new adjudication terms rather than adopting old receipts',()=>nativeFixture(f=>{
  const s=setup(f);
  for(const change of [{difficulty:1},{trait:'Knowledge'},{stakes:'Automatic custody'},{risk:'none'},
    {explanation:'Different interpretation'},{modifierKeys:['forged']},{attackSource:'fake'}])
    assert.throws(()=>s.replay(change),/terms|ancestry|rule/i);
}));

test('W2 revoked declaration and changed request ancestry cannot authorize saved adjudication replay',()=>nativeFixture(f=>{
  const s=setup(f),q=f.db.getCityRecord(f.guild,'roll_request',s.saved.data.roll_request_ref);
  f.db.saveCityRecord(f.guild,{...q,key:q.record_key,subject_key:f.pcs[1].id});
  assert.throws(()=>s.replay(),/ancestry/i);
  f.db.saveCityRecord(f.guild,{...q,key:q.record_key});
  indexWorldEvent(f.db,f.guild,{key:s.accepted.source_event,status:'retracted'},'fixture-revocation');
  assert.throws(()=>s.replay(),/source|stale/i);
}));

test('W2 historical adjudication without the additive input hash remains readable but source checked',()=>nativeFixture(f=>{
  const s=setup(f),{input_hash,...data}=s.saved.data;
  f.db.saveCityRecord(f.guild,{...s.saved,key:s.saved.record_key,data});
  assert.deepEqual(s.replay(),data);
  assert.throws(()=>s.replay({difficulty:1}),/ancestry|terms/i);
}));
