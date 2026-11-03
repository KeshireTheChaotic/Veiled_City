import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openRollStore} from '../../src/v2/rules/roll-store.js';
import {openFearReservations} from '../../src/v2/rules/fear-reservations.js';
import {createFearOpportunityReader} from '../../src/v2/rules/fear-opportunity-reader.js';
import {createPreRollFearCoordinator} from '../../src/v2/rules/pre-roll-fear-coordinator.js';
function fixture(t,amount=1){
  const dir=mkdtempSync(join(tmpdir(),'vk2-fear-order-'));let rolls,fear,coordinator;
  const check=()=>{},owner={id:'pc',kind:'pc',status:'active',campaignId:'c',sceneId:'s',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1'},npc={id:'npc',kind:'npc',status:'active',campaignId:'c',sceneId:'s',controllerUserId:null};
  function close(){rolls?.close();fear?.close();rolls=fear=null;}
  function reopen(){close();rolls=openRollStore(join(dir,'rolls.sqlite'));fear=openFearReservations(join(dir,'fear.sqlite'));
    const reader=createFearOpportunityReader({rollStore:rolls,sourceAuthority:{inspectReference:()=>({campaign:'c',scene:'s',principal:'u',actors:['pc']})},readActor:(_c,id)=>id==='pc'?owner:npc,inspectGmDecision:(_c,q)=>({id:`decision:${q}`,status:'gm_action_ready',issuer:'native_gm_decision',campaignId:'c',sceneId:'s',requestRef:q,npcId:'npc',targetActorId:'pc',operation:'commit_adversary_attack',feature:'standard_attack',advantage:false,disadvantage:false,experienceRef:null,printedFearCost:0})});
    coordinator=createPreRollFearCoordinator({rollStore:rolls,fearStore:fear,opportunityReader:reader});
  }
  t.after(()=>{close();rmSync(dir,{recursive:true,force:true});});reopen();fear.initialize('c',amount,{check});
  function request(q){rolls.createRequest({id:q,campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',noticeRef:`notice:${q}`,stakes:'The guard hears.',difficulty:12,modifier:0,experience:0,advantage:0,disadvantage:0,sourceRef:'source',sourceRevision:'1'},{check});rolls.acknowledgeDelivery('c',q,{messageId:`message:${q}`,recipientIds:['u']},{check});}
  request('q');request('other');
  return {get rolls(){return rolls;},get fear(){return fear;},get coordinator(){return coordinator;},reopen,check,roll(q='q'){return rolls.recordOwnerRoll('c',q,{id:`result:${q}`,ownerUserId:'u',hope:8,fear:5},{check});},publication(){return {campaignId:'c',requestRef:'q',bindingHash:fear.read('c','q').bindingHash,status:'not_started',attemptCount:0};}};
}
test('held request stays unrolled across reopen while independent request and cancelled hold can roll',t=>{
  const f=fixture(t),r=f.coordinator.reserve('c','q',{check:f.check});assert.equal(r.status,'awaiting_announcement');
  assert.throws(()=>f.roll(),/interruption holds/);assert.equal(f.roll('other').hope,8);f.reopen();
  assert.deepEqual(f.coordinator.reserve('c','q',{check:f.check}),r);assert.throws(()=>f.roll(),/interruption holds/);
  f.coordinator.cancel('c','q',{check:f.check,readPublication:f.publication});f.reopen();assert.equal(f.rolls.readFearHold('c','q').status,'cancelled');
  const roll=f.roll();assert.deepEqual(f.roll(),roll);assert.equal(f.fear.reserved('c'),0);
});
test('saved owner dice cannot acquire a later interruption or reserve Fear',t=>{
  const f=fixture(t);f.roll();assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/Unrolled/);
  assert.equal(f.rolls.readFearHold('c','q'),null);assert.equal(f.fear.read('c','q'),null);
});
test('reservation failure preserves a durable hold and cannot invent cancellation proof',t=>{
  const f=fixture(t,0);assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/unreserved/);f.reopen();
  assert.equal(f.rolls.readFearHold('c','q').status,'held');assert.equal(f.fear.read('c','q'),null);assert.throws(()=>f.roll(),/interruption holds/);
  assert.throws(()=>f.rolls.releaseCancelledFear('c','q',{check:f.check,readCancellation:()=>({status:'cancelled',terms:{campaignId:'c',requestRef:'q',decisionRef:'different'}})}),/Exact cancelled/);
  assert.equal(f.rolls.readFearHold('c','q').status,'held');
});
test('failed hold authorization rolls back; failed release leaves cancelled reservation safely held for replay',t=>{
  const f=fixture(t);let checks=0;
  assert.throws(()=>f.coordinator.reserve('c','q',{check(){if(++checks===2)throw new Error('Authority changed');}}),/Authority changed/);assert.equal(f.rolls.readFearHold('c','q'),null);
  f.coordinator.reserve('c','q',{check:f.check});checks=0;
  assert.throws(()=>f.coordinator.cancel('c','q',{readPublication:f.publication,check(){if(++checks===3)throw new Error('Release interrupted');}}),/Release interrupted/);f.reopen();
  assert.equal(f.fear.read('c','q').status,'cancelled');assert.equal(f.rolls.readFearHold('c','q').status,'held');assert.throws(()=>f.roll(),/interruption holds/);
  f.coordinator.cancel('c','q',{check:f.check});assert.equal(f.rolls.readFearHold('c','q').status,'cancelled');assert.equal(f.roll().hope,8);
});

function recoveryOptions(f){return {check:f.check,readReview:()=>({id:'review',campaignId:'c',requestRef:'q',decisionRef:'decision:q',status:'approved',operation:'cancel_unreserved_fear_hold',reviewerUserId:'gm'}),readPublication:()=>({campaignId:'c',requestRef:'q',decisionRef:'decision:q',status:'not_started',attemptCount:0})};}
test('reviewed orphan recovery persists a cancellation tombstone and releases only its held request',t=>{
  const f=fixture(t,0);assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/unreserved/);f.reopen();
  const options=recoveryOptions(f),receipt=f.coordinator.recoverUnreserved('c','q',options);f.reopen();
  assert.equal(receipt.recoveryKind,'unreserved_hold');assert.equal(receipt.status,'cancelled');assert.equal(f.fear.reserved('c'),0);
  assert.deepEqual(f.coordinator.recoverUnreserved('c','q',options),receipt);assert.equal(f.rolls.readFearHold('c','q').status,'cancelled');
  assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/already closed/);assert.equal(f.roll().hope,8);
});
test('orphan recovery rejects absent, mismatched or unapproved reviews and uncertain publication',t=>{
  const f=fixture(t,0);assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/unreserved/);const options=recoveryOptions(f);
  assert.throws(()=>f.coordinator.recoverUnreserved('c','q',{check:f.check}),/evidence required/);
  for(const patch of [{status:'pending'},{reviewerUserId:''},{campaignId:'other'},{decisionRef:'other'},{operation:'unlock'}])assert.throws(()=>f.coordinator.recoverUnreserved('c','q',{...options,readReview:()=>({...options.readReview(),...patch})}),/approved native recovery/);
  for(const patch of [{status:'uncertain'},{attemptCount:1},{decisionRef:'other'}])assert.throws(()=>f.coordinator.recoverUnreserved('c','q',{...options,readPublication:()=>({...options.readPublication(),...patch})}),/Unattempted orphan/);
  assert.equal(f.fear.read('c','q'),null);assert.equal(f.rolls.readFearHold('c','q').status,'held');
});
test('orphan recovery cannot cancel an actual reservation or survive changing review evidence',t=>{
  const active=fixture(t);active.coordinator.reserve('c','q',{check:active.check});assert.throws(()=>active.coordinator.recoverUnreserved('c','q',recoveryOptions(active)),/Existing Fear reservation/);assert.equal(active.fear.reserved('c'),1);
  const f=fixture(t,0);assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/unreserved/);const options=recoveryOptions(f);let reads=0;
  assert.throws(()=>f.coordinator.recoverUnreserved('c','q',{...options,readReview:()=>({...options.readReview(),id:++reads===1?'review':'changed'})}),/evidence changed/);
  let checks=0;assert.throws(()=>f.coordinator.recoverUnreserved('c','q',{...options,check(){if(++checks===2)throw new Error('Review revoked');}}),/Review revoked/);f.reopen();assert.equal(f.fear.read('c','q'),null);assert.throws(()=>f.roll(),/interruption holds/);
});
test('interruption after recovery receipt before hold release is safely resumed after reopen',t=>{
  const f=fixture(t,0);assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/unreserved/);const options=recoveryOptions(f);let checks=0;
  assert.throws(()=>f.coordinator.recoverUnreserved('c','q',{...options,check(){if(++checks===3)throw new Error('Release interrupted');}}),/Release interrupted/);f.reopen();
  assert.equal(f.fear.read('c','q').status,'cancelled');assert.equal(f.rolls.readFearHold('c','q').status,'held');assert.throws(()=>f.roll(),/interruption holds/);
  f.coordinator.recoverUnreserved('c','q',options);assert.equal(f.rolls.readFearHold('c','q').status,'cancelled');assert.equal(f.roll().hope,8);
});
