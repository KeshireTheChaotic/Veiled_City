import test from 'node:test';
import assert from 'node:assert/strict';
import {composeServices,createOpeningServices} from '../../src/application/composition/public.js';

test('composition validates missing, duplicate and cyclic graphs before executing any factory',()=>{
  let calls=0;const make=()=>{calls++;return {};};
  assert.throws(()=>composeServices([{name:'a',dependencies:['missing'],create:make}]),/Missing service/);
  assert.throws(()=>composeServices([{name:'a',create:make},{name:'a',create:make}]),/Duplicate service/);
  assert.throws(()=>composeServices([{name:'a',dependencies:['b'],create:make},{name:'b',dependencies:['a'],create:make}]),/Cyclic service/);
  assert.throws(()=>composeServices([{name:'a',create:make}],{values:{a:{}}}),/Duplicate service/);
  assert.equal(calls,0);
});
test('service factories are lazy, cached and isolated per composition instance',()=>{
  let calls=0;const definitions=[{name:'service',create:()=>({number:++calls})}],a=composeServices(definitions),b=composeServices(definitions);
  assert.equal(calls,0);assert.equal(a.get('service'),a.get('service'));assert.equal(calls,1);
  assert.notEqual(a.get('service'),b.get('service'));assert.equal(calls,2);
});
test('factories receive only frozen declared dependency bindings',()=>{
  const visible={id:'provided'},container=composeServices([{name:'a',dependencies:['visible'],create:deps=>{
    assert.deepEqual(Object.keys(deps),['visible']);assert.equal(Object.getPrototypeOf(deps),null);assert.ok(Object.isFrozen(deps));return deps.visible;
  }}],{values:{visible,secret:'unrequested'}});
  assert.equal(container.get('a'),visible);assert.throws(()=>container.get('unknown'),/Missing service/);
});
test('a failed factory does not silently retry resource construction',()=>{
  const failure=new Error('construction failed');let calls=0;
  const container=composeServices([{name:'connection',create:()=>{calls++;throw failure;}}]);
  for(let i=0;i<2;i++)assert.throws(()=>container.get('connection'),error=>error===failure);assert.equal(calls,1);
});
test('composition snapshots definitions and rejects asynchronous factory lifecycles',()=>{
  const definition={name:'a',dependencies:[],create:()=>17},container=composeServices([definition]);
  definition.dependencies.push('missing');definition.create=()=>99;assert.equal(container.get('a'),17);
  assert.throws(()=>composeServices([{name:'async',create:()=>Promise.resolve(1)}]).get('async'),/synchronously/);
});
test('opening composition delegates through both pair interfaces without eager gameplay or transport',async()=>{
  const calls=[],scope={mode:'private',actorUserId:'owner',actorCharacterId:'pc'},receipt={messageId:'ack',channelId:'private'},
    row={id:'publication',turn_id:'turn',target_user_id:'owner',target_character_id:'pc',payload:'private fiction'};
  const services=createOpeningServices({author:{authorAssemblyScene:(...args)=>{calls.push(['author',...args]);return scope;}},
    transport:async actual=>{assert.equal(actual,row);calls.push(['send',actual]);return receipt;}});
  assert.equal(calls.length,0);assert.equal(services.openingAuthor.authorAssemblyScene('g','s',scope),scope);
  assert.equal(await services.transport(row),receipt);assert.equal(calls.length,2);
});
