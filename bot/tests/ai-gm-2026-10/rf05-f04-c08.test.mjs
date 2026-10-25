import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GMService} from '../../src/gm.js';
import {minorNpcSchema as publicSchema} from '../../src/frameworks/world/public.js';
import {minorNpcSchema as compatibilitySchema} from '../../src/city-depth.js';

test('GM uses the World public minor-NPC schema without changing its contract', async()=>{
  assert.equal(typeof GMService,'function');
  assert.equal(publicSchema,compatibilitySchema);
  assert.equal(publicSchema.type,'object');
  assert.equal(publicSchema.additionalProperties,false);
  assert.deepEqual(Object.keys(publicSchema.properties).sort(),['name','occupation','portrayal','public_identity']);
  assert.deepEqual(publicSchema.required,['name','occupation','public_identity','portrayal']);
  const source=await readFile(new URL('../../src/gm.js',import.meta.url),'utf8');
  assert.match(source,/import\s*\{\s*minorNpcSchema\s*\}\s*from\s*["']\.\/frameworks\/world\/public\.js["']/);
  assert.doesNotMatch(source,/import\s*\{\s*minorNpcSchema\s*\}\s*from\s*["']\.\/city-depth\.js["']/);
});
