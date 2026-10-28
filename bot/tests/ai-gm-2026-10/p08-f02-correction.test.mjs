import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assemblyHookSources,assemblyInputFingerprint,assemblyWriterBrief,assemblyInputs} from '../../src/assembly-context.js';
import {prepareOpeningEntryOpportunity} from '../../src/session-opening-attendance.js';
import {openingEntryProjection} from '../../src/frameworks/session/opening-entry-source.js';
import {disposableCampaign} from './p08-correction-fixture.mjs';

test('nested export visibility stays out of owner and writer projections while GM planning retains its separate hook source',()=>{
  const {db,close}=disposableCampaign();
  try{
    db.upsertPlayer('guild-correction','owner-a','Owner A');
    let deep={visibility:'gm_private',text:'DEEP_GM_CANARY'};for(let i=0;i<14;i++)deep={child:deep};
    const pc=db.createCharacter('guild-correction','owner-a','Aster',{background:'SAFE_OWNER_BACKGROUND',entry_hooks:[
      {text:'NESTED_EXPORT_CANARY',export_meta:{visibility:'gm_private'}},
      {text:'NESTED_GM_CANARY',container:{visibility:'GM',text:'hidden'}},
      {text:'DEEP_PARENT_CANARY',details:deep},
      {text:'SAFE_ENTRY_THREAD'}]});
    db.upsertCharacterGmHook('guild-correction',pc.id,{key:'seed',premise:'GM_PLANNER_SEED'});
    const session=db.startSession('guild-correction','privacy test','auto');
    db.assignCharacter(session.id,'owner-a',pc.id);db.setPresence(session.id,'owner-a','present');
    const owner=assemblyHookSources(db,'guild-correction',pc.id).map(row=>row.text).join('\n');
    assert.match(owner,/SAFE_OWNER_BACKGROUND/);assert.match(owner,/SAFE_ENTRY_THREAD/);
    assert.doesNotMatch(owner,/CANARY|GM_PLANNER_SEED/);
    const inputs=assemblyInputs(db,'guild-correction',session);
    assert.equal(inputs.characters[0].gm_hooks[0].premise,'GM_PLANNER_SEED');
    const plan={convergence_goal:'GM_ONLY_GOAL_CANARY',assembly_contract:{version:2,input_fingerprint:assemblyInputFingerprint(db,'guild-correction',session)},
      character_entries:[{discord_user_id:'owner-a',character_name:'Aster',hook_source_refs:assemblyHookSources(db,'guild-correction',pc.id).map(s=>s.id)}]};
    db.setAssemblyPlan(session.id,plan);
    const brief=assemblyWriterBrief(db,'guild-correction',session.id,{mode:'private',actorUserId:'owner-a',actorCharacterId:pc.id});
    const serialized=JSON.stringify(brief);
    assert.doesNotMatch(serialized,/GM_ONLY_GOAL_CANARY|NESTED_EXPORT_CANARY|NESTED_GM_CANARY|GM_PLANNER_SEED/);
    assert.match(serialized,/SAFE_OWNER_BACKGROUND|SAFE_ENTRY_THREAD/);
    const opportunity=prepareOpeningEntryOpportunity(db,'guild-correction','owner-a',pc.id,'owner-entry-interaction');
    const entry=openingEntryProjection(db,'guild-correction',opportunity.record_key,{mode:'private',actorUserId:'owner-a',actorCharacterId:pc.id});
    assert.match(entry.text,/SAFE_OWNER_BACKGROUND|SAFE_ENTRY_THREAD/);
    assert.doesNotMatch(entry.text,/CANARY|GM_PLANNER_SEED/);
  }finally{close();}
});
