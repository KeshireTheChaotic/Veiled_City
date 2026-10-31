import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createGmCapabilityRules} from '../../src/frameworks/daggerheart/gm-capability-rules.js';
import {nativeStore} from './af03-store.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const definitions=JSON.parse(fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-feature-definitions.json',import.meta.url),'utf8')).features;
function fixture(){
  const store=nativeStore(),{db,indexWorldEvent}=store,g='g',noop=()=>null,
    feature=definitions.find(f=>f.feature_key.endsWith(':flashbang')),
    origin={source:'input',scene:'scene',session:'session',location:'here'},
    presence={source_event:'presence',location_key:'here',data:{state:'actually_present',zone:'door'}},
    entity={state:{location_key:'here'}},profile={key:'npc'};
  db.sql.exec('CREATE TABLE npc(id TEXT PRIMARY KEY,stress INTEGER,max INTEGER);INSERT INTO npc VALUES(\'c\',0,5)');
  const combatant=()=>{const r=db.sql.prepare('SELECT * FROM npc').get();return {id:r.id,stress_current:r.stress,stress_max:r.max};};
  db.getSimulationEntity=()=>entity;db.getNpcProfile=()=>profile;db.listNpcProxies=()=>[];
  db.listNpcGoals=()=>[];db.getCurrentEncounter=()=>({id:'enc'});db.listCombatants=()=>[combatant()];
  db.updateCombatant=(id,patch)=>{db.sql.prepare('UPDATE npc SET stress=? WHERE id=?').run(patch.stress_current,id);return combatant();};
  const opportunity={source:'owner-source',intent:'look',key:`gm-opportunity:${hash(['input','scene'])}`},
    material={intent_ref:'npc-intent',actor:{type:'npc',key:'npc'},snapshot:hash([entity,profile,presence,[]]),knowledge_refs:[],objective_ref:'',dependencies:[]},
    npcSource=indexWorldEvent(db,g,{key:'npc-intent-source',kind:'native_npc_scene_intent',source_id:'native:unified-gm',details:{entry_hash:hash(material),input_source:'input'}}),
    entry={...material,source_ref:npcSource.event_key,source_hash:hash(npcSource.details)},
    boardData={origin,entries:[{intent_ref:'look',actor:{type:'character',key:'pc'},operation:'describe_scene'},entry]},
    boardSource=indexWorldEvent(db,g,{key:'board-source',kind:'native_scene_intent_board',source_id:'native:unified-gm',details:{payload_hash:hash(boardData)}});
  db.saveCityRecord(g,{kind:'scene_intent_board',key:'board',source_event:boardSource.event_key,data:boardData});
  db.saveCityRecord(g,{kind:'typed_intent',key:'look',status:'resolved',source_event:'owner-source',data:{type:'other',framing:'immediate',resolution:'conversational'}});
  const native={operation:'commit_group_feature',opportunity,feature:feature.feature_key,feature_hash:hash(feature),combatant:'c',combatant_hash:hash(combatant())},
    data={board:'board',entry:entry.intent_ref,entry_hash:hash(entry),origin,scope:{mode:'party'},proposal:{},proposal_hash:hash({}),native},
    source=indexWorldEvent(db,g,{key:'decision-source',kind:'native_gm_arbitration',source_id:'native:unified-gm',details:{payload_hash:hash(data)}});
  db.saveCityRecord(g,{kind:'gm_arbitration_decision',key:'decision',status:'pending_pc_reaction',visibility:'gm',source_event:source.event_key,data});
  const control={failSpotlight:false,failStress:false};
  const update=db.updateCombatant;db.updateCombatant=(...args)=>{if(control.failStress)throw new Error('stress write failed');return update(...args);};
  const rules=createGmCapabilityRules({capabilities:{buildNarrativeContext:()=>({binding:origin,packet:{npcs:[{key:'npc',human_controlled:false}]}}),
    activeCityProxy:()=>false,consentAction:noop,historicalActionSource:noop,scenePresence:()=>presence,sceneAccess:()=>true,
    conversationPrincipal:noop,actorReferenceVisible:()=>true,typedRollProof:noop,isPvpIntent:()=>false,narrativeSourceVisible:()=>true,
    compileNativeFeatures:()=>definitions,inspectGroupFeatureChild:noop,nativeActorControl:()=>({owner_control_type:'ai_world'}),
    preRollFearOpportunity:noop,commitPreRollFearCost:()=>{throw new Error('unexpected Fear interrupt');},RANGE_BANDS:['Melee','Very Close','Close'],
    planNativeSpotlight:(db,g,actor,scene,cost)=>({actor,scene,index:1,cost}),recordNativeSpotlight:(db,g,receipt)=>{
      indexWorldEvent(db,g,{key:'spotlight',kind:'native_gm_spotlight',details:{cost:receipt.record_key}});
      if(control.failSpotlight)throw new Error('spotlight write failed');
    }}});
  return {...store,rules,control,combatant};
}

test('native group feature cost, immutable receipt and spotlight roll back together; replay never marks Stress twice',()=>{
  const f=fixture();try{
    f.control.failSpotlight=true;
    assert.throws(()=>f.rules.commitGmActionCost(f.db,'g','decision'),/spotlight write failed/);
    assert.equal(f.combatant().stress_current,0);assert.equal(f.db.getCampaign('g').fear,6);
    assert.equal(f.db.listCityRecords('g',{kind:'gm_action_cost_receipt'}).length,0);assert.equal(f.db.getWorldEvent('g','spotlight'),null);
    f.control.failSpotlight=false;const receipt=f.rules.commitGmActionCost(f.db,'g','decision');
    assert.equal(receipt.status,'committed');assert.equal(receipt.data.npc_stress.after,1);
    assert.equal(f.combatant().stress_current,1);
    assert.deepEqual(f.rules.commitGmActionCost(f.db,'g','decision'),receipt);assert.equal(f.combatant().stress_current,1);
  }finally{f.close();}
});

test('native group feature Stress write failure leaves no cost receipt or spotlight',()=>{
  const f=fixture();try{
    f.control.failStress=true;assert.throws(()=>f.rules.commitGmActionCost(f.db,'g','decision'),/stress write failed/);
    assert.equal(f.combatant().stress_current,0);assert.equal(f.db.getCampaign('g').fear,6);
    assert.equal(f.db.listCityRecords('g',{kind:'gm_action_cost_receipt'}).length,0);
  }finally{f.close();}
});
