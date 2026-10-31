import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dispatchAiIntents} from '../../src/ai-intents.js';
import {validateIntent as publicValidateIntent} from '../../src/frameworks/intent/public.js';
import {validateIntent as compatibilityValidateIntent} from '../../src/ai-intent-contracts.js';

test('Intent dispatch consumes the public validator and retains the compatibility identity',async()=>{
  assert.equal(typeof dispatchAiIntents,'function');
  const source=await readFile(fileURLToPath(new URL('../../src/ai-intents.js',import.meta.url)),'utf8');
  assert.match(source,/import\s*\{[^}]*\bvalidateIntent\b[^}]*\}\s*from\s*["']\.\/frameworks\/intent\/public\.js["']/);
  assert.doesNotMatch(source,/from\s*["']\.\/ai-intent-contracts\.js["']/);
  assert.equal(compatibilityValidateIntent,publicValidateIntent);
  const valid={version:1,feature:'setup',target_key:'setup-1',expected_revision:'',policy_revision:0,source_prerequisites:[],
    payload:{source_event:'source-1',op:'suggest',setup_key:'setup-1',character_id:'character-1',choice_source:'source-1',suggestion:'A nonbinding story lead.'}};
  assert.equal(publicValidateIntent(valid),true);
  assert.equal(publicValidateIntent({...valid,unrecognized:true}),false);
});
