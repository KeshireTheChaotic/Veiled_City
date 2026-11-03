import test from 'node:test';
import assert from 'node:assert/strict';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {createHopeConsentIngress} from '../../src/v2/rules/hope-consent-ingress.js';
import {createAtomicHopeCostAuthority} from '../../src/v2/rules/hope-cost-authority.js';
import {openSourceRegistry} from '../../src/v2/source-registry.js';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
function fixture(t,{persistent=false}={}){const dir=persistent?mkdtempSync(join(tmpdir(),'vk3-chain-')):null,path=name=>dir?join(dir,name):':memory:';let scene=openSceneStore(path('scene.sqlite')),actions=openActionStore(path('actions.sqlite')),registry=openSourceRegistry(path('sources.sqlite'));
  t.after(()=>{scene.close();actions.close();registry.close();if(dir){assert.ok(resolve(dir).startsWith(resolve(tmpdir())));rmSync(dir,{recursive:true,force:true});}});const check=()=>{};
  const actor={id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'};
  const records=[{kind:'session',data:{id:'session',campaignId:'c',status:'active'}},{kind:'scene',data:{id:'s',campaignId:'c',sessionId:'session',status:'active',participants:[{actorId:'pc',userId:'u',presence:'present'}]}},{kind:'actor',data:actor},
    {kind:'channel',data:{id:'ch',campaignId:'c',sceneId:'s',kind:'private',ownerUserId:'u',permissionsVerified:true,recipientIds:['u'],writerIds:['u']}},
    ...['attempt','choice'].map(id=>({kind:'message',data:{id,campaignId:'c',userId:'u',channelId:'ch',deleted:false,text:id==='attempt'?'I use the ability.':'I confirm the displayed cost.'}}))];
  scene.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'setup',records:records.map(r=>({...r,expectedRevision:null}))},{check});
  const event=id=>({campaignId:'c',messageId:id,userId:'u',actorId:'pc'});let sources=createSourceAuthority({...scene.readers,sourceRegistry:registry});const attempt=sources.authenticate(event('attempt')),choice=sources.authenticate(event('choice'));
  const identity={id:'a',campaignId:'c',actorId:'pc',ownerUserId:'u',sceneId:'s',sourceRef:attempt.id,sourceRevision:attempt.revision,kind:'hope_cost'};
  actions.create(identity,{check});actions.initializeHope({campaignId:'c',actorId:'pc',ownerUserId:'u',hope:3,cap:6},{check});actions.registerHopeTerms({...identity,revision:'1',controlRevision:'1',cost:{resource:'hope',slot:'base',amount:2}},{check});actions.transition({campaignId:'c',actionId:'a',expectedRevision:1,sourceRef:'window',to:'awaiting_consent'},{check});
  const decision={sourceRef:choice.id,sourceRevision:choice.revision,principal:'u',campaignId:'c',sceneId:'s',actionRef:'a',termsRevision:'1',actorId:'pc',amount:2,costSlot:'base',decision:'accept'};
  const ingress=createHopeConsentIngress({sourceAuthority:sources,readActor:scene.readers.readActor,readDecision:()=>decision,actionStore:actions});const consent=ingress.record(choice,'a');
  const makeAuthority=()=>createAtomicHopeCostAuthority({sourceAuthority:sources,readActor:scene.readers.readActor,readActionTerms:actions.readActionTerms,readConsent:actions.readConsent,actionStore:actions});let authority=makeAuthority();
  return {get scene(){return scene;},get actions(){return actions;},attempt,choice,consent,commit:()=>authority.commit(attempt,'pc',{action_ref:'a',consent_ref:consent.id},1),reopen(){assert.ok(dir);scene.close();actions.close();registry.close();scene=openSceneStore(path('scene.sqlite'));actions=openActionStore(path('actions.sqlite'));registry=openSourceRegistry(path('sources.sqlite'));sources=createSourceAuthority({...scene.readers,sourceRegistry:registry});authority=makeAuthority();}};
}
test('real issued source proofs bind durable owner consent to one atomic outcome',t=>{
  const f=fixture(t),receipt=f.commit();assert.equal(receipt.cost.sourceRef,f.attempt.id);assert.equal(receipt.cost.choiceSourceRef,f.choice.id);assert.notEqual(receipt.cost.sourceRef,receipt.cost.choiceSourceRef);
  assert.equal(receipt.afterAction.status,'resolved');assert.equal(f.actions.readHope('c','pc').hope,1);assert.deepEqual(f.commit(),receipt);
});
test('editing only the owner choice source blocks commit with both states unchanged',t=>{
  const f=fixture(t);f.scene.commitSnapshot({campaignId:'c',principal:'u',sourceRef:'choice-edit',records:[{kind:'message',expectedRevision:1,data:{id:'choice',campaignId:'c',userId:'u',channelId:'ch',deleted:false,text:'I withdrew that decision.'}}]},{check:()=>{}});
  assert.throws(f.commit,/authenticated scene source/);assert.equal(f.actions.readHope('c','pc').hope,3);assert.equal(f.actions.read('c','a').status,'ready_to_commit');assert.equal(f.actions.readOutcome('c','a'),null);
});
test('reopened scene/action/source stores reconstruct proofs and preserve one outcome across another reopen',t=>{
  const f=fixture(t,{persistent:true});f.reopen();const receipt=f.commit();assert.equal(receipt.afterHope.hope,1);f.reopen();assert.deepEqual(f.commit(),receipt);assert.equal(f.actions.readHope('c','pc').revision,2);assert.equal(f.actions.read('c','a').revision,4);
});
