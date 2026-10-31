import test from 'node:test';
import assert from 'node:assert/strict';
import {splitMixedReactionCohort,rollNativeNpcReaction,inspectNativeNpcReaction,prepareMixedReactionCohort} from '../../src/frameworks/daggerheart/mixed-reaction-rules.js';
import {prepareMixedReactionCohort as composedMixedReactionCohort} from '../../src/native-group-features.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';
import {nativeStore} from './af03-store.mjs';

const targets=[{kind:'character',key:'pc',owner:'owner:pc',presence_hash:'p1'},
  {kind:'npc',key:'foe',presence_hash:'p2',control_hash:'c2',template_hash:'t2'}];
test('the native group-feature composition exposes the transaction-bound mixed coordinator',()=>{
  assert.equal(composedMixedReactionCohort,prepareMixedReactionCohort);
});
test('mixed cohort preserves owner PC reactions and separately routes native NPC reactions',()=>{
  const split=splitMixedReactionCohort(targets);
  assert.deepEqual(split.pc.map(t=>t.key),['pc']);assert.deepEqual(split.npc.map(t=>t.key),['foe']);
  assert.equal(split.cohort_hash,hash(targets));
  assert.throws(()=>splitMixedReactionCohort([...targets,targets[0]]),/mixed_reaction_cohort/);
  assert.throws(()=>splitMixedReactionCohort([{...targets[0],owner:null}]),/mixed_reaction_cohort/);
});
test('NPC reaction uses exact statblock Experience or zero, and replay verifies native d20 arithmetic',()=>{
  const template={experiences:[{name:'Scout',modifier:2}]},combatant={id:'c',status:'active',hp_current:4},
    target={...targets[1],template_hash:hash(template)},rng=()=>15;
  const withExperience=rollNativeNpcReaction({target,combatant,template,experienceName:'Scout',difficulty:16,rng});
  assert.equal(withExperience.result.total,17);assert.equal(withExperience.result.success,true);
  assert.equal(inspectNativeNpcReaction(withExperience),withExperience);
  const withoutExperience=rollNativeNpcReaction({target,combatant,template,difficulty:16,rng});
  assert.equal(withoutExperience.result.modifier,0);assert.equal(withoutExperience.result.success,false);
  assert.throws(()=>rollNativeNpcReaction({target,combatant,template,experienceName:'Invented',difficulty:10,rng}),/mixed_reaction_experience_source/);
  assert.throws(()=>rollNativeNpcReaction({target,combatant:{...combatant,hp_current:0},template,difficulty:10,rng}),/mixed_reaction_npc_source/);
  const forged={...withExperience,result:{...withExperience.result,total:99}};
  const {receipt_hash,...data}=forged;forged.receipt_hash=hash(data);
  assert.throws(()=>inspectNativeNpcReaction(forged),/mixed_reaction_npc_arithmetic/);
});
test('mixed cohort writes owner invitations and native NPC receipts atomically, then replays without rerolls',()=>{
  const f=nativeStore(),{db}=f;let rolls=0,owners=0;
  try{
    const pc={record_key:'pc-decision',kind:'gm_arbitration_decision',status:'pending_pc_reaction',data:{native:{character:'pc',owner:'owner:pc'}}},
      template={experiences:[]},combatant={id:'c',status:'active',hp_current:4},npc={...targets[1],template_hash:hash(template)},
      run=()=>prepareMixedReactionCohort({transaction:fn=>db.transaction(fn),targets:[targets[0],npc],key:'execution-1',
        readReceipt:key=>db.getCityRecord('g','mixed_execution',key)?.data,
        createPcInvitation:()=>{owners++;return pc;},resolveNpcReaction:target=>{rolls++;return rollNativeNpcReaction({target,combatant,template,difficulty:14,rng:()=>16});},
        inspectPcInvitation:()=>pc,
        writeNpcReceipt:(target,receipt)=>db.saveCityRecord('g',{kind:'native_npc_reaction',key:`npc:${target.key}`,status:'resolved',data:receipt}),
        writeExecution:result=>{db.saveCityRecord('g',{kind:'mixed_execution',key:result.key,status:'awaiting_owners',data:result});return result;}});
    const first=run();assert.deepEqual(first.reactions.map(x=>x.kind),['character','npc']);assert.equal(rolls,1);assert.equal(owners,1);
    assert.deepEqual(run(),first);assert.equal(rolls,1);assert.equal(owners,1);
  }finally{f.close();}
});
test('mixed cohort rejects incomplete writes and invokes atomic rollback boundary',()=>{
  const f=nativeStore(),{db}=f;
  try{
    assert.throws(()=>prepareMixedReactionCohort({transaction:fn=>db.transaction(fn),targets,key:'execution-fail',readReceipt:()=>null,
      writeExecution:result=>db.saveCityRecord('g',{kind:'mixed_execution',key:result.key,data:result}),
      createPcInvitation:()=>({kind:'gm_arbitration_decision',status:'pending_pc_reaction',data:{native:{character:'pc',owner:'owner:pc'}}}),
      inspectPcInvitation:()=>null,
      resolveNpcReaction:()=>({}),writeNpcReceipt:()=>null}),/mixed_reaction_npc_receipt/);
    assert.equal(db.listCityRecords('g',{kind:'mixed_execution'}).length,0);
  }finally{f.close();}
});
