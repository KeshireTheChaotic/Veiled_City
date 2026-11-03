import test from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerRollEvidence} from '../../src/v2/rules/owner-roll-evidence.js';
function fixture(){
  const source={campaign:'c',scene:'s',principal:'u',actors:['pc'],recipients:['u']},request={id:'q',campaignId:'c',sceneId:'s',status:'awaiting_player_roll',ownerUserId:'u',actorId:'pc',controlRevision:'1',noticeRef:'notice',difficulty:15,stakes:'The guard may hear you.',modifier:0,experience:0,advantage:0,disadvantage:0};
  const actor={id:'pc',campaignId:'c',sceneId:'s',kind:'pc',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',status:'active',controlRevision:'1'},delivery={status:'delivered',requestRef:'q',difficulty:15,stakes:request.stakes,recipientIds:['u'],sequence:10},roll={id:'r',campaignId:'c',sceneId:'s',requestRef:'q',actorId:'pc',ownerUserId:'u',authenticated:true,origin:'owner_roll',sequence:11,hope:8,fear:7};
  const service=createOwnerRollEvidence({sourceAuthority:{revalidate:()=>true},readRequest:()=>request,readActor:()=>actor,readDelivery:()=>delivery,readRoll:()=>roll});return {source,request,actor,delivery,roll,run:()=>service.inspect(source,{requestRef:'q',rollRef:'r'})};
}
test('native owner dice resolve arithmetic after published stakes without committing effects',()=>{const f=fixture(),r=f.run();assert.equal(r.success,true);assert.equal(r.total,15);assert.equal(r.effectsCommitted,false);f.roll.hope=2;f.roll.fear=2;assert.equal(f.run().success,true);});
test('proxy ownership, stale control, altered notice and pre-notice dice fail closed',()=>{for(const change of [f=>f.actor.controlRole='proxy',f=>f.actor.controlRevision='2',f=>f.delivery.stakes='Changed',f=>f.roll.sequence=9,f=>f.roll.origin='model',f=>f.roll.ownerUserId='other']){const f=fixture();change(f);assert.throws(f.run);}});
test('unqualified modifier paths and fabricated faces are rejected',()=>{const f=fixture();f.request.advantage=1;assert.throws(f.run);f.request.advantage=0;f.roll.hope=13;assert.throws(f.run,/out of range/);});
