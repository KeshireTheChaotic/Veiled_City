import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as narrativePublic from '../../src/frameworks/narrative/public.js';
import * as compatibilitySchemas from '../../src/gm-fiction-schema.js';
import {GMService} from '../../src/gm.js';

const names=['compositionTones','npcCompositionSchema','freshNpcFocuses','freshNpcRequestSchema','freshNpcResponseSchema','nativeOutcomeKinds',
  'nativeOutcomeSchema','sceneAtmosphereSubjects','sceneAtmosphereVerbs','sceneAtmosphereEndings','sceneDescriptionSchema',
  'freshSceneRequestSchema','freshSceneResponseSchema','sceneFictionRequestSchema','sceneFictionResponseSchema','narrativeRequestSchema',
  'narrativeUnitKinds','narrativeResponseSchema','narrativeFictionDeltaV9Schema'];

test('GM consumes unchanged Narrative-owned proposal schemas through the public API',()=>{
  assert.equal(typeof GMService,'function');
  assert.equal(names.length,19);
  for(const name of names)assert.equal(narrativePublic[name],compatibilitySchemas[name],`${name} compatibility identity`);
  assert.deepEqual(narrativePublic.nativeOutcomeSchema.properties.receipt_kind.enum,narrativePublic.nativeOutcomeKinds);
  assert.deepEqual(narrativePublic.narrativeRequestSchema.properties.operation.enum,
    ['describe_scene','current_situation','conversation','combat','continuation']);
  assert.equal(narrativePublic.narrativeRequestSchema.additionalProperties,false);
  const source=readFileSync(new URL('../../src/gm.js',import.meta.url),'utf8');
  assert.match(source,/import\s*\{\s*nativeOutcomeSchema\s*,\s*narrativeRequestSchema\s*\}\s*from\s*["']\.\/frameworks\/narrative\/public\.js["']/);
  assert.doesNotMatch(source,/import\s*\{\s*nativeOutcomeSchema\s*,\s*narrativeRequestSchema\s*\}\s*from\s*["']\.\/gm-fiction-schema\.js["']/);
});
