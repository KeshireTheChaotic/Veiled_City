import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {splitMixedReactionCohort,rollNativeNpcReaction,inspectNativeNpcReaction} from '../../src/v2/rules/npc-reaction-proof.js';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const template={key:'native-adversary',experiences:[{name:'Streetwise',modifier:2}]};
const combatant={id:'combatant',status:'active',hp_current:4,stress_current:0};
const npc={kind:'npc',key:'npc',presence_hash:'presence-native',control_hash:'ai-world-control',template_hash:hash(template)};
const pc={kind:'character',key:'pc',owner:'player',presence_hash:'pc-presence'};
function roll(face,options={}){return rollNativeNpcReaction({target:npc,combatant,template,difficulty:14,rng:sides=>{assert.equal(sides,20);return face;},...options});}
function reseal(receipt,edit){const {receipt_hash,...data}=structuredClone(receipt);edit(data);return {...data,receipt_hash:hash(data)};}
test('mixed target routing retains each PC owner without rolling or collapsing them into NPCs',()=>{
  const targets=[pc,npc],r=splitMixedReactionCohort(targets);assert.equal(r.pc.length,1);assert.equal(r.npc.length,1);assert.deepEqual(r.pc[0],pc);assert.equal(r.cohort_hash,hash(targets));assert.equal(Object.isFrozen(r.pc[0]),true);
  for(const targets of [[],[pc,pc],[npc,npc],[{...pc,owner:null}],[{...npc,control_hash:null}],[{kind:'pc',key:'wrong'}]])assert.throws(()=>splitMixedReactionCohort(targets));
});
test('native NPC reactions use actual d20 values, correct threshold and optional native Experience',()=>{
  for(const [face,success] of [[1,false],[13,false],[14,true],[19,true]]){const r=roll(face);assert.equal(r.result.success,success);assert.deepEqual(r.result.faces,[face]);assert.equal(r.result.total,face);assert.equal(inspectNativeNpcReaction(r),r);}
  const experienced=roll(12,{experienceName:'Streetwise'});assert.equal(experienced.result.total,14);assert.equal(experienced.result.modifier,2);assert.equal(experienced.result.success,true);assert.deepEqual(experienced.experience,{name:'Streetwise',modifier:2});assert.equal(inspectNativeNpcReaction(experienced),experienced);
});
test('natural 20 automatically succeeds as a reaction without PC Duality rewards',()=>{
  const r=roll(20,{difficulty:50});assert.equal(r.result.success,true);assert.equal(r.result.total,20);assert.equal(r.result.critical,'reaction_success');assert.equal(Object.hasOwn(r.result,'hope'),false);assert.equal(Object.hasOwn(r.result,'fear'),false);assert.equal(inspectNativeNpcReaction(r),r);
});
test('ordinary NPC profiles use pinned identity at zero modifier without adversary sheet or Experience',()=>{
  const profile={guild_id:'guild',npc_key:'ordinary',voice:'terse'},target={kind:'npc',key:'ordinary',presence_hash:'p',control_hash:'c',template_hash:hash(profile),profile_hash:hash(profile)};
  const args={target,profile,difficulty:14,rng:()=>14},receipt=rollNativeNpcReaction(args);assert.equal(receipt.version,2);assert.equal(receipt.combatant_hash,null);assert.equal(receipt.experience,null);assert.equal(inspectNativeNpcReaction(receipt),receipt);
  for(const patch of [{experienceName:'Streetwise'},{combatant},{template},{profile:{...profile,voice:'changed'}},{target:{...target,profile_hash:'changed'}}])assert.throws(()=>rollNativeNpcReaction({...args,...patch}));
});
test('unqualified targets, changed statblocks, dead sheets and unknown Experience cannot mint reaction proof',()=>{
  for(const patch of [{target:pc},{target:{...npc,owner:'human-proxy'}},{target:{...npc,control_hash:null}},{combatant:{...combatant,hp_current:0}},{combatant:{...combatant,status:'closed'}},{template:{...template,key:'changed'}},{experienceName:'invented'},{experienceName:''},{difficulty:-1}])assert.throws(()=>roll(14,patch));
  const duplicate={...template,experiences:[{name:'Streetwise',modifier:2},{name:'Streetwise',modifier:1}]};assert.throws(()=>roll(14,{template:duplicate,target:{...npc,template_hash:hash(duplicate)},experienceName:'Streetwise'}));
});
test('native RNG rejects out-of-range, noninteger or missing dice',()=>{for(const face of [0,21,1.5,undefined,NaN])assert.throws(()=>roll(face));});
test('receipt digest and recomputed arithmetic reject mutated or resealed outcomes',()=>{
  const original=roll(8);const changed=structuredClone(original);changed.result.success=true;assert.throws(()=>inspectNativeNpcReaction(changed),/npc_receipt/);
  for(const edit of [d=>{d.result.success=true;},d=>{d.result.total=100;},d=>{d.result.selected=20;},d=>{d.result.faces=[21];},d=>{d.result.faces=[8,9];},d=>{d.result.critical='reaction_success';},d=>{d.result.modifier=2;}])assert.throws(()=>inspectNativeNpcReaction(reseal(original,edit)));
});
test('receipt families cannot exchange PC, ordinary-profile and adversary authority',()=>{
  const original=roll(14);for(const edit of [d=>{d.target.kind='character';},d=>{d.result.family='duality';},d=>{d.result.kind='action';},d=>{d.version=2;},d=>{d.profile={key:'npc',hash:d.target.template_hash};},d=>{d.experience={name:'invented',modifier:-1};}])assert.throws(()=>inspectNativeNpcReaction(reseal(original,edit)),/npc_receipt/);
});
