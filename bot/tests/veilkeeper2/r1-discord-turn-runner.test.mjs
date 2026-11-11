import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscordTurnRunner} from '../../src/v2/discord-turn-runner.js';
function fixture(){
  const calls=[],state={revision:1,refreshes:0,changeAt:null};
  const runner=createDiscordTurnRunner({createAuthority:()=>({authenticate:()=>state.revision,revalidate:revision=>revision===state.revision}),intake:{ingest:async request=>{calls.push('refresh');if(++state.refreshes===state.changeAt)state.revision++;return {id:request.id};}},
    provider:{generate:async()=>{calls.push('provider');return {text:'Draft'};}},
    createApplication:({provider})=>{const revision=state.revision;return {respond:async()=>{await provider.generate({});return {publication:{id:'p',sent:false}};},inspectPublication:id=>{calls.push('inspect');if(state.revision!==revision)throw new Error('source revoked');return {id,sent:false};}};}});
  return {runner,calls,state};
}
test('refreshes before and after inference and again before publication inspection',async()=>{
  const f=fixture();await f.runner.respond({id:'m'});assert.deepEqual(f.calls,['refresh','refresh','provider','refresh','refresh','inspect']);
  assert.equal((await f.runner.inspectPublication('p')).sent,false);assert.deepEqual(f.calls.slice(-2),['refresh','inspect']);
});
test('changed evidence during inference prevents releasing the publication handle',async()=>{
  const f=fixture();f.state.changeAt=3;await assert.rejects(f.runner.respond({id:'m'}),/revoked/);await assert.rejects(f.runner.inspectPublication('p'),/not available/);
});
test('later permission changes invalidate inspection and unknown publications cannot trigger intake',async()=>{
  const f=fixture();await assert.rejects(f.runner.inspectPublication('unknown'));assert.deepEqual(f.calls,[]);
  await f.runner.respond({id:'m'});f.state.changeAt=5;await assert.rejects(f.runner.inspectPublication('p'),/revoked/);
});

test('unknown or revoked publications cannot produce native review diagnostics',async()=>{
  const f=fixture();await assert.rejects(f.runner.reviewPublication('unknown'),/not available/);assert.deepEqual(f.calls,[]);
  await f.runner.respond({id:'m'});f.state.changeAt=5;await assert.rejects(f.runner.reviewPublication('p'),/revoked/);assert.equal(f.state.refreshes,5);assert.equal(f.calls.filter(c=>c==='provider').length,1);
});
