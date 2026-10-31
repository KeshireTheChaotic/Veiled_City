import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {rollNativeNpcReaction,inspectNativeNpcReaction} from '../../src/frameworks/daggerheart/mixed-reaction-rules.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const profile={guild_id:'guild',npc_key:'bystander',display_name:'Bystander',capabilities:['A fictional capability is not an Experience modifier.']};
const target={kind:'npc',key:profile.npc_key,presence_hash:'current-presence',control_hash:'native-control',profile_hash:hash(profile),template_hash:hash(profile)};

test('ordinary native NPC profile uses a pinned d20 +0 reaction and verified receipt',()=>{
  const receipt=rollNativeNpcReaction({target,profile,difficulty:14,rng:()=>13});
  assert.equal(receipt.version,2);assert.equal(receipt.result.modifier,0);assert.equal(receipt.result.success,false);
  assert.equal(receipt.combatant_hash,null);assert.equal(receipt.experience,null);
  assert.deepEqual(inspectNativeNpcReaction(receipt),receipt);
  const critical=rollNativeNpcReaction({target,profile,difficulty:100,rng:()=>20});assert.equal(critical.result.success,true);
});

test('profile drift, wrong identity, owner control and invented Experience cannot use the zero fallback',()=>{
  for(const args of [{profile:{...profile,display_name:'changed'}},{profile:{...profile,npc_key:'other'}},
    {target:{...target,owner:'player'}},{target:{...target,presence_hash:null}},{experienceName:'fictional skill'},
    {combatant:{status:'active',hp_current:1}},{template:{experiences:[]}}])
    assert.throws(()=>rollNativeNpcReaction({target,profile,difficulty:14,rng:()=>10,...args}));
});

test('existing statblock reaction receipts keep version 1 and a defeated combatant cannot fall back',()=>{
  const template={experiences:[{name:'Stalwart',modifier:2}]},combatant={status:'active',hp_current:2},statTarget={...target,template_hash:hash(template)};
  const receipt=rollNativeNpcReaction({target:statTarget,template,combatant,experienceName:'Stalwart',difficulty:14,rng:()=>12});
  assert.equal(receipt.version,1);assert.equal(receipt.result.total,14);assert.equal(receipt.profile,undefined);inspectNativeNpcReaction(receipt);
  assert.throws(()=>rollNativeNpcReaction({target:statTarget,template,combatant:{...combatant,hp_current:0},difficulty:14,rng:()=>10}));
});

test('profile receipt arithmetic and source identity corruption are rejected even with a recomputed digest',()=>{
  const original=rollNativeNpcReaction({target,profile,difficulty:14,rng:()=>13});
  for(const alter of [v=>v.result.total=50,v=>v.profile.key='other',v=>v.profile.hash='changed',v=>v.experience={name:'claimed',modifier:5}]){
    const changed=structuredClone(original);alter(changed);const {receipt_hash,...data}=changed;changed.receipt_hash=hash(data);
    assert.throws(()=>inspectNativeNpcReaction(changed));
  }
});
