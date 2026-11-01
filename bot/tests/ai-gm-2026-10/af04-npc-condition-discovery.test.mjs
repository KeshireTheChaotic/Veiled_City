import test from 'node:test';
import assert from 'node:assert/strict';
import {runAf07Scenario,createAf07MockAi} from '../../scripts/af07-codex-scene.mjs';
import {createSceneIntentBoardService} from '../../src/frameworks/intent/scene-intent-board.js';
import {createArbitrationOrigin,inspectArbitrationOrigin} from '../../src/scene-intent-board.js';
import {worldInputKey} from '../../src/frameworks/world/public.js';

test('current NPC condition discovery reuses the trusted reader and keeps invalid or ambiguous recovery local',async()=>{
  await runAf07Scenario({aiFactory:createAf07MockAi,verifyCommittedScene:({fixture:f})=>{
    const origin=createArbitrationOrigin(f.db,f.guild,{mode:'party',actorUserId:'owner-af07',actorCharacterId:f.pc.id},worldInputKey('af07:gm-input',f.pc.id));
    let rows=[{data:{cause:{condition:'Restrained',expiry:'until_freed'}}}],held=false,reads=0;
    const service=createSceneIntentBoardService({inspectArbitrationOrigin,
      featureWindowChoices:()=>[],executableNativeFeatures:()=>[],compileNativeActors:()=>[],preRollFearCandidates:()=>[],
      nativeAdversaryFeatureContext:()=>null,preparedPositionCandidates:()=>[],
      activeNativeConditions:(_db,_g,actor,options)=>{
        reads++;assert.equal(actor,f.npc);assert.deepEqual(options,{kind:'npc'});
        if(held)throw Object.assign(Error('invalid condition ancestry'),{code:'GM_ARBITRATION'});
        return rows;
      }});
    const actions=()=>service.arbitrationPromptBoard(f.db,f.guild,origin).npc_candidates[0].condition_actions;
    assert.deepEqual(actions().map(a=>({feature:a.feature_ref,operation:a.operation,targets:a.target_refs})),
      [{feature:'srd:clear-condition',operation:'prepare',targets:[f.npc]}]);
    assert.equal(reads,1);
    rows=[...rows,...rows];assert.deepEqual(actions(),[]);
    rows=[];assert.deepEqual(actions(),[]);
    held=true;assert.deepEqual(actions(),[]);
  }});
});
