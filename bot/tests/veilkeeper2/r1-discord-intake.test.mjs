import test from 'node:test';
import assert from 'node:assert/strict';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {createDiscordIntake} from '../../src/v2/discord-intake.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
function fixture(t){
  const store=openSceneStore();t.after(()=>store.close());
  store.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'setup',records:[
    {kind:'session',data:{id:'session',campaignId:'c',status:'active'}},
    {kind:'scene',data:{id:'s',campaignId:'c',sessionId:'session',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}},
    {kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'s',status:'active',kind:'pc',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}}
  ].map(r=>({...r,expectedRevision:null}))},{check:()=>{}});
  const evidence={messageRecord:{id:'m',campaignId:'c',userId:'u',channelId:'ch',deleted:false,text:'Interesting.'},audience:{channelRecord:{id:'ch',campaignId:'c',sceneId:'s',kind:'party',permissionsVerified:true,recipientIds:['u'],writerIds:['u']},fingerprint:'channel-1'},fingerprint:'evidence-1'};
  const state={calls:0,onRead:()=>{}};const intake=createDiscordIntake({sceneStore:store,messageReader:{read:async()=>{state.onRead(++state.calls);return structuredClone(evidence);}}});
  return {store,evidence,state,intake,request:{guildId:'c',channelId:'ch',messageId:'m',userId:'u',actorId:'pc',sceneId:'s'}};
}
test('native intake commits audience/message evidence and authenticates through durable readers',async t=>{
  const f=fixture(t),event=await f.intake.ingest(f.request),authority=createSourceAuthority(f.store.readers);assert.equal(authority.authenticate(event).text,'Interesting.');
  await f.intake.ingest(f.request);assert.equal(f.store.history('c','message','m').length,1);
  const proof=authority.authenticate(event);f.evidence.fingerprint='evidence-2';f.evidence.messageRecord.text='Edited.';await f.intake.ingest(f.request);assert.equal(authority.revalidate(proof),false);
});
test('unauthorized character control fails before source records are committed',async t=>{
  const f=fixture(t);f.request.actorId='other';await assert.rejects(f.intake.ingest(f.request),/authenticated scene/);assert.equal(f.store.readers.readMessage('c','m'),null);
});
test('changing Discord evidence during verification aborts without partial intake',async t=>{
  const f=fixture(t);f.state.onRead=n=>{if(n===2)f.evidence.fingerprint='changed';};await assert.rejects(f.intake.ingest(f.request),/evidence changed/);
  assert.equal(f.store.readers.readMessage('c','m'),null);assert.equal(f.store.readers.readChannel('c','ch'),null);
});

test('equivalent JSON property order preserves issued sources while changed audience still revokes them',async t=>{
  const f=fixture(t),event=await f.intake.ingest(f.request),authority=createSourceAuthority(f.store.readers),source=authority.authenticate(event);
  f.evidence.audience.channelRecord=Object.fromEntries(Object.entries(f.evidence.audience.channelRecord).reverse());f.evidence.messageRecord=Object.fromEntries(Object.entries(f.evidence.messageRecord).reverse());
  await f.intake.ingest(f.request);assert.equal(f.store.history('c','channel','ch').length,1);assert.equal(f.store.history('c','message','m').length,1);assert.equal(authority.revalidate(source),true);
  f.evidence.audience.channelRecord.recipientIds.push('v');f.evidence.audience.channelRecord.writerIds.push('v');f.evidence.fingerprint='new-audience';await f.intake.ingest(f.request);assert.equal(f.store.history('c','channel','ch').length,2);assert.equal(authority.revalidate(source),false);
});
