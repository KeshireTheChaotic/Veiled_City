import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GMService} from '../../src/gm.js';
import {commitGmTurn} from '../../src/turn-orchestration.js';
import * as intent from '../../src/frameworks/intent/public.js';
import * as compatibility from '../../src/decision-advisory.js';

test('Intent public API preserves decision advisory behavior and both application consumers use it', async()=>{
  assert.equal(typeof GMService,'function');
  assert.equal(typeof commitGmTurn,'function');
  for(const key of ['decisionAdvisorySchema','requiredDecisionAdvisorySchema','decisionPromptContext','decisionContext','validateDecisionAdvisory'])
    assert.equal(intent[key],compatibility[key],`${key} compatibility identity`);

  assert.equal(intent.decisionAdvisorySchema.anyOf[1].additionalProperties,false);
  assert.equal(intent.requiredDecisionAdvisorySchema.properties.reason.minLength,1);
  const rulings=[{source:'r'.repeat(120),text:'authoritative ruling'}];
  const compact=intent.decisionPromptContext({rulings,summary:'current context'},rulings);
  assert.deepEqual(compact.rulings_ref,{section:'SAVED GM RULINGS (authoritative)'});

  const db={getCityCalendar:()=>({flags:{decision_advisory:true}}),searchRulesRulings:()=>rulings};
  const context=intent.decisionContext(db,'guild','current action');
  assert.equal(context.rulings,rulings);
  assert.deepEqual(context.local_sources,['ENGINE/DAGGERHEART_MULTIPLAYER_CORE.md','ENGINE/MULTIPLAYER_GM_RULES.md']);
  assert.match(context.guidance,/GM-private advisory is not native effect authority/);
  const result={respond:true,decision_advisory:{mode:'narrate',check:'',reason:'Established scene context.',uncertainty:'',consequence:'',referent_uncertainty:'',fictional_uncertainty:''}};
  assert.equal(intent.validateDecisionAdvisory(db,'guild',result).authority,
    'Advisory only; application rolls/native resolvers and human rulings remain authoritative.');
  assert.throws(()=>intent.validateDecisionAdvisory(db,'guild',{respond:true,decision_advisory:{...result.decision_advisory,mode:'roll',check:'action'}}),
    error=>error.code==='DECISION_ADVISORY'&&error.diagnostic.category==='check_contract');

  const gm=await readFile(new URL('../../src/gm.js',import.meta.url),'utf8');
  const orchestration=await readFile(new URL('../../src/turn-orchestration.js',import.meta.url),'utf8');
  assert.match(gm,/from\s*["']\.\/frameworks\/intent\/public\.js["']/);
  assert.doesNotMatch(gm,/from\s*["']\.\/decision-advisory\.js["']/);
  assert.match(orchestration,/from\s*["']\.\/frameworks\/intent\/public\.js["']/);
  assert.doesNotMatch(orchestration,/from\s*["']\.\/decision-advisory\.js["']/);
});
