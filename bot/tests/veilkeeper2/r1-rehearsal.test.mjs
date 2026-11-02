import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRehearsal} from '../../src/v2/rehearsal.js';

function fixture({failSelection=false,providerResult}={}){
  const event={campaignId:'c',messageId:'m',userId:'u',actorId:'pc'};
  const message={id:'m',campaignId:'c',userId:'u',channelId:'ch',revision:'1',deleted:false,text:'Interesting.'};
  const channel={id:'ch',campaignId:'c',sceneId:'scene',revision:'1',kind:'party',permissionsVerified:true,recipientIds:['u'],writerIds:['u']};
  const actor={id:'pc',campaignId:'c',sceneId:'scene',status:'active',kind:'pc',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1'};
  const sources=new Map(['rumor','secret'].map(ref=>[ref,{id:ref,revision:'1',contentHash:createHash('sha256').update(ref==='secret'?'GM-only culprit':'The clerk claims a tunnel exists.').digest('hex'),campaignId:'c',status:'active',kind:'testimony',scope:'scene',sceneId:'scene',sourceRefs:[],recipientIds:['u'],knownBy:[],visibility:ref==='secret'?'gm':'recipients',disclosure:'acknowledged'}]));
  const requests=[],textReads=[];
  const app=createRehearsal({readers:{readMessage:()=>message,readChannel:()=>channel,readActor:()=>actor,
    readScene:()=>({id:'scene',campaignId:'c',sessionId:'session',revision:'1',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}),
    readSession:()=>({id:'session',campaignId:'c',revision:'1',status:'active'})},
    records:{metadata:(_c,ref)=>sources.get(ref),readText:(_c,ref,revision)=>{textReads.push(ref);return {revision,text:ref==='secret'?'GM-only culprit':'The clerk claims a tunnel exists.'};}},
    selectContext:()=>{if(failSelection)throw new Error('Optional memory unavailable');return ['rumor','secret'];},
    provider:{generate:async request=>{requests.push(request);return providerResult?providerResult():{text:'“Mercer, interesting usually means trouble,” the clerk says.',usage:{inputTokens:42,outputTokens:12}};}}});
  return {app,event,channel,actor,sources,requests,textReads};
}
test('ordinary conversation reaches one scoped inference with no typed intent or action receipt',async()=>{
  const f=fixture(),result=await f.app.respond(f.event),output=f.app.inspectPublication(result.publication.id);
  assert.equal(f.requests.length,1);assert.deepEqual(f.textReads,['rumor']);
  assert.equal(f.requests[0].context.utterance,'Interesting.');assert.equal(JSON.stringify(f.requests).includes('GM-only culprit'),false);
  assert.equal(Object.hasOwn(f.requests[0],'player_intents'),false);assert.match(output.text,/Mercer/);
  assert.equal(output.status,'awaiting_review');assert.equal(output.sent,false);assert.equal(output.knowledgeAcknowledged,false);
  assert.equal(result.metrics.modelCalls,1);assert.equal(result.metrics.usage.inputTokens,42);
  assert.deepEqual(Object.keys(f.app.capabilities(result.sourceHandle)),['context_read','action_propose','state_inspect','knowledge_propose']);
});
test('optional retrieval failure keeps current utterance available without fabricating remembered facts',async()=>{
  const f=fixture({failSelection:true});await f.app.respond(f.event);
  assert.equal(f.requests.length,1);assert.deepEqual(f.requests[0].context.records,[]);assert.deepEqual(f.textReads,[]);
});
test('audience revocation during inference prevents queueing and later inspection',async()=>{
  let f;f=fixture({providerResult:()=>{f.channel.revision='2';return {text:'Draft'};}});
  await assert.rejects(f.app.respond(f.event),/authority/);
  const g=fixture(),result=await g.app.respond(g.event);g.actor.controlRevision='2';assert.throws(()=>g.app.inspectPublication(result.publication.id),/authority/);
});
test('provider errors reveal no private diagnostics and abort before inference makes zero calls',async()=>{
  const f=fixture({providerResult:()=>{throw new Error('secret provider diagnostic');}});
  await assert.rejects(f.app.respond(f.event),e=>e.code==='generation_failed'&&!e.message.includes('secret'));
  const g=fixture(),abort=new AbortController();abort.abort();await assert.rejects(g.app.respond(g.event,{signal:abort.signal}));assert.equal(g.requests.length,0);
});
test('duplicate identical drafts reuse the offline publication identity and remain undelivered',async()=>{
  const f=fixture(),a=await f.app.respond(f.event),b=await f.app.respond(f.event);
  assert.equal(a.publication.id,b.publication.id);assert.equal(b.publication.sent,false);
  // Inference deduplication across replay is R7 work; no exactly-once model-call claim.
  assert.equal(f.requests.length,2);
});
