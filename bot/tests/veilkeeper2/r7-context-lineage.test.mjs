import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openSourceRegistry} from '../../src/v2/source-registry.js';
import {openTurnStore} from '../../src/v2/turn-store.js';
import {openKnowledgeStore} from '../../src/v2/knowledge-store.js';
import {createKnowledgeAuthority} from '../../src/v2/knowledge-authority.js';
import {createContextAuthority} from '../../src/v2/context-authority.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {createDiscordTurnRunner} from '../../src/v2/discord-turn-runner.js';
import {createNativeDraftPublication} from '../../src/v2/native-draft-publication.js';

async function fixture(t,{toolLookup=false,legacy=false}={}){
  const directory=mkdtempSync(join(tmpdir(),'vk2-context-lineage-'));let scenes,registry,turns,knowledge;
  function open(){scenes=openSceneStore(join(directory,'scenes.sqlite'));registry=openSourceRegistry(join(directory,'sources.sqlite'));turns=openTurnStore(join(directory,'turns.sqlite'));knowledge=openKnowledgeStore(join(directory,'knowledge.sqlite'));}
  function close(){knowledge.close();turns.close();registry.close();scenes.close();}
  open();t.after(()=>{close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});});
  scenes.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'setup',records:[
    {kind:'session',data:{id:'session',campaignId:'c',status:'active'}},
    {kind:'scene',data:{id:'s',campaignId:'c',sessionId:'session',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}},
    {kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}},
    {kind:'channel',data:{id:'ch',campaignId:'c',sceneId:'s',kind:'party',permissionsVerified:true,recipientIds:['u'],writerIds:['u']}},
    {kind:'message',data:{id:'m',campaignId:'c',channelId:'ch',userId:'u',deleted:false,text:'Interesting.'}}
  ].map(r=>({...r,expectedRevision:null}))},{check:()=>{}});
  const events=new Map();let evidence=0,bodyReads=0,calls=0;
  function establish(id,patch={}){
    const old=knowledge.metadata('c',id),event={id:`e${++evidence}`,campaignId:'c',revision:String(evidence),status:'committed',authority:'native_observation',record:{id,kind:'observation',body:`Visible ${id}`,status:'active',scope:'scene',sceneId:'s',visibility:'recipients',recipientIds:['u'],knownBy:[],sourceRefs:id==='child'?['base']:[],disclosure:'observed',...patch}};
    events.set(event.id,event);return createKnowledgeAuthority({store:knowledge,sourceAuthority:{revalidate:()=>true},readEvidence:(_c,ref)=>structuredClone(events.get(ref))}).establish('c',event.id,old?.revision??null);
  }
  establish('base');establish('child');establish('secret',{body:'GM-private-canary',visibility:'gm',recipientIds:[],disclosure:'private'});
  const records={metadata:(...args)=>knowledge.metadata(...args),readText:(...args)=>{bodyReads++;return knowledge.readText(...args);}};
  const runner=createDiscordTurnRunner({intake:{ingest:async()=>({campaignId:'c',messageId:'m',userId:'u',actorId:'pc'})},provider:{generate:async input=>{calls++;assert.equal(JSON.stringify(input).includes('GM-private-canary'),false);return toolLookup&&!input.history.length?{toolCalls:[{id:'lookup',name:'context_read',arguments:{topic:'knowledge',focus:'child'}}]}:{text:'The clerk considers the note.'};}},turnStore:{...turns,saveDraft:(claim,draft,options)=>{if(legacy){draft={...draft};delete draft.contextDependencies;}return turns.saveDraft(claim,draft,options);}},applicationOptions:{readers:{...scenes.readers,sourceRegistry:registry},records,selectContext:()=>toolLookup?[]:['child','secret']}});
  await runner.respond({guildId:'c',channelId:'ch',messageId:'m',mode:'party'});const saved=turns.recentDrafts('c')[0];
  assert.equal(bodyReads,1);close();open();bodyReads=0;
  const authority=createSourceAuthority({...scenes.readers,sourceRegistry:registry}),context=createContextAuthority({sourceAuthority:authority,records,readActor:scenes.readers.readActor}),sent=[];
  const publication=createNativeDraftPublication({sceneStore:scenes,gmAuthority:{check:()=>{}},drafts:{inspectReceipts:(c,s,r,entries)=>{if(!Array.isArray(entries)||entries.length)throw new Error('Unexpected native receipt lineage');},recent:(c,n)=>turns.recentDrafts(c,n),inspectSource:(c,s,r)=>authority.inspectReference(s,r),refreshSource:async()=>{},inspectContext:(c,s,r,manifests)=>{if(!Array.isArray(manifests)||!manifests.length)throw new Error('Saved context lineage required');const proof=authority.inspectReference(s,r);for(const manifest of manifests)context.verifyDependencies(proof,manifest);},begin:(c,s,o)=>turns.beginPublication(c,s,o),finish:(c,s,m)=>turns.finishPublication(c,s,m),uncertain:(c,s,r)=>turns.markPublicationUncertain(c,s,r)},audiences:{read:async()=>({channelRecord:scenes.readers.readChannel('c','ch')})},resolveChannel:async()=>({id:'ch',guildId:'c',send:async value=>{sent.push(value);return {id:'sent'};}})});
  return {saved,sent,establish,publish:()=>publication.publish({operation:'draft_publish',campaignId:'c',targetRef:saved.source,principal:'gm',sourceRef:'approval',sourceRevision:'1'},{fingerprint:saved.fingerprint}),row:()=>turns.inspectNative('c',saved.source),bodyReads:()=>bodyReads,calls:()=>calls};
}

test('cold publication revalidates complete context ancestry without reading bodies or repeating inference',async t=>{
  const f=await fixture(t),manifest=f.saved.draft.contextDependencies[0];assert.deepEqual(manifest.records.map(r=>r.ref).sort(),['base','child']);assert.equal(JSON.stringify(manifest).includes('Visible'),false);assert.equal(JSON.stringify(manifest).includes('secret'),false);
  assert.deepEqual(await f.publish(),{messageId:'sent'});assert.equal(f.sent.length,1);assert.equal(f.bodyReads(),0);assert.equal(f.calls(),1);assert.equal(f.row().status,'published');
});
test('native knowledge correction or retraction after restart withholds the old draft without a send claim',async t=>{
  for(const change of [f=>f.establish('base',{body:'Corrected observation'}),f=>f.establish('child',{status:'retracted'})]){
    const f=await fixture(t);change(f);await assert.rejects(f.publish(),/authority/);assert.equal(f.sent.length,0);assert.equal(f.row().status,'draft_saved');assert.equal(f.bodyReads(),0);assert.equal(f.calls(),1);
  }
});
test('tool-only context dependencies survive restart and still revoke publication when their ancestor changes',async t=>{
  const f=await fixture(t,{toolLookup:true});assert.equal(f.saved.draft.contextDependencies.length,2);assert.deepEqual(f.saved.draft.contextDependencies[0].records,[]);assert.equal(f.calls(),2);
  f.establish('base',{body:'Corrected tool context'});await assert.rejects(f.publish(),/authority/);assert.equal(f.sent.length,0);assert.equal(f.bodyReads(),0);assert.equal(f.row().status,'draft_saved');
});
test('historical drafts without context lineage remain private rather than assuming an empty context',async t=>{
  const f=await fixture(t,{legacy:true});await assert.rejects(f.publish(),/context lineage required/);assert.equal(f.sent.length,0);assert.equal(f.row().status,'draft_saved');assert.equal(f.bodyReads(),0);
});
