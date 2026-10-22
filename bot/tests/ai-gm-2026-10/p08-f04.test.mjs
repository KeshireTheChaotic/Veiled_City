import test from 'node:test';
import assert from 'node:assert/strict';
import {openingCohortEligible,openingCohortIsAdditive,openingCohortRoster,openingCohortRosterRevision} from '../../src/opening-cohort-state.js';
import {runOpeningCohort,openingCohortStatus} from '../../src/opening-cohort-runner.js';

test('cohort requires two distinct currently owner-controlled players',()=>{
  const roster=[{valid:true,user:'owner-a'},{valid:true,user:'owner-a'}];
  assert.equal(openingCohortEligible(roster),false);
  assert.equal(openingCohortEligible([...roster,{valid:true,user:'owner-b'}]),true);
  assert.equal(openingCohortEligible([{valid:true,user:'owner-a'},{valid:false,user:'proxy'}]),false);
});

test('pre-registered initial cohort is not replayed as a post-start additive opportunity',()=>{
  const roster=[{user:'owner-a',character:'pc-a',valid:true},{user:'owner-b',character:'pc-b',valid:true}],
    origin={roster:[{user:'owner-a',character:'pc-a'},{user:'owner-b',character:'pc-b'}]};
  assert.equal(openingCohortIsAdditive(roster,origin),false);
  assert.equal(openingCohortIsAdditive(roster.slice(0,1).concat({user:'owner-c',character:'pc-c',valid:true}),origin),true);
});

test('cohort roster revision binds owner control and excludes absent attendees',()=>{
  const session={id:'s',guild_id:'g'},rows=[
    {character_id:'pc-a',discord_user_id:'owner-a',presence:'present'},
    {character_id:'pc-b',discord_user_id:'owner-b',presence:'absent'},
  ];
  const db={roster:()=>rows,getCharacter:id=>({id,guild_id:'g',owner_user_id:`owner-${id.slice(-1)}`,status:'active'}),
    activeAssignment:(_s,user)=>({character_id:'pc-a',control_policy:'player_only',control_revision:`${user}-r1`})};
  const roster=openingCohortRoster(db,'g',session);
  assert.equal(roster.length,1);
  assert.equal(openingCohortEligible(roster),false);
  const before=openingCohortRosterRevision(db,'g',session);
  db.activeAssignment=(_s,user)=>({character_id:'pc-a',control_policy:'player_only',control_revision:`${user}-r2`});
  assert.notEqual(openingCohortRosterRevision(db,'g',session),before);
});

test('manual assembly and established-party resume never launch a new cohort plan',async()=>{
  for(const session of [{id:'manual-session',assembly_phase:'assembly',assembly_mode:'manual'},
    {id:'resume-session',assembly_phase:'party',assembly_mode:'auto'}]){
    const db={getActiveSession:()=>session,getCityRecord:()=>null};
    const gm={planAssembly:()=>{throw new Error('planner must not run');}};
    assert.equal(await runOpeningCohort({db,guild:{id:'g'},gm}),null);
  }
});

test('cohort status communicates delivery without claiming placement or party state',()=>{
  assert.match(openingCohortStatus({status:'delivered'}),/Shared opportunity acknowledged/);
  assert.match(openingCohortStatus({status:'uncertain'}),/uncertain; held for review/);
  assert.match(openingCohortStatus({status:'delivered'}),/does not establish arrival, location, cooperation, party state/);
});
