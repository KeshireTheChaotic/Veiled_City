import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openRollStore} from '../../src/v2/rules/roll-store.js';
import {openFearReservations} from '../../src/v2/rules/fear-reservations.js';
import {createFearOpportunityReader} from '../../src/v2/rules/fear-opportunity-reader.js';
import {createPreRollFearCoordinator} from '../../src/v2/rules/pre-roll-fear-coordinator.js';
import {createIncomingDamageAuthority} from '../../src/v2/rules/incoming-damage-authority.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {createHash} from 'node:crypto';
function fixture(t,amount=1){
  const dir=mkdtempSync(join(tmpdir(),'vk2-fear-order-'));let rolls,fear,coordinator,reader;
  const check=()=>{},owner={id:'pc',kind:'pc',status:'active',campaignId:'c',sceneId:'s',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1'},npc={id:'npc',kind:'npc',status:'active',campaignId:'c',sceneId:'s',controllerUserId:null};
  function close(){rolls?.close();fear?.close();rolls=fear=null;}
  function reopen(){close();rolls=openRollStore(join(dir,'rolls.sqlite'));fear=openFearReservations(join(dir,'fear.sqlite'));
    reader=createFearOpportunityReader({rollStore:rolls,sourceAuthority:{inspectReference:()=>({campaign:'c',scene:'s',principal:'u',actors:['pc']})},readActor:(_c,id)=>id==='pc'?owner:npc,inspectGmDecision:(_c,q)=>({id:`decision:${q}`,status:'gm_action_ready',issuer:'native_gm_decision',campaignId:'c',sceneId:'s',requestRef:q,npcId:'npc',targetActorId:'pc',operation:'commit_adversary_attack',feature:'standard_attack',advantage:false,disadvantage:false,experienceRef:null,printedFearCost:0})});
    coordinator=createPreRollFearCoordinator({rollStore:rolls,fearStore:fear,opportunityReader:reader,sourceAuthority:{inspectReference(ref){if(ref==='revoked')throw new Error('Source revoked');return {campaign:'c',scene:'s',principal:ref==='other-owner'?'other':'u',actors:['pc'],recipients:ref==='party-source'?['u','other']:['u']};}}});
  }
  t.after(()=>{close();rmSync(dir,{recursive:true,force:true});});reopen();fear.initialize('c',amount,{check});
  function request(q){rolls.createRequest({id:q,campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',noticeRef:`notice:${q}`,stakes:'The guard hears.',difficulty:12,modifier:0,experience:0,advantage:0,disadvantage:0,sourceRef:'source',sourceRevision:'1'},{check});rolls.acknowledgeDelivery('c',q,{messageId:`message:${q}`,recipientIds:['u']},{check});}
  request('q');request('other');
  return {get rolls(){return rolls;},get fear(){return fear;},get reader(){return reader;},get coordinator(){return coordinator;},reopen,check,roll(q='q'){return rolls.recordOwnerRoll('c',q,{id:`result:${q}`,ownerUserId:'u',hope:8,fear:5},{check});},publication(){return {campaignId:'c',requestRef:'q',bindingHash:fear.read('c','q').bindingHash,status:'not_started',attemptCount:0};}};
}
test('held request stays unrolled across reopen while independent request and cancelled hold can roll',t=>{
  const f=fixture(t),r=f.coordinator.reserve('c','q',{check:f.check});assert.equal(r.status,'awaiting_announcement');
  assert.throws(()=>f.roll(),/interruption holds/);assert.equal(f.roll('other').hope,8);f.reopen();
  assert.deepEqual(f.coordinator.reserve('c','q',{check:f.check}),r);assert.throws(()=>f.roll(),/interruption holds/);
  f.coordinator.cancel('c','q',{check:f.check,readPublication:f.publication});f.reopen();assert.equal(f.rolls.readFearHold('c','q').status,'cancelled');
  const roll=f.roll();assert.deepEqual(f.roll(),roll);assert.equal(f.fear.reserved('c'),0);
});
test('saved owner dice cannot acquire a later interruption or reserve Fear',t=>{
  const f=fixture(t);f.roll();assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/Unrolled/);
  assert.equal(f.rolls.readFearHold('c','q'),null);assert.equal(f.fear.read('c','q'),null);
});
test('reservation failure preserves a durable hold and cannot invent cancellation proof',t=>{
  const f=fixture(t,0);assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/unreserved/);f.reopen();
  assert.equal(f.rolls.readFearHold('c','q').status,'held');assert.equal(f.fear.read('c','q'),null);assert.throws(()=>f.roll(),/interruption holds/);
  assert.throws(()=>f.rolls.releaseCancelledFear('c','q',{check:f.check,readCancellation:()=>({status:'cancelled',terms:{campaignId:'c',requestRef:'q',decisionRef:'different'}})}),/Exact cancelled/);
  assert.equal(f.rolls.readFearHold('c','q').status,'held');
});
test('failed hold authorization rolls back; failed release leaves cancelled reservation safely held for replay',t=>{
  const f=fixture(t);let checks=0;
  assert.throws(()=>f.coordinator.reserve('c','q',{check(){if(++checks===2)throw new Error('Authority changed');}}),/Authority changed/);assert.equal(f.rolls.readFearHold('c','q'),null);
  f.coordinator.reserve('c','q',{check:f.check});checks=0;
  assert.throws(()=>f.coordinator.cancel('c','q',{readPublication:f.publication,check(){if(++checks===3)throw new Error('Release interrupted');}}),/Release interrupted/);f.reopen();
  assert.equal(f.fear.read('c','q').status,'cancelled');assert.equal(f.rolls.readFearHold('c','q').status,'held');assert.throws(()=>f.roll(),/interruption holds/);
  f.coordinator.cancel('c','q',{check:f.check});assert.equal(f.rolls.readFearHold('c','q').status,'cancelled');assert.equal(f.roll().hope,8);
});

function recoveryOptions(f){return {check:f.check,readReview:()=>({id:'review',campaignId:'c',requestRef:'q',decisionRef:'decision:q',status:'approved',operation:'cancel_unreserved_fear_hold',reviewerUserId:'gm'}),readPublication:()=>({campaignId:'c',requestRef:'q',decisionRef:'decision:q',status:'not_started',attemptCount:0})};}
test('reviewed orphan recovery persists a cancellation tombstone and releases only its held request',t=>{
  const f=fixture(t,0);assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/unreserved/);f.reopen();
  const options=recoveryOptions(f),receipt=f.coordinator.recoverUnreserved('c','q',options);f.reopen();
  assert.equal(receipt.recoveryKind,'unreserved_hold');assert.equal(receipt.status,'cancelled');assert.equal(f.fear.reserved('c'),0);
  assert.deepEqual(f.coordinator.recoverUnreserved('c','q',options),receipt);assert.equal(f.rolls.readFearHold('c','q').status,'cancelled');
  assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/already closed/);assert.equal(f.roll().hope,8);
});
test('orphan recovery rejects absent, mismatched or unapproved reviews and uncertain publication',t=>{
  const f=fixture(t,0);assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/unreserved/);const options=recoveryOptions(f);
  assert.throws(()=>f.coordinator.recoverUnreserved('c','q',{check:f.check}),/evidence required/);
  for(const patch of [{status:'pending'},{reviewerUserId:''},{campaignId:'other'},{decisionRef:'other'},{operation:'unlock'}])assert.throws(()=>f.coordinator.recoverUnreserved('c','q',{...options,readReview:()=>({...options.readReview(),...patch})}),/approved native recovery/);
  for(const patch of [{status:'uncertain'},{attemptCount:1},{decisionRef:'other'}])assert.throws(()=>f.coordinator.recoverUnreserved('c','q',{...options,readPublication:()=>({...options.readPublication(),...patch})}),/Unattempted orphan/);
  assert.equal(f.fear.read('c','q'),null);assert.equal(f.rolls.readFearHold('c','q').status,'held');
});
test('orphan recovery cannot cancel an actual reservation or survive changing review evidence',t=>{
  const active=fixture(t);active.coordinator.reserve('c','q',{check:active.check});assert.throws(()=>active.coordinator.recoverUnreserved('c','q',recoveryOptions(active)),/Existing Fear reservation/);assert.equal(active.fear.reserved('c'),1);
  const f=fixture(t,0);assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/unreserved/);const options=recoveryOptions(f);let reads=0;
  assert.throws(()=>f.coordinator.recoverUnreserved('c','q',{...options,readReview:()=>({...options.readReview(),id:++reads===1?'review':'changed'})}),/evidence changed/);
  let checks=0;assert.throws(()=>f.coordinator.recoverUnreserved('c','q',{...options,check(){if(++checks===2)throw new Error('Review revoked');}}),/Review revoked/);f.reopen();assert.equal(f.fear.read('c','q'),null);assert.throws(()=>f.roll(),/interruption holds/);
});
test('interruption after recovery receipt before hold release is safely resumed after reopen',t=>{
  const f=fixture(t,0);assert.throws(()=>f.coordinator.reserve('c','q',{check:f.check}),/unreserved/);const options=recoveryOptions(f);let checks=0;
  assert.throws(()=>f.coordinator.recoverUnreserved('c','q',{...options,check(){if(++checks===3)throw new Error('Release interrupted');}}),/Release interrupted/);f.reopen();
  assert.equal(f.fear.read('c','q').status,'cancelled');assert.equal(f.rolls.readFearHold('c','q').status,'held');assert.throws(()=>f.roll(),/interruption holds/);
  f.coordinator.recoverUnreserved('c','q',options);assert.equal(f.rolls.readFearHold('c','q').status,'cancelled');assert.equal(f.roll().hope,8);
});

