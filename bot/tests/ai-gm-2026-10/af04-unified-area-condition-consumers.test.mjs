import test from 'node:test';
import assert from 'node:assert/strict';
import {createUnifiedAdjudication} from '../../src/frameworks/daggerheart/unified-adjudication.js';

function fixture({restrained=false}={}){
  const records=new Map(),captured=[],origin={binding:{source:'input',session:'session',scene:'scene',location:'room'},scope:{mode:'party'}};
  const db={transaction:fn=>fn(),getCityRecord:(_g,k,key)=>k==='scene_presence'&&key==='area'?{data:{entity_type:'hazard'}}:records.get(`${k}:${key}`)||null,
    saveCityRecord:(_g,v)=>{const row={...v,record_key:v.key};records.set(`${v.kind}:${v.key}`,row);return row;},
    getCharacter:()=>null,getNpcProfile:()=>null,getSimulationEntity:()=>null};
  const source={inspectArbitrationOrigin:()=>origin,arbitrationTurnOrigin:()=>origin,currentScenePlayerInputs:()=>[],matchesArbitrationSchema:()=>true,
    buildSceneIntentBoard:(_db,_g,_o,_rows,proposals)=>{
      captured.push(proposals);
      return db.saveCityRecord('g',{kind:'scene_intent_board',key:'board',source_event:'board-source',data:{origin:origin.binding,
        entries:proposals.map((p,i)=>({intent_ref:`npc:${i}`,actor:{type:'npc',key:p.actor_key},operation:p.operation,target_refs:p.target_refs}))}});
    }};
  const mechanics={EncounterLibrary:class{},PROFESSIONAL_ENTRY:'professional_entry',applyNativeEnvironmentProfileProposals:()=>{},establishPreparedPositions:()=>{},
    pendingFeatureWindows:()=>[],indexWorldEvent:(_db,_g,event)=>({...event,event_key:event.key}),
    nativeMovementConditionIssue:(_db,_g,actor,options)=>{assert.equal(actor,'npc');assert.deepEqual(options,{kind:'npc'});return restrained?'NATIVE_MOVEMENT_RESTRAINED':null;}};
  const native=createUnifiedAdjudication({source,mechanics});
  const run=intents=>native.applyUnifiedArbitration(db,'g',{unified_arbitration:{npc_intents:intents.map(([operation,refs])=>({actor_key:'npc',operation,target_refs:refs})),
    decisions:intents.map(([operation],i)=>({intent_ref:`npc:${i}`,disposition:'npc_no_roll',difficulty:null,trait:null,stakes:'none',stakes_kind:'attempt_only',
      rule_basis_refs:['srd:gm-moves'],reason:'Ordinary local NPC fiction.',feature_ref:'',experience_ref:'',advantage:false,disadvantage:false}))}},[]);
  return {run,captured};
}

test('full unified entrypoint retains native areas for feature intents while ordinary props remain filtered',()=>{
  const f=fixture();f.run([['feature',['area','scrap']]]);
  assert.deepEqual(f.captured[0][0].target_refs,['area']);
  const ordinary=fixture();ordinary.run([['speak',['area','scrap']]]);
  assert.deepEqual(ordinary.captured[0][0].target_refs,[]);
});

test('native Restrained condition holds walking fiction locally and preserves independent NPC speech',()=>{
  const f=fixture({restrained:true}),rows=f.run([['walk',[]],['speak',[]]]);
  assert.equal(rows[0].status,'needs_rules_review');assert.match(rows[0].data.reason,/NATIVE_MOVEMENT_RESTRAINED/);
  assert.equal(rows[1].status,'resolved_no_roll');
});

test('ordinary unrestrained NPC walk keeps its existing fiction-only adjudication',()=>{
  const rows=fixture().run([['walk',[]]]);assert.equal(rows[0].status,'resolved_no_roll');assert.equal(rows[0].data.native,null);
});
