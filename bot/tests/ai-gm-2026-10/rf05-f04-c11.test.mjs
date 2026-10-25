import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GMService} from '../../src/gm.js';
import * as operations from '../../src/frameworks/operations/public.js';
import * as compatibility from '../../src/turn-trace-context.js';

test('Operations public and compatibility paths share the same async-local trace',async()=>{
  assert.equal(typeof GMService,'function');
  for(const key of ['currentTurnTrace','instrumentSqlReads','turnTraceFor','withTurnTrace'])
    assert.equal(operations[key],compatibility[key],`${key} compatibility identity`);
  const trace={guild:'guild-1',turn:'turn-1'};
  await operations.withTurnTrace(trace,async()=>{
    assert.equal(operations.turnTraceFor('guild-1'),trace);
    assert.equal(compatibility.turnTraceFor('guild-1'),trace);
    assert.equal(operations.turnTraceFor('guild-2'),null);
    await Promise.resolve();
    assert.equal(compatibility.currentTurnTrace(),trace);
  });
  assert.equal(operations.currentTurnTrace(),null);
  const gm=await readFile(new URL('../../src/gm.js',import.meta.url),'utf8');
  assert.match(gm,/turnTraceFor[^}]*\}\s*from\s*["']\.\/frameworks\/operations\/public\.js["']/);
  assert.doesNotMatch(gm,/from\s*["']\.\/turn-trace-context\.js["']/);
});
