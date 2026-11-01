import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {reviewInbox} from '../../src/frameworks/operations/public.js';

test('application supplies Intent public feature catalog to Operations review',async()=>{
  assert.equal(typeof reviewInbox,'function');
  assert.throws(()=>reviewInbox({},'guild',{}),/Intent feature flag catalog required/);
  const operations=await readFile(fileURLToPath(new URL('../../src/frameworks/operations/ai-review.js',import.meta.url)),'utf8');
  assert.match(operations,/export function reviewInbox\(db,guild,\{[^}]*\}=\{\},featureFlags\)/);
  assert.doesNotMatch(operations,/FEATURE_FLAGS\s*\}\s*from\s*["']\.\/ai-intents\.js["']/);
  const application=await readFile(fileURLToPath(new URL('../../src/story-commands.js',import.meta.url)),'utf8');
  assert.match(application,/import\s*\{\s*FEATURE_FLAGS\s*\}\s*from\s*["']\.\/frameworks\/intent\/public\.js["']/);
  assert.match(application,/reviewInbox\(db,guild,input,FEATURE_FLAGS\)/);
});
