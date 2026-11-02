import test from 'node:test';
import assert from 'node:assert/strict';
import {createKernel,createMemoryJournal,createRulesetRegistry,TOOL_NAMES} from '../../src/v2/kernel.js';
import {createOfflineApplication} from '../../src/v2/index.js';

function fixture(definitions=[]){
  let current=true;
  const proof={id:'message:1',principal:'player:1',campaign:'campaign:1',scene:'scene:1',revision:'rev:1',actors:['pc:1'],recipients:['player:1'],text:'Interesting.'};
  const journal=createMemoryJournal();
  const kernel=createKernel({authority:{authenticate:()=>structuredClone(proof),revalidate:()=>current},journal,rules:createRulesetRegistry(definitions)});
  const handle=kernel.intake({});
  return {kernel,handle,tools:kernel.bind(handle),journal,proof,revoke:()=>{current=false;}};
}
const request=()=>({source_ref:'message:1',actor_ref:'pc:1',action:{kind:'test.prepare',parameters:{choice:'ask'}},expected_revision:'rev:1'});
const rule=(prepare=()=>({status:'pending'}))=>({kind:'test.prepare',version:'1',validate:({proposal})=>proposal.parameters.choice==='ask',prepare});

test('offline app boots with exactly four tools and no game handlers or transport',()=>{
  const app=createOfflineApplication();
  assert.deepEqual(app.describe(),{mode:'offline',effectExecution:false,publication:false,tools:[...TOOL_NAMES],rules:[]});
  assert.throws(()=>app.intake({principal:'gm'}),/Authenticated source proof/);
});
test('model capability cannot mint or substitute an authenticated source handle',()=>{
  const f=fixture();assert.throws(()=>f.kernel.bind({}),/Native source handle/);
  assert.deepEqual(Object.keys(f.tools),TOOL_NAMES);
  assert.equal(f.tools.context_read({topic:'conversation'}).text,'Interesting.');
  assert.equal(f.tools.context_read({topic:'conversation',principal:'gm'}).code,'invalid_context_query');
  assert.equal(f.tools.context_read({topic:'gm_private'}).code,'context_not_available');
});
test('unknown actions, altered sources, other actors and stale revisions fail before native preparation',()=>{
  let calls=0;const f=fixture([rule(()=>{calls++;return {status:'pending'};})]);
  for(const [patch,code] of [[{source_ref:'other'},'source_mismatch'],[{actor_ref:'pc:2'},'actor_not_controlled'],[{expected_revision:'rev:0'},'stale_revision'],[{action:{kind:'state.patch',parameters:{}}},'unknown_operation'],[{principal:'gm'},'invalid_action_proposal']])assert.equal(f.tools.action_propose({...request(),...patch}).code,code);
  assert.equal(calls,0);
});
test('native validation, pending receipt and replay preserve trace without rerunning preparation',()=>{
  let calls=0;const f=fixture([rule(()=>{calls++;return {status:'awaiting_player_roll'};})]);
  assert.equal(f.tools.action_propose({...request(),action:{kind:'test.prepare',parameters:{choice:'unauthorized'}}}).code,'native_validation_failed');
  const first=f.tools.action_propose(request()),second=f.tools.action_propose(request());
  assert.deepEqual(first,second);assert.equal(calls,1);
  const inspected=f.tools.state_inspect({receipt_ref:first.receipt_ref});
  assert.equal(inspected.status,'awaiting_player_roll');assert.equal(inspected.effects_committed,false);assert.equal(inspected.trace_id,first.trace_id);
  assert.equal(f.journal.receipt(first.receipt_ref).proposal.actorRef,'pc:1');
});
test('revocation during preparation prevents receipt creation and later context access',()=>{
  let f;f=fixture([rule(()=>{f.revoke();return {status:'pending'};})]);
  assert.equal(f.tools.action_propose(request()).code,'source_authority_changed');
  assert.equal(f.tools.context_read({topic:'conversation'}).code,'source_authority_changed');
});
test('receipt inspection is source-bound and cannot expose another conversation',()=>{
  const f=fixture([rule()]),receipt=f.tools.action_propose(request());
  f.proof.id='message:2';const second=f.kernel.bind(f.kernel.intake({}));
  assert.equal(second.state_inspect({receipt_ref:receipt.receipt_ref}).code,'receipt_not_available');
});
test('intake snapshots are immutable and a reused message cannot silently change authorship or content',()=>{
  const f=fixture();const source=f.journal.source('message:1');
  assert.ok(Object.isFrozen(source.actors));assert.throws(()=>source.actors.push('pc:2'));
  assert.doesNotThrow(()=>f.kernel.intake({}));
  f.proof.text='Different';assert.throws(()=>f.kernel.intake({}),/Source identity conflict/);
});
test('preparation cannot claim committed effects or register duplicate rule names',()=>{
  const f=fixture([rule(()=>({status:'resolved',damage:99}))]);
  assert.equal(f.tools.action_propose(request()).code,'unsupported_preparation_status');
  assert.throws(()=>createRulesetRegistry([rule(),rule()]),/Duplicate/);
  assert.equal(f.tools.knowledge_propose({source_ref:'message:1',kind:'canon_proposal',claim:'The mayor is guilty.'}).code,'knowledge_authority_not_installed');
});
test('invalid JSON objects, oversized requests and asynchronous native preparation are rejected',async()=>{
  const f=fixture([rule(async()=>{throw new Error('private native diagnostic');})]);
  assert.equal(f.tools.action_propose(request()).code,'asynchronous_native_handler');
  await Promise.resolve();
  assert.equal(f.tools.context_read({topic:'conversation',focus:()=>{}}).code,'invalid_json');
  assert.equal(f.tools.context_read({topic:'x'.repeat(32001)}).code,'input_too_large');
});
