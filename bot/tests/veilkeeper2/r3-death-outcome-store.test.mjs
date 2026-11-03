import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {DatabaseSync} from 'node:sqlite';
import {createAtomicHopeCostAuthority} from '../../src/v2/rules/hope-cost-authority.js';
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
  const readActorSnapshot=()=>{const {life,defenses,hope}=store.readPcLife('c','pc');return {actorId:'pc',ownerUserId:'u',controlRevision:'1',status:life.status,data:{level:life.level,death_state:life.deathState,resources:{hp:defenses.hp,armor:defenses.armorSlots,stress:life.stress,hope:hope.hope,hope_max:hope.cap},features}};};
  const eligible=store.readIncomingDeath('c','attack'),base={campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',requestRef:eligible.id,eligibilityHash:hash(eligible),resourceRevision:2,actorSnapshotHash:hash(readActorSnapshot()),sourceRef:'owner-source',sourceRevision:'1'};
  const review={...base,id:'review',kind:'incoming_death_review',sequence:1},ownerChoice={...base,id:'choice',kind:'incoming_death_choice',sequence:2,reviewRef:'review',move};
  store.recordIncomingDeathReview('c','attack',{check,sourceAuthority,readEvidence:()=>review});store.recordIncomingDeathChoice('c','attack',{check,sourceAuthority,readEvidence:()=>ownerChoice});
  return {get store(){return store;},path,features,readActorSnapshot,revoke(){revoked=true;},reopen(){store.close();store=openActionStore(path);},options:{check,sourceAuthority,readActorSnapshot}};
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

function allocation(f,hp,stress){const initial=f.store.readIncomingDeathOutcome('c','attack');return {id:'allocation',kind:'incoming_death_allocation',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',sourceRef:'allocation-source',sourceRevision:'1',requestRef:initial.requestRef,outcomeHash:hash(initial),sequence:3,hp,stress};}
test('explicit owner recovery uses the saved Hope budget, resolves once and preserves original dice after reopen',t=>{
  const f=fixture(t),faces=[5,1],initial=f.store.resolveIncomingDeath('c','attack',{...f.options,rng:()=>faces.shift()}),e=allocation(f,3,2),options={...f.options,readEvidence:()=>e};
  const resolved=f.store.allocateIncomingDeathRecovery('c','attack',options);f.reopen();const state=f.store.readPcLife('c','pc');assert.equal(state.defenses.hp.current,3);assert.equal(state.life.stress.current,1);assert.equal(state.life.deathState.status,'recovered');assert.equal(state.hope.hope,3);assert.equal(resolved.status,'resolved');assert.deepEqual(resolved.roll,initial.roll);
  assert.deepEqual(f.store.allocateIncomingDeathRecovery('c','attack',options),resolved);assert.deepEqual(f.store.resolveIncomingDeath('c','attack',{...f.options,rng(){throw new Error('No reroll');}}),resolved);
  assert.throws(()=>f.store.allocateIncomingDeathRecovery('c','attack',{...options,readEvidence:()=>({...e,hp:2,stress:3})}),/replay conflict/);
});
test('recovery budget caps at marked slots and does not force an owner to clear HP',t=>{
  for(const [faces,hp,stress,afterHp,afterStress] of [[[10,2],6,3,0,0],[[3,1],0,3,6,0]]){
    const f=fixture(t),stream=[...faces];f.store.resolveIncomingDeath('c','attack',{...f.options,rng:()=>stream.shift()});const e=allocation(f,hp,stress);f.store.allocateIncomingDeathRecovery('c','attack',{...f.options,readEvidence:()=>e});const state=f.store.readPcLife('c','pc');assert.equal(state.defenses.hp.current,afterHp);assert.equal(state.life.stress.current,afterStress);
  }
});
test('invalid amounts, old outcomes, public sources and stale native frames cannot allocate recovery',t=>{
  const f=fixture(t),faces=[5,1];f.store.resolveIncomingDeath('c','attack',{...f.options,rng:()=>faces.shift()});const e=allocation(f,3,2);
  for(const patch of [{hp:-1},{hp:7},{hp:2},{stress:4},{outcomeHash:'wrong'},{sequence:2}])assert.throws(()=>f.store.allocateIncomingDeathRecovery('c','attack',{...f.options,readEvidence:()=>({...e,...patch})}));
  assert.throws(()=>f.store.allocateIncomingDeathRecovery('c','attack',{...f.options,sourceAuthority:{inspectReference:()=>({campaign:'c',scene:'s',principal:'u',actors:['pc'],recipients:['u','other']})},readEvidence:()=>e}),/private owner/);
  f.features.push('New owned feature');assert.throws(()=>f.store.allocateIncomingDeathRecovery('c','attack',{...f.options,readEvidence:()=>e}),/compare-and-set is stale/);assert.equal(f.store.readPcLife('c','pc').defenses.hp.current,6);
});
test('final recovery authorization rollback retains pending outcome and both marked pools',t=>{
  const f=fixture(t),faces=[5,1];f.store.resolveIncomingDeath('c','attack',{...f.options,rng:()=>faces.shift()});const e=allocation(f,3,2);let checks=0;
  assert.throws(()=>f.store.allocateIncomingDeathRecovery('c','attack',{...f.options,readEvidence:()=>e,check(){if(++checks===2)throw new Error('Recovery authority revoked');}}),/Recovery authority revoked/);f.reopen();const state=f.store.readPcLife('c','pc');assert.equal(state.defenses.hp.current,6);assert.equal(state.life.stress.current,3);assert.equal(f.store.readIncomingDeathOutcome('c','attack').status,'awaiting_allocation');
});

test('an unrelated native control event cannot impersonate a saved recovery receipt',t=>{
  const f=fixture(t),faces=[5,1];f.store.resolveIncomingDeath('c','attack',{...f.options,rng:()=>faces.shift()});const check=()=>{};
  f.store.create({id:'a',campaignId:'c',actorId:'pc',ownerUserId:'u',sceneId:'s',sourceRef:'m',sourceRevision:'1',kind:'ordinary_roll'},{check});
  f.store.transition({campaignId:'c',actionId:'a',expectedRevision:1,sourceRef:'incoming-death-allocation:attack',to:'awaiting_notice'},{check});
  assert.throws(()=>f.store.readIncomingDeathOutcome('c','attack'),/Exact saved native recovery receipt/);assert.equal(f.store.readPcLife('c','pc').defenses.hp.current,6);
});

test('an older persisted death outcome without the full recovery frame remains held for migration',t=>{
  const f=fixture(t),faces=[5,1],initial=f.store.resolveIncomingDeath('c','attack',{...f.options,rng:()=>faces.shift()});delete initial.actorAfter;delete initial.actorBefore;
  const db=new DatabaseSync(f.path);try{db.prepare('UPDATE vk3_action_events SET data=? WHERE campaign=? AND source=?').run(JSON.stringify(initial),'c','incoming-death-outcome:attack');}finally{db.close();}f.reopen();
  const e=allocation(f,3,2);assert.throws(()=>f.store.allocateIncomingDeathRecovery('c','attack',{...f.options,readEvidence:()=>e}),/requires reviewed migration/);assert.equal(f.store.readPcLife('c','pc').defenses.hp.current,6);assert.equal(f.store.readIncomingDeathOutcome('c','attack').status,'awaiting_allocation');
});

function blazeOptions(f,kind='ordinary_action'){
  const initial=f.store.resolveIncomingDeath('c','attack',{...f.options,rng(){throw new Error('Blaze has no death dice');}}),action={id:'final-action',revision:'1',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',sourceRef:'owner-final-source',sourceRevision:'1',status:'accepted',kind,parametersHash:'c'.repeat(64)};
  const approval={id:'gm-review',revision:'1',kind:'human_gm_blaze_approval',status:'approved',campaignId:'c',sceneId:'s',requestRef:initial.requestRef,actionRef:action.id,actionRevision:action.revision,actionHash:hash(action),outcomeHash:hash(initial),reviewerUserId:'gm',rulingRef:'ruling',rulingRevision:'1',sourceRef:'gm-source',sourceRevision:'1'};
  return {action,approval,options:{...f.options,actionRef:action.id,approvalRef:approval.id,readOwnerAction:()=>action,inspectGmApproval:()=>approval}};
}
test('one exact human-approved owner Blaze action gets a durable native Critical without dice or effect authority',t=>{
  const f=fixture(t,{move:'blaze_of_glory'}),b=blazeOptions(f);assert.throws(()=>f.store.createIncomingBlazeCritical('c','attack',b.options),/Saved native Blaze approval/);
  const approved=f.store.approveIncomingBlaze('c','attack',b.options),critical=f.store.createIncomingBlazeCritical('c','attack',b.options);f.reopen();
  assert.equal(approved.effectsCommitted,false);assert.equal(critical.duality,'Critical');assert.equal(critical.total,null);assert.equal(critical.rule,'srd_blaze_of_glory');assert.equal(critical.hope,undefined);assert.equal(critical.fear,undefined);assert.equal(critical.faces,undefined);assert.equal(critical.effectsCommitted,false);
  assert.deepEqual(f.store.approveIncomingBlaze('c','attack',b.options),approved);assert.deepEqual(f.store.createIncomingBlazeCritical('c','attack',b.options),critical);assert.equal(f.store.readPcLife('c','pc').defenses.hp.current,6);assert.equal(f.store.readIncomingDeathOutcome('c','attack').status,'awaiting_final_action');
});
test('changed approval, other owner action or second otherwise approved action cannot replace a Blaze binding',t=>{
  const f=fixture(t,{move:'blaze_of_glory'}),b=blazeOptions(f);f.store.approveIncomingBlaze('c','attack',b.options);
  b.approval.status='revoked';assert.throws(()=>f.store.createIncomingBlazeCritical('c','attack',b.options),/Authenticated human GM/);b.approval.status='approved';
  b.action.ownerUserId='other';assert.throws(()=>f.store.createIncomingBlazeCritical('c','attack',b.options),/independently owner-authored/);b.action.ownerUserId='u';
  const action={...b.action,id:'second-action'},approval={...b.approval,id:'second-review',actionRef:action.id,actionHash:hash(action)};
  assert.throws(()=>f.store.approveIncomingBlaze('c','attack',{...b.options,actionRef:action.id,approvalRef:approval.id,readOwnerAction:()=>action,inspectGmApproval:()=>approval}),/One immutable Blaze final action/);assert.equal(f.store.readIncomingBlazeCritical('c','attack'),null);
});
test('GM approval authority rollback and changed native actor frame cannot save a Blaze action',t=>{
  const f=fixture(t,{move:'blaze_of_glory'}),b=blazeOptions(f);let checks=0;
  assert.throws(()=>f.store.approveIncomingBlaze('c','attack',{...b.options,check(){if(++checks===2)throw new Error('GM authority changed');}}),/GM authority changed/);f.reopen();assert.equal(f.store.readIncomingBlazeApproval('c','attack'),null);
  f.features.push('New owned feature');assert.throws(()=>f.store.approveIncomingBlaze('c','attack',b.options),/Current native Blaze actor snapshot/);assert.equal(f.store.readIncomingBlazeApproval('c','attack'),null);
});

function terminalBlaze(f,b){
  const approval=f.store.approveIncomingBlaze('c','attack',b.options),critical=f.store.createIncomingBlazeCritical('c','attack',b.options);
  return {id:'terminal',revision:'1',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',actionRef:b.action.id,actionRevision:b.action.revision,actionHash:hash(b.action),approvalRef:approval.id,approvalHash:hash(approval),criticalRef:critical.id,criticalHash:hash(critical),kind:b.action.kind,status:'resolved',receiptRef:'native-final-receipt',receiptHash:'d'.repeat(64),effectRef:null,effectHash:null,consentReceiptRef:null,consentReceiptHash:null,stateAfterHash:hash(f.store.readPcLife('c','pc')),actorAfterHash:hash(f.readActorSnapshot())};
}
test('verified terminal Blaze action commits death once and consumes approval across reopen',t=>{
  const f=fixture(t,{move:'blaze_of_glory'}),b=blazeOptions(f),proof=terminalBlaze(f,b);b.action.status='resolved';const options={...b.options,inspectTerminalAction:()=>proof};
  const receipt=f.store.completeIncomingBlaze('c','attack',options);f.reopen();assert.equal(receipt.after.life.status,'dead');assert.equal(receipt.after.life.deathState.status,'dead');assert.equal(f.store.readIncomingDeathOutcome('c','attack').status,'resolved');assert.equal(f.store.readIncomingBlazeApproval('c','attack').status,'consumed');
  assert.deepEqual(f.store.completeIncomingBlaze('c','attack',options),receipt);assert.throws(()=>f.store.createIncomingBlazeCritical('c','attack',b.options),/already consumed/);assert.throws(()=>f.store.approveIncomingBlaze('c','attack',b.options),/already consumed/);
});
test('unresolved action or wrong saved Critical/state cannot invent Blaze completion',t=>{
  const f=fixture(t,{move:'blaze_of_glory'}),b=blazeOptions(f),proof=terminalBlaze(f,b),options={...b.options,inspectTerminalAction:()=>proof};
  assert.throws(()=>f.store.completeIncomingBlaze('c','attack',options),/Actual resolved native final action/);b.action.status='resolved';
  for(const patch of [{criticalHash:'wrong'},{actionRef:'other'},{status:'pending'},{stateAfterHash:'e'.repeat(64)}])assert.throws(()=>f.store.completeIncomingBlaze('c','attack',{...options,inspectTerminalAction:()=>({...proof,...patch})}));
  assert.equal(f.store.readPcLife('c','pc').life.status,'active');assert.equal(f.store.readIncomingDeathOutcome('c','attack').status,'awaiting_final_action');
});
test('PvP Blaze terminal evidence requires explicit verified consent and applied damage references',t=>{
  const f=fixture(t,{move:'blaze_of_glory'}),b=blazeOptions(f,'pvp_attack'),proof=terminalBlaze(f,b);proof.status='damage_applied';
  assert.throws(()=>f.store.completeIncomingBlaze('c','attack',{...b.options,inspectTerminalAction:()=>proof}),/protected consent/);
  Object.assign(proof,{consentReceiptRef:'target-consent',consentReceiptHash:'e'.repeat(64),effectRef:'native-pvp-damage',effectHash:'f'.repeat(64)});
  assert.equal(f.store.completeIncomingBlaze('c','attack',{...b.options,inspectTerminalAction:()=>proof}).after.life.status,'dead');
});
test('final Blaze authority failure rolls death and consumption back while retaining the terminal action proof',t=>{
  const f=fixture(t,{move:'blaze_of_glory'}),b=blazeOptions(f),proof=terminalBlaze(f,b);b.action.status='resolved';let checks=0;
  assert.throws(()=>f.store.completeIncomingBlaze('c','attack',{...b.options,inspectTerminalAction:()=>proof,check(){if(++checks===2)throw new Error('Final action authority changed');}}),/Final action authority changed/);f.reopen();
  assert.equal(f.store.readPcLife('c','pc').life.status,'active');assert.equal(f.store.readIncomingBlazeApproval('c','attack').status,'approved');assert.equal(f.store.readIncomingDeathOutcome('c','attack').status,'awaiting_final_action');
});

function blazeCosts(f,count=1){
  const b=blazeOptions(f);f.store.approveIncomingBlaze('c','attack',b.options);f.store.createIncomingBlazeCritical('c','attack',b.options);
  const costs=Array.from({length:count},(_,i)=>({actionRef:`final-cost-${i}`,slot:`slot-${i}`,amount:count===1?2:1,resource:'hope',sourceRef:b.action.sourceRef,sourceRevision:b.action.sourceRevision})),plan={id:'native-plan',revision:'1',actionRef:b.action.id,actionRevision:'1',actionHash:hash(b.action),ruleFingerprint:'d'.repeat(64),costs};
  const options={...b.options,inspectCostPlan:()=>plan},check=()=>{};
  const link={attackRef:'attack',parentActionRef:b.action.id,approvalRef:'incoming-death-blaze-approval:attack',planRef:'incoming-death-blaze-cost-plan:attack'};
  function addCost(cost){const identity={id:cost.actionRef,campaignId:'c',actorId:'pc',ownerUserId:'u',sceneId:'s',sourceRef:b.action.sourceRef,sourceRevision:'1',kind:'hope_cost'};
    f.store.create(identity,{check});f.store.registerHopeTerms({...identity,revision:'terms-1',controlRevision:'1',cost:{resource:'hope',slot:cost.slot,amount:cost.amount},blaze:link},{check});f.store.transition({campaignId:'c',actionId:identity.id,expectedRevision:1,sourceRef:`window:${identity.id}`,to:'awaiting_consent'},{check});
    f.store.recordHopeConsent({id:`consent:${identity.id}`,campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',sourceRef:b.action.sourceRef,sourceRevision:'1',choiceSourceRef:`choice:${identity.id}`,choiceSourceRevision:'1',actionRef:identity.id,actionRevision:'terms-1',amount:cost.amount,costSlot:cost.slot,revision:'1',status:'accepted'},{check});
  }
  for(const cost of costs)addCost(cost);f.store.prepareIncomingBlazeCosts('c','attack',options);
  function run(ref,revision=1,authorized=true){const source={id:b.action.sourceRef,revision:'1',campaign:'c',scene:'s',principal:'u',actors:['pc']},authority=createAtomicHopeCostAuthority({sourceAuthority:{...f.options.sourceAuthority,revalidate:()=>true},readActor:()=>({id:'pc',kind:'pc',status:f.store.readPcLife('c','pc').life.status,campaignId:'c',sceneId:'s',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1'}),readActionTerms:f.store.readActionTerms,readConsent:f.store.readConsent,actionStore:f.store,...(authorized?{inspectBlazeCost:(c,action)=>f.store.inspectIncomingBlazeCost(c,'attack',action,options)}:{})});return authority.commit(source,'pc',{action_ref:ref,consent_ref:`consent:${ref}`},revision);}
  return {b,plan,options,addCost,run};
}
test('only the planned consented Blaze Hope cost bypasses the pending-death action hold and replays once',t=>{
  const f=fixture(t,{move:'blaze_of_glory'}),c=blazeCosts(f);assert.throws(()=>c.run('final-cost-0',1,false),/native recovery/);assert.equal(f.store.readHope('c','pc').hope,3);
  const receipt=c.run('final-cost-0');assert.equal(receipt.afterHope.hope,1);assert.equal(receipt.blazeAuthorization.parentActionRef,'final-action');f.reopen();assert.deepEqual(c.run('final-cost-0'),receipt);assert.equal(f.store.readHope('c','pc').hope,1);assert.equal(f.store.readIncomingDeathOutcome('c','attack').status,'awaiting_final_action');
});
test('multiple approved Blaze cost slots can commit out of plan order with one canonical Hope lineage',t=>{
  const f=fixture(t,{move:'blaze_of_glory'}),c=blazeCosts(f,2);c.run('final-cost-1',1);c.run('final-cost-0',2);f.reopen();assert.equal(f.store.readHope('c','pc').hope,1);assert.equal(f.store.readHope('c','pc').revision,3);assert.equal(c.run('final-cost-1',1).afterHope.hope,2);
});
test('aliases, changed cost rules and revoked GM approval cannot charge outside the exact Blaze plan',t=>{
  const f=fixture(t,{move:'blaze_of_glory'}),c=blazeCosts(f);c.addCost({...c.plan.costs[0],actionRef:'alias'});assert.throws(()=>c.run('alias'),/outside the approved Blaze plan/);
  c.plan.ruleFingerprint='e'.repeat(64);assert.throws(()=>c.run('final-cost-0'),/current approved final-action cost rules/i);c.plan.ruleFingerprint='d'.repeat(64);
  c.b.approval.status='revoked';assert.throws(()=>c.run('final-cost-0'),/Authenticated human GM/);assert.equal(f.store.readHope('c','pc').hope,3);assert.equal(f.store.read('c','final-cost-0').status,'ready_to_commit');
});
test('revocation during a Blaze cost rolls Hope, action and cost receipt back together',t=>{
  const f=fixture(t,{move:'blaze_of_glory'}),c=blazeCosts(f);let reads=0;c.options.inspectGmApproval=()=>{if(++reads===2)c.b.approval.status='revoked';return c.b.approval;};
  assert.throws(()=>c.run('final-cost-0'),/Authenticated human GM/);f.reopen();assert.equal(f.store.readHope('c','pc').hope,3);assert.equal(f.store.read('c','final-cost-0').status,'ready_to_commit');assert.equal(f.store.readOutcome('c','final-cost-0'),null);
});

test('a Blaze-linked cost cannot execute as an ordinary healthy-PC charge',t=>{
  const f=fixture(t),faces=[6,6];f.store.resolveIncomingDeath('c','attack',{...f.options,rng:()=>faces.shift()});const check=()=>{},identity={id:'bad-cost',campaignId:'c',actorId:'pc',ownerUserId:'u',sceneId:'s',sourceRef:'m',sourceRevision:'1',kind:'hope_cost'};
  f.store.create(identity,{check});f.store.registerHopeTerms({...identity,revision:'terms',controlRevision:'1',cost:{resource:'hope',slot:'base',amount:1},blaze:{attackRef:'attack',parentActionRef:'other',approvalRef:'missing',planRef:'missing'}},{check});f.store.transition({campaignId:'c',actionId:'bad-cost',expectedRevision:1,sourceRef:'window',to:'awaiting_consent'},{check});f.store.transition({campaignId:'c',actionId:'bad-cost',expectedRevision:2,sourceRef:'owner-choice',to:'ready_to_commit'},{check});
  const cost={id:'cost',actionRef:'bad-cost',campaignId:'c',actorId:'pc',ownerUserId:'u',sourceRef:'m',sourceRevision:'1',status:'accepted',ownerConfirmed:true,amount:1,costSlot:'base'};
  assert.throws(()=>f.store.commitHopeCost({campaignId:'c',actionId:'bad-cost',costRef:'cost',expectedActionRevision:3,expectedHopeRevision:1},{check,readCost:()=>cost}),/Blaze-linked cost requires/);assert.equal(f.store.readHope('c','pc').hope,3);
});
