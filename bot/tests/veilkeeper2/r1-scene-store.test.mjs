import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {createRehearsal} from '../../src/v2/rehearsal.js';
const event={campaignId:'c',messageId:'m',userId:'u',actorId:'pc'};
function initial(){return {campaignId:'c',principal:'admin',sourceRef:'setup',records:[
  {kind:'session',data:{id:'session',campaignId:'c',status:'active'}},
  {kind:'scene',data:{id:'scene',campaignId:'c',sessionId:'session',status:'active',participants:[{userId:'u',actorId:'pc',presence:'late'}]}},
  {kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'scene',status:'active',kind:'pc',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}},
  {kind:'channel',data:{id:'channel',campaignId:'c',sceneId:'scene',kind:'party',permissionsVerified:true,recipientIds:['u'],writerIds:['u']}},
  {kind:'message',data:{id:'m',campaignId:'c',userId:'u',channelId:'channel',deleted:false,text:'Interesting.'}}
].map(r=>({...r,expectedRevision:null}))};}
const check=()=>{};
function setup(t,path){const store=openSceneStore(path);t.after(()=>store.close());store.commitSnapshot(initial(),{check});return store;}
function update(store,kind,patch,source='update'){
  const entry=initial().records.find(r=>r.kind===kind);return store.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:source,records:[{kind,data:{...entry.data,...patch},expectedRevision:1}]},{check});
}
test('persisted native records authenticate a late arrival after database reopening',t=>{
  const dir=mkdtempSync(join(tmpdir(),'vk2-scene-')),path=join(dir,'scene.sqlite'),store=setup(t,path);
  t.after(()=>{assert.ok(resolve(dir).startsWith(resolve(tmpdir())));rmSync(dir,{recursive:true,force:true});});
  const second=openSceneStore(path);try{
    const authority=createSourceAuthority(second.readers),proof=authority.authenticate(event);assert.equal(proof.text,'Interesting.');assert.deepEqual(proof.recipients,['u']);
    assert.equal(second.readers.readActor('c','pc').controlRevision,'1');assert.equal(second.readers.readMessage('other','m'),null);
  }finally{second.close();}
  assert.equal(store.history('c','message','m')[0].sourceRef,'setup');
});
test('source invalidation follows durable ownership, attendance, message and permission revisions',t=>{
  for(const [kind,patch] of [['actor',{controllerUserId:'other'}],['scene',{participants:[{userId:'u',actorId:'pc',presence:'absent'}]}],['message',{deleted:true}],['channel',{permissionsVerified:false}]]){
    const store=setup(t),authority=createSourceAuthority(store.readers),proof=authority.authenticate(event);update(store,kind,patch);assert.equal(authority.revalidate(proof),false);
  }
});
test('identical replay does not replace later records; altered replay and stale writers fail',t=>{
  const store=setup(t),first=store.commitSnapshot(initial(),{check});update(store,'message',{text:'Edited.'});
  assert.deepEqual(store.commitSnapshot(initial(),{check}),first);assert.equal(store.readers.readMessage('c','m').text,'Edited.');
  const changed=initial();changed.records[4].data.text='Forged replay';assert.throws(()=>store.commitSnapshot(changed,{check}),/replay conflict/);
  assert.throws(()=>update(store,'message',{text:'Stale'},'stale'),/revision conflict/);assert.equal(store.history('c','message','m').length,2);
});
test('multi-record updates and final authorization failure roll back atomically',t=>{
  const store=setup(t),records=initial().records.slice(0,2).map(r=>({...r,expectedRevision:1}));records[0].data.status='ended';records[1].expectedRevision=2;
  assert.throws(()=>store.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'bad',records},{check}),/revision conflict/);assert.equal(store.readers.readSession('c','session').status,'active');
  records[1].expectedRevision=1;let checks=0;assert.throws(()=>store.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'revoke',records},{check:()=>{if(++checks===2)throw new Error('revoked');}}),/revoked/);
  assert.equal(store.readers.readSession('c','session').revision,'1');
});
test('native snapshot schema rejects gameplay patches, cross-campaign records and supplied revisions',t=>{
  const store=setup(t);for(const patch of [{hp:99},{campaignId:'other'},{revision:'100'},{controlRevision:'100'}]){
    const data={...initial().records[2].data,...patch};assert.throws(()=>store.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'bad',records:[{kind:'actor',data,expectedRevision:1}]},{check}),/Closed native/);
  }
  const duplicate=initial();duplicate.sourceRef='duplicate';duplicate.records.push(duplicate.records[0]);assert.throws(()=>store.commitSnapshot(duplicate,{check}),/Duplicate/);
});
test('durable readers compose into rehearsal without exposing a mutation capability',async t=>{
  const store=setup(t),requests=[],app=createRehearsal({readers:store.readers,records:{metadata:()=>null,readText:()=>null},provider:{generate:async r=>{requests.push(r);return {text:'The clerk waits for your reply.'};}}});
  const result=await app.respond(event);assert.equal(requests.length,1);assert.equal(requests[0].context.utterance,'Interesting.');
  assert.deepEqual(Object.keys(app.capabilities(result.sourceHandle)),['context_read','action_propose','state_inspect','knowledge_propose']);assert.equal(result.publication.sent,false);
  update(store,'session',{status:'ended'});assert.throws(()=>app.inspectPublication(result.publication.id),/authority/);
});
