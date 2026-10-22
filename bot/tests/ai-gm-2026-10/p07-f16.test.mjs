import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseCoverageJson} from '../../scripts/ai-gm-delta.mjs';
import {selectFreshTests} from '../../src/ai-gm-test-selection.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const coveragePath=path.join(root,'tests/ai-gm-2026-10/coverage.json');
const bridge='bot/src/world-narrative-bridge.js',gm='bot/src/gm.js';
const fresh='bot/tests/ai-gm-2026-10/p07-f16.test.mjs';

test('coverage loader rejects duplicate root keys across legal whitespace and escaped spellings',()=>{
  assert.throws(()=>parseCoverageJson('{\n  "x" : [],\n\t"x": ["a"]\n}'),/Duplicate coverage mapping: x/);
  assert.throws(()=>parseCoverageJson('{"bot/src/\u0077orld-narrative-bridge.js":[], "bot/src/world-narrative-bridge.js":[]}'),/Duplicate coverage mapping/);
});

test('coverage loader accepts unique keys and fails closed on malformed or trailing input',()=>{
  assert.deepEqual(parseCoverageJson('{\n "a": ["one"], "b": []\n}'),{a:['one'],b:[]});
  assert.throws(()=>parseCoverageJson('{"a": [}'));
  assert.throws(()=>parseCoverageJson('{"a": []} {}'));
});

test('checked-in bridge and GM mappings retain their deduplicated fresh-test unions',()=>{
  const raw=readFileSync(coveragePath,'utf8'),coverage=parseCoverageJson(raw);
  assert.equal(Object.keys(coverage).length, new Set(Object.keys(coverage)).size);
  for(const module of [bridge,gm]){
    const mapped=coverage[module];assert.ok(Array.isArray(mapped));
    assert.equal(mapped.length,new Set(mapped).size,`${module} mappings must be deduplicated`);
    const selected=selectFreshTests([module],coverage);
    assert.equal(selected.qualified,true);
    for(const expected of ['p07-f13.test.mjs','p07-f14.test.mjs','p07-f17.test.mjs'])
      assert.ok(selected.tests.includes(`bot/tests/ai-gm-2026-10/${expected}`),`${module} must retain ${expected}`);
  }
  const runner=selectFreshTests(['bot/scripts/ai-gm-delta.mjs'],coverage);
  assert.equal(runner.qualified,true);assert.ok(runner.tests.includes(fresh));
  assert.deepEqual(parseCoverageJson(raw),coverage);
});
