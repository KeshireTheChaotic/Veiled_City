import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as narrativePublic from '../../src/frameworks/narrative/public.js';
import * as compatibilityRenderer from '../../src/gm-world-narrative.js';
import {GMService} from '../../src/gm.js';

test('GM consumes unchanged GM-world schema and prompt through the Narrative public API',()=>{
  assert.equal(typeof GMService,'function');
  assert.equal(narrativePublic.gmWorldPartsSchema,compatibilityRenderer.gmWorldPartsSchema);
  assert.equal(narrativePublic.GM_WORLD_NARRATIVE_PROMPT,compatibilityRenderer.GM_WORLD_NARRATIVE_PROMPT);
  assert.equal(narrativePublic.gmWorldPartsSchema.type,'array');
  assert.equal(narrativePublic.gmWorldPartsSchema.maxItems,4);
  assert.equal(narrativePublic.gmWorldPartsSchema.items.anyOf.length,8);
  assert.match(narrativePublic.GM_WORLD_NARRATIVE_PROMPT,/never a PC response, secrets, promises, new access or mechanics/);
  const source=readFileSync(new URL('../../src/gm.js',import.meta.url),'utf8');
  assert.match(source,/import\s*\{\s*gmWorldPartsSchema\s*,\s*GM_WORLD_NARRATIVE_PROMPT\s*\}\s*from\s*["']\.\/frameworks\/narrative\/public\.js["']/);
  assert.doesNotMatch(source,/import\s*\{\s*gmWorldPartsSchema\s*,\s*GM_WORLD_NARRATIVE_PROMPT\s*\}\s*from\s*["']\.\/gm-world-narrative\.js["']/);
});
