/** W6 construction fixtures: real Flashbang consequence and ordinary owner recovery; authored, NOT RUN. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup as narrativeSetup,candidate} from './narrative-fixtures.mjs';
import {actionFixture} from './v96-action-fixture.mjs';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../src/gm-unified-arbitration.js';
import {executeUnifiedGmActions,inspectGmReactionInvitation,submitGmReactionInvitation} from '../src/gm-native-rolls.js';
import {validateNativeCondition,validateGroupReactionEffect,nativeIncomingConditions,validateIncomingConditions} from '../src/native-group-features.js';
import {inspectNativeConditionClearAncestry,clearNativeConditionFromOutcome} from '../src/native-condition-recovery.js';
import {windowOperation} from '../src/window-coordinator.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision} from '../src/roll-requests.js';
import {dualityRoll} from '../src/dice.js';
import {applyOrdinaryEffects} from '../src/ordinary-effects.js';
import {verifyOrdinaryEffect} from '../src/ordinary-effect-proof.js';
const FLASH='adversary:aster-vale-contractor:flashbang';
const list=(f,kind)=>f.db.listCityRecords(f.guild,{kind,includeGM:true,limit:100});
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
const rollCount=f=>f.db.db.prepare('SELECT COUNT(*) n FROM rolls WHERE guild_id=?').get(f.guild).n;

function flashbang(f){
  const x=narrativeSetup(f,{text:'I watch the contractor.',messageId:'native-condition-flashbang'}),scene=currentScene(f.db,f.guild),
    library=new EncounterLibrary('../content');
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true,narrative_encounters:true}});
  f.db.upsertNpcProfile(f.guild,{npcKey:'contractor',displayName:'Contractor'});
  f.db.setSimulationEntity(f.guild,'npc','contractor',{location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:'condition-contractor-source',kind:'observation',title:'Actual native Contractor presence',
    source_id:'fixture-gm',session_id:scene.session_id,scene:scene.key,location_key:'terminal',visibility:'party'},'fixture-gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'contractor',source_event:source.event_key,location_key:'terminal',
    zone:'interior',range:'Close',visibility:'party'},'fixture-native');
  const encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,base_bp:14,budget_bp:14,
    composition:[{name:'Aster Vale Contractor',quantity:1}]}),combatant=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library))[0];
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,data:{combatants:[{actor:'contractor',id:combatant.id}]}});
  f.db.changeFear(f.guild,2-f.db.getCampaign(f.guild).fear);
  const accepted=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
    board=buildSceneIntentBoard(f.db,f.guild,origin,accepted,[{actor_key:'contractor',operation:'feature',target_refs:[x.pc.id],
      objective_ref:'',source_refs:[],dependencies:[]}]),entry=board.data.entries.find(e=>e.actor.type==='npc'),
    [decision]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{intent_ref:entry.intent_ref,disposition:'native_feature_resolution',
      rule_basis_refs:['srd:reaction-rolls'],difficulty:12,trait:'Instinct',stakes_kind:'native_feature',stakes:'Exact native Flashbang reaction.',
      reason:'Native Contractor Flashbang action.',difficulty_reason:'Printed Instinct 12.',feature_ref:FLASH,experience_ref:'',advantage:false,disadvantage:false}],{library});
  assert.equal(decision.status,'gm_action_ready');
  const [group]=executeUnifiedGmActions(f.db,f.guild,[decision],{library,rng:()=>assert.fail('Invitation cannot roll')});
  const child=f.db.getCityRecord(f.guild,'gm_arbitration_decision',group.data.children[0].decision),
    terms=inspectGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,child.record_key).terms,
    input={op:'gm-reaction-roll',request:child.record_key,revision:terms.revision};let draws=0;
  submitGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,input,{interactionId:'owner-native-flashbang-reaction',
    authoredText:JSON.stringify(input),rng:()=>[2,1][draws++]});
  assert.equal(draws,2);
  const condition=list(f,'pc_native_condition').find(c=>c.subject_key===x.pc.id&&c.data.feature===FLASH),
    effect=f.db.getCityRecord(f.guild,'gm_group_feature_effect',condition.data.effect);
  assert.equal(condition.status,'active');assert.equal(condition.data.condition,'Vulnerable');assert.equal(condition.data.expiry,'until_cleared');
  assert.equal(effect.data.stress,1);assert.equal(effect.data.success,false);
  return {...x,condition,effect};
}
function recovery(f,x,{roll=false,run=true,target=x.condition.record_key}={}){
  const a=actionFixture(f,'I take a moment to clear my flashbang disorientation.',{privateScene:true});
  const scene=currentScene(f.db,f.guild),context=indexWorldEvent(f.db,f.guild,{key:'condition-recovery-observation',kind:'observation',
    title:'The owner has the actual native temporary Vulnerable condition',source_kind:'event',source_id:x.condition.source_event,
    visibility:'character',truth_status:'observed',subject_key:x.pc.id,session_id:scene.session_id,scene:scene.key,location_key:'terminal',
    details:{condition_ref:x.condition.record_key,source_refs:[x.condition.source_event]}},'fixture-native');
  Object.assign(a.intent,{operation:'clear_condition',target_key:target,target_name:'My sourced Vulnerable condition',resolution:roll?'roll_required':'auto'});
  Object.assign(a.ruling,{context_refs:[context.event_key],effect_class:'attempt_only',
    explanation:'The affected owner attempts ordinary recovery from their temporary sourced flashbang disorientation.',
    difficulty_reason:roll?'Current disorientation makes recovery uncertain.':'Uncontested ordinary recovery, no resource cost.'});
  if(!roll)Object.assign(a.ruling,{disposition:'narrative_no_roll',trait:null,difficulty:null,risk:'none',stakes:'none'});
  else Object.assign(a.ruling,{disposition:'standard_action_roll',trait:'Finesse',difficulty:10,risk:'The disorientation may persist.',
    stakes:'On success the native clear-condition adapter may end this exact condition; no resource recovery.'});
  if(!run)return {a};
  const mutation=a.run(),accepted=mutation.typedIntents.find(r=>r.data.operation==='clear_condition');
  return {a,accepted:f.db.getCityRecord(f.guild,'typed_intent',accepted.record_key)};
}
function clearInput(x,accepted){return {op:'clear-condition',condition:x.condition.record_key,accepted_intent:accepted.record_key,
  prerequisite:accepted.data.outcome_receipt||'no-native-outcome'};}

for(const rolled of [false,true])test(`actual Flashbang condition clears only after owner ${rolled?'successful ordinary action':'GM no-roll outcome'} without resource reset`,()=>nativeFixture(f=>{
  const x=flashbang(f),{a,accepted:initial}=recovery(f,x,{roll:rolled});let accepted=initial;
  if(rolled){
    const q=list(f,'roll_request').find(q=>q.data.input?.accepted_intent===accepted.record_key);assert.ok(q);
    contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:'owner-condition-recovery-roll'},
      {rng:(()=>{let n=0;return ()=>[11,10][n++];})()});
    accepted=f.db.getCityRecord(f.guild,'typed_intent',accepted.record_key);
  }
  const outcome=f.db.getCityRecord(f.guild,'action_outcome_receipt',accepted.data.outcome_receipt);
  assert.equal(outcome.data.outcome,rolled?'success':'resolved_no_roll');assert.equal(accepted.status,'resolved');
  assert.ok(list(f,'gm_action_ruling').some(r=>r.data.accepted_intent===accepted.record_key));
  const resources=structuredClone(f.db.getCharacter(x.pc.id).data.resources),rolls=rollCount(f),fear=f.db.getCampaign(f.guild).fear,
    input=clearInput(x,accepted),receipt=windowOperation(f.db,f.guild,x.pc.owner_user_id,input);
  assert.equal(receipt.kind,'pc_native_condition_clear');assert.equal(receipt.data.action,accepted.record_key);
  assert.equal(receipt.data.prerequisite,outcome.record_key);assert.equal(receipt.visibility,'character');
  assert.equal(rollCount(f),rolls);assert.equal(f.db.getCampaign(f.guild).fear,fear);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
  const condition=validateNativeCondition(f.db,f.guild,x.condition.record_key);assert.equal(condition.status,'cleared');
  assert.deepEqual(inspectNativeConditionClearAncestry(f.db,f.guild,condition),receipt);
  assert.equal(f.db.getCharacter(x.pc.id).data.conditions.find(c=>c.native_ref===condition.record_key).active,false);
  assert.deepEqual(validateGroupReactionEffect(f.db,f.guild,x.effect.record_key,{historical:true}),x.effect);
  const before=changes(f);assert.deepEqual(windowOperation(f.db,f.guild,x.pc.owner_user_id,input),receipt);assert.equal(changes(f),before);
  f.restart();const restarted=changes(f);
  assert.deepEqual(windowOperation(f.db,f.guild,x.pc.owner_user_id,input),receipt);assert.equal(changes(f),restarted);
  assert.deepEqual(validateGroupReactionEffect(f.db,f.guild,x.effect.record_key,{historical:true}),x.effect);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);assert.equal(list(f,'pc_native_condition_clear').length,1);
}));

test('accepted-only declaration and unrelated genuinely high native roll cannot replace its ordinary outcome receipt',()=>nativeFixture(f=>{
  const x=flashbang(f),{a}=recovery(f,x,{run:false}),accepted=persistPlayerIntents(f.db,f.guild,[a.intent],a.scope,{messageId:a.messageId})[0],
    high=dualityRoll({modifier:3},(()=>{let n=0;return ()=>[12,11][n++];})()),
    raw=f.db.addRoll(f.guild,f.session.id,x.pc.owner_user_id,x.pc.id,'action',high),resources=f.db.getCharacter(x.pc.id).data.resources,before=changes(f);
  assert.ok(high.total>20);
  for(const prerequisite of ['no-native-outcome',raw])assert.throws(()=>windowOperation(f.db,f.guild,x.pc.owner_user_id,
    {op:'clear-condition',condition:x.condition.record_key,accepted_intent:accepted.record_key,prerequisite}));
  assert.equal(changes(f),before);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
  assert.equal(validateNativeCondition(f.db,f.guild,x.condition.record_key).status,'active');assert.equal(list(f,'pc_native_condition_clear').length,0);
}));

for(const change of ['wrong-owner','gm-substitution','wrong-target','action-source','condition-source','outcome-source'])
test(`condition recovery rejects ${change} without changing resources or consuming the original consequence`,()=>nativeFixture(f=>{
  const x=flashbang(f),{accepted}=recovery(f,x,{target:change==='wrong-target'?'different-condition':x.condition.record_key}),
    input=clearInput(x,accepted),owner=change==='wrong-owner'?f.pcs[1].owner_user_id:change==='gm-substitution'?'fixture-gm':x.pc.owner_user_id;
  if(change==='action-source')indexWorldEvent(f.db,f.guild,{key:accepted.source_event,status:'retracted'},'fixture');
  if(change==='condition-source')indexWorldEvent(f.db,f.guild,{key:x.condition.source_event,status:'retracted'},'fixture');
  if(change==='outcome-source'){
    const ruling=list(f,'gm_action_ruling').find(r=>r.data.accepted_intent===accepted.record_key),source=ruling.data.context_refs[0];
    indexWorldEvent(f.db,f.guild,{key:source,status:'retracted'},'fixture');
  }
  const resources=f.db.getCharacter(x.pc.id).data.resources,before=changes(f),rolls=rollCount(f);
  assert.throws(()=>windowOperation(f.db,f.guild,owner,input,{gm:change==='gm-substitution'}));
  assert.equal(changes(f),before);assert.equal(rollCount(f),rolls);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
  assert.equal(f.db.getCityRecord(f.guild,'pc_native_condition',x.condition.record_key).status,'active');
  assert.equal(list(f,'pc_native_condition_clear').length,0);
}));

test('ordinary condition_clear follow-through uses the same native owner outcome and stays private across restart',()=>nativeFixture(f=>{
  const x=flashbang(f),{a,accepted}=recovery(f,x),proposal={version:1,accepted_intent_ref:accepted.record_key,
    effect_class:'special',adapter:'condition_clear',prerequisite_ref:accepted.data.outcome_receipt,
    payload_json:JSON.stringify({when:'no_roll',condition:{condition:x.condition.record_key}})},
    resources=f.db.getCharacter(x.pc.id).data.resources,rolls=rollCount(f),budget={operations:0,cost:0},
    [receipt]=applyOrdinaryEffects(f.db,f.guild,[proposal],a.scope,{typedIntents:[accepted],budget});
  assert.equal(receipt.status,'applied');assert.equal(receipt.visibility,'character');assert.equal(receipt.subject_key,x.pc.id);
  assert.deepEqual(budget,{operations:0,cost:0});assert.equal(rollCount(f),rolls);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
  const projection=verifyOrdinaryEffect(f.db,f.guild,receipt.record_key,a.scope);
  assert.match(projection.text,/Vulnerable condition has ended/);
  assert.equal(list(f,'pc_native_condition_clear').length,1);assert.equal(list(f,'ordinary_effect_receipt').length,1);
  assert.deepEqual(validateGroupReactionEffect(f.db,f.guild,x.effect.record_key,{historical:true}),x.effect);
  f.restart();const before=changes(f);
  assert.deepEqual(applyOrdinaryEffects(f.db,f.guild,[proposal],a.scope,{typedIntents:[accepted]})[0],receipt);
  assert.equal(verifyOrdinaryEffect(f.db,f.guild,receipt.record_key,a.scope).text,projection.text);
  assert.equal(changes(f),before);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
}));

test('a saved private condition recovery cannot be replayed in party scope or by a replacement owner',()=>nativeFixture(f=>{
  const x=flashbang(f),{a,accepted}=recovery(f,x),{op,...input}=clearInput(x,accepted),
    receipt=clearNativeConditionFromOutcome(f.db,f.guild,input,a.scope),resources=f.db.getCharacter(x.pc.id).data.resources;
  f.restart();
  const before=changes(f);
  assert.throws(()=>clearNativeConditionFromOutcome(f.db,f.guild,input,{...a.scope,mode:'party'}));
  assert.throws(()=>clearNativeConditionFromOutcome(f.db,f.guild,input,{...a.scope,actorUserId:f.pcs[1].owner_user_id}));
  assert.equal(changes(f),before);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
  assert.deepEqual(clearNativeConditionFromOutcome(f.db,f.guild,input,a.scope),receipt);assert.equal(changes(f),before);
}));

test('ended Vulnerable remains historical roll evidence but cannot authorize fresh incoming odds',()=>nativeFixture(f=>{
  const x=flashbang(f),prior=nativeIncomingConditions(f.db,f.guild,x.pc.id),{a,accepted}=recovery(f,x),
    {op,...input}=clearInput(x,accepted);
  assert.equal(prior.length,1);
  validateIncomingConditions(f.db,f.guild,x.pc.id,prior,{current:true});
  assert.throws(()=>validateIncomingConditions(f.db,f.guild,x.pc.id,[],{current:true}));
  clearNativeConditionFromOutcome(f.db,f.guild,input,a.scope);f.restart();const before=changes(f);
  validateIncomingConditions(f.db,f.guild,x.pc.id,prior);
  assert.throws(()=>validateIncomingConditions(f.db,f.guild,x.pc.id,prior,{current:true}));
  validateIncomingConditions(f.db,f.guild,x.pc.id,[],{current:true});
  assert.equal(changes(f),before);
}));

for(const changed of ['clear-source','native-mutation-actor','action-source'])
test(`saved condition cleanup rejects changed ${changed} without reversing its committed cleanup`,()=>nativeFixture(f=>{
  const x=flashbang(f),{a,accepted}=recovery(f,x),{op,...input}=clearInput(x,accepted),
    receipt=clearNativeConditionFromOutcome(f.db,f.guild,input,a.scope),resources=f.db.getCharacter(x.pc.id).data.resources;
  if(changed==='clear-source')indexWorldEvent(f.db,f.guild,{key:receipt.source_event,status:'retracted'},'fixture');
  if(changed==='action-source')indexWorldEvent(f.db,f.guild,{key:accepted.source_event,status:'retracted'},'fixture');
  if(changed==='native-mutation-actor')f.db.db.prepare('UPDATE mutation_ledger SET actor_id=? WHERE id=?')
    .run('model-claimed-gm',receipt.data.mutation);
  f.restart();const before=changes(f);
  assert.throws(()=>clearNativeConditionFromOutcome(f.db,f.guild,input,a.scope));
  assert.equal(changes(f),before);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
  assert.equal(f.db.getCityRecord(f.guild,'pc_native_condition',x.condition.record_key).status,'cleared');
  assert.equal(f.db.getCharacter(x.pc.id).data.conditions.find(c=>c.native_ref===x.condition.record_key).active,false);
  assert.equal(list(f,'pc_native_condition_clear').length,1);
}));