test('announcement lifecycle retains its roll hold through uncertain delivery and exact acknowledgement',t=>{
  const f=fixture(t),row=f.coordinator.reserve('c','q',{check:f.check}),attempt=f.coordinator.claimAnnouncement('c','q',{check:f.check});
  f.coordinator.markAnnouncementUncertain('c','q',attempt.attemptId,{check:f.check});f.reopen();
  assert.throws(()=>f.roll(),/interruption holds/);assert.throws(()=>f.coordinator.claimAnnouncement('c','q',{check:f.check}),/already attempted/);
  const notice={attemptId:attempt.attemptId,status:'delivered',kind:'pre_roll_fear',requestRef:'q',bindingHash:row.bindingHash,baseCost:1,printedFearCost:0,npcId:'npc',actorId:'pc',recipientIds:['u'],messageId:'fear-message'};
  const result=f.coordinator.acknowledgeAnnouncement('c','q',{check:f.check,readNotice:()=>notice});f.reopen();
  assert.equal(result.status,'announced');assert.deepEqual(f.coordinator.acknowledgeAnnouncement('c','q',{check:f.check,readNotice:()=>notice}),result);
  assert.equal(f.rolls.readFearHold('c','q').status,'held');assert.throws(()=>f.roll(),/interruption holds/);assert.equal(f.fear.reserved('c'),1);
});

