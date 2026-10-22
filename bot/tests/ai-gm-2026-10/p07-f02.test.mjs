import test from 'node:test';
import assert from 'node:assert/strict';
import {rankWorldNarrativeOpportunities} from '../../src/narrative-opportunity-policy.js';

const signals=['optional','urgent-personal','response','overlap'];
test('required response and causal urgency outrank optional overlap',()=>{
  const sorted=rankWorldNarrativeOpportunities(signals,[
    {index:0,classification:'ambient'},
    {index:1,classification:'personal_opportunity',urgency:3},
    {index:2,classification:'mandatory_response'},
    {index:3,classification:'personal_opportunity',verifiedActorLinks:['pc-a','pc-b']}
  ]);
  assert.deepEqual(sorted,['response','urgent-personal','overlap','optional']);
});
test('overlap breaks only comparable ties and insufficient links do not rank',()=>{
  const sorted=rankWorldNarrativeOpportunities(['plain','one-link','overlap'],[
    {index:0,classification:'personal_opportunity'},
    {index:1,classification:'personal_opportunity',verifiedActorLinks:['pc-a']},
    {index:2,classification:'personal_opportunity',verifiedActorLinks:['pc-b','pc-a']}
  ]);
  assert.deepEqual(sorted,['overlap','plain','one-link']);
});
test('unknown classes and private-only/invalid links preserve stable input order',()=>{
  assert.deepEqual(rankWorldNarrativeOpportunities(['first','second'],[
    {index:0,classification:'unknown',verifiedActorLinks:['private:pc-a','private:pc-b']},
    {index:1,classification:'not-a-class',verifiedActorLinks:[null,'pc-b']}
  ]),['first','second']);
});
test('single-character opportunity remains eligible and output stays bounded to four',()=>{
  const many=Array.from({length:7},(_,i)=>`signal-${i}`);
  const result=rankWorldNarrativeOpportunities(many,many.map((_,index)=>({index,classification:'personal_opportunity',urgency:index===6?3:0})));
  assert.equal(result.length,4);
  assert.equal(result[0],'signal-6');
});
