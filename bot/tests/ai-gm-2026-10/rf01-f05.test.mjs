import test from 'node:test';
import assert from 'node:assert/strict';
import {checkBoundaries} from '../../tooling/architecture/boundary-checker.mjs';
import {checkBridgeRegistry} from '../../tooling/architecture/bridge-registry.mjs';

const pair='narrative--session',api=`bot/src/framework-to-framework/${pair}/public.js`,consumer='bot/src/application/composition/open.js';
const testFile='bot/tests/ai-gm-2026-10/rf01-f05.test.mjs';
function fixture(){
  const policy={frameworks:['narrative','session','world'],publicEntrypoints:{[pair]:[api],
    narrative:['bot/src/frameworks/narrative/public.js'],session:['bot/src/frameworks/session/public.js']}};
  const report=checkBoundaries({policy,sources:{[api]:`import {author} from '../../frameworks/narrative/public.js';export {author};`,
    'bot/src/frameworks/narrative/public.js':'export const author=()=>{};',
    'bot/src/frameworks/session/public.js':'export const consume=value=>value;',
    [consumer]:`import {author} from '../../framework-to-framework/narrative--session/public.js';export {author};`}});
  const registry={version:1,pairs:[{pair,endpoints:['narrative','session'],status:'CONTRACT_ONLY_UNWIRED',
    directions:[{from:'session',to:'narrative',contract:'request authoring; return source-qualified result'}],
    source_evidence:[{from:'bot/src/original-runner.js',line:7}],validation:'preserve native audience and receipts',
    lifecycle:'tested contract; adoption deferred',adoption_feature:'RF04-F04',public_api:api,consumers:[consumer],tests:[testFile]}]};
  return {policy,report,registry,testPaths:new Set([testFile])};
}
const codes=input=>checkBridgeRegistry(input).map(e=>e.code);
test('registered composition contract verifies actual public API and source imports without claiming native adoption',()=>{
  const input=fixture();assert.deepEqual(input.report.violations,[]);assert.deepEqual(codes(input),[]);
  assert.equal(input.registry.pairs[0].status,'CONTRACT_ONLY_UNWIRED');
});
test('proposed records need no empty package, fake consumer or passing-test assertion',()=>{
  const input=fixture();input.registry.pairs[0]={...input.registry.pairs[0],pair:'narrative--world',endpoints:['narrative','world'],
    directions:[{from:'narrative',to:'world',contract:'observed dependency; exact port pending'}],status:'PROPOSED_NO_API',public_api:null,consumers:[],tests:[]};
  input.registry.pairs.push(fixture().registry.pairs[0]);assert.deepEqual(codes(input),[]);
  input.registry.pairs[0].tests=[testFile];assert.ok(codes(input).includes('PROPOSED_BRIDGE_HAS_IMPLEMENTATION'));
});
test('canonical pairs, endpoints, directions and unique records are enforced',()=>{
  for(const change of [e=>e.pair='session--narrative',e=>e.endpoints=['narrative','world'],e=>e.directions[0].to='world']){
    const input=fixture();change(input.registry.pairs[0]);assert.ok(codes(input).length);
  }
  const duplicate=fixture();duplicate.registry.pairs.push(structuredClone(duplicate.registry.pairs[0]));assert.ok(codes(duplicate).includes('DUPLICATE_BRIDGE_PAIR'));
});
test('implemented API cannot point at a private filename or missing export',()=>{
  const input=fixture();input.registry.pairs[0].public_api=api.replace('public.js','internal.js');assert.ok(codes(input).includes('INVALID_BRIDGE_PUBLIC_API'));
  input.registry.pairs[0].public_api=api;input.report.modules.find(m=>m.path===api).exports=[];assert.ok(codes(input).includes('INVALID_BRIDGE_PUBLIC_API'));
});
test('consumer declarations require actual imports and every external importer is registered',()=>{
  const input=fixture();input.report.edges=input.report.edges.filter(e=>e.from!==consumer);assert.ok(codes(input).includes('INVALID_BRIDGE_CONSUMER'));
  const extra=fixture();extra.report.edges.push({from:'bot/src/application/workflows/unregistered.js',to:api});assert.ok(codes(extra).includes('UNREGISTERED_BRIDGE_CONSUMER'));
});
test('test metadata must reference fresh feature paths that exist, without reading their bodies',()=>{
  const input=fixture();input.testPaths.clear();assert.ok(codes(input).includes('INVALID_BRIDGE_TEST_REFERENCE'));
  input.testPaths.add('bot/scripts/old-suite.mjs');input.registry.pairs[0].tests=['bot/scripts/old-suite.mjs'];assert.ok(codes(input).includes('INVALID_BRIDGE_TEST_REFERENCE'));
});
test('unregistered real pair packages and incomplete lifecycle evidence fail',()=>{
  const input=fixture();input.registry.pairs=[];assert.ok(codes(input).includes('UNREGISTERED_BRIDGE_PACKAGE'));
  const incomplete=fixture();delete incomplete.registry.pairs[0].validation;assert.ok(codes(incomplete).includes('INCOMPLETE_BRIDGE_RECORD'));
});
test('unsupported statuses and malformed top-level registries cannot pass',()=>{
  assert.deepEqual(codes({...fixture(),registry:{}}),['INVALID_BRIDGE_REGISTRY']);
  const input=fixture();input.registry.pairs[0].status='FULLY_VERIFIED';assert.ok(codes(input).includes('INVALID_BRIDGE_STATUS'));
});
