import test from 'node:test';
import assert from 'node:assert/strict';
import {assemblyHookSources,assemblyInputFingerprint,assemblyWriterBrief} from '../../src/assembly-context.js';
import {openingCohortStatus} from '../../src/opening-cohort-runner.js';
import {disposableCampaign} from './p08-correction-fixture.mjs';

test('corrective projection path keeps secrets out, owner context separate, and receipt language honest',()=>{
  const {db,close}=disposableCampaign();
  try{
    db.upsertPlayer('guild-correction','owner-a','Owner A');
    const pc=db.createCharacter('guild-correction','owner-a','Aster',{background:'OWNER_ONLY_SAFE_CONTEXT',gm_hooks:[{premise:'GM_ONLY_CANARY'}]});
    const session=db.startSession('guild-correction','final corrective path','auto');
    db.assignCharacter(session.id,'owner-a',pc.id);db.setPresence(session.id,'owner-a','present');
    const plan={convergence_goal:'GM_ONLY_GOAL_CANARY',assembly_contract:{version:2,input_fingerprint:assemblyInputFingerprint(db,'guild-correction',session)}};
    const packet=assemblyWriterBrief(db,'guild-correction',session.id,{mode:'party',actorUserId:null,actorCharacterId:null},plan);
    assert.doesNotMatch(JSON.stringify(packet),/GM_ONLY_CANARY|GM_ONLY_GOAL_CANARY|OWNER_ONLY_SAFE_CONTEXT/);
    assert.match(assemblyHookSources(db,'guild-correction',pc.id).map(s=>s.text).join('\n'),/OWNER_ONLY_SAFE_CONTEXT/);
    assert.match(openingCohortStatus({status:'delivered',data:{evidence:{dramatic_coverage:'unverified'}}}),/dramatic fulfillment remains unverified/);
  }finally{close();}
});
