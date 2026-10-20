/** W6 construction: existing native actors and supported-only discovery. Written, not run. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup as narrativeSetup} from './narrative-fixtures.mjs';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {createArbitrationOrigin,arbitrationPromptBoard,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../src/gm-unified-arbitration.js';
import {compileNativeFeatures,executableNativeFeatures} from '../src/native-feature-catalog.js';
import {nativeAdversaryFeatureContext,inspectNativeAdversaryFeatureContext,requireNativeAdversaryFeature} from '../src/native-adversary-context.js';
import {featureWindowChoices,authorizeFeatureChoice} from '../src/native-feature-windows.js';
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
function fixture(f){
  const x=narrativeSetup(f,{text:'I look toward the contractor.',messageId:'adversary-capabilities'}),scene=currentScene(f.db,f.guild),library=new EncounterLibrary('../content');
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,narrative_encounters:true}});
  f.db.upsertNpcProfile(f.guild,{npcKey:'contractor',displayName:'Contractor'});
  f.db.setSimulationEntity(f.guild,'npc','contractor',{location_key:'terminal'});
  const source=indexWorldEvent(f.db,f.guild,{key:'adversary-native-presence',kind:'observation',title:'Actual Contractor presence',
    source_id:'fixture-gm',location_key:'terminal',session_id:scene.session_id,scene:scene.key,visibility:'party'},'fixture-gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'contractor',source_event:source.event_key,
    location_key:'terminal',zone:'interior',visibility:'party'},'fixture-gm');
  const encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,base_bp:14,budget_bp:14,
    composition:[{name:'Aster Vale Contractor',quantity:1}]}),combatant=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library))[0];
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,
    data:{combatants:[{actor:'contractor',id:combatant.id}]}});
  return {...x,scene,source,library,encounter,combatant,origin:createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef)};
}

test('bound adversary context exposes only qualified features without creating actors, costs or effects',()=>nativeFixture(f=>{
  const x=fixture(f),before=changes(f),context=nativeAdversaryFeatureContext(f.db,f.guild,x.origin,'contractor',{library:x.library}),
    expected=executableNativeFeatures('adversary').filter(feature=>feature.actor_name==='Aster Vale Contractor');
  assert.equal(context.execution_authorized,false);assert.equal(context.publication_authorized,false);
  assert.equal(context.combatant,x.combatant.id);assert.deepEqual(context.features.map(f=>f.key),expected.map(f=>f.feature_key));
  assert.deepEqual(inspectNativeAdversaryFeatureContext(f.db,f.guild,x.origin,context),context);
  const packet=arbitrationPromptBoard(f.db,f.guild,x.origin),actor=packet.npc_candidates.find(n=>n.actor_key==='contractor');
  assert.deepEqual(actor.adversary_context,context);
  assert.ok(actor.action_features.every(feature=>expected.some(e=>e.feature_key===feature.feature_ref)));
  assert.ok(requireNativeAdversaryFeature(f.db,f.guild,x.origin,'contractor','adversary:aster-vale-contractor:flashbang').feature);
  assert.equal(changes(f),before);
  f.restart();const restarted=changes(f),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef);
  assert.deepEqual(inspectNativeAdversaryFeatureContext(f.db,f.guild,origin,context),context);assert.equal(changes(f),restarted);
}));

test('all currently unsupported adversary occurrences remain unavailable, including forged supported descriptors',()=>nativeFixture(f=>{
  const x=fixture(f),before=changes(f),review=compileNativeFeatures().filter(f=>f.actor_kind==='adversary'&&f.status!=='supported');
  for(const feature of review){
    assert.throws(()=>requireNativeAdversaryFeature(f.db,f.guild,x.origin,'contractor',feature.feature_key),/no_qualified_native_handler/);
    assert.throws(()=>authorizeFeatureChoice(f.db,f.guild,{}, {}, {},{...feature,status:'supported',native_handler:'feedback'}),/qualified_native_descriptor/);
  }
  assert.throws(()=>requireNativeAdversaryFeature(f.db,f.guild,x.origin,'contractor',{status:'supported',native_handler:'feedback'}),/no_qualified_native_handler/);
  assert.equal(changes(f),before);
}));

test('unsupported real board proposal is held without a native cost, roll, NPC or PC effect',()=>nativeFixture(f=>{
  const x=fixture(f),feature=compileNativeFeatures().find(f=>f.actor_name==='Aster Vale Contractor'&&f.status==='review_only')
    ||{feature_key:'adversary:aster-vale-contractor:unregistered-test-feature'};
  const board=buildSceneIntentBoard(f.db,f.guild,x.origin,[],[{actor_key:'contractor',operation:'feature',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]}]),
    entry=board.data.entries[0],pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),combatants=f.db.listCombatants(x.encounter.id),fear=f.db.getCampaign(f.guild).fear,
    proposals=[{intent_ref:entry.intent_ref,disposition:'native_feature_resolution',rule_basis_refs:['srd:reaction-rolls'],difficulty:12,trait:'Instinct',
      stakes_kind:'native_feature',stakes:'Untrusted attempt to invoke an unsupported feature.',reason:'Proposed feature only.',difficulty_reason:'Not effect authority.',
      feature_ref:feature.feature_key,experience_ref:'',advantage:false,disadvantage:false}],
    [decision]=adjudicateSceneBoard(f.db,f.guild,x.origin,board,proposals,{library:x.library});
  assert.equal(decision.status,'needs_rules_review');assert.equal(decision.data.native,null);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);assert.deepEqual(f.db.listCombatants(x.encounter.id),combatants);
  assert.equal(f.db.getCampaign(f.guild).fear,fear);assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,0);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls WHERE guild_id=?').get(f.guild).n,0);
}));

test('old unsupported trigger records are not advertised or rewritten as executable choices',()=>nativeFixture(f=>{
  const x=fixture(f),key='old-unsupported-window';
  f.db.saveCityRecord(f.guild,{kind:'native_feature_window',key,status:'pending',visibility:'gm',source_event:x.source.event_key,
    data:{feature:'adversary:aster-vale-catastrophe-analyst:bad-branch',phase:'on_pc_action',receipt:'historical',
      audience:{visibility:'party'},actor:'contractor'}});
  const prior=f.db.getCityRecord(f.guild,'native_feature_window',key),before=changes(f);
  assert.deepEqual(featureWindowChoices(f.db,f.guild,x.scope),[]);
  assert.deepEqual(f.db.getCityRecord(f.guild,'native_feature_window',key),prior);assert.equal(changes(f),before);
}));

for(const change of ['player-control','source-retraction','defeated','template','other-actor'])
test(`adversary capability revalidation rejects ${change} without rewriting native history`,()=>nativeFixture(f=>{
  const x=fixture(f),proof=nativeAdversaryFeatureContext(f.db,f.guild,x.origin,'contractor');
  if(change==='player-control')f.db.setSimulationEntity(f.guild,'npc','contractor',{location_key:'terminal',player_controlled:true});
  if(change==='source-retraction')indexWorldEvent(f.db,f.guild,{key:x.source.event_key,status:'retracted'},'fixture');
  if(change==='defeated')f.db.updateCombatant(x.combatant.id,{hp_current:0,status:'defeated'});
  if(change==='template')f.db.db.prepare('UPDATE encounter_combatants SET base_name=? WHERE id=?').run('Fabricated Adversary',x.combatant.id);
  const input=change==='other-actor'?{...proof,actor:x.pc.id}:proof,before=changes(f);
  assert.throws(()=>inspectNativeAdversaryFeatureContext(f.db,f.guild,x.origin,input));assert.equal(changes(f),before);
}));
