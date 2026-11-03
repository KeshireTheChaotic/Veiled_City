import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {openActionStore} from '../../src/v2/rules/action-store.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function fixture(t,{move='risk_it_all',cap=6,hope=3,features=[]}={}){
  const dir=mkdtempSync(join(tmpdir(),'vk3-death-outcome-')),path=join(dir,'actions.sqlite');let store=openActionStore(path),revoked=false;
  const check=()=>{};t.after(()=>{store.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));rmSync(dir,{recursive:true,force:true});});
  store.initializePcDefenses({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',hp:{current:5,max:6},armorSlots:{current:0,max:3}},{check});
  store.initializeHope({campaignId:'c',actorId:'pc',ownerUserId:'u',hope:Math.min(hope,cap),cap},{check});
  store.initializePcLife({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',sourceRef:'pc-source',sourceRevision:'1',level:2,stress:{current:3,max:6}},{check});
  const attack={id:'attack',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',resultRef:'roll',resultHash:'roll-hash',termsHash:'offer-hash',sourceRef:'attack-source',sourceRevision:'1',damage:10,major:8,severe:16,defenses:{resistance:'none',armorReduction:1,armorAllowed:true}},choice={id:'armor',kind:'incoming_armor_choice',campaignId:'c',sceneId:'s',attackRef:'attack',actorId:'pc',ownerUserId:'u',controlRevision:'1',resultRef:'roll',resultHash:'roll-hash',termsHash:'offer-hash',sourceRef:'armor-source',sourceRevision:'1',useArmor:false};
  store.commitIncomingDamage({campaignId:'c',attackRef:'attack',expectedRevision:1},{check,readAttack:()=>attack,readArmorChoice:()=>choice});
  const sourceAuthority={inspectReference(){if(revoked)throw new Error('Owner source revoked');return {campaign:'c',scene:'s',principal:'u',actors:['pc'],recipients:['u']};}};
  const readActorSnapshot=()=>{const {life,defenses,hope}=store.readPcLife('c','pc');return {actorId:'pc',ownerUserId:'u',controlRevision:'1',status:life.status,data:{level:life.level,resources:{hp:defenses.hp,armor:defenses.armorSlots,stress:life.stress,hope:hope.hope,hope_max:hope.cap},features}};};
  const eligible=store.readIncomingDeath('c','attack'),base={campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',requestRef:eligible.id,eligibilityHash:hash(eligible),resourceRevision:2,actorSnapshotHash:hash(readActorSnapshot()),sourceRef:'owner-source',sourceRevision:'1'};
  const review={...base,id:'review',kind:'incoming_death_review',sequence:1},ownerChoice={...base,id:'choice',kind:'incoming_death_choice',sequence:2,reviewRef:'review',move};
  store.recordIncomingDeathReview('c','attack',{check,sourceAuthority,readEvidence:()=>review});store.recordIncomingDeathChoice('c','attack',{check,sourceAuthority,readEvidence:()=>ownerChoice});
  return {get store(){return store;},features,readActorSnapshot,revoke(){revoked=true;},reopen(){store.close();store=openActionStore(path);},options:{check,sourceAuthority,readActorSnapshot}};
}
const cases=[
  {name:'Risk It All with Fear',move:'risk_it_all',faces:[1,12],result:'dead',status:'resolved',hp:6,stress:3,actorStatus:'dead',cap:6,hope:3},
  {name:'Risk It All critical',move:'risk_it_all',faces:[6,6],result:'recovered',status:'resolved',hp:0,stress:0,actorStatus:'active',cap:6,hope:3},
  {name:'Risk It All with Hope',move:'risk_it_all',faces:[10,2],result:'allocate_recovery',status:'awaiting_allocation',hp:6,stress:3,actorStatus:'active',cap:6,hope:3},
  {name:'Avoid Death scar',move:'avoid_death',faces:[2],result:'unconscious',status:'resolved',hp:6,stress:3,actorStatus:'active',cap:5,hope:5,startHope:6},
  {name:'Avoid Death without scar',move:'avoid_death',faces:[3],result:'unconscious',status:'resolved',hp:6,stress:3,actorStatus:'active',cap:6,hope:3},
  {name:'Avoid Death last slot',move:'avoid_death',faces:[1],result:'journey_ended',status:'resolved',hp:6,stress:3,actorStatus:'dead',cap:0,hope:0,startCap:1},
  {name:'Blaze of Glory pending owner final action',move:'blaze_of_glory',faces:[],result:'blaze_pending',status:'awaiting_final_action',hp:6,stress:3,actorStatus:'active',cap:6,hope:3}
];
for(const c of cases)test(`${c.name} commits one native outcome and never redraws after reopen`,t=>{
  const f=fixture(t,{move:c.move,cap:c.startCap??6,hope:c.startHope??3}),faces=[...c.faces];let draws=0;
  const receipt=f.store.resolveIncomingDeath('c','attack',{...f.options,rng:s=>{assert.equal(s,12);draws++;assert.ok(faces.length);return faces.shift();}});assert.equal(draws,c.faces.length);assert.equal(receipt.result,c.result);assert.equal(receipt.status,c.status);f.reopen();
  const state=f.store.readPcLife('c','pc');assert.equal(state.defenses.hp.current,c.hp);assert.equal(state.life.stress.current,c.stress);assert.equal(state.life.status,c.actorStatus);assert.equal(state.hope.cap,c.cap);assert.equal(state.hope.hope,c.hope);
  assert.deepEqual(f.store.resolveIncomingDeath('c','attack',{...f.options,rng(){throw new Error('No reroll');}}),receipt);assert.equal(f.store.readIncomingDeathOutcome('c','attack').choiceHash,receipt.choiceHash);
});
test('owned death feature and changed native actor snapshot block vanilla dice without erasing the owner choice',t=>{
  const f=fixture(t,{features:['Reanimated']});let draws=0;
  assert.throws(()=>f.store.resolveIncomingDeath('c','attack',{...f.options,rng:()=>{draws++;return 6;}}),/supported native mapping/);assert.equal(draws,0);assert.equal(f.store.readIncomingDeathChoice('c','attack').status,'choice_saved');
  const g=fixture(t);g.features.push('New owned feature');assert.throws(()=>g.store.resolveIncomingDeath('c','attack',{...g.options,rng:()=>{draws++;return 6;}}),/canonical native death snapshot/);assert.equal(draws,0);
});
test('invalid native dice or revoked source rolls back all death resources and receipt',t=>{
  const f=fixture(t);assert.throws(()=>f.store.resolveIncomingDeath('c','attack',{...f.options,rng:()=>13}),/out of range/);assert.equal(f.store.readIncomingDeathOutcome('c','attack'),null);
  let checks=0;assert.throws(()=>f.store.resolveIncomingDeath('c','attack',{...f.options,check(){if(++checks===2)throw new Error('Death authority revoked');},rng:()=>6}),/Death authority revoked/);f.reopen();
  const state=f.store.readPcLife('c','pc');assert.equal(state.defenses.hp.current,6);assert.equal(state.life.stress.current,3);assert.equal(state.life.deathState,null);assert.equal(f.store.readIncomingDeathOutcome('c','attack'),null);
  f.revoke();assert.throws(()=>f.store.resolveIncomingDeath('c','attack',{...f.options,rng(){throw new Error('Must reject before RNG');}}),/Owner source revoked/);
});

test('canonical death state blocks an ordinary Hope action; recovered PC can use its existing Hope authority',t=>{
  for(const [move,faces,allowed] of [['risk_it_all',[1,12],false],['risk_it_all',[10,2],false],['avoid_death',[3],false],['risk_it_all',[6,6],true]]){
    const f=fixture(t,{move}),stream=[...faces];f.store.resolveIncomingDeath('c','attack',{...f.options,rng:()=>stream.shift()});const check=()=>{};
    f.store.create({id:'a',campaignId:'c',actorId:'pc',ownerUserId:'u',sceneId:'s',sourceRef:'m',sourceRevision:'1',kind:'hope_cost'},{check});f.store.transition({campaignId:'c',actionId:'a',expectedRevision:1,sourceRef:'window',to:'awaiting_consent'},{check});f.store.transition({campaignId:'c',actionId:'a',expectedRevision:2,sourceRef:'choice',to:'ready_to_commit'},{check});
    const cost={id:'cost',actionRef:'a',campaignId:'c',actorId:'pc',ownerUserId:'u',sourceRef:'m',sourceRevision:'1',status:'accepted',ownerConfirmed:true,amount:1},input={campaignId:'c',actionId:'a',costRef:'cost',expectedActionRevision:3,expectedHopeRevision:f.store.readHope('c','pc').revision},options={check,readCost:()=>cost};
    if(allowed)assert.equal(f.store.commitHopeCost(input,options).afterHope.hope,2);
    else{assert.throws(()=>f.store.commitHopeCost(input,options),/native recovery/);assert.equal(f.store.read('c','a').status,'ready_to_commit');}
  }
});