test('reservation without its matching hold cannot claim or acknowledge through the coordinator',t=>{
  const f=fixture(t);f.fear.reserve('c','q',{readOpportunity:f.reader.read,check:f.check});
  assert.throws(()=>f.coordinator.claimAnnouncement('c','q',{check:f.check}),/Matching active/);assert.equal(f.fear.readPublication('c','q').status,'not_started');
  f.rolls.holdForFear('c','q','other-decision',{check:f.check});assert.throws(()=>f.coordinator.claimAnnouncement('c','q',{check:f.check}),/Matching active/);
  assert.throws(()=>f.coordinator.acknowledgeAnnouncement('c','q',{check:f.check,readNotice:()=>null}),/Matching active/);
});

test('native hold authority revoked at the end of claim rolls publication state back',t=>{
  const f=fixture(t);f.coordinator.reserve('c','q',{check:f.check});let checks=0;
  assert.throws(()=>f.coordinator.claimAnnouncement('c','q',{check(){if(++checks===2)throw new Error('Authority revoked');}}),/Authority revoked/);f.reopen();
  assert.equal(f.fear.readPublication('c','q').status,'not_started');assert.equal(f.rolls.readFearHold('c','q').status,'held');
});

test('native response identity survives reopen, rejects conflicts and cannot be saved for another attempt',t=>{
  const f=fixture(t);f.coordinator.reserve('c','q',{check:f.check});const attempt=f.coordinator.claimAnnouncement('c','q',{check:f.check}),response={campaignId:'c',requestRef:'q',attemptId:attempt.attemptId,channelId:'ch',messageId:'m',audienceFingerprint:'a'.repeat(64)};
  const options={check:f.check,readResponse:()=>response};f.coordinator.recordAnnouncementResponse('c','q',attempt.attemptId,options);f.reopen();
  assert.deepEqual(f.fear.readPublication('c','q').response,response);f.coordinator.recordAnnouncementResponse('c','q',attempt.attemptId,options);
  assert.throws(()=>f.coordinator.recordAnnouncementResponse('c','q',attempt.attemptId,{...options,readResponse:()=>({...response,messageId:'other'})}),/Immutable Fear send response conflict/);
  assert.throws(()=>f.coordinator.recordAnnouncementResponse('c','q','other',options),/saved Fear publication attempt/);
  assert.throws(()=>f.coordinator.acknowledgeAnnouncement('c','q',{check:f.check,readNotice:()=>({attemptId:attempt.attemptId,messageId:'different'})}),/saved native send response/);
  assert.equal(f.fear.readPublication('c','q').status,'delivering');
});

