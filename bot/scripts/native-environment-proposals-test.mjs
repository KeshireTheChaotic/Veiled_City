/** W6 combined-request producer fixtures. Authored, not executed during construction. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup} from './narrative-fixtures.mjs';
import {createArbitrationOrigin,bindArbitrationTurn,arbitrationPromptBoard} from '../src/scene-intent-board.js';
import {applyUnifiedArbitration} from '../src/gm-unified-arbitration.js';
import {applyNativeEnvironmentProfileProposals} from '../src/native-environment-proposals.js';
import {compileNativeActors,executableNativeFeatures} from '../src/native-feature-catalog.js';
import {matchesArbitrationSchema,unifiedArbitrationSchema} from '../src/gm-arbitration-contract.js';
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
function fixture(f){
  const x=setup(f,{messageId:'environment-combined-profile',text:'What is happening around this place?'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,authoring:true}});
  return {...x,origin:createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef)};
}
test('legacy combined arbitration shapes remain valid beside the bounded environment profile shape',()=>{
  const base={npc_intents:[],decisions:[]};
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{version:1,...base}),true);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{version:2,...base,pre_roll_fear:[]}),true);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{version:3,...base,pre_roll_fear:[],environment_profiles:[]}),true);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{version:4,...base,pre_roll_fear:[],environment_profiles:[],environment_actions:[]}),true);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{version:3,...base,pre_roll_fear:[],environment_profiles:[
    {version:1,environment:'environment:occult-crime-scene',location:'terminal',gm:true}]}),false);
});
test('unqualified environment actions through the combined adapter stay GM-private without fabricating an NPC or spending Fear',()=>nativeFixture(f=>{
  const x=fixture(f),proposal={version:1,feature_ref:'environment:occult-crime-scene:sirens-outside',environment:'unverified',category:'authority',
    npc:{kind:'npc',key:'new-responder',name:'Responding Officer',aliases:[],location_key:'terminal',parent_location_key:'',role:'authority',summary:'A responding officer arrives.'}},
    result=bindArbitrationTurn({unified_arbitration:{version:4,npc_intents:[],decisions:[],pre_roll_fear:[],environment_profiles:[],environment_actions:[proposal]}},x.origin),
    before=f.db.getCampaign(f.guild).fear,pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id));
  assert.deepEqual(applyUnifiedArbitration(f.db,f.guild,result,[],{content:{read:()=>null}}),[]);
  const held=f.db.listCityRecords(f.guild,{kind:'native_environment_action_review',includeGM:true});
  assert.equal(held.length,1);assert.equal(held[0].visibility,'gm');assert.equal(held[0].status,'needs_review');
  assert.equal(held[0].data.execution_authorized,false);assert.equal(f.db.getNpcProfile(f.guild,'new-responder'),null);
  assert.equal(f.db.getCampaign(f.guild).fear,before);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
  assert.equal(f.db.getCurrentEncounter(f.session.id),null);
}));
test('only supported environment templates are offered to the combined planner',()=>nativeFixture(f=>{
  const x=fixture(f),before=changes(f),packet=arbitrationPromptBoard(f.db,f.guild,x.origin),supported=executableNativeFeatures('environment'),
    templates=compileNativeActors().filter(a=>a.actor_kind==='environment'&&supported.some(s=>s.template_hash===a.template_hash));
  assert.deepEqual(packet.environment_candidates.map(c=>c.environment),templates.map(t=>t.actor_key));assert.equal(changes(f),before);
}));
test('unsupported environment proposals through the real combined adapter hold privately without resources or encounter effects',()=>nativeFixture(f=>{
  const x=fixture(f),supported=executableNativeFeatures('environment'),unsupported=compileNativeActors()
    .filter(a=>a.actor_kind==='environment'&&!supported.some(s=>s.template_hash===a.template_hash)),
    profile={version:1,environment:unsupported[0]?.actor_key||'environment:unregistered-profile',location:'terminal'},
    result=bindArbitrationTurn({unified_arbitration:{version:3,npc_intents:[],decisions:[],pre_roll_fear:[],environment_profiles:[profile]}},x.origin),
    pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),fear=f.db.getCampaign(f.guild).fear;
  assert.deepEqual(applyUnifiedArbitration(f.db,f.guild,result,[]),[]);
  const held=f.db.listCityRecords(f.guild,{kind:'native_environment_profile_review',includeGM:true});
  assert.equal(held.length,1);assert.equal(held[0].status,'needs_review');assert.equal(held[0].visibility,'gm');
  assert.equal(held[0].data.execution_authorized,false);assert.deepEqual(held[0].data.proposal,profile);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'native_environment_instance',includeGM:true}).length,0);
  assert.equal(f.db.getCurrentEncounter(f.session.id),null);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
  assert.equal(f.db.getCampaign(f.guild).fear,fear);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls WHERE guild_id=?').get(f.guild).n,0);
  const before=changes(f);assert.deepEqual(applyUnifiedArbitration(f.db,f.guild,result,[]),[]);assert.equal(changes(f),before);
  f.restart();const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),restarted=changes(f);
  assert.deepEqual(applyNativeEnvironmentProfileProposals(f.db,f.guild,origin,[profile]),held);assert.equal(changes(f),restarted);
}));
test('serialized environment origin and extra role fields cannot create a profile or a false native review',()=>nativeFixture(f=>{
  const x=fixture(f),before=changes(f),profile={version:1,environment:'environment:occult-crime-scene',location:'terminal'};
  assert.throws(()=>applyNativeEnvironmentProfileProposals(f.db,f.guild,{gm:true,scope:x.scope},[profile]));
  assert.throws(()=>applyNativeEnvironmentProfileProposals(f.db,f.guild,x.origin,[{...profile,gm:true}]));
  assert.equal(changes(f),before);
}));
