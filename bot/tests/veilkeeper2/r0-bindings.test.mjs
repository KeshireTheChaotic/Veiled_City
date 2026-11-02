import test from 'node:test';
import assert from 'node:assert/strict';
import {bindingIndex,routeBranches} from '../../tooling/veilkeeper2/binding-audit.mjs';

test('resolves named aliases through multiple public barrels to the original definition',()=>{
  const index=bindingIndex(new Map([
    ['bot/src/native.js','export function apply(){ return 1; }'],
    ['bot/src/public.js',"export {apply as execute} from './native.js';"],
    ['bot/src/app.js',"import {execute as run} from './public.js'; export {run};"]
  ]));
  const result=index.resolveExport('bot/src/app.js','run');
  assert.equal(result.status,'definition');assert.equal(result.file,'bot/src/native.js');assert.equal(result.name,'apply');
  assert.equal(result.chain.length,3);
});
test('wildcard export conflicts and cycles remain unresolved; external namespaces are explicit',()=>{
  const index=bindingIndex(new Map([
    ['bot/src/a.js','export const x=1;'],['bot/src/b.js','export const x=2;'],
    ['bot/src/conflict.js',"export * from './a.js'; export * from './b.js';"],
    ['bot/src/c.js',"export {x} from './d.js';"],['bot/src/d.js',"export {x} from './c.js';"],
    ['bot/src/external.js',"import * as fs from 'node:fs'; export {fs};"]
  ]));
  assert.equal(index.resolveExport('bot/src/conflict.js','x').status,'ambiguous-export');
  assert.equal(index.resolveExport('bot/src/c.js','x').status,'cycle');
  assert.equal(index.resolveExport('bot/src/external.js','fs').status,'external');
});
test('captures explicit dependency injection and factory return members without executing them',()=>{
  const index=bindingIndex(new Map([['bot/src/a.js',`export function connect(){ return native.bind({owner: source.owner}); }
export function create(){ function run(){}; return {run, unknown: other}; }`]]));
  const m=index.modules.get('bot/src/a.js');
  assert.equal(m.bindings[0].target,'native');
  assert.deepEqual(m.bindings[0].arguments,['{owner: source.owner}']);
  assert.equal(m.factoryReturns[0].owner,'create');
  assert.deepEqual(m.factoryReturns[0].members.map(m=>m.name),['run','unknown']);
});
test('route evaluation respects nested groups, else branches, list selection and unknown input guards',()=>{
  const index=bindingIndex(new Map([['bot/src/a.js',`function dispatch(){
if(group==='roll'){ if(['pending','result'].includes(sub)) read(); else if(sub==='duality') roll(); }
if(group==='story' && sub==='scene' && input.op==='move') move();
if(group==='admin' && sub.startsWith('seed-')) seed();
}`]]));
  const m=index.modules.get('bot/src/a.js');
  const roll=routeBranches(m,{group:'roll',sub:'duality'});
  assert.equal(roll.length,2);assert.ok(roll.some(b=>b.condition==="sub==='duality'"));
  assert.ok(!roll.some(b=>b.condition.includes('pending')));
  const story=routeBranches(m,{group:'story',sub:'scene'});
  assert.equal(story.length,1);assert.equal(story[0].decision,'conditional');
  assert.equal(routeBranches(m,{group:'admin',sub:'seed-add'}).length,1);
  assert.equal(routeBranches(m,{group:'admin',sub:'unknown'}).length,0);
});
test('destructured exports and anonymous default declarations retain source locations',()=>{
  const index=bindingIndex(new Map([['bot/src/a.js','export const {a,b: renamed} = value; export default ()=>42;']]));
  assert.deepEqual(index.exportNames('bot/src/a.js'),['a','default','renamed']);
  assert.equal(index.resolveExport('bot/src/a.js','renamed').line,1);
  assert.equal(index.resolveExport('bot/src/a.js','default').kind,'ArrowFunctionExpression');
});
