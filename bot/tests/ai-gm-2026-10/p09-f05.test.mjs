import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {matchesArbitrationSchema,gmArbitrationProposalSchema,unifiedArbitrationSchema} from '../../src/gm-arbitration-contract.js';
import {motivationKey} from '../../src/simulation-motivation.js';
import {gmD20Roll} from '../../src/dice.js';
import {PROFESSIONAL_ENTRY,establishPreparedPositions,qualifyProfessionalEntry,professionalEntryRollState,
  commitProfessionalEntryUse,inspectProfessionalEntryUse} from '../../src/native-professional-entry.js';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const scene='session-1:1',session='session-1',location='loc-1',guild='guild-1',actor='aster-contractor',target='pc-1';
function fixture(){
  const records=new Map(),events=new Map(),encounter={id:'enc-1',status:'active'},binding={source:'gm-input-1',session,scene,location};
  const db={
    transaction:fn=>fn(),getActiveSession:()=>({id:session}),getDirectorState:()=>({scene_number:1,scene_label:'Entry'}),
    getCurrentEncounter:()=>encounter,getSimulationClock:()=>({tick:1,minute:1}),recordMutation:()=>{},
    getCharacter:key=>key===target?{id:target,guild_id:guild}:null,
    getSimulationEntity:()=>null,getNpcProfile:()=>null,
    getWorldEvent:(g,key)=>events.get(key)||null,
    saveWorldEvent:(g,row)=>{const event={...row,event_key:row.key};events.set(row.key,event);return event;},
    getCityRecord:(g,kind,key)=>records.get(`${kind}:${key}`)||null,
    saveCityRecord:(g,row)=>{const saved={...row,record_key:row.key};records.set(`${row.kind}:${row.key}`,saved);return saved;},
    listCityRecords:(g,{kind,includeGM=false}={})=>[...records.values()].filter(row=>row.kind===kind&&(includeGM||row.visibility!=='gm')),
  };
  const presenceKey=`presence:${motivationKey([scene,'character',target])}`;
  db.saveWorldEvent(guild,{key:'presence-source',kind:'arrival',status:'active',session_id:session,scene,location_key:location,
    source_id:'player:owner-1',details:{}});
  db.saveCityRecord(guild,{kind:'scene_presence',key:presenceKey,status:'active',source_event:'presence-source',visibility:'party',
    location_key:location,data:{entity_type:'character',entity_key:target,state:'actually_present',scene,zone:'scene'}});
  db.saveWorldEvent(guild,{key:binding.source,kind:'gm_scene_input',status:'active',session_id:session,scene,location_key:location,details:{}});
  return {db,binding,records,events,encounter};
}
const prepared=[{position_ref:'east-entry',kind:'fortified_position',description:'The east entrance is barricaded and defended.',target_refs:[target]}];
const proposal={intent_ref:'npc-intent-1',disposition:'gm_attack_roll',rule_basis_refs:['srd:adversary-attacks'],difficulty:null,trait:null,
  stakes_kind:'native_attack',stakes:'Breach the prepared east entry.',reason:'The Contractor forces the barricade.',difficulty_reason:'Native Evasion applies.',
  feature_ref:PROFESSIONAL_ENTRY,experience_ref:'',advantage:false,disadvantage:false,proposal_version:4,
  feature_intent:{action:'breach',position_ref:'east-entry'}};
const entry={actor:{type:'npc',key:actor},operation:'attack',target_refs:[target],scene_ref:scene};

test('v11 prepared-position and v4 Professional Entry proposals are closed and typed',()=>{
  const unified={version:11,npc_intents:[],decisions:[proposal],pre_roll_fear:[],environment_profiles:[],environment_actions:[],prepared_positions:prepared};
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,unified),true);
  assert.equal(matchesArbitrationSchema(gmArbitrationProposalSchema,{...proposal,untrusted_advantage:true}),false);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{...unified,prepared_positions:[{...prepared[0],retroactive:true}]}),false);
});

