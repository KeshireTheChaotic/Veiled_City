/** Production adapters, synthetic sources, native dice and temporary SQLite only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate,run} from './narrative-fixtures.mjs';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {adjudicateAcceptedIntent} from '../src/rules-arbitration.js';
import {createArbitrationOrigin,arbitrationPromptBoard,bindArbitrationTurn} from '../src/scene-intent-board.js';
import {applyUnifiedArbitration} from '../src/gm-unified-arbitration.js';
import {executeUnifiedGmActions} from '../src/gm-native-rolls.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';
import {contributeRoll,adjudicateRollSource,inspectUnrolledInterruptRequest} from '../src/roll-collaboration.js';
import {rollRevision,publishRollRequests} from '../src/roll-requests.js';
import {inspectPreRollFear} from '../src/pre-roll-fear.js';

function request(f,index,text){
  const pc=f.pcs[index],scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  f.db.updateCharacterData(pc.id,d=>{d.resources.hope=4;});
  const a=f.accepted(index,text,null,{type:'search',operation:'inspect',target:{kind:'unknown',key:'',phrase:'',grounding:'unknown'}});
  const outcome=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:a.record_key,mode:'roll_required',trait:'Instinct',kind:'action',
    difficulty:12,risk:'A clue may be missed.',stakes:'Inspect the visible scene.',rawRefs:['srd:action-rolls'],explanation:'A source-owned uncertain inspection.'},'native:unified-gm',{scope});
  return f.db.getCityRecord(f.guild,'roll_request',outcome.roll_request_ref);
}
function fixture(f){
  const x=setup(f,{text:'I inspect the counter.'}),scene=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true,narrative_encounters:true}});
  f.db.changeFear(f.guild,2);
  for(const pc of f.pcs){
    f.db.updateCharacterData(pc.id,d=>{d.resources.hope=4;d.evasion=12;d.thresholds={major:7,severe:14};});
    const arrival=indexWorldEvent(f.db,f.guild,{key:`integration-arrival-${pc.id}`,kind:'arrival',title:'Owner-established initial scene position',source_id:`player:${pc.owner_user_id}`,session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party',details:{entity_type:'character',entity_key:pc.id,owner_user_id:pc.owner_user_id}},pc.owner_user_id);
    recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,source_event:arrival.event_key,location_key:'terminal',zone:'interior',range:'Close',visibility:'party',accepted_by:pc.owner_user_id},'fixture-native');
  }
  f.db.upsertNpcProfile(f.guild,{npcKey:'guard',displayName:'Guard'});
  f.db.setSimulationEntity(f.guild,'npc','guard',{name:'Guard',location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:'integration-guard',kind:'observation',source_id:'gm',title:'Guard present',session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:source.event_key,location_key:'terminal',zone:'interior',range:'Close',visibility:'party'},'gm');
  const library=new EncounterLibrary('../content'),encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,base_bp:14,budget_bp:14,composition:[{name:'Aster Vale Contractor',quantity:1}]}),combatant=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library))[0];
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,data:{combatants:[{actor:'guard',id:combatant.id}]}});
  const [accepted]=persistPlayerIntents(f.db,f.guild,[{...candidate(x.text).player_intents[0],type:'search',operation:'inspect'}],x.scope,{messageId:x.messageId});
  const outcome=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:accepted.record_key,mode:'roll_required',trait:'Instinct',kind:'action',difficulty:12,risk:'The search may be incomplete.',stakes:'Find visible clues.',rawRefs:['srd:action-rolls'],explanation:'A consequential inspection.'},'native:unified-gm',{scope:x.scope}),heldRequest=f.db.getCityRecord(f.guild,'roll_request',outcome.roll_request_ref);
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),ref=arbitrationPromptBoard(f.db,f.guild,origin).npc_candidates.find(n=>n.actor_key==='guard').intent_refs.attack;
  const arbitration={version:2,npc_intents:[{actor_key:'guard',operation:'attack',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]}],decisions:[{intent_ref:ref,disposition:'gm_attack_roll',rule_basis_refs:['srd:adversary-attacks'],difficulty:null,trait:null,stakes_kind:'native_attack',stakes:'The guard attempts its standard attack.',reason:'One lawful interruption.',difficulty_reason:'Use actual Evasion.',feature_ref:'standard_attack',experience_ref:'',advantage:false,disadvantage:false}],pre_roll_fear:[{request_ref:heldRequest.record_key,npc_intent_ref:ref}]};
  return {...x,accepted,heldRequest,origin,arbitration,library};
}
function reserve(f,x){
  const r={unified_arbitration:x.arbitration};bindArbitrationTurn(r,x.origin);
  const decisions=applyUnifiedArbitration(f.db,f.guild,r,[x.accepted]);
  assert.equal(decisions[0].status,'gm_action_ready',decisions[0].data.reason);
  executeUnifiedGmActions(f.db,f.guild,decisions,{library:x.library});
  return decisions;
}
function contribution(f,row,user,op,fields={},rng=()=>7){
  return contributeRoll(f.db,f.guild,user,{op,key:`integration-${op}-${row.record_key}`,request:row.record_key,expected_revision:rollRevision(row),...fields},{rng});
}
function participationProof(f,row,pc,kind){
  f.db.upsertRulesRuling(f.guild,{key:'integration-tag',ruling:'Source-verified shared inspection is feasible as a Tag Team; owners independently choose participation.',createdBy:'gm'});
  return adjudicateRollSource(f.db,f.guild,{key:`integration-${kind}-${pc.id}`,character_id:pc.id,kind:'participation',ruling_key:'integration-tag',data:{request:row.record_key,character_id:pc.id,kind,description:'I coordinate the inspection.'}},'gm');
}

test('combined GM request selects current pre-roll Fear and actual commit/publisher retains owner-only native announcement with no added provider request',()=>nativeFixture(async f=>{
  const x=fixture(f),r=candidate(x.text);r.player_intents=[{...r.player_intents[0],type:'search',operation:'inspect'}];r.unified_arbitration=x.arbitration;
  const out=await run(f,x,{version:9,acts:[],fiction_delta:[]},r);
  assert.equal(out.ai.requests.length,2,'existing combined semantic plus narrative requests, no separate Fear selector request');
  assert(out.ai.requests[0].input.includes(x.heldRequest.record_key));
  assert(out.ai.requests[0].text.format.schema.properties.unified_arbitration.anyOf);
  const held=f.db.getCityRecord(f.guild,'pre_roll_fear_interrupt',`pre-roll-fear:${x.heldRequest.record_key}`);
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key).row.status,'awaiting_announcement');
  let sends=0;await publishRollRequests(f.db,f.guild,out.mutation,async(user,text,session,char,{publication})=>{
    sends++;assert.equal(user,x.pc.owner_user_id);assert.equal(char,x.pc.id);assert.equal(session,f.session.id);assert.match(text,/1.*Fear/i);assert(publication);return {ok:true,messageId:'integration-announcement',channelId:'owner-dm'};
  });
  assert.equal(sends,1);assert.equal(f.db.getCampaign(f.guild).fear,2);
  f.restart();await publishRollRequests(f.db,f.guild,out.mutation,async()=>assert.fail('delivered announcement cannot replay'));
  assert.equal(f.db.getCampaign(f.guild).fear,2);
}));

test('a held partner cannot be attached to an independent Tag Team initiation; unrelated native action remains executable',()=>nativeFixture(f=>{
  const x=fixture(f),other=request(f,1,'I inspect the visible lockers.'),independent=request(f,2,'I inspect the visible floor.');reserve(f,x);
  const proof=participationProof(f,other,f.pcs[1],'tag'),hope=f.db.getCharacter(f.pcs[1].id).data.resources.hope;let draws=0;
  assert.throws(()=>contribution(f,other,f.pcs[1].owner_user_id,'tag',{partner_request:x.heldRequest.record_key,proof:proof.event_key,description:'I coordinate the inspection.',pay_hope:true},()=>{draws++;return 7;}),/interrupt|Fear|pre.roll/i);
  assert.equal(draws,0);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hope,hope);
  assert.equal(f.db.getCityRecord(f.guild,'roll_request',other.record_key).status,'pending');
  assert.equal(contribution(f,independent,f.pcs[2].owner_user_id,'roll').status,'resolved');
}));

test('a later Fear reservation blocks partner acceptance before Tag Team Hope debit, supersession or RNG',()=>nativeFixture(f=>{
  const x=fixture(f),other=request(f,1,'I inspect the visible lockers.'),proof=participationProof(f,other,f.pcs[1],'tag');
  const invited=contribution(f,other,f.pcs[1].owner_user_id,'tag',{partner_request:x.heldRequest.record_key,proof:proof.event_key,description:'I coordinate the inspection.',pay_hope:true});
  assert.equal(invited.status,'awaiting_partner');reserve(f,x);
  const acceptProof=participationProof(f,invited,x.pc,'participate'),hope=f.db.getCharacter(f.pcs[1].id).data.resources.hope;let draws=0;
  assert.throws(()=>contribution(f,invited,x.pc.owner_user_id,'participate',{proof:acceptProof.event_key,description:'I coordinate the inspection.'},()=>{draws++;return 7;}),/interrupt|Fear|pre.roll/i);
  assert.equal(draws,0);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hope,hope);
  assert.equal(f.db.getCityRecord(f.guild,'roll_request',x.heldRequest.record_key).status,'pending');
  assert.equal(f.db.getCityRecord(f.guild,'roll_request',other.record_key).status,'awaiting_partner');
}));

test('fully owner-authored unrolled Tag Team is eligible for one primary Fear reservation, holding both dice without another Hope debit',()=>nativeFixture(f=>{
  const x=fixture(f),partner=request(f,1,'I inspect the visible lockers.'),independent=request(f,2,'I inspect the visible floor.'),
    tagProof=participationProof(f,x.heldRequest,x.pc,'tag');
  const invitation=contribution(f,x.heldRequest,x.pc.owner_user_id,'tag',{partner_request:partner.record_key,
    proof:tagProof.event_key,description:'I coordinate the inspection.',pay_hope:true});
  const acceptance=participationProof(f,invitation,f.pcs[1],'participate'),
    ready=contribution(f,invitation,f.pcs[1].owner_user_id,'participate',
      {proof:acceptance.event_key,description:'I coordinate the inspection.'});
  assert.equal(inspectUnrolledInterruptRequest(f.db,f.guild,ready),true);
  const before=f.pcs.slice(0,2).map(pc=>f.db.getCharacter(pc.id).data.resources.hope);
  reserve(f,x);
  let draws=0;const rng=()=>{draws++;return 7;};
  const current=f.db.getCityRecord(f.guild,'roll_request',ready.record_key);
  for(const pc of f.pcs.slice(0,2))assert.throws(()=>contribution(f,current,pc.owner_user_id,'roll',{},rng),/interrupt|Fear|pre.roll/i);
  assert.equal(draws,0);assert.deepEqual(f.pcs.slice(0,2).map(pc=>f.db.getCharacter(pc.id).data.resources.hope),before);
  assert.equal(f.db.getCampaign(f.guild).fear,2);assert.equal(contribution(f,independent,f.pcs[2].owner_user_id,'roll').status,'resolved');
  f.restart();assert.equal(inspectPreRollFear(f.db,f.guild,`pre-roll-fear:${ready.record_key}`,{current:false}).row.status,'awaiting_announcement');
}));

test('uncertain Fear delivery preserves its hold while independent native request notices deliver once across restart',()=>nativeFixture(async f=>{
  const x=fixture(f),independent=request(f,2,'I inspect the visible floor.'),decisions=reserve(f,x),mutation={unifiedArbitration:decisions,nativeAdjudications:[{roll_request_ref:independent.record_key}]};
  let fearSends=0,otherSends=0;
  const send=async(user,text,session,char,{publication})=>{
    assert(publication);assert.equal(session,f.session.id);
    if(user===x.pc.owner_user_id){fearSends++;throw new Error('synthetic uncertain Fear send');}
    assert.equal(user,f.pcs[2].owner_user_id);assert.equal(char,f.pcs[2].id);otherSends++;
    return {ok:true,messageId:'independent-roll-notice',channelId:'independent-dm'};
  };
  await assert.rejects(publishRollRequests(f.db,f.guild,mutation,send),/uncertain|reviewed recovery/);
  assert.equal(fearSends,1);assert.equal(otherSends,1,'unrelated notice must survive an uncertain intervention announcement');
  f.restart();await assert.rejects(publishRollRequests(f.db,f.guild,mutation,send),/uncertain|acknowledg|delivery/i);
  assert.equal(fearSends,1,'unknown delivery cannot be blindly resent');assert.equal(otherSends,1,'confirmed independent delivery cannot repeat');
  assert.throws(()=>contribution(f,f.db.getCityRecord(f.guild,'roll_request',x.heldRequest.record_key),x.pc.owner_user_id,'roll'),/interrupt|Fear/i);
  assert.equal(contribution(f,f.db.getCityRecord(f.guild,'roll_request',independent.record_key),f.pcs[2].owner_user_id,'roll').status,'resolved');
  assert.equal(f.db.getCampaign(f.guild).fear,2);
}));
