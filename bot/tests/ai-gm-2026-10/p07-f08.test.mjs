import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rankWorldNarrativeOpportunities} from '../../src/narrative-opportunity-policy.js';
import {selectFreshTests} from '../../src/ai-gm-test-selection.js';

const coverage=JSON.parse(fs.readFileSync(new URL('./coverage.json',import.meta.url),'utf8'));

test('two different validated overlaps compare as equal and preserve source order',()=>{
  const rows=['a','b','c'].map((id,index)=>({id,index}));
  const metadata=rows.map(({index},n)=>({index,classification:'personal_opportunity',urgency:1,
    verifiedActorLinks:n===0?['pc-a','pc-b']:n===1?['pc-c','pc-d']:[]}));
  for(const input of [rows,rows.slice().reverse(),[rows[1],rows[2],rows[0]]]){
    const ordered=rankWorldNarrativeOpportunities(input,metadata);
    const eligibleIndexes=input.map(row=>row.index);
    assert.equal(ordered[0].id,input[0].id);
    assert.equal(ordered[1].id,input[1].id);
    assert.deepEqual(input.map(row=>row.index),eligibleIndexes);
  }
});

test('classification and urgency outrank overlap, with stable ties and no mutation',()=>{
  const signals=['ambient','plain','overlap','urgent','mandatory'];
  const metadata=[{index:0,classification:'ambient'},
    {index:1,classification:'personal_opportunity',urgency:1},
    {index:2,classification:'personal_opportunity',urgency:1,verifiedActorLinks:['a','b']},
    {index:3,classification:'personal_opportunity',urgency:2,verifiedActorLinks:['c','d']},
    {index:4,classification:'mandatory_response',verifiedActorLinks:['e','f']}];
  const before=structuredClone(metadata);
  assert.deepEqual(rankWorldNarrativeOpportunities(signals,metadata),['mandatory','urgent','overlap','plain']);
  assert.deepEqual(metadata,before);
});

test('fresh selector maps the corrected policy to this focused regression',()=>{
  const selected=selectFreshTests(['bot/src/narrative-opportunity-policy.js'],coverage);
  assert.equal(selected.qualified,true);
  assert.ok(selected.tests.includes('bot/tests/ai-gm-2026-10/p07-f08.test.mjs'));
});