function attackCandidate(){return {id:'attack',campaignId:'c',sceneId:'s',requestRef:'q',decisionRef:'decision:q',actorId:'pc',ownerUserId:'u',controlRevision:'1',npcId:'npc',sourceRef:'source',sourceRevision:'1',targetRevision:'pc:1',encounterRevision:'encounter:1',statblockRevision:'template:1',ruleFingerprint:'b'.repeat(64),damageExpression:'2d6+3',damageType:'physical',attackBonus:2,evasion:12,major:8,severe:16,advantage:false,disadvantage:false,defenses:{resistance:'none',armorReduction:1,armorAllowed:true,sourceRef:'base'}};}
function announce(f){const row=f.coordinator.reserve('c','q',{check:f.check}),attempt=f.coordinator.claimAnnouncement('c','q',{check:f.check});f.coordinator.acknowledgeAnnouncement('c','q',{check:f.check,readNotice:()=>({attemptId:attempt.attemptId,status:'delivered',kind:'pre_roll_fear',requestRef:'q',bindingHash:row.bindingHash,baseCost:1,printedFearCost:0,npcId:'npc',actorId:'pc',recipientIds:['u'],messageId:'fear-notice'})});}
test('acknowledged native interruption prepares one immutable incoming offer without spending or rolling',t=>{
  const f=fixture(t),candidate=attackCandidate();announce(f);const options={check:f.check,readCandidate:()=>candidate},offer=f.coordinator.prepareIncoming('c','q',options);f.reopen();
  assert.equal(offer.status,'awaiting_defense');assert.equal(offer.effectsCommitted,false);assert.deepEqual(f.coordinator.prepareIncoming('c','q',options),offer);
  assert.equal(f.fear.initialize('c',1,{check:f.check}),1);assert.equal(f.fear.reserved('c'),1);assert.equal(f.rolls.readResultForRequest('c','q'),null);assert.equal(f.rolls.readFearHold('c','q').status,'held');
  assert.throws(()=>f.coordinator.prepareIncoming('c','q',{...options,readCandidate:()=>({...candidate,targetRevision:'pc:2'})}),/Immutable incoming offer conflict/);
});
test('incoming offer cannot bypass announcement, original source, target ownership or inspected rule terms',t=>{
  const f=fixture(t),options={check:f.check,readCandidate:attackCandidate};assert.throws(()=>f.coordinator.prepareIncoming('c','q',options),/Matching active/);announce(f);
  for(const patch of [{sourceRef:'other'},{sourceRevision:'2'},{ownerUserId:'other'},{npcId:'other'},{damageExpression:'free damage'},{evasion:0},{ruleFingerprint:'unknown'},{defenses:{resistance:'none',armorReduction:3,armorAllowed:true,sourceRef:'base'}}])assert.throws(()=>f.coordinator.prepareIncoming('c','q',{...options,readCandidate:()=>({...attackCandidate(),...patch})}));
  assert.equal(f.fear.read('c','q').incoming,undefined);
});
test('changing native candidate or final authorization failure cannot save an incoming offer',t=>{
  const f=fixture(t);announce(f);let reads=0;
  assert.throws(()=>f.coordinator.prepareIncoming('c','q',{check:f.check,readCandidate:()=>({...attackCandidate(),targetRevision:++reads===1?'pc:1':'pc:2'})}),/candidate changed/);
  let checks=0;assert.throws(()=>f.coordinator.prepareIncoming('c','q',{readCandidate:attackCandidate,check(){if(++checks===2)throw new Error('Attack authority changed');}}),/Attack authority changed/);f.reopen();
  assert.equal(f.fear.read('c','q').incoming,undefined);assert.equal(f.fear.reserved('c'),1);
});

