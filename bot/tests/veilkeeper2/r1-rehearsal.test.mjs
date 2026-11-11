import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRehearsal} from '../../src/v2/rehearsal.js';
import {createProseMaterialReview} from '../../src/v2/prose-material-review.js';
import {openKnowledgeStore} from '../../src/v2/knowledge-store.js';
import {createKnowledgeAuthority} from '../../src/v2/knowledge-authority.js';

function fixture({failSelection=false,providerResult,knowledgeStore,recall,planning,proseReview}={}){
  const event={campaignId:'c',messageId:'m',userId:'u',actorId:'pc'};
  const message={id:'m',campaignId:'c',userId:'u',channelId:'ch',revision:'1',deleted:false,text:'Interesting.'};
  const channel={id:'ch',campaignId:'c',sceneId:'scene',revision:'1',kind:'party',permissionsVerified:true,recipientIds:['u'],writerIds:['u']};
  const actor={id:'pc',campaignId:'c',sceneId:'scene',status:'active',kind:'pc',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1'};
  const sources=new Map(['rumor','secret'].map(ref=>[ref,{id:ref,revision:'1',contentHash:createHash('sha256').update(ref==='secret'?'GM-only culprit':'The clerk claims a tunnel exists.').digest('hex'),campaignId:'c',status:'active',kind:'testimony',scope:'scene',sceneId:'scene',sourceRefs:[],recipientIds:['u'],knownBy:[],visibility:ref==='secret'?'gm':'recipients',disclosure:'acknowledged'}]));
  const requests=[],textReads=[];
  const app=createRehearsal({readers:{readMessage:()=>message,readChannel:()=>channel,readActor:()=>actor,
    readScene:()=>({id:'scene',campaignId:'c',sessionId:'session',revision:'1',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}),
    readSession:()=>({id:'session',campaignId:'c',revision:'1',status:'active'})},
    records:knowledgeStore?undefined:{metadata:(_c,ref)=>sources.get(ref),readText:(_c,ref,revision)=>{textReads.push(ref);return {revision,text:ref==='secret'?'GM-only culprit':'The clerk claims a tunnel exists.'};}},
    knowledge:knowledgeStore?{store:knowledgeStore,readEvidence:()=>null}:null,recall,planning,proseReview,
    selectContext:()=>{if(failSelection)throw new Error('Optional memory unavailable');return ['rumor','secret'];},
    provider:{generate:async request=>{requests.push(request);return providerResult?providerResult(request):{text:'“Mercer, interesting usually means trouble,” the clerk says.',usage:{inputTokens:42,outputTokens:12}};}}});
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

test('optional generic retrieval checks guessed references and current audience before reading bodies',async()=>{
  const f=fixture(),result=await f.app.respond(f.event),tools=f.app.capabilities(result.sourceHandle);
  assert.equal(tools.context_read({topic:'knowledge',focus:'rumor'}).records[0].kind,'testimony');
  const before=f.textReads.length;
  for(const ref of ['secret','missing'])assert.deepEqual(tools.context_read({topic:'knowledge',focus:ref}).records,[]);
  assert.equal(f.textReads.length,before);
  assert.equal(tools.context_read({topic:'knowledge',focus:'rumor',recipients:['other']}).code,'invalid_context_query');
  assert.equal(tools.context_read({topic:'knowledge',focus:'rumor',cursor:'forged'}).code,'context_not_available');
  f.channel.revision='2';assert.equal(tools.context_read({topic:'knowledge',focus:'rumor'}).code,'source_authority_changed');
  assert.equal(f.textReads.length,before);
});

test('persisted knowledge feeds scoped rehearsal while proposals remain separate and corrections invalidate drafts',async t=>{
  const store=openKnowledgeStore();t.after(()=>store.close());
  const event={id:'e',campaignId:'c',revision:'1',status:'committed',authority:'native_testimony',record:{id:'rumor',kind:'testimony',body:'A clerk claims a tunnel exists.',status:'active',scope:'scene',sceneId:'scene',visibility:'recipients',recipientIds:['u'],knownBy:[],sourceRefs:[],disclosure:'observed'}};
  const native=createKnowledgeAuthority({store,sourceAuthority:{revalidate:()=>true},readEvidence:()=>event});
  native.establish('c','e');const f=fixture({knowledgeStore:store}),result=await f.app.respond(f.event),tools=f.app.capabilities(result.sourceHandle);
  assert.equal(f.requests[0].context.records[0].text,event.record.body);
  const sourceRef=tools.context_read({topic:'conversation'}).source_ref;
  const proposal=tools.knowledge_propose({source_ref:sourceRef,kind:'fact',claim:'The tunnel is real.'});
  assert.equal(proposal.status,'proposed');assert.equal(store.proposal('c',proposal.proposal_ref).effectsCommitted,false);
  assert.deepEqual(tools.context_read({topic:'knowledge',focus:proposal.proposal_ref}).records,[]);
  event.id='e2';event.record.body='The clerk retracts the claim.';native.establish('c','e2','1');
  assert.throws(()=>f.app.inspectPublication(result.publication.id),/authority/);
  assert.equal(tools.context_read({topic:'knowledge',focus:'rumor'}).records[0].revision,'2');
  event.id='e3';event.record.status='retracted';native.establish('c','e3','2');
  assert.deepEqual(tools.context_read({topic:'knowledge',focus:'rumor'}).records,[]);
  assert.equal(f.requests.length,1);
});

test('native weighted recall composes before one inference and retirement does not delete records',async()=>{
  let tick=0;
  const recall={readClock:()=>tick,readCandidates:()=>['rumor','secret'],readPins:()=>[],readCauses:()=>[{id:'cause',campaignId:'c',status:'committed',authority:'native_recall',kind:'mention',tick:0,targetRefs:['rumor'],sourceRefs:['rumor'],independentlyAuthenticated:true}]};
  const f=fixture({recall});await f.app.respond(f.event);assert.equal(f.requests[0].context.records.length,1);
  tick=12;await f.app.respond(f.event);assert.deepEqual(f.requests[1].context.records,[]);
  assert.equal(f.sources.has('rumor'),true);assert.deepEqual(f.textReads,['rumor']);assert.equal(f.requests.length,2);
});

test('optional private planning stays separate and is not invoked for ordinary audience response',async()=>{
  const privateRequests=[],secret='A hidden official ordered surveillance.';
  const planning={authorize:s=>({sourceRef:s.id,sourceRevision:s.revision,principal:s.principal,campaignId:s.campaign,sceneId:s.scene,revision:'1',purpose:'secret_dependent',recordRefs:['order']}),
    records:{metadata:()=>({id:'order',campaignId:'c',revision:'1',status:'active',kind:'canon',scope:'scene',sceneId:'scene',sourceRefs:[],contentHash:createHash('sha256').update(secret).digest('hex')}),readText:()=>({revision:'1',text:secret})},
    provider:{generate:async request=>{privateRequests.push(request);return {text:'PRIVATE proposal about the official'};}}};
  const f=fixture({planning});await f.app.respond(f.event);assert.equal(privateRequests.length,0);
  const plan=await f.app.plan(f.event);assert.equal(f.app.inspectPlan(plan).status,'private_proposal');assert.equal(privateRequests.length,1);
  await f.app.respond(f.event);assert.equal(f.requests.length,2);assert.equal(JSON.stringify(f.requests).includes('official'),false);
  assert.throws(()=>f.app.inspectPublication(plan),/not available/);
});

test('provider retrieval retains extra source grants through queued publication inspection',async()=>{
  let f;f=fixture({failSelection:true,providerResult:request=>request.history.length===0?{toolCalls:[{id:'lookup',name:'context_read',arguments:{topic:'knowledge',focus:'rumor'}}]}:{text:'The clerk repeats the rumor.'}});
  const result=await f.app.respond(f.event);assert.equal(result.metrics.modelCalls,2);assert.equal(result.metrics.toolCalls,1);const lineage=f.app.inspectPublication(result.publication.id).contextDependencies;assert.equal(lineage.length,2);assert.deepEqual(lineage[0].records,[]);assert.equal(lineage[1].records[0].ref,'rumor');
  assert.equal(f.requests[1].history[0].toolResults[0].result.records[0].kind,'testimony');assert.deepEqual(f.requests[0].context.records,[]);
  f.sources.get('rumor').revision='2';assert.throws(()=>f.app.inspectPublication(result.publication.id),/authority/);
});

test('extra lookup is revalidated after tool continuation and never grants hidden context',async()=>{
  let f;f=fixture({failSelection:true,providerResult:request=>{
    if(!request.history.length)return {toolCalls:[{id:'secret',name:'context_read',arguments:{topic:'knowledge',focus:'secret'}},{id:'rumor',name:'context_read',arguments:{topic:'knowledge',focus:'rumor'}}]};
    assert.deepEqual(request.history[0].toolResults[0].result.records,[]);f.sources.get('rumor').revision='2';return {text:'Stale draft'};
  }});
  await assert.rejects(f.app.respond(f.event),/authority/);assert.deepEqual(f.textReads,['rumor']);
});

test('native segment review and local repair preserve one inference and never grant publication',async()=>{
  const f=fixture({providerResult:()=>({text:'Rain taps the glass.\n\nYou agree to pay.\n\nThe clerk waits.'})}),turn=await f.app.respond(f.event);
  const review=f.app.reviewPublication(turn.publication.id);assert.equal(review.heldCount,1);assert.equal(f.requests.length,1);
  const fixed=f.app.repairPublication(turn.publication.id,review.segments[1].id,'The clerk offers an alternative.');
  assert.equal(fixed.heldCount,0);assert.equal(fixed.status,'requires_semantic_review');assert.equal(fixed.sent,false);assert.equal(f.requests.length,1);
  assert.deepEqual(Object.keys(f.app.capabilities(turn.sourceHandle)),['context_read','action_propose','state_inspect','knowledge_propose']);
  f.channel.revision='2';assert.throws(()=>f.app.reviewPublication(turn.publication.id),/authority/);
});

test('rehearsal actually applies its supplied native control, speaker and material policy',async()=>{
  let checks=0;const proseReview=createProseMaterialReview({readControlledNames:()=>['Mercer','Rook'],readIndependentSpeakers:()=>['The clerk','Rook'],authorizeMaterial:c=>{checks++;return c.kind==='mechanical_result'&&c.excerpt==='take 3 damage';}});
  const f=fixture({proseReview,providerResult:()=>({text:'Mercer obeys.\n\nThe clerk claims, “You agreed to pay.”\n\nRook says, “I accept.”\n\nYou take 3 damage.'})}),turn=await f.app.respond(f.event),review=f.app.reviewPublication(turn.publication.id);
  assert.deepEqual(review.segments.map(s=>s.status),['withheld','screened','withheld','screened']);assert.ok(checks>=3);assert.equal(review.status,'requires_semantic_review');assert.equal(review.sent,false);assert.equal(f.requests.length,1);
});

test('identical prose with changed context lineage receives a new publication identity',async()=>{
  const f=fixture({providerResult:()=>({text:'The clerk waits.'})}),first=await f.app.respond(f.event);f.sources.get('rumor').revision='2';
  const second=await f.app.respond(f.event);assert.notEqual(second.publication.id,first.publication.id);assert.equal(f.requests.length,2);assert.throws(()=>f.app.inspectPublication(first.publication.id),/authority/);assert.equal(f.app.inspectPublication(second.publication.id).text,'The clerk waits.');
});
