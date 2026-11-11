import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openSourceRegistry} from '../../src/v2/source-registry.js';
import {openTurnStore} from '../../src/v2/turn-store.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {createDiscordTurnRunner} from '../../src/v2/discord-turn-runner.js';
import {createDiscordIntake} from '../../src/v2/discord-intake.js';
import {createNativeDraftPublication} from '../../src/v2/native-draft-publication.js';

async function fixture(t){
  const directory=mkdtempSync(join(tmpdir(),'vk2-publication-source-'));
  let scenes=openSceneStore(join(directory,'scenes.sqlite')),registry=openSourceRegistry(join(directory,'sources.sqlite')),turns=openTurnStore(join(directory,'turns.sqlite'));
  t.after(()=>{turns.close();registry.close();scenes.close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});});
  const records=[
    {kind:'session',data:{id:'session',campaignId:'c',status:'active'}},
    {kind:'scene',data:{id:'scene',campaignId:'c',sessionId:'session',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}},
    {kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'scene',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}},
    {kind:'channel',data:{id:'channel',campaignId:'c',sceneId:'scene',kind:'private',permissionsVerified:true,recipientIds:['u'],writerIds:['u'],ownerUserId:'u'}},
    {kind:'message',data:{id:'message',campaignId:'c',userId:'u',channelId:'channel',deleted:false,text:'Interesting.'}}
  ];
  scenes.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'setup',records:records.map(r=>({...r,expectedRevision:null}))},{check:()=>{}});
  let calls=0;const event={campaignId:'c',messageId:'message',userId:'u',actorId:'pc'};
  const runner=createDiscordTurnRunner({intake:{ingest:async()=>event},provider:{generate:async()=>{calls++;return {text:'The clerk raises an eyebrow.'};}},turnStore:turns,applicationOptions:{readers:{...scenes.readers,sourceRegistry:registry},records:{metadata:()=>null,readText:()=>null}}});
  await runner.respond({guildId:'c',channelId:'channel',messageId:'message',mode:'private'});
  assert.equal(calls,1);
  const saved=turns.recentDrafts('c')[0];assert.ok(registry.get(saved.source));
  assert.equal(JSON.stringify(registry.get(saved.source)).includes('Interesting.'),false);
  turns.close();registry.close();scenes.close();
  scenes=openSceneStore(join(directory,'scenes.sqlite'));registry=openSourceRegistry(join(directory,'sources.sqlite'));turns=openTurnStore(join(directory,'turns.sqlite'));
  const live={message:{...records.find(r=>r.kind==='message').data},reads:0};
  const intake=createDiscordIntake({sceneStore:scenes,messageReader:{read:async()=>{live.reads++;if(live.error)throw new Error(live.error);return {messageRecord:live.message,audience:{channelRecord:records.find(r=>r.kind==='channel').data,fingerprint:'live-channel'},fingerprint:'live-message'};}}});
  const authority=createSourceAuthority({...scenes.readers,sourceRegistry:registry}),sent=[];
  const publication=createNativeDraftPublication({sceneStore:scenes,gmAuthority:{check:()=>{}},drafts:{
    refreshSource:async(c,s,r,{signal})=>{const event=authority.eventForReference(s);await intake.ingest({guildId:c,channelId:'channel',sceneId:'scene',messageId:event.messageId,userId:event.userId,actorId:event.actorId,mode:'private',ownerUserId:event.userId},{signal});},
    inspectSource:(c,s,r)=>authority.inspectReference(s,r),recent:(c,n)=>turns.recentDrafts(c,n),begin:(c,s,o)=>turns.beginPublication(c,s,o),finish:(c,s,m)=>turns.finishPublication(c,s,m),uncertain:(c,s,r)=>turns.markPublicationUncertain(c,s,r)
  },audiences:{read:async()=>({channelRecord:scenes.readers.readChannel('c','channel')})},resolveChannel:async()=>({id:'channel',guildId:'c',send:async payload=>{sent.push(payload);return {id:'sent'};}})});
  const publish=()=>publication.publish({operation:'draft_publish',campaignId:'c',targetRef:saved.source,principal:'gm',sourceRef:'approval',sourceRevision:'1'},{fingerprint:saved.fingerprint});
  let change=0;
  function update(kind,patch){
    const base=records.find(r=>r.kind===kind),current=scenes.readers[{scene:'readScene',session:'readSession',actor:'readActor',message:'readMessage',channel:'readChannel'}[kind]]('c',base.data.id);
    scenes.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:`change-${++change}`,records:[{kind,data:{...base.data,...patch},expectedRevision:Number(current.revision)}]},{check:()=>{}});
  }
  return {publish,update,sent,turns,saved,live};
}

test('one-inference saved draft retains original source authority after reopening all stores',async t=>{
  const f=await fixture(t);assert.deepEqual(await f.publish(),{messageId:'sent'});assert.equal(f.sent.length,1);assert.equal(f.live.reads,2);assert.equal(f.turns.inspectNative('c',f.saved.source).status,'published');await assert.rejects(f.publish(),/current saved draft/);assert.equal(f.sent.length,1);
});

test('persisted drafts reject message edits, ownership changes, absence and scene close/reopen',async t=>{
  for(const mutation of [f=>f.update('message',{text:'Edited.'}),f=>f.update('actor',{ownerUserId:'other',controllerUserId:'other'}),f=>f.update('scene',{participants:[{userId:'u',actorId:'pc',presence:'absent'}]}),f=>{f.update('scene',{status:'closed'});f.update('scene',{status:'active'}); }]){
    const f=await fixture(t);mutation(f);await assert.rejects(f.publish(),/authenticated scene source/);assert.equal(f.sent.length,0);assert.equal(f.turns.inspectNative('c',f.saved.source).status,'draft_saved');
  }
});

test('unobserved live edits, deletions and unavailable original messages stay withheld',async t=>{
  for(const mutate of [f=>{f.live.message.text='Edited on Discord';},f=>{f.live.message.deleted=true;},f=>{f.live.error='Message unavailable';}]){
    const f=await fixture(t);mutate(f);await assert.rejects(f.publish());assert.equal(f.sent.length,0);assert.equal(f.turns.inspectNative('c',f.saved.source).status,'draft_saved');assert.ok(f.live.reads>0);
  }
});
