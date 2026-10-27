import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assemblyInputs,assemblyInputFingerprint} from '../../src/assembly-context.js';
import {scheduleSessionOpening,beginSessionOpeningAttempt} from '../../src/session-opening.js';
import {disposableCampaign} from './p08-correction-fixture.mjs';

test('planner agenda reads active NPC and faction goals without advancing native state',()=>{
  const {db,close}=disposableCampaign();
  try{
    const session=db.startSession('guild-correction','world agenda','auto');
    db.upsertNpcProfile('guild-correction',{npcKey:'mara-voss',displayName:'Mara Voss',activityTier:'active'});
    db.upsertNpcGoal('guild-correction',{npcKey:'mara-voss',goalKey:'find-witness',title:'Find witness',objective:'Locate the missing witness',priority:90});
    db.setSimulationEntity('guild-correction','faction','glass-court',{activity_tier:'active'});
    db.putSimulationRecord('guild-correction',{id:'court-pressure',kind:'goal',entityKey:'faction:glass-court',status:'active',data:{title:'Silence the archive',objective:'Acquire the city archive',priority:80}});
    const before={clock:db.getSimulationClock('guild-correction'),canon:JSON.stringify(db.listCanon('guild-correction',{includeGM:true,limit:500})),
      records:db.listSimulationRecords('guild-correction',{limit:100}).length};
    const inputs=assemblyInputs(db,'guild-correction',session);
    assert.ok(inputs.world_agenda.some(row=>row.actor==='mara-voss'&&row.objective==='Locate the missing witness'));
    assert.ok(inputs.world_agenda.some(row=>row.actor==='glass-court'&&row.objective==='Acquire the city archive'));
    assert.ok(inputs.world_agenda.every(row=>row.scope.guild==='guild-correction'&&row.scope.session===session.id&&row.scope.scene===inputs.scene));
    assert.deepEqual(inputs.world_context.beats,[]);
    assert.deepEqual(db.getSimulationClock('guild-correction'),before.clock);
    assert.equal(JSON.stringify(db.listCanon('guild-correction',{includeGM:true,limit:500})),before.canon);
    assert.equal(db.listSimulationRecords('guild-correction',{limit:100}).length,before.records);
  }finally{close();}
});

test('starting an opening does not stale its own assembly input fingerprint',()=>{
  const {db,close}=disposableCampaign();
  try{
    const guild='guild-fingerprint',session=db.startSession(guild,'opening fingerprint','auto');
    const interaction={id:'start-opening-1',guildId:guild,user:{id:'gm-1'}};
    scheduleSessionOpening(db,interaction,session,()=>true);
    const before=assemblyInputFingerprint(db,guild,session);
    beginSessionOpeningAttempt(db,guild,session.id);
    assert.equal(assemblyInputFingerprint(db,guild,session),before);
  }finally{close();}
});