function defenseEvidence(f,kind='incoming_defense_review',patch={}){const incoming=f.fear.read('c','q').incoming;return {id:kind==='incoming_defense_review'?'review':'choice',kind,campaignId:'c',sceneId:'s',attackRef:'attack',termsHash:incoming.termsHash,ownerUserId:'u',actorId:'pc',controlRevision:'1',sourceRef:'owner-source',sourceRevision:'1',sequence:kind==='incoming_defense_review'?1:2,...(kind==='incoming_defense_choice'?{reviewRef:'review',decision:'confirm_base_defenses'}:{}),...patch};}
function prepareDefense(f){announce(f);f.coordinator.prepareIncoming('c','q',{check:f.check,readCandidate:attackCandidate});}
test('ordered private owner review, withholding and confirmation persist without spending or rolling',t=>{
  const f=fixture(t);prepareDefense(f);const options={check:f.check,readCandidate:attackCandidate},review=defenseEvidence(f);
  f.coordinator.reviewIncoming('c','q',{...options,readEvidence:()=>review});
  const withheld=defenseEvidence(f,'incoming_defense_choice',{decision:'withhold_defense'});assert.equal(f.coordinator.recordIncomingDefense('c','q',{...options,readEvidence:()=>withheld}).status,'hold_for_owner');f.reopen();
  const choice=defenseEvidence(f,'incoming_defense_choice',{id:'confirmed',sequence:3}),result=f.coordinator.recordIncomingDefense('c','q',{...options,readEvidence:()=>choice});f.reopen();
  assert.equal(result.status,'ready');assert.equal(result.choices.length,2);assert.deepEqual(f.coordinator.recordIncomingDefense('c','q',{...options,readEvidence:()=>choice}),result);
  assert.equal(f.fear.initialize('c',1,{check:f.check}),1);assert.equal(f.fear.reserved('c'),1);assert.equal(f.rolls.readResultForRequest('c','q'),null);assert.equal(result.effectsCommitted,false);
});
test('unreviewed, out-of-order, wrong-owner or public defense choices cannot open an attack',t=>{
  const f=fixture(t);prepareDefense(f);const options={check:f.check,readCandidate:attackCandidate},choice=defenseEvidence(f,'incoming_defense_choice');
  assert.throws(()=>f.coordinator.recordIncomingDefense('c','q',{...options,readEvidence:()=>choice}),/Ordered reviewed/);
  for(const sourceRef of ['other-owner','party-source','revoked'])assert.throws(()=>f.coordinator.reviewIncoming('c','q',{...options,readEvidence:()=>defenseEvidence(f,'incoming_defense_review',{sourceRef})}));
  f.coordinator.reviewIncoming('c','q',{...options,readEvidence:()=>defenseEvidence(f)});
  for(const patch of [{sequence:1},{reviewRef:'different'},{controlRevision:'2'},{termsHash:'different'},{decision:'auto_accept'}])assert.throws(()=>f.coordinator.recordIncomingDefense('c','q',{...options,readEvidence:()=>({...choice,...patch})}));
  assert.equal(f.fear.read('c','q').incoming.status,'awaiting_defense');
});
test('stale native attack candidate or revoked final authority leaves the owner defense window pending',t=>{
  const f=fixture(t);prepareDefense(f);const review=defenseEvidence(f),options={check:f.check,readEvidence:()=>review};
  assert.throws(()=>f.coordinator.reviewIncoming('c','q',{...options,readCandidate:()=>({...attackCandidate(),targetRevision:'pc:2'})}),/Current native incoming/);
  let checks=0;assert.throws(()=>f.coordinator.reviewIncoming('c','q',{...options,readCandidate:attackCandidate,check(){if(++checks===2)throw new Error('Owner authorization changed');}}),/Owner authorization changed/);f.reopen();
  assert.equal(f.fear.read('c','q').incoming.review,undefined);assert.equal(f.fear.read('c','q').incoming.status,'awaiting_defense');
});

