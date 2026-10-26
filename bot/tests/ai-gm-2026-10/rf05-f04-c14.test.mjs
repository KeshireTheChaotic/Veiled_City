import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {contextMemorySchema,CONTEXT_MEMORY_PROMPT} from '../../src/frameworks/knowledge/public.js';
import {contextMemorySchema as legacySchema,CONTEXT_MEMORY_PROMPT as legacyPrompt} from '../../src/context-memory.js';

test('GM context-memory contract uses Knowledge public values and retains compatibility identity',async()=>{
  assert.strictEqual(contextMemorySchema,legacySchema);
  assert.equal(CONTEXT_MEMORY_PROMPT,legacyPrompt);
  assert.deepEqual(Object.keys(contextMemorySchema),['type','maxItems','items']);
  assert.equal(contextMemorySchema.type,'array');
  assert.equal(contextMemorySchema.maxItems,8);
  assert.equal(contextMemorySchema.items.additionalProperties,false);
  assert.deepEqual(contextMemorySchema.items.required,['kind','key','name','summary','retention']);
  assert.match(CONTEXT_MEMORY_PROMPT,/NEVER authoritative canon/);
  assert.match(CONTEXT_MEMORY_PROMPT,/Never create a durable memory of a GM-only secret in a public player scene/);
  const source=await readFile(new URL('../../src/gm.js',import.meta.url),'utf8');
  assert.match(source,/from ["']\.\/frameworks\/knowledge\/public\.js["']/);
  assert.doesNotMatch(source,/from ["']\.\/context-memory\.js["']/);
});
