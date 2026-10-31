import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createGroupFeatureExecutionRules} from '../../src/frameworks/daggerheart/group-feature-execution-rules.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

function fixture(){
  const template={name:'Ritual Enforcement Team',features:['source rule']},pc={id:'pc',owner_user_id:'owner',data:{resources:{hope:2}}},
    actor={source_event:'actor-source',location_key:'room',data:{state:'actually_present'}},presence={source_event:'pc-source',data:{state:'actually_present'}},
    combatant={id:'caster-id',base_name:template.name,status:'active',hp_current:3,stress_current:0,stress_max:2},
    entry={actor:{type:'npc',key:'caster'},operation:'feature',target_refs:['area']},
    proposal={disposition:'native_feature_resolution',stakes_kind:'native_feature',trait:'Agility',difficulty:14,rule_basis_refs:['srd:reaction-rolls']},
    feature={feature_key:'adversary:ritual-enforcement-team:null-foam',template_hash:hash(template),costs:[{resource:'npc_stress',amount:1}]},
    origin={binding:{session:'session',scene:'scene',location:'room'},scope:{mode:'party'}},
    area={area_hash:'area-source-hash',targets:[{kind:'character',key:'pc',owner:'owner',presence_hash:hash(presence)},
      {kind:'npc',key:'caster',presence_hash:hash(actor),control_hash:'gm-control'}]};
  let costCalls=0,native=null,principal={kind:'owner',revision:'principal'},sourceStatus='active';
  const db={getCurrentEncounter:()=>({id:'encounter',status:'active'}),
    getCityRecord:(_g,kind)=>kind==='encounter_binding'?{source_event:'binding-source',data:{combatants:[{actor:'caster',id:combatant.id}]}}:null,
    listCombatants:()=>[combatant],getWorldEvent:()=>({status:sourceStatus}),getCampaign:()=>({fear:2}),transaction:fn=>fn()};
  const names=['narrativeSourceVisible','compileNativeFeatures','inspectNativeGmDecision','inspectCommittedGmDecision','nativeReactionTarget','commitGmActionCost',
    'currentScene','scenePresence','sceneAccess','activeCityProxy','conversationPrincipal','personalCharacter','indexWorldEvent','typedRollProof','EncounterLibrary',
    'reserveGmArbitrationNotice','applyNativeStressPassive','inspectNativeConditionClearAncestry'];
  const caps=Object.fromEntries(names.map(n=>[n,()=>{throw Error(`unexpected ${n}`);} ]));
  Object.assign(caps,{currentScene:()=>({session_id:'session'}),scenePresence:(_d,_g,kind)=>kind==='npc'?actor:presence,activeCityProxy:()=>false,
    personalCharacter:()=>pc,conversationPrincipal:()=>principal,compileNativeFeatures:()=>[feature],
    inspectNativeGmDecision:()=>({row:{data:{native}},entry}),commitGmActionCost:()=>{costCalls++;},
    planNativeAreaCohort:(_d,_g,o,key,ref)=>{assert.equal(o,origin);assert.equal(key,'caster');assert.equal(ref,'area');return area;},
    RANGE_BANDS:['Melee','Very Close','Close','Far','Very Far']});
  const rules=createGroupFeatureExecutionRules({capabilities:caps}),library={findAdversary:()=>template};
  const plan=()=>native=rules.planGroupFeature(db,'guild',origin,entry,proposal,feature,{library});
  return {rules,plan,db,entry,area,combatant,feature,library,costCalls:()=>costCalls,setPrincipal:v=>principal=v,retract:()=>sourceStatus='retracted'};
}

test('existing group host plans one exact area, preserves owner reaction and includes the caster NPC',()=>{
  const f=fixture(),plan=f.plan();assert.equal(plan.targets.length,1);assert.equal(plan.targets[0].owner,'owner');
  assert.equal(plan.npc_targets.length,1);assert.equal(plan.npc_targets[0].key,'caster');assert.equal(plan.npc_targets[0].template_hash,f.feature.template_hash);
  assert.equal(plan.cost.npc_stress,1);assert.equal(f.costCalls(),0);
  assert.throws(()=>f.rules.prepareGroupFeature(f.db,'guild','decision',{library:f.library}),/area_execution_not_qualified/);
  assert.equal(f.costCalls(),0);
});

test('area source/owner/NPC bindings and stress capacity remain required',()=>{
  const f=fixture();f.entry.target_refs=['area','extra'];assert.throws(f.plan);f.entry.target_refs=['area'];
  f.setPrincipal({kind:'proxy',revision:'bad'});assert.throws(f.plan);f.setPrincipal({kind:'owner',revision:'principal'});
  f.area.targets.push({kind:'npc',key:'unbound'});assert.throws(f.plan);f.area.targets.pop();
  f.combatant.stress_current=2;assert.throws(f.plan);f.combatant.stress_current=0;
  f.retract();assert.throws(f.plan);
});

test('area cost skips an absent native Stress track while retaining the source descriptor',()=>{
  const f=fixture();f.combatant.stress_max=0;const plan=f.plan();assert.equal(plan.cost.npc_stress,0);
  assert.deepEqual(plan.feature_definition.costs,[{resource:'npc_stress',amount:1}]);
});