test('base-defense confirmation cannot silently accept a feature defense while withholding remains available',t=>{
  const f=fixture(t);announce(f);const candidate={...attackCandidate(),defenses:{resistance:'half',armorReduction:1,armorAllowed:true,sourceRef:'owned-feature'}},options={check:f.check,readCandidate:()=>candidate};
  f.coordinator.prepareIncoming('c','q',options);f.coordinator.reviewIncoming('c','q',{...options,readEvidence:()=>defenseEvidence(f)});
  assert.throws(()=>f.coordinator.recordIncomingDefense('c','q',{...options,readEvidence:()=>defenseEvidence(f,'incoming_defense_choice')}),/separate native reviewed route/);
  assert.equal(f.coordinator.recordIncomingDefense('c','q',{...options,readEvidence:()=>defenseEvidence(f,'incoming_defense_choice',{decision:'withhold_defense'})}).status,'hold_for_owner');
});

function readyAttack(f,candidate=attackCandidate()){
  announce(f);const options={check:f.check,readCandidate:()=>candidate};f.coordinator.prepareIncoming('c','q',options);
  const review=defenseEvidence(f);f.coordinator.reviewIncoming('c','q',{...options,readEvidence:()=>review});
  const choice=defenseEvidence(f,'incoming_defense_choice');f.coordinator.recordIncomingDefense('c','q',{...options,readEvidence:()=>choice});
  return {...options,readReview:()=>review,readChoice:()=>choice};
}
test('one native attack atomically spends reserved Fear and saves critical dice; replay never draws or spends again',t=>{
  const f=fixture(t),options=readyAttack(f),faces=[20,2,4],sides=[];
  const result=f.coordinator.rollIncoming('c','q',{...options,rng:s=>{sides.push(s);return faces.shift();}});f.reopen();
  assert.deepEqual(sides,[20,6,6]);assert.equal(result.roll.critical,'attack_success');assert.equal(result.damage.total,21);assert.deepEqual(result.fear,{before:1,after:0,amount:1});
  assert.equal(f.fear.initialize('c',0,{check:f.check}),0);assert.equal(f.fear.reserved('c'),0);assert.equal(f.fear.read('c','q').incoming.status,'awaiting_armor');assert.equal(f.rolls.readFearHold('c','q').status,'held');assert.equal(result.hpEffectsCommitted,false);
  assert.deepEqual(f.coordinator.rollIncoming('c','q',{...options,readCandidate(){throw new Error('Historical replay does not authorize a new attack');},rng(){throw new Error('No reroll');}}),result);
});
test('native miss draws no damage and native effective advantage selects the correct d20',t=>{
  const missed=fixture(t),options=readyAttack(missed);let draws=0;
  const result=missed.coordinator.rollIncoming('c','q',{...options,rng:s=>{assert.equal(s,20);draws++;return 1;}});assert.equal(draws,1);assert.equal(result.damage,null);assert.equal(missed.fear.read('c','q').incoming.status,'missed');
  const f=fixture(t),adv=readyAttack(f,{...attackCandidate(),advantage:true}),faces=[3,15,2,2],sides=[];
  const hit=f.coordinator.rollIncoming('c','q',{...adv,rng:s=>{sides.push(s);return faces.shift();}});assert.deepEqual(sides,[20,20,6,6]);assert.equal(hit.roll.selected,15);assert.equal(hit.damage.total,7);
});
test('unconfirmed or revoked owner defense cannot spend Fear or draw attack dice',t=>{
  const f=fixture(t);prepareDefense(f);const options={check:f.check,readCandidate:attackCandidate,readReview:()=>defenseEvidence(f),readChoice:()=>defenseEvidence(f,'incoming_defense_choice')};let draws=0;
  assert.throws(()=>f.coordinator.rollIncoming('c','q',{...options,rng:()=>{draws++;return 10;}}),/defense proofs/);assert.equal(draws,0);assert.equal(f.fear.initialize('c',1,{check:f.check}),1);
  const g=fixture(t),ready=readyAttack(g);assert.throws(()=>g.coordinator.rollIncoming('c','q',{...ready,readChoice:()=>({...ready.readChoice(),sourceRef:'revoked'}),rng:()=>{draws++;return 10;}}),/revoked/);assert.equal(draws,0);assert.equal(g.fear.initialize('c',1,{check:g.check}),1);
});
test('invalid native RNG or final authorization failure rolls back both debit and saved attack',t=>{
  const f=fixture(t),options=readyAttack(f);assert.throws(()=>f.coordinator.rollIncoming('c','q',{...options,rng:()=>21}),/out of range/);
  let checks=0;assert.throws(()=>f.coordinator.rollIncoming('c','q',{...options,check(){if(++checks===2)throw new Error('Execution authority changed');},rng:s=>s===20?15:2}),/Execution authority changed/);f.reopen();
  assert.equal(f.fear.initialize('c',1,{check:f.check}),1);assert.equal(f.fear.reserved('c'),1);assert.equal(f.fear.read('c','q').incoming.status,'ready');assert.equal(f.fear.read('c','q').incoming.result,undefined);
});

