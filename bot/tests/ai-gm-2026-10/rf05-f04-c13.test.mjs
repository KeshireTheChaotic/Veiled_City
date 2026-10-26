import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GMService} from '../../src/gm.js';

const root=new URL('../../src/',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('the application GM loads with Knowledge authority projection on its public API',async()=>{
  assert.equal(typeof GMService,'function');
  const gm=await read('gm.js');
  assert.match(gm,/import\s*\{\s*projectAuthorityRecords\s*\}\s*from\s*["']\.\/frameworks\/knowledge\/public\.js["']/);
  assert.doesNotMatch(gm,/from\s*["']\.\/authority-projection\.js["']/);
});

test('Knowledge public and root compatibility readers retain the implementation routes',async()=>{
  const api=await read('frameworks/knowledge/public.js');
  const compatibility=await read('authority-projection.js');
  const implementation=await read('frameworks/knowledge/authority-projection.js');
  assert.match(api,/export\s*\*\s*from\s*["']\.\/authority-projection\.js["']/);
  assert.match(compatibility,/export\s*\*\s*from\s*["']\.\/frameworks\/knowledge\/authority-projection\.js["']/);
  assert.match(implementation,/export\s+function\s+projectAuthorityRecords\s*\(/);
});
