import test from 'node:test';
import assert from 'node:assert/strict';
import {assertMutationSuccess} from '../../src/application/workflows/state-mutation-results.js';

test('empty and successful mutation receipts return true',()=>{
  assert.equal(assertMutationSuccess(),true);
  assert.equal(assertMutationSuccess({events:[{ok:true}],relationships:[{ok:true}]}),true);
});

test('expected canon conflicts and blocked rows remain non-fatal',()=>{
  assert.equal(assertMutationSuccess({events:[
    {ok:false,expectedConflict:true,error:'canon conflict'},
    {ok:false,blocked:true,error:'blocked'}
  ]}),true);
});

test('unexpected failures preserve order, original rows, and error contract',()=>{
  const event={ok:false,error:'event rejected'},relationship={ok:false},handout={ok:false,blocked:true};
  assert.throws(()=>assertMutationSuccess({events:[event],relationships:[relationship],handouts:[handout]}),error=>{
    assert.equal(error.code,'STATE_MUTATION_REJECTED');
    assert.equal(error.message,'Authoritative state mutation rejected: event[0]: event rejected; relationship[0]: mutation failed');
    assert.deepEqual(error.failures.map(({kind,index,error})=>({kind,index,error})),[
      {kind:'event',index:0,error:'event rejected'},{kind:'relationship',index:0,error:'mutation failed'}
    ]);
    assert.equal(error.failures[0].row,event);
    assert.equal(error.failures[1].row,relationship);
    return true;
  });
});
