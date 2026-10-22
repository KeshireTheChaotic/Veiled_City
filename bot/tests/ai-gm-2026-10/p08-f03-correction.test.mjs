import test from 'node:test';
import assert from 'node:assert/strict';
import {assemblyInputFingerprint,assemblyWriterBrief} from '../../src/assembly-context.js';
import {disposableCampaign} from './p08-correction-fixture.mjs';

test('planner free text is not writer authority and no-cue fallback remains creatively open',()=>{
  const {db,close}=disposableCampaign();
  try{
    const session=db.startSession('guild-correction','brief test','auto');
    const plan={convergence_goal:'GM_ONLY_GOAL_CANARY: reveal the hidden culprit',assembly_contract:{version:2,
      input_fingerprint:assemblyInputFingerprint(db,'guild-correction',session)}};
    const brief=assemblyWriterBrief(db,'guild-correction',session.id,{mode:'party',actorUserId:null,actorCharacterId:null},plan);
    assert.equal(brief.dramatic_intent.objective,'Explore an interesting shared opportunity without asserting a hidden cause, PC response, or outcome.');
    assert.deepEqual(brief.dramatic_intent.cues,[]);
    assert.doesNotMatch(JSON.stringify(brief),/GM_ONLY_GOAL_CANARY|hidden culprit/);
    assert.match(brief.task,/Ordinary NPC offers, visible surroundings and nonbinding signs are allowed/);
  }finally{close();}
});
