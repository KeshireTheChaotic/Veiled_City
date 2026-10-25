import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GMService} from '../../src/gm.js';
import * as intent from '../../src/frameworks/intent/public.js';
import * as compatibility from '../../src/gm-arbitration-contract.js';

test('GM arbitration schemas use Intent public and preserve the compatibility contract',async()=>{
  assert.equal(typeof GMService,'function');
  for(const key of ['ARBITRATION_DISPOSITIONS','npcSceneIntentSchema','gmArbitrationProposalSchema',
    'unifiedArbitrationSchema','matchesArbitrationSchema','arbitrationFailure'])
    assert.equal(intent[key],compatibility[key],`${key} compatibility identity`);
  const proposal={actor_key:'npc:lyra',operation:'speak',target_refs:[],objective_ref:'current_conversation',source_refs:[],dependencies:[]};
  assert.equal(intent.matchesArbitrationSchema(intent.npcSceneIntentSchema,proposal),true);
  assert.equal(intent.matchesArbitrationSchema(intent.npcSceneIntentSchema,{...proposal,unapproved:true}),false);
  const failure=intent.arbitrationFailure('missing authorized source');
  assert.equal(failure.code,'GM_ARBITRATION');
  assert.equal(failure.expected,true);
  assert.equal(failure.message,'Unified GM arbitration held: missing authorized source');
  const gm=await readFile(new URL('../../src/gm.js',import.meta.url),'utf8');
  assert.match(gm,/unifiedArbitrationSchema[^}]*\}\s*from\s*["']\.\/frameworks\/intent\/public\.js["']/);
  assert.doesNotMatch(gm,/from\s*["']\.\/gm-arbitration-contract\.js["']/);
});
