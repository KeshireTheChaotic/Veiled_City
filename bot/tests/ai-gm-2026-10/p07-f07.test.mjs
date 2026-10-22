import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectFreshTests} from '../../src/ai-gm-test-selection.js';

const raw=fs.readFileSync(new URL('./coverage.json',import.meta.url),'utf8');
function rootEntries(text){
  const keys=[...text.matchAll(/^  "([^"]+)": \[/gm)].map(row=>row[1]);
  return {keys,duplicates:keys.filter((key,index)=>keys.indexOf(key)!==index)};
}
const coverage=JSON.parse(raw);

test('coverage has unique root mappings and preserves the effective P03/P05/P07 unions',()=>{
  const {keys,duplicates}=rootEntries(raw);
  assert.deepEqual(duplicates,[]);
  assert.equal(keys.length,Object.keys(coverage).length);
  assert.ok(coverage['bot/src/world-narrative-bridge.js'].includes('bot/tests/ai-gm-2026-10/p03-f04.test.mjs'));
  assert.ok(coverage['bot/src/world-narrative-bridge.js'].includes('bot/tests/ai-gm-2026-10/p07-f03.test.mjs'));
  assert.ok(coverage['bot/src/gm.js'].includes('bot/tests/ai-gm-2026-10/p05-f01.test.mjs'));
  assert.ok(coverage['bot/src/gm.js'].includes('bot/tests/ai-gm-2026-10/p07-f04.test.mjs'));
});

test('changed module selection includes the full deduplicated fresh mapping',()=>{
  const bridge=selectFreshTests(['bot/src/world-narrative-bridge.js'],coverage);
  const gm=selectFreshTests(['bot/src/gm.js'],coverage);
  assert.equal(bridge.qualified,true);assert.equal(gm.qualified,true);
  assert.ok(bridge.tests.includes('bot/tests/ai-gm-2026-10/p03-f04.test.mjs'));
  assert.ok(bridge.tests.includes('bot/tests/ai-gm-2026-10/p07-f06.test.mjs'));
  assert.ok(gm.tests.includes('bot/tests/ai-gm-2026-10/p05-f01.test.mjs'));
  assert.ok(gm.tests.includes('bot/tests/ai-gm-2026-10/p07-f04.test.mjs'));
});
