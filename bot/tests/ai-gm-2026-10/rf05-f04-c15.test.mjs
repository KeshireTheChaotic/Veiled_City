import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GMService} from '../../src/gm.js';
import {NARRATIVE_V9_INSTRUCTIONS,NATIVE_CLAUSE_INSTRUCTIONS,narrativeResponseV9Schema} from '../../src/frameworks/narrative/public.js';
import {NARRATIVE_V9_INSTRUCTIONS as legacyInstructions,NATIVE_CLAUSE_INSTRUCTIONS as legacyClauseInstructions,
  narrativeResponseV9Schema as legacySchema} from '../../src/narrative-writer-v9.js';
import {NARRATIVE_ACT_KINDS} from '../../src/frameworks/narrative/narrative-act-kinds-v9.js';
import {nativeClauseSchema} from '../../src/frameworks/narrative/native-clause-schema-v9.js';

test('GM writer uses Narrative public v9 contract while root compatibility exports retain identity',async()=>{
  assert.strictEqual(narrativeResponseV9Schema,legacySchema);
  assert.equal(NARRATIVE_V9_INSTRUCTIONS,legacyInstructions);
  assert.equal(NATIVE_CLAUSE_INSTRUCTIONS,legacyClauseInstructions);
  assert.deepEqual(narrativeResponseV9Schema.properties.acts.items.anyOf[1].properties.kind.enum,NARRATIVE_ACT_KINDS.filter(k=>k!=='gm_internal_note'));
  assert.deepEqual(narrativeResponseV9Schema.properties.acts.items.anyOf[1].properties.construction,nativeClauseSchema);
  const source=await readFile(new URL('../../src/gm.js',import.meta.url),'utf8');
  assert.match(source,/from ["']\.\/frameworks\/narrative\/public\.js["']/);
  assert.doesNotMatch(source,/from ["']\.\/narrative-writer-v9\.js["']/);

  let captured;
  const service=Object.create(GMService.prototype);
  service.config={gmModel:'mock-gm'};
  service.metrics={record(){}};
  service.requestModel=async(request,options)=>{captured={request,options};return {output_text:'{"version":9,"acts":[],"fiction_delta":[]}'};};
  const packet={audience_v9:{task_ids:[]}};
  const answer=await service.generateNarrative('guild',packet,{throwIfAborted(){}},'combined');
  assert.deepEqual(answer,{version:9,acts:[],fiction_delta:[]});
  assert.strictEqual(captured.request.text.format.schema,narrativeResponseV9Schema);
  assert.ok(captured.request.instructions.includes(NARRATIVE_V9_INSTRUCTIONS));
  assert.ok(captured.request.instructions.includes(NATIVE_CLAUSE_INSTRUCTIONS));
  assert.equal(captured.options.purpose,'scene_writer');
});
