import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {stateRevision} from '../../src/kernel/state-revision.js';

test('Operations review consumes the neutral kernel revision primitive directly',async()=>{
  const operations=await readFile(fileURLToPath(new URL('../../src/ai-review.js',import.meta.url)),'utf8');
  assert.match(operations,/import\s*\{stateRevision\}\s*from\s*["']\.\/kernel\/state-revision\.js["']/);
  assert.doesNotMatch(operations,/import\s*\{[^}]*\bstateRevision\b[^}]*\}\s*from\s*["']\.\/ai-intents\.js["']/);
  assert.equal(stateRevision(null),'absent');
  assert.equal(stateRevision({status:'pending'}),stateRevision({status:'pending'}));
  assert.notEqual(stateRevision({status:'pending'}),stateRevision({status:'approved'}));
});
