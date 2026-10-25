import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as intentPublic from '../../src/frameworks/intent/public.js';
import * as intentCompatibility from '../../src/ai-intent-contracts.js';
import {GMService} from '../../src/gm.js';

test('GM consumes the unchanged Intent contract through its public API',()=>{
  assert.equal(typeof GMService,'function');
  for(const name of ['INTENT_PAYLOADS','INTENT_PROMPT','intentArraySchema','intentOperations','validateIntent'])
    assert.equal(intentPublic[name],intentCompatibility[name],`${name} compatibility identity`);
  assert.equal(intentPublic.intentArraySchema.maxItems,4);
  assert.equal(intentPublic.validateIntent({}),false);
  const source=readFileSync(new URL('../../src/gm.js',import.meta.url),'utf8');
  assert.match(source,/import\s*\{\s*intentArraySchema\s*,\s*INTENT_PROMPT\s*\}\s*from\s*["']\.\/frameworks\/intent\/public\.js["']/);
  assert.doesNotMatch(source,/import\s*\{\s*intentArraySchema\s*,\s*INTENT_PROMPT\s*\}\s*from\s*["']\.\/ai-intent-contracts\.js["']/);
});
