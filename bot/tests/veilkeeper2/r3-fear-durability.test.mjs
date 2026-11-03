import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openRollStore} from '../../src/v2/rules/roll-store.js';
import {openFearReservations} from '../../src/v2/rules/fear-reservations.js';
import {createFearOpportunityReader} from '../../src/v2/rules/fear-opportunity-reader.js';

function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vk2-fear-'));let rolls,fear,reader;
  const check=()=>{},owner={id:'pc',kind:'pc',status:'active',campaignId:'c',sceneId:'s',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1'},npc={id:'npc',kind:'npc',status:'active',campaignId:'c',sceneId:'s',controllerUserId:null};
  let sourceCurrent=true;
  const decision={id:'d',status:'gm_action_ready',issuer:'native_gm_decision',campaignId:'c',sceneId:'s',requestRef:'q',npcId:'npc',targetActorId:'pc',operation:'commit_adversary_attack',feature:'standard_attack',advantage:false,disadvantage:false,experienceRef:null,printedFearCost:0};
  function close(){rolls?.close();fear?.close();rolls=fear=null;}
  function reopen(){close();rolls=openRollStore(join(dir,'rolls.sqlite'));fear=openFearReservations(join(dir,'fear.sqlite'));reader=createFearOpportunityReader({rollStore:rolls,sourceAuthority:{inspectReference(){if(!sourceCurrent)throw new Error('Source no longer current');return {campaign:'c',scene:'s',principal:'u',actors:['pc']};}},readActor:(_c,id)=>id==='pc'?owner:npc,inspectGmDecision:()=>decision});}
  t.after(()=>{close();rmSync(dir,{recursive:true,force:true});});reopen();
  fear.initialize('c',1,{check});rolls.createRequest({id:'q',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',noticeRef:'n',stakes:'The guard hears.',difficulty:12,modifier:0,experience:0,advantage:0,disadvantage:0,sourceRef:'source',sourceRevision:'1'},{check});rolls.acknowledgeDelivery('c','q',{messageId:'roll-notice',recipientIds:['u']},{check});
  return {get fear(){return fear;},get rolls(){return rolls;},get options(){return {check,readOpportunity:reader.read};},check,reopen,invalidate(){sourceCurrent=false;},notice(row){return {status:'delivered',kind:'pre_roll_fear',requestRef:'q',bindingHash:row.bindingHash,baseCost:1,printedFearCost:0,npcId:'npc',actorId:'pc',recipientIds:['u'],messageId:'fear-notice'};}};
}

test('reopened reservations preserve capacity and reject subsequently persisted owner dice',t=>{
  const f=fixture(t),row=f.fear.reserve('c','q',f.options);f.reopen();
  assert.deepEqual(f.fear.read('c','q'),row);assert.equal(f.fear.reserved('c'),1);assert.deepEqual(f.fear.reserve('c','q',f.options),row);
  f.rolls.recordOwnerRoll('c','q',{id:'r',ownerUserId:'u',hope:7,fear:6},{check:f.check});f.reopen();
  assert.throws(()=>f.fear.acknowledge('c','q',{...f.options,readNotice:()=>f.notice(row)}),/opportunity changed/);
  assert.equal(f.fear.read('c','q').status,'awaiting_announcement');assert.equal(f.fear.reserved('c'),1);
});

test('reopened notices replay once; failed cancellation rolls back and successful cancellation persists',t=>{
  const f=fixture(t),row=f.fear.reserve('c','q',f.options),notice=f.notice(row);
  const announced=f.fear.acknowledge('c','q',{...f.options,readNotice:()=>notice});f.reopen();
  assert.deepEqual(f.fear.acknowledge('c','q',{...f.options,readNotice:()=>notice}),announced);assert.equal(f.fear.read('c','q').history.length,2);
  let checks=0;assert.throws(()=>f.fear.cancel('c','q',{check(){if(++checks===2)throw new Error('Authority changed');}}),/Authority changed/);f.reopen();
  assert.deepEqual(f.fear.read('c','q'),announced);assert.equal(f.fear.reserved('c'),1);
  const cancelled=f.fear.cancel('c','q',{check:f.check});f.reopen();assert.deepEqual(f.fear.read('c','q'),cancelled);assert.equal(f.fear.reserved('c'),0);assert.equal(cancelled.history.length,3);
  assert.deepEqual(f.fear.cancel('c','q',{check:f.check}),cancelled);
});

test('reopening cannot turn a stale source into current Fear announcement authority',t=>{
  const f=fixture(t),row=f.fear.reserve('c','q',f.options);f.reopen();f.invalidate();
  assert.throws(()=>f.fear.acknowledge('c','q',{...f.options,readNotice:()=>f.notice(row)}),/Source no longer current/);
  assert.equal(f.fear.read('c','q').status,'awaiting_announcement');assert.equal(f.fear.reserved('c'),1);
});
