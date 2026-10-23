import test from 'node:test';
import assert from 'node:assert/strict';
import * as errors from '../../src/kernel/errors.js';
import {KeyedSerialQueue} from '../../src/kernel/serial-queue.js';
import {isExpectedError} from '../../src/frameworks/operations/public.js';

test('neutral exception constructors preserve names, default codes, expected flags, cause and serialization',()=>{
  const cause=new Error('root'),cases=[['VeiledError','VEILED_ERROR',false],['UserInputError','INVALID_INPUT',true],
    ['PermissionError','PERMISSION_DENIED',true],['NotFoundError','NOT_FOUND',true],['StateConflictError','STATE_CONFLICT',true]];
  for(const [name,code,expected] of cases){
    const error=new errors[name]('fixture',{cause});assert.ok(error instanceof Error);assert.ok(error instanceof errors.VeiledError);
    assert.equal(error.name,name);assert.equal(error.message,'fixture');assert.equal(error.cause,cause);assert.match(error.stack,new RegExp(`${name}: fixture`));
    assert.deepEqual(JSON.parse(JSON.stringify(error)),{name,code,expected});
    assert.equal(new errors[name]('override',{code:'EXACT',expected:false}).code,'EXACT');
  }
  assert.equal(new errors.PermissionError().message,'Permission denied.');assert.equal(new errors.NotFoundError().message,'Not found.');
});
test('operations retains legacy classification without importing domain policy into kernel',()=>{
  assert.equal(isExpectedError(new errors.StateConflictError('opaque')),true);
  for(const text of ['No active session','Join Veilkeeper\'s current voice channel','import requires a package'])assert.equal(isExpectedError(new Error(text)),true);
  assert.equal(isExpectedError(new Error('internal arithmetic defect')),false);assert.equal(isExpectedError(null),false);
  assert.equal(isExpectedError({expected:true}),true);
});
test('same-key jobs serialize while different keys proceed; original values and key coercion survive',async()=>{
  const q=new KeyedSerialQueue(),events=[];let release;const barrier=new Promise(resolve=>release=resolve),value={receipt:'unchanged'};
  const first=q.enqueue(12,async()=>{events.push('first');await barrier;events.push('released');return value;});
  const second=q.enqueue('12',()=>{events.push('second');return 2;});
  const other=q.enqueue('other',()=>{events.push('other');return 3;});
  assert.equal(q.depth(12),2);assert.equal(q.pending('12'),true);await other;
  assert.deepEqual(events,['first','other']);release();assert.equal(await first,value);assert.equal(await second,2);
  await Promise.all([...q.tails.values()]);assert.deepEqual(events,['first','other','released','second']);
  assert.equal(q.depth('12'),0);assert.equal(q.pending(12),false);assert.equal(q.tails.size,0);
});
test('a rejected job is owned by its caller and does not poison the next job or another queue',async()=>{
  const q=new KeyedSerialQueue(),independent=new KeyedSerialQueue(),failure=new Error('one rejection');
  const failed=q.enqueue('x',()=>{throw failure;}),next=q.enqueue('x',()=>42);
  await assert.rejects(failed,error=>error===failure);assert.equal(await next,42);
  assert.equal(await independent.enqueue('x',()=>17),17);await Promise.all([...q.tails.values(),...independent.tails.values()]);
  assert.equal(q.depth('x'),0);assert.equal(q.pending('x'),false);
});
