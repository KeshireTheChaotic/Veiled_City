import test from 'node:test';
import assert from 'node:assert/strict';
import {openRollStore} from '../../src/v2/rules/roll-store.js';
import {createOrdinaryRollPreparation} from '../../src/v2/rules/ordinary-roll-preparation.js';
import {createOwnerRollEvidence} from '../../src/v2/rules/owner-roll-evidence.js';
function fixture(t){
  const store=openRollStore();t.after(()=>store.close());const source={id:'m',revision:'1',campaign:'c',scene:'s',principal:'u',actors:['pc'],recipients:['u']};
  const actor={id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1'};
  const adjudication={id:'a',revision:'1',status:'accepted',sourceRef:'m',sourceRevision:'1',actorId:'pc',campaignId:'c',sceneId:'s',difficulty:14,stakes:'The guard hears a failed attempt.',modifier:0,experience:0,advantage:0,disadvantage:0};
  const sourceAuthority={revalidate:()=>true},preparation=createOrdinaryRollPreparation({sourceAuthority,readActor:()=>actor,readAdjudication:()=>adjudication,rollStore:store});
  const request=preparation.commitRequest(source,'pc',{adjudication_ref:'a'});
  const inspector=createOwnerRollEvidence({sourceAuthority,readActor:()=>actor,readRequest:store.readRequest,readRoll:store.readRoll,readDelivery:store.readDelivery});
  return {store,source,actor,request,inspector,notice:()=>store.acknowledgeDelivery('c',request.id,{messageId:'discord-notice',recipientIds:['u']},{check:()=>{}}),roll:()=>store.recordOwnerRoll('c',request.id,{id:'owner-roll',ownerUserId:'u',hope:9,fear:5},{check:()=>{}})};
}
test('prepared native request stays unresolved until delivered stakes and saved owner dice exist',t=>{
  const f=fixture(t),inspect=()=>f.inspector.inspect(f.source,{requestRef:f.request.id,rollRef:'owner-roll'});assert.throws(inspect);
  f.notice();assert.throws(inspect);f.roll();const result=inspect();assert.equal(result.total,14);assert.equal(result.success,true);assert.equal(result.effectsCommitted,false);assert.equal(result.id,'owner-roll');
});
test('ownership revision changes invalidate a saved result without erasing historical dice',t=>{
  const f=fixture(t);f.notice();f.roll();f.actor.controlRevision='2';assert.throws(()=>f.inspector.inspect(f.source,{requestRef:f.request.id,rollRef:'owner-roll'}));assert.equal(f.store.readRoll('c','owner-roll').hope,9);
});
test('native evidence changing during validation is rejected',t=>{
  const f=fixture(t);f.notice();f.roll();let reads=0;
  const inspector=createOwnerRollEvidence({sourceAuthority:{revalidate:()=>true},readActor:()=>f.actor,readRequest:f.store.readRequest,readDelivery:f.store.readDelivery,
    readRoll:(...args)=>{const row=f.store.readRoll(...args);if(++reads===2)row.hope=1;return row;}});
  assert.throws(()=>inspector.inspect(f.source,{requestRef:f.request.id,rollRef:'owner-roll'}),/evidence changed/);
});
