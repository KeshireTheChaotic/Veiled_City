import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openTurnStore} from '../../src/v2/turn-store.js';
import {createDiscordTurnRunner} from '../../src/v2/discord-turn-runner.js';
import {createRehearsal} from '../../src/v2/rehearsal.js';

async function fixture(t){
  const directory=mkdtempSync(join(tmpdir(),'vk2-source-repair-')),path=join(directory,'turns.sqlite'),store=openTurnStore(path),scenes=openSceneStore();
  t.after(()=>{store.close();scenes.close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});});
  const actor={id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',controlRole:'owner',ownerUserId:'u',controllerUserId:'u'};
  scenes.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'setup',records:[
    {kind:'session',data:{id:'session',campaignId:'c',status:'active'}},
    {kind:'scene',data:{id:'s',campaignId:'c',sessionId:'session',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}},
    {kind:'actor',data:actor},
    {kind:'channel',data:{id:'ch',campaignId:'c',sceneId:'s',kind:'party',permissionsVerified:true,recipientIds:['u'],writerIds:['u']}},
    {kind:'message',data:{id:'m',campaignId:'c',channelId:'ch',userId:'u',deleted:false,text:'Interesting.'}}
  ].map(r=>({...r,expectedRevision:null}))},{check:()=>{}});
  const state={calls:0,failCheck:0,checks:0,revokeOnRefresh:false};let app;
  function revoke(){const current=scenes.readers.readActor('c','pc');scenes.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'revoke',records:[{kind:'actor',expectedRevision:Number(current.revision),data:{...actor,ownerUserId:'other',controllerUserId:'other'}}]},{check:()=>{}});}
  const runner=createDiscordTurnRunner({intake:{ingest:async()=>{if(state.revokeOnRefresh){state.revokeOnRefresh=false;revoke();}return {campaignId:'c',messageId:'m',userId:'u',actorId:'pc'};}},provider:{generate:async()=>{state.calls++;return {text:'Rain taps the glass.\n\nYou agree to pay.\n\nThe clerk waits.'};}},turnStore:{...store,saveReview:(claim,review,options)=>store.saveReview(claim,review,{...options,check:()=>{options.check();if(++state.checks===state.failCheck)throw new Error('simulated final storage authorization failure');}})},applicationOptions:{readers:scenes.readers,records:{metadata:()=>null,readText:()=>null}},createApplication:options=>(app=createRehearsal(options))});
  const generated=await runner.respond({guildId:'c',channelId:'ch',messageId:'m',mode:'party'}),id=generated.publication.id,initial=app.reviewPublication(id),source=store.recentDrafts('c')[0].source;
  return {store,path,runner,app,id,initial,source,state};
}

test('one native local repair persists before replacing memory and survives reopening without another inference',async t=>{
  const f=await fixture(t),raw=f.store.inspectNative('c',f.source).data.fingerprint;
  const repaired=await f.runner.repairPublication(f.id,f.initial.segments[1].id,'The clerk offers an alternative.');
  assert.equal(repaired.heldCount,0);assert.equal(repaired.sent,false);assert.equal(repaired.status,'requires_semantic_review');assert.equal(f.state.calls,1);
  assert.equal(repaired.segments[0].id,f.initial.segments[0].id);assert.equal(repaired.segments[2].id,f.initial.segments[2].id);
  const cold=openTurnStore(f.path);try{const row=cold.inspectNative('c',f.source);assert.equal(row.status,'draft_saved');assert.equal(row.data.fingerprint,raw);assert.match(row.data.draft.text,/You agree/);assert.deepEqual(row.data.review.value,repaired);assert.deepEqual(row.data.reviewHistory[0].value,f.initial);assert.equal(row.data.review.repair.fromSegmentId,f.initial.segments[1].id);assert.equal(row.data.review.repair.toSegmentId,repaired.segments[1].id);}finally{cold.close();}
  await assert.rejects(f.runner.repairPublication(f.id,f.initial.segments[1].id,'A repeated repair'),/current withheld/);
  await f.runner.reviewPublication(f.id);assert.equal(f.store.inspectNative('c',f.source).data.review.sequence,1);assert.equal(f.state.calls,1);
});

test('a final transactional failure rolls back storage and leaves the original in-memory candidate intact',async t=>{
  const f=await fixture(t);f.state.failCheck=2;
  await assert.rejects(f.runner.repairPublication(f.id,f.initial.segments[1].id,'The clerk offers an alternative.'),/final storage/);
  assert.deepEqual(f.app.reviewPublication(f.id),f.initial);assert.equal(f.store.inspectNative('c',f.source).data.review,undefined);assert.equal(f.state.calls,1);
  f.state.failCheck=0;assert.equal((await f.runner.repairPublication(f.id,f.initial.segments[1].id,'The clerk offers an alternative.')).heldCount,0);assert.equal(f.state.calls,1);
});

test('a stale repair writer cannot overwrite peer review, and explicit fresh review permits a later local repair',async t=>{
  const f=await fixture(t),peer=openTurnStore(f.path);try{
    const row=peer.inspectNative('c',f.source),claim={status:'claimed',campaignId:'c',sourceRef:f.source,sourceRevision:row.revision,token:row.token};peer.saveReview(claim,f.initial,{check:()=>{}});
    await assert.rejects(f.runner.repairPublication(f.id,f.initial.segments[1].id,'The clerk offers an alternative.'),/sequence conflict/);assert.deepEqual(f.app.reviewPublication(f.id),f.initial);assert.deepEqual(peer.inspectNative('c',f.source).data.review.value,f.initial);
    await f.runner.reviewPublication(f.id);await f.runner.repairPublication(f.id,f.initial.segments[1].id,'The clerk offers an alternative.');assert.equal(peer.inspectNative('c',f.source).data.review.sequence,2);assert.equal(f.state.calls,1);
  }finally{peer.close();}
});

test('source revocation during refresh and unknown handles cannot reach repair storage',async t=>{
  const f=await fixture(t);await assert.rejects(f.runner.repairPublication('unknown','segment','text'),/not available/);f.state.revokeOnRefresh=true;
  await assert.rejects(f.runner.repairPublication(f.id,f.initial.segments[1].id,'The clerk waits.'),/revoked/);assert.equal(f.store.inspectNative('c',f.source).data.review,undefined);assert.equal(f.state.calls,1);
});
