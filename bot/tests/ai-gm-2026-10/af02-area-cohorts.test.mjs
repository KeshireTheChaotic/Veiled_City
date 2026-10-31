import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroupTargetRules,assertExactGroupCohort} from '../../src/frameworks/daggerheart/group-target-rules.js';
import {nativeStore} from './af03-store.mjs';
function fixture(){
  const f=nativeStore(),{db,indexWorldEvent}=f,rows=new Map(),scope={mode:'party'},origin={binding:{scene:'scene',session:'s',location:'here'},scope},
    controls=new Map(),pcs=new Map(),hidden=new Set();
  const add=(type,key,{zone='doorway',range='Close',state='actually_present'}={})=>{
    const source=indexWorldEvent(db,'g',{key:`source:${key}`,kind:'native_scene_placement',source_id:'native:test',scene:'scene',session_id:'s',location_key:'here'}),
      row=db.saveCityRecord('g',{kind:'scene_presence',key:`presence:${key}`,status:'active',source_event:source.event_key,location_key:'here',
        data:{entity_type:type,entity_key:key,scene:'scene',session_id:'s',zone,range,state}});
    rows.set(key,row);controls.set(key,{owner_control_type:'ai_world',revision:'r1'});
    if(type==='character')pcs.set(key,{id:key,guild_id:'g',owner_user_id:`owner:${key}`});
    return row;
  };
  db.getCharacter=key=>pcs.get(key);db.roster=()=>[...pcs].map(([character_id])=>({character_id,presence:'present'}));
  add('npc','caster');add('hazard','area');add('character','pc');add('npc','ally');add('npc','enemy');
  add('npc','outside',{zone:'street'});add('character','departed',{state:'departed'});
  const rules=createGroupTargetRules({currentScene:()=>({key:'scene',session_id:'s'}),scenePresence:(db,g,type,key)=>rows.get(key),
    nativeActorControl:(db,g,type,key)=>controls.get(key),narrativeSourceVisible:(db,g,key)=>!hidden.has(key),
    rangeBands:['Melee','Very Close','Close','Far','Very Far']});
  return {...f,add,rows,pcs,hidden,controls,rules,origin,plan:()=>rules.planNativeAreaCohort(db,'g',origin,'caster','presence:area')};
}
test('area plans include every current PC and NPC, including caster and allies, without effects or disclosure grants',()=>{
  const f=fixture();try{
    const plan=f.plan();assert.deepEqual(plan.targets.map(t=>`${t.kind}:${t.key}`),['character:pc','npc:ally','npc:caster','npc:enemy']);
    assert.equal(plan.targets[0].owner,'owner:pc');assert.equal(plan.range,'Melee');
    assert.equal(plan.execution_authorized,false);assert.equal(plan.publication_authorized,false);assert.ok(Object.isFrozen(plan.targets));
    assert.equal(f.db.listCityRecords('g',{kind:'gm_action_cost_receipt'}).length,0);
    for(let i=0;i<105;i++)f.add('npc',`extra-${i}`);
    assert.equal(f.plan().targets.length,109); // Exact cohort beyond the first storage page.
  }finally{f.close();}
});
test('private, uncertain or player-controlled NPC occupants hold the entire area plan rather than silently disappear',()=>{
  const f=fixture();try{
    f.hidden.add('source:pc');assert.throws(f.plan,/group_area_current_audience_source/);f.hidden.clear();
    f.add('npc','uncertain',{state:'uncertain'});assert.throws(f.plan,/group_area_unresolved_actor_presence/);
    f.add('npc','uncertain',{state:'departed'});f.controls.set('ally',{owner_control_type:'player'});
    assert.throws(f.plan,/group_area_npc_controller_not_native/);
  }finally{f.close();}
});
test('a native local footprint and current Close range are required; generic whole-scene targeting is never inferred',()=>{
  const f=fixture();try{
    f.add('hazard','area',{zone:'scene'});assert.throws(f.plan,/group_area_current_native_area/);
    f.add('hazard','area',{zone:'courtyard',range:'Far'});assert.throws(f.plan,/group_area_native_close_range/);
    f.add('hazard','area',{zone:'courtyard',range:'Close'});assert.equal(f.plan().range,'Close');
    f.hidden.add('source:area');assert.throws(f.plan,/group_area_current_audience_source/);
  }finally{f.close();}
});
test('existing group selection keeps exact-all and exactly-one rules, rejecting duplicates and omitted targets',()=>{
  assert.doesNotThrow(()=>assertExactGroupCohort(['b','a'],['a','b'],{all:true}));
  assert.doesNotThrow(()=>assertExactGroupCohort(['a'],['a','b']));
  for(const [selected,eligible,options] of [[['a'],['a','b'],{all:true}],[['a','a'],['a'],{all:true}],[[],['a'],{}],[['a','b'],['a','b'],{}],[['a'],['a','a'],{}]])
    assert.throws(()=>assertExactGroupCohort(selected,eligible,options),/group_feature_exact_target_cohort/);
});