function damageChain(t,f){
  const options=readyAttack(f),faces=[15,2,2],result=f.coordinator.rollIncoming('c','q',{...options,rng:()=>faces.shift()}),actions=openActionStore();t.after(()=>actions.close());
  actions.initializePcDefenses({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',hp:{current:0,max:6},armorSlots:{current:0,max:3}},{check:f.check});
  const actor={id:'pc',kind:'pc',status:'active',campaignId:'c',sceneId:'s',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1',revision:'pc:1'},choice={id:'armor',kind:'incoming_armor_choice',campaignId:'c',sceneId:'s',attackRef:'attack',actorId:'pc',ownerUserId:'u',controlRevision:'1',resultRef:result.id,resultHash:createHash('sha256').update(JSON.stringify(result)).digest('hex'),termsHash:result.termsHash,sourceRef:'armor-source',sourceRevision:'1',useArmor:false};
  let corrupt=false;
  const authority=createIncomingDamageAuthority({fearStore:{read(c,q){const row=f.fear.read(c,q);if(corrupt)row.incoming.result.damage.total++;return row;}},actionStore:actions,sourceAuthority:{inspectReference(ref){if(ref==='revoked')throw new Error('Armor source revoked');return {campaign:'c',scene:'s',principal:'u',actors:['pc'],recipients:ref==='public'?['u','other']:['u']};}},readActor:()=>actor,readArmorChoice:()=>choice});
  return {actions,actor,choice,authority,corrupt(){corrupt=true;}};
}
test('actual native saved attack settles through private owner Armor evidence and replays against later state without reroll',t=>{
  const f=fixture(t),chain=damageChain(t,f),result=chain.authority.commit('c','q','armor');assert.equal(result.after.hp.current,1);assert.equal(result.after.armorSlots.current,0);f.reopen();
  chain.actor.revision='pc:2';assert.deepEqual(chain.authority.commit('c','q','armor'),result);assert.equal(chain.actions.readPcDefenses('c','pc').revision,2);assert.equal(f.fear.initialize('c',0,{check:f.check}),0);
});
test('corrupt native saved damage cannot establish an authoritative PC effect',t=>{
  const f=fixture(t),chain=damageChain(t,f);chain.corrupt();assert.throws(()=>chain.authority.commit('c','q','armor'),/saved damage dice mismatch/);
  assert.equal(chain.actions.readPcDefenses('c','pc').hp.current,0);assert.equal(chain.actions.readIncomingDamage('c','attack'),null);
});
test('wrong result, public or revoked Armor source and stale target state cannot authorize damage',t=>{
  const f=fixture(t),chain=damageChain(t,f),original=structuredClone(chain.choice);
  for(const patch of [{resultHash:'different'},{sourceRef:'public'},{sourceRef:'revoked'},{useArmor:'yes'}]){Object.assign(chain.choice,original,patch);assert.throws(()=>chain.authority.commit('c','q','armor'));}
  Object.assign(chain.choice,original);chain.actor.revision='pc:2';assert.throws(()=>chain.authority.commit('c','q','armor'),/target revision/);assert.equal(chain.actions.readPcDefenses('c','pc').revision,1);
});
