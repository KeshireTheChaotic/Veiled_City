import test from 'node:test';
import assert from 'node:assert/strict';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {openRollStore} from '../../src/v2/rules/roll-store.js';
import {createOrdinaryRollPreparation} from '../../src/v2/rules/ordinary-roll-preparation.js';
import {createOwnerRollEvidence} from '../../src/v2/rules/owner-roll-evidence.js';
import {createRollActionLifecycle} from '../../src/v2/rules/roll-action-lifecycle.js';
function fixture(t){const actions=openActionStore(),rolls=openRollStore();t.after(()=>{actions.close();rolls.close();});const source={id:'m',revision:'1',campaign:'c',scene:'s',principal:'u',actors:['pc'],recipients:['u']},actor={id:'pc',kind:'pc',status:'active',campaignId:'c',sceneId:'s',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1'};
  const a={id:'a',revision:'1',status:'accepted',sourceRef:'m',sourceRevision:'1',actorId:'pc',campaignId:'c',sceneId:'s',difficulty:12,stakes:'A guard hears.',modifier:0,experience:0,advantage:0,disadvantage:0},authority={revalidate:()=>true};
  const preparation=createOrdinaryRollPreparation({sourceAuthority:authority,readActor:()=>actor,readAdjudication:()=>a,rollStore:rolls}),ownerInspector=createOwnerRollEvidence({sourceAuthority:authority,readActor:()=>actor,readRequest:rolls.readRequest,readRoll:rolls.readRoll,readDelivery:rolls.readDelivery});
  return {actions,rolls,source,actor,lifecycle:createRollActionLifecycle({sourceAuthority:authority,preparation,rollStore:rolls,actionStore:actions,ownerInspector})};}
test('actual notice and owner evidence open durable windows without resolving effects',t=>{const f=fixture(t),q=f.lifecycle.prepare(f.source,'pc',{adjudication_ref:'a'});assert.equal(f.actions.read('c',q.id).status,'awaiting_notice');assert.throws(()=>f.lifecycle.noticeDelivered(f.source,q.id));
  f.rolls.acknowledgeDelivery('c',q.id,{messageId:'notice',recipientIds:['u']},{check:()=>{}});f.lifecycle.noticeDelivered(f.source,q.id);assert.equal(f.actions.read('c',q.id).status,'awaiting_player_roll');
  f.rolls.recordOwnerRoll('c',q.id,{id:'r',ownerUserId:'u',hope:8,fear:4},{check:()=>{}});const result=f.lifecycle.ownerRolled(f.source,q.id,'r');assert.equal(result.result.success,true);assert.equal(result.effectsCommitted,false);assert.equal(f.actions.read('c',q.id).status,'ready_to_resolve');assert.deepEqual(f.lifecycle.ownerRolled(f.source,q.id,'r'),result);
});
test('stale control cannot open ready-to-resolve even with stored owner dice',t=>{const f=fixture(t),q=f.lifecycle.prepare(f.source,'pc',{adjudication_ref:'a'});f.rolls.acknowledgeDelivery('c',q.id,{messageId:'notice',recipientIds:['u']},{check:()=>{}});f.lifecycle.noticeDelivered(f.source,q.id);f.rolls.recordOwnerRoll('c',q.id,{id:'r',ownerUserId:'u',hope:8,fear:4},{check:()=>{}});f.actor.controlRevision='2';assert.throws(()=>f.lifecycle.ownerRolled(f.source,q.id,'r'));assert.equal(f.actions.read('c',q.id).status,'awaiting_player_roll');});
