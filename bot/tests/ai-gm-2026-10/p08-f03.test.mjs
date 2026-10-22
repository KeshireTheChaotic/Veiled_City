import test from 'node:test';
import assert from 'node:assert/strict';
import {assemblyWriterBrief} from '../../src/assembly-context.js';

test('certified assembly intent reaches public writer without raw planner notes or private hooks',()=>{
  const session={id:'s1',assembly_phase:'assembly'};
  const plan={convergence_goal:'A public evidence trail invites separate investigation.',gm_notes:'GM_CANARY',public_opening:'RAW_CANARY',
    character_entries:[{private_hook:'PRIVATE_HOOK_CANARY',stay_reason:'MOTIVE_CANARY'}],
    assembly_contract:{version:2,input_fingerprint:'input-fingerprint'}};
  const db={getSession:()=>session,getActiveSession:()=>session,getAssemblyPlan:()=>plan,
    getDirectorState:()=>({scene_number:3,scene_label:'Market'}),getCityCalendar:()=>({flags:{}}),
    openingDirectorSources:()=>[],getCityRecord:()=>null};
  const brief=assemblyWriterBrief(db,'g','s1',{mode:'party'});
  assert.equal(brief.dramatic_intent.goal,plan.convergence_goal);
  assert.equal(brief.dramatic_intent.plan_inputs,'input-fingerprint');
  assert.equal(brief.dramatic_intent.audience,'party');
  assert.match(brief.knowledge,/objective, not a fact/);
  const packet=JSON.stringify(brief);
  for(const canary of ['GM_CANARY','RAW_CANARY','PRIVATE_HOOK_CANARY','MOTIVE_CANARY'])assert.ok(!packet.includes(canary));
});