test('only established position evidence matching the exact action and target qualifies',()=>{
  const {db,binding}=fixture();
  establishPreparedPositions(db,guild,binding,prepared);
  assert.ok(qualifyProfessionalEntry(db,guild,{id:'enc-1'},entry,proposal));
  assert.equal(qualifyProfessionalEntry(db,guild,{id:'enc-1'},entry,{...proposal,feature_intent:{action:'surprise',position_ref:'east-entry'}})?.action,'surprise');
  assert.equal(qualifyProfessionalEntry(db,guild,{id:'enc-1'},entry,{...proposal,feature_intent:{action:'restrain',position_ref:'missing'}}),null);
  assert.equal(qualifyProfessionalEntry(db,guild,{id:'enc-1'},entry,{...proposal,feature_intent:{action:'breach',position_ref:'east-entry'},advantage:true}),null);
  assert.equal(qualifyProfessionalEntry(db,guild,{id:'enc-1'}, {...entry,target_refs:['another-pc']},proposal),null);
  assert.equal(qualifyProfessionalEntry(db,guild,{id:'enc-1'}, {...entry,actor:{type:'character',key:target}},proposal),null);
});

test('a native encounter preparation record outranks conflicting GM scene fiction',()=>{
  const {db,binding}=fixture();
  establishPreparedPositions(db,guild,binding,prepared);
  const nativeData={version:1,issuer:'native:encounter-preparation',evidence_kind:'native_encounter_record',
    position_ref:'east-entry',kind:'fortified_position',description:'Native record identifies another defender.',target_refs:['other-pc'],
    encounter:'enc-1',session,scene,location,established_from:'native-prep-source'};
  db.saveWorldEvent(guild,{key:'native-prep-source',kind:'native_encounter_preparation',source_id:'native:encounter-preparation',
    status:'active',session_id:session,scene,details:{payload_hash:hash(nativeData)}});
  db.saveCityRecord(guild,{kind:'native_prepared_position',key:'native-position',status:'active',source_event:'native-prep-source',
    visibility:'gm',data:nativeData});
  assert.equal(qualifyProfessionalEntry(db,guild,{id:'enc-1'},entry,proposal),null);
});

test('encounter use grants Advantage once and binds the immutable use to one roll',()=>{
  const {db,binding,records}=fixture();
  establishPreparedPositions(db,guild,binding,prepared);
  const proof=qualifyProfessionalEntry(db,guild,{id:'enc-1'},entry,proposal);
  const decision={record_key:'decision-1',source_event:'decision-source',data:{origin:binding,native:{professional_entry:proof},proposal}};
  db.saveWorldEvent(guild,{key:'decision-source',kind:'native_gm_arbitration',status:'active',session_id:session,scene,location_key:location,details:{}});
  db.saveCityRecord(guild,{kind:'gm_arbitration_decision',key:decision.record_key,status:'gm_action_ready',source_event:decision.source_event,
    visibility:'gm',data:decision.data});
  const state=professionalEntryRollState(db,guild,decision,entry);
  assert.equal(state.advantage,true);
  const director=db.getDirectorState;
  db.getDirectorState=()=>({scene_number:2,scene_label:'Later'});
  assert.equal(professionalEntryRollState(db,guild,decision,entry).advantage,false);
  db.getDirectorState=director;
  const firstFaces=[2,17],firstRoll=gmD20Roll({kind:'attack',modifier:0,difficulty:12,advantage:state.advantage},()=>firstFaces.shift());
  assert.equal(firstRoll.selected,17);
  assert.equal(firstFaces.length,0);
  const receipt=commitProfessionalEntryUse(db,guild,decision,state,'attack-roll:1','roll-id-1');
  assert.equal(receipt.data.roll_id,'roll-id-1');
  assert.equal(professionalEntryRollState(db,guild,decision,entry).advantage,false);
  const laterFaces=[11],laterRoll=gmD20Roll({kind:'attack',modifier:0,difficulty:12,
    advantage:professionalEntryRollState(db,guild,decision,entry).advantage},()=>laterFaces.shift());
  assert.equal(laterRoll.selected,11);
  assert.equal(laterFaces.length,0);
  assert.equal(inspectProfessionalEntryUse(db,guild,state.use_ref,decision,'attack-roll:1','roll-id-1').record_key,state.use_ref);
  assert.throws(()=>inspectProfessionalEntryUse(db,guild,state.use_ref,decision,'attack-roll:2','roll-id-1'),/ancestry/);
  assert.throws(()=>commitProfessionalEntryUse(db,guild,decision,state,'attack-roll:2','roll-id-2'),/consumed/);
  const position=[...records.values()].find(row=>row.kind==='native_prepared_position');
  db.saveWorldEvent(guild,{...db.getWorldEvent(guild,position.source_event),status:'retracted'});
  assert.equal(inspectProfessionalEntryUse(db,guild,state.use_ref,decision,'attack-roll:1','roll-id-1').record_key,state.use_ref);
  assert.equal(professionalEntryRollState(db,guild,decision,entry).advantage,false);
});
