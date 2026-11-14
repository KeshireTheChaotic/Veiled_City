import test from 'node:test';import assert from 'node:assert/strict';
import {createNpcDecisionPlanner} from '../../src/v2/npc-decision-planner.js';
import {npcDecisionFixture} from './helpers/npc-decision-fixture.mjs';
function fixture(t){const f=npcDecisionFixture();t.after(()=>f.close());return f;}
test('one-call independent NPC decision sees known testimony and portrayal but no private or unheard message',async t=>{
 const f=fixture(t),calls=[],planner=createNpcDecisionPlanner({contextAuthority:f.context,provider:{generate:async input=>{calls.push(input);return {text:'Ilex could offer the parcel and wait for an answer: “One outstanding item. No signature required.”'};}}}),plan=planner.inspect(await planner.plan(f.grant()));
 assert.equal(calls.length,1);assert.equal(calls[0].context.utterance,'');assert.equal(calls[0].tools,undefined);assert.equal(JSON.stringify(calls).includes('CANARY'),false);assert.deepEqual(f.reads,['clerk-portrait','observed-scene','heard-rumor']);
 assert.equal(calls[0].context.records.find(r=>r.ref==='heard-rumor').kind,'testimony');assert.equal(plan.visibility,'npc_private');assert.equal(plan.actorRef,'clerk');assert.equal(plan.executionAuthority,false);assert.equal(plan.publicationAuthority,false);assert.equal(plan.knowledgeAuthority,false);assert.equal(plan.metrics.modelCalls,1);assert.ok(Object.isFrozen(plan));
});
test('GM grants, forged handles and human-controlled NPCs cannot enter the independent decision model',async t=>{
 const f=fixture(t);let calls=0;const planner=createNpcDecisionPlanner({contextAuthority:f.context,provider:{generate:async()=>{calls++;return {text:'Wait.'};}}});await assert.rejects(planner.plan(f.context.issue(f.source,[])),/Actor-limited/);await assert.rejects(planner.plan({}),/authority/);assert.throws(()=>planner.inspect({}),/Issued/);
 const actor=f.sceneStore.readers.readActor('c','clerk'),{revision,controlRevision,...data}=actor;f.sceneStore.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'proxy',records:[{kind:'actor',expectedRevision:Number(revision),data:{...data,controllerUserId:'v',controlRole:'proxy',proxyAuthorized:true,delegationRef:'human-delegation'}}]},{check(){}});assert.throws(f.grant,/authority/);assert.equal(calls,0);
});
test('changed actor knowledge during inference invalidates the proposal rather than leaking a stale decision',async t=>{
 const f=fixture(t),planner=createNpcDecisionPlanner({contextAuthority:f.context,provider:{generate:async()=>{const row=f.knowledge.metadata('c','heard-rumor');f.knowledge.append({campaignId:'c',id:'heard-rumor',expectedRevision:row.revision,evidenceRef:'correction',metadata:{...row,status:'retracted'},body:'Retracted.'});return {text:'Offer the parcel.'};}}});await assert.rejects(planner.plan(f.grant()),/authority/);
});
test('source edits and proxy reassignment invalidate saved in-memory NPC decisions',async t=>{
 const f=fixture(t),planner=createNpcDecisionPlanner({contextAuthority:f.context,provider:{generate:async()=>({text:'Ilex chooses to wait. The counter can remain quiet.'})}}),handle=await planner.plan(f.grant());assert.match(planner.inspect(handle).text,/wait/);
 const m=f.sceneStore.readers.readMessage('c','message'),{revision,...data}=m;f.sceneStore.commitSnapshot({campaignId:'c',principal:'u',sourceRef:'edit',records:[{kind:'message',expectedRevision:Number(revision),data:{...data,text:'Changed private message.'}}]},{check(){}});assert.throws(()=>planner.inspect(handle),/authority/);
});
test('provider failure, unsupported tools and abort are not retried or converted to successful action',async t=>{
 for(const result of [new Error('offline'),{text:'',toolCalls:[]},{text:'I commit it.',toolCalls:[{name:'damage'}]}]){const f=fixture(t);let calls=0;const planner=createNpcDecisionPlanner({contextAuthority:f.context,provider:{generate:async()=>{calls++;if(result instanceof Error)throw result;return result;}}});await assert.rejects(planner.plan(f.grant()));assert.equal(calls,1);}
 const f=fixture(t),abort=new AbortController();abort.abort();let called=false;const planner=createNpcDecisionPlanner({contextAuthority:f.context,provider:{generate:async()=>{called=true;return {text:'Wait.'};}}});await assert.rejects(planner.plan(f.grant(),{signal:abort.signal}));assert.equal(called,false);
});
