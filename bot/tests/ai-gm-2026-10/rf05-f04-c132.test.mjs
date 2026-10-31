import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {FEATURE_FLAGS as publicFlags,INTENT_PAYLOADS} from '../../src/frameworks/intent/public.js';
import {FEATURE_FLAGS as compatibilityFlags} from '../../src/ai-intents.js';
import {reviewInbox} from '../../src/ai-review.js';

test('Intent feature-to-flag contract has one public owner and unchanged compatibility identity',async()=>{
  assert.equal(typeof reviewInbox,'function');
  assert.equal(compatibilityFlags,publicFlags);
  assert.deepEqual(publicFlags,{institution:'institutions',roll:'roll_requests',setup:'narrative_setups',organization:'player_organizations',
    influence:'audience_influence',evidence:'evidence_custody',dialogue:'dialogue_history',encounter:'encounter_intelligence',goal:'emergent_goals',
    consequence:'consequences',scene:'scene_continuity',group:'emergent_groups',strategy:'strategies',arc:'personal_arcs',discovery:'discovery',
    project:'long_projects',mediation:'conflict_mediation',memory:'memory_consolidation',density:'activity_density'});
  assert.deepEqual(Object.keys(publicFlags).sort(),Object.keys(INTENT_PAYLOADS).sort());
  const dispatcher=await readFile(fileURLToPath(new URL('../../src/ai-intents.js',import.meta.url)),'utf8');
  assert.doesNotMatch(dispatcher,/export\s+const\s+FEATURE_FLAGS\s*=/);
  assert.match(dispatcher,/import\s*\{\s*FEATURE_FLAGS\s*,\s*validateIntent\s*\}\s*from\s*["']\.\/frameworks\/intent\/public\.js["']/);
});
