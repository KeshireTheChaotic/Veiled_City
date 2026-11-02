import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {intentNarrativeDelegationCatalog,intentNarrativeDelegationSource,INTENT_PAYLOADS,intentOperations} from '../../src/frameworks/intent/public.js';
import {narrativeIntentDelegationSource} from '../../src/frameworks/narrative/public.js';
import {delegationOperation} from '../../src/ai-intents.js';
import {connectIntentWorldNative} from '../../src/framework-to-framework/intent--world/public.js';

const readSource=path=>fs.readFileSync(fileURLToPath(new URL(path,import.meta.url)),'utf8');

test('Narrative delegation catalog crosses only its fixed Intent–Narrative pair',async()=>{
  assert.throws(()=>narrativeIntentDelegationSource.delegationFeatureKeys(),{code:'NARRATIVE_INTENT_DELEGATION_SOURCE_COMPOSITION'});
  assert.throws(()=>intentNarrativeDelegationCatalog.delegationCatalog(),{code:'INTENT_NARRATIVE_DELEGATION_CATALOG_COMPOSITION'});

  connectIntentWorldNative();
  const {initializeIntentNarrative}=await import('../../src/application/composition/intent-narrative.js');
  initializeIntentNarrative();
  initializeIntentNarrative();

  const features=Object.keys(INTENT_PAYLOADS);
  assert.deepEqual(intentNarrativeDelegationSource.delegationFeatureKeys(),features);
  for(const feature of features){
    assert.deepEqual(intentNarrativeDelegationSource.delegationOperations(feature),intentOperations(feature));
  }

  const all=[...new Set(features.flatMap(feature=>intentOperations(feature).map(op=>`${feature}.${op}`)))].sort();
  const families=new Set(['goal','consequence','scene','group','strategy','encounter','institution']);
  const privateEligible=all.filter(id=>families.has(id.split('.')[0]));
  const authority='Permission eligibility only; native flags, derived risk/review, consent, expiry and budgets still apply.';
  assert.deepEqual(intentNarrativeDelegationCatalog.delegationCatalog(),{all,private_eligible:privateEligible,authority});

  const database=new Proxy({}, {get(){throw new Error('catalog reads must not access persistence');}});
  const first=delegationOperation(database,'guild',{op:'catalog'},'gm');
  assert.deepEqual(first.all,all.slice(0,50));
  assert.deepEqual(first.private_eligible,privateEligible);
  assert.equal(first.authority,authority);
  assert.equal(first.total,all.length);
  assert.deepEqual(delegationOperation(database,'guild',{op:'catalog',page:2},'gm').all,all.slice(50,100));
  const filtered=all.filter(id=>id.includes('goal.'));
  const filteredResult=delegationOperation(database,'guild',{op:'catalog',filter:'goal.'},'gm');
  assert.deepEqual(filteredResult.all,filtered.slice(0,50));
  assert.equal(filteredResult.total,filtered.length);

  assert.throws(()=>intentNarrativeDelegationSource.bind({delegationFeatureKeys:()=>[],delegationOperations:()=>[]}),/replacement forbidden/);
  assert.throws(()=>narrativeIntentDelegationSource.bind({delegationFeatureKeys:()=>[],delegationOperations:()=>[]}),/replacement forbidden/);
  assert.throws(()=>intentNarrativeDelegationCatalog.bind({delegationCatalog:()=>({})}),/replacement forbidden/);

  assert.equal(fs.existsSync(fileURLToPath(new URL('../../src/delegation-catalog.js',import.meta.url))),false);
  const intentSource=readSource('../../src/ai-intents.js');
  const narrativeCatalogSource=readSource('../../src/frameworks/narrative/delegation-catalog.js');
  const appComposition=readSource('../../src/application/composition/intent-narrative.js');
  assert.match(intentSource,/intentNarrativeDelegationCatalog\.delegationCatalog/);
  assert.doesNotMatch(intentSource,/from ['"]\.\/delegation-catalog\.js['"]/);
  assert.match(narrativeCatalogSource,/narrativeIntentDelegationSource\.delegationFeatureKeys/);
  assert.doesNotMatch(narrativeCatalogSource,/frameworks\/intent|ai-intent-contracts/);
  assert.match(appComposition,/connectIntentNarrativeDelegationCatalog\(\)/);
});
