import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {openActionStore} from '../../src/v2/rules/action-store.js';
function fixture(t,{marked=0,damage=16,useArmor=true}={}){
  const dir=mkdtempSync(join(tmpdir(),'vk3-incoming-effect-')),path=join(dir,'actions.sqlite');let store=openActionStore(path);const check=()=>{};
  t.after(()=>{store.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));rmSync(dir,{recursive:true,force:true});});
  store.initializePcDefenses({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'control:1',hp:{current:marked,max:6},armorSlots:{current:0,max:3}},{check});
  const attack={id:'attack',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'control:1',resultRef:'roll',resultHash:'roll-hash',termsHash:'offer-hash',sourceRef:'attack-source',sourceRevision:'1',damage,major:8,severe:16,defenses:{resistance:'none',armorReduction:1,armorAllowed:true}};
  const choice={id:'armor-choice',kind:'incoming_armor_choice',campaignId:'c',sceneId:'s',attackRef:'attack',actorId:'pc',ownerUserId:'u',controlRevision:'control:1',resultRef:'roll',resultHash:'roll-hash',termsHash:'offer-hash',sourceRef:'owner-choice-source',sourceRevision:'1',useArmor};
  return {get store(){return store;},reopen(){store.close();store=openActionStore(path);},attack,choice,input:{campaignId:'c',attackRef:'attack',expectedRevision:1},options:{check,readAttack:()=>attack,readArmorChoice:()=>choice}};
}
test('native damage and owner Armor choice commit once with an immutable receipt across reopen',t=>{
  const f=fixture(t),result=f.store.commitIncomingDamage(f.input,f.options);f.reopen();
  assert.equal(result.after.hp.current,2);assert.equal(result.after.armorSlots.current,1);assert.equal(result.after.revision,2);assert.equal(result.outcome.effectsCommitted,true);assert.equal(f.store.readIncomingDeath('c','attack'),null);
  assert.deepEqual(f.store.commitIncomingDamage(f.input,f.options),result);assert.equal(f.store.readPcDefenses('c','pc').hp.current,2);
  assert.throws(()=>f.store.commitIncomingDamage(f.input,{...f.options,readArmorChoice:()=>({...f.choice,useArmor:false})}),/replay conflict/);
});
test('last marked HP atomically creates owner death eligibility without choosing a fate',t=>{
  const f=fixture(t,{marked:5,damage:8,useArmor:false}),result=f.store.commitIncomingDamage(f.input,f.options);f.reopen();
  assert.equal(result.outcome.hpMarks,1);assert.equal(result.after.hp.current,6);assert.equal(result.after.armorSlots.current,0);
  const eligible=f.store.readIncomingDeath('c','attack');assert.equal(eligible.status,'awaiting_owner');assert.equal(eligible.causeRef,result.id);assert.equal(eligible.ownerUserId,'u');assert.equal(eligible.move,undefined);
  assert.deepEqual(f.store.commitIncomingDamage(f.input,f.options),result);assert.deepEqual(f.store.readIncomingDeath('c','attack'),eligible);
});
test('wrong owner, result identity, stale revision and repeated bootstrap cannot patch defenses',t=>{
  const f=fixture(t);
  for(const patch of [{ownerUserId:'other'},{resultRef:'other'},{resultHash:'other'},{termsHash:'other'},{useArmor:'yes'}])assert.throws(()=>f.store.commitIncomingDamage(f.input,{...f.options,readArmorChoice:()=>({...f.choice,...patch})}));
  assert.throws(()=>f.store.commitIncomingDamage({...f.input,expectedRevision:2},f.options),/defense revision/);
  assert.throws(()=>f.store.commitIncomingDamage(f.input,{...f.options,readAttack:()=>({...f.attack,statePatch:{hp:0}})}),/Exact native hit/);
  assert.throws(()=>f.store.initializePcDefenses({...f.store.readPcDefenses('c','pc'),hp:{current:0,max:12}},{check:()=>{}}));
  assert.equal(f.store.readPcDefenses('c','pc').revision,1);assert.equal(f.store.readIncomingDamage('c','attack'),null);
});
test('changing native evidence or final authorization failure rolls back resources, receipt and death eligibility together',t=>{
  const f=fixture(t,{marked:5,useArmor:false});let reads=0;
  assert.throws(()=>f.store.commitIncomingDamage(f.input,{...f.options,readArmorChoice:()=>({...f.choice,sourceRevision:++reads===1?'1':'2'})}),/authority changed/);
  let checks=0;assert.throws(()=>f.store.commitIncomingDamage(f.input,{...f.options,check(){if(++checks===2)throw new Error('Owner source revoked');}}),/Owner source revoked/);f.reopen();
  assert.equal(f.store.readPcDefenses('c','pc').hp.current,5);assert.equal(f.store.readPcDefenses('c','pc').revision,1);assert.equal(f.store.readIncomingDamage('c','attack'),null);assert.equal(f.store.readIncomingDeath('c','attack'),null);
});
