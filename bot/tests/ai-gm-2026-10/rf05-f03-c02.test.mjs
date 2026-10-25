import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GMService} from '../../src/gm.js';
import {WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE as publicGuidance} from '../../src/frameworks/narrative/public.js';
import {WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE as compatibilityGuidance} from '../../src/narrative-opportunity-guidance.js';

test('GM receives the Narrative-owned soft guidance through its public API',()=>{
  assert.equal(typeof GMService,'function');
  assert.equal(typeof publicGuidance,'string');
  assert.equal(publicGuidance,compatibilityGuidance);
  const source=readFileSync(new URL('../../src/gm.js',import.meta.url),'utf8');
  assert.match(source,/import\s*\{\s*WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE\s*\}\s*from\s*["']\.\/frameworks\/narrative\/public\.js["']/);
  assert.doesNotMatch(source,/import\s*\{\s*WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE\s*\}\s*from\s*["']\.\/narrative-opportunity-guidance\.js["']/);
  assert.match(source,/CHARACTER-DRIVEN OPPORTUNITIES \(soft narrative preference, not authority\): \$\{WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE\}/);
  assert.match(publicGuidance,/A personal lead remains fully worthwhile when it has the strongest cause; a quiet world is allowed\./);
});
