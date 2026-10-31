import test from 'node:test';
import assert from 'node:assert/strict';
import {runAf07Scenario,createAf07MockAi} from '../../scripts/af07-codex-scene.mjs';

test('AF07 mocked Codex scenario commits one source-backed feature and owner reaction invitation in disposable SQLite',async()=>{
  const result=await runAf07Scenario({aiFactory:createAf07MockAi});
  assert.equal(result.ok,true);
  assert.equal(result.live,false);
  assert.equal(result.turnCommitted,true);
  assert.equal(result.gmNativeActions,1);
  assert.equal(result.groupFeatureExecutions,1,JSON.stringify(result));
  assert.equal(result.ownerReactionInvitations,1);
  assert.equal(result.databaseWasTemporary,true);
  assert.equal(result.discordConnected,false);
});

test('AF07 a feature belonging to another adversary is held locally without execution or owner invitations',async()=>{
  const result=await runAf07Scenario({aiFactory:context=>createAf07MockAi({...context,
    proposedFeature:'adversary:pale-regent:command-the-blood'})});
  assert.equal(result.turnCommitted,true);
  assert.equal(result.gmNativeActions,0,JSON.stringify(result));
  assert.equal(result.groupFeatureExecutions,0);
  assert.equal(result.ownerReactionInvitations,0);
});

test('AF07 live runner requires its explicit Codex guard and rejects API-key mode before fixture work',async()=>{
  await assert.rejects(()=>runAf07Scenario(),/mocked AI client.*--live-codex/);
  const oldMode=process.env.AI_AUTH_MODE,oldKey=process.env.OPENAI_API_KEY;
  try{
    process.env.AI_AUTH_MODE='chatgpt';process.env.OPENAI_API_KEY='present-but-never-read';
    await assert.rejects(()=>runAf07Scenario({live:true}),/Refusing API-key mode/);
  }finally{
    if(oldMode===undefined)delete process.env.AI_AUTH_MODE;else process.env.AI_AUTH_MODE=oldMode;
    if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;
  }
});
