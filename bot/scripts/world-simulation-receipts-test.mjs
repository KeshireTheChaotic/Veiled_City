/** W3 construction fixtures: authored only; run in the consolidated frozen-phase batch. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {configureSimulationEntity,submitNpcAction} from '../src/simulation.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {inspectWorldSimulationReceipt,worldSimulationReceiptForAudience,prepareWorldSimulationObservation} from '../src/world-simulation-receipts.js';
import {applicationPrincipal} from '../src/application-authority.js';
import {recordCharacterArrival} from '../src/scene-continuity.js';
import {nativeOutcomeProjection} from '../src/native-outcome-output.js';
import {bindDirectorNarrativeSource,directorBriefForAudience} from '../src/narrative-director-source.js';
import {canonicalNarrativeCause} from '../src/world-narrative-bridge.js';

function complete(f,roll=20){
  const {db,guild}=f;
  configureSimulationEntity(db,guild,'location','home',{});
  configureSimulationEntity(db,guild,'location','terminal',{});
  db.upsertNpcProfile(guild,{npcKey:'courier',displayName:'Courier'});
  configureSimulationEntity(db,guild,'npc','courier',{location_key:'home',resources:{materials:1}});
  db.upsertNpcGoal(guild,{npcKey:'courier',goalKey:'travel',objective:'Deliver message',acceptableMethods:['travel']});
  return submitNpcAction(db,guild,{actor_type:'npc',actor_key:'courier',goal_key:'travel',type:'travel',location_key:'terminal'},
    {roll:()=>roll});
}
const footprint=db=>db.db.prepare('SELECT total_changes() AS changes').get().changes;

for(const roll of [1,20])test(`native roll ${roll}: exact immutable completion survives exhausted resources and restart`,()=>nativeFixture(f=>{
  const action=complete(f,roll),receipt=inspectWorldSimulationReceipt(f.db,f.guild,action.id),before=footprint(f.db);
  assert.equal(receipt.status,'verified_native_receipt');
  assert.equal(receipt.result.attack_roll,roll);assert.equal(receipt.result.success,roll===20);
  assert.deepEqual(receipt.result.resource_cost,{materials:1});
  assert.equal(f.db.getSimulationEntity(f.guild,'npc','courier').state.resources.materials,0);
  assert.equal(receipt.execution_authority,false);assert.equal(receipt.publication_authority,false);
  assert.equal(Object.hasOwn(receipt,'rationale'),false);assert.equal(Object.hasOwn(receipt,'content'),false);
  assert.throws(()=>{receipt.result.resource_cost.materials=9;},TypeError);
  assert.deepEqual(inspectWorldSimulationReceipt(f.db,f.guild,action.id),receipt);assert.equal(footprint(f.db),before);
  f.restart();const restarted=footprint(f.db);
  assert.deepEqual(inspectWorldSimulationReceipt(f.db,f.guild,action.id),receipt);assert.equal(footprint(f.db),restarted);
}));

test('changed completion, forged result-only record, foreign guild and missing native receipt hold',()=>nativeFixture(f=>{
  const action=complete(f),receipt=inspectWorldSimulationReceipt(f.db,f.guild,action.id);
  assert.equal(receipt.status,'verified_native_receipt');
  f.db.putSimulationRecord(f.guild,{id:action.id,kind:'action',entityKey:action.entity_key,status:'completed',
    data:{...action.data,result:{...action.data.result,attack_roll:7}}});
  assert.equal(inspectWorldSimulationReceipt(f.db,f.guild,action.id).status,'held_source');
  const forged=f.db.putSimulationRecord(f.guild,{kind:'action',entityKey:action.entity_key,status:'completed',data:action.data});
  assert.equal(inspectWorldSimulationReceipt(f.db,f.guild,forged.id).status,'held_source');
  assert.equal(inspectWorldSimulationReceipt(f.db,'other',action.id).status,'held_source');
  assert.equal(inspectWorldSimulationReceipt(f.db,f.guild,'missing').status,'held_source');
}));

test('GM mutation, native travel index, co-location and model-shaped public claim never certify audience outcome',()=>nativeFixture(f=>{
  const action=complete(f),receipt=inspectWorldSimulationReceipt(f.db,f.guild,action.id);
  assert.throws(()=>indexWorldEvent(f.db,f.guild,{key:'forged-public-observation',kind:'travel',title:'Courier succeeded',
    source_kind:'mutation',source_id:receipt.mutation_id,visibility:'party',location_key:'terminal',
    details:{action_id:action.id,observed_by:f.pcs[0].id,success:true}},'fixture'),/cannot disclose its private source/);
  const event=indexWorldEvent(f.db,f.guild,{key:'alleged-observation',kind:'travel',title:'Courier succeeded',
    source_kind:'mutation',source_id:receipt.mutation_id,visibility:'gm',location_key:'terminal',
    details:{action_id:action.id,observed_by:f.pcs[0].id,success:true}},'fixture');
  const before=footprint(f.db);
  for(const mode of ['party','private'])for(const sourceRef of [receipt.source_ref,event.event_key,'missing']){
    const projected=worldSimulationReceiptForAudience(f.db,f.guild,action.id,
      {mode,actorCharacterId:f.pcs[0].id,actorUserId:f.pcs[0].owner_user_id},{sourceRef});
    assert.equal(projected.status,'held_source');assert.equal(Object.hasOwn(projected,'result'),false);
    assert.equal(Object.hasOwn(projected,'actor'),false);assert.equal(projected.publication_authority,false);
  }
  assert.equal(footprint(f.db),before);
  f.restart();assert.equal(worldSimulationReceiptForAudience(f.db,f.guild,action.id,{mode:'party'},
    {sourceRef:event.event_key}).status,'held_source');
}));

test('ledger payload/actor tampering and ambiguous duplicate receipts are rejected',()=>nativeFixture(f=>{
  const action=complete(f),receipt=inspectWorldSimulationReceipt(f.db,f.guild,action.id),
    original=f.db.getMutation(f.guild,receipt.mutation_id);
  f.db.db.prepare('UPDATE mutation_ledger SET actor_id=? WHERE id=?').run('impostor',original.id);
  assert.equal(inspectWorldSimulationReceipt(f.db,f.guild,action.id).status,'held_source');
  f.db.db.prepare('UPDATE mutation_ledger SET actor_id=?,payload_json=? WHERE id=?').run(original.actor_id,'{}',original.id);
  assert.equal(inspectWorldSimulationReceipt(f.db,f.guild,action.id).status,'held_source');
  f.db.db.prepare('UPDATE mutation_ledger SET payload_json=? WHERE id=?').run(original.payload_json,original.id);
  f.db.recordMutation(f.guild,{actorType:'ai',actorId:original.actor_id,sourceLayer:'npc_director',
    mutationType:original.mutation_type,entityKey:action.id,visibility:'gm',before:JSON.parse(original.before_json),
    after:JSON.parse(original.after_json),payload:JSON.parse(original.payload_json)});
  assert.equal(inspectWorldSimulationReceipt(f.db,f.guild,action.id).reason,'ambiguous_native_receipt');
}));

function observe(f,mode='private'){
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scene_continuity:true}});
  configureSimulationEntity(f.db,f.guild,'location','terminal',{});
  for(const pc of f.pcs)recordCharacterArrival(f.db,f.guild,pc,pc.owner_user_id,`arrival-${pc.id}`);
  const action=complete(f),scope={mode,actorCharacterId:f.pcs[0].id,actorUserId:f.pcs[0].owner_user_id},
    principal=applicationPrincipal(f.guild,'world.observe-travel','synthetic-native-director');
  return {action,scope,principal};
}

for(const mode of ['private','party'])test(`W3 real ${mode} Director producer and common output reader use only witnessed arrival`,()=>nativeFixture(f=>{
  const x=observe(f,mode),scope=mode==='party'?{mode:'party',actorUserId:null,actorCharacterId:null}:x.scope;
  configureSimulationEntity(f.db,f.guild,'location','terminal',{name:'Public Terminal'});
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),ref=bindDirectorNarrativeSource(f.db,f.guild,{act:true},scope,'round',{},null),
    source=f.db.getWorldEvent(f.guild,ref),brief=directorBriefForAudience(f.db,f.guild,source,scope),
    proof=brief.native_world_observations.receipts.find(p=>p.action===x.action.id);
  assert(proof,'Actual Director should prepare the current independently witnessed NPC arrival');
  assert(brief.world_bridge.beats.some(b=>b.consequence==='observed_native_npc_arrival'&&b.effect_ref===proof.key));
  const proposal={version:4,kind:'native_outcome',receipt_kind:'world_simulation_observation',ref:proof.key},
    projection=nativeOutcomeProjection(f.db,f.guild,proposal,scope);
  assert.match(projection.text,/Courier/);assert.match(projection.text,/Public Terminal/);
  assert.doesNotMatch(projection.text,/attack_roll|resource_cost|materials|succeeded|player-/);
  assert.equal(canonicalNarrativeCause(f.db,f.guild,ref,scope),proof.observation_ref);
  f.restart();assert.deepEqual(nativeOutcomeProjection(f.db,f.guild,proposal,scope),projection);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
  assert.throws(()=>nativeOutcomeProjection(f.db,f.guild,proposal,{mode:'private',actorCharacterId:f.pcs[1].id,actorUserId:f.pcs[1].owner_user_id}),/exact committed outcome/);
}));

for(const mode of ['private','party'])test(`native ${mode} arrival observation is bounded, restart-safe, idempotent and read-only`,()=>nativeFixture(f=>{
  const {action,scope,principal}=observe(f,mode),before=inspectWorldSimulationReceipt(f.db,f.guild,action.id),
    result=prepareWorldSimulationObservation(f.db,f.guild,action.id,scope,{principal});
  assert.equal(result.status,'verified_native_observation');assert.equal(result.outcome,'observed_arrival');
  assert.equal(Object.hasOwn(result,'result'),false);assert.equal(Object.hasOwn(result,'mutation_id'),false);
  const row=f.db.getCityRecord(f.guild,'world_simulation_observation',result.source_ref),event=f.db.getWorldEvent(f.guild,result.observation_ref);
  assert.equal(row.visibility,'gm');assert.equal(event.source_id,'native:world-travel-observation');
  assert.deepEqual(Object.keys(event.details).sort(),['actor','location_key','outcome']);
  assert.equal(JSON.stringify(event).includes(before.mutation_id),false);
  const count=footprint(f.db);
  assert.deepEqual(prepareWorldSimulationObservation(f.db,f.guild,action.id,scope,{principal}),result);
  assert.deepEqual(worldSimulationReceiptForAudience(f.db,f.guild,action.id,scope,{sourceRef:result.source_ref}),result);
  assert.equal(footprint(f.db),count);
  f.restart();const restarted=footprint(f.db);
  assert.deepEqual(worldSimulationReceiptForAudience(f.db,f.guild,action.id,scope,{sourceRef:result.source_ref}),result);
  assert.deepEqual(inspectWorldSimulationReceipt(f.db,f.guild,action.id),before);assert.equal(footprint(f.db),restarted);
}));

test('serialized/cloned application authority cannot mint observation and owner/audience mismatches hold',()=>nativeFixture(f=>{
  const {action,scope,principal}=observe(f);
  const before=footprint(f.db);
  for(const forged of [{...principal},{gm:true},null])assert.equal(
    prepareWorldSimulationObservation(f.db,f.guild,action.id,scope,{principal:forged}).status,'held_source');
  assert.equal(footprint(f.db),before);
  const observation=prepareWorldSimulationObservation(f.db,f.guild,action.id,scope,{principal});
  for(const changed of [{...scope,mode:'party'},{...scope,actorUserId:f.pcs[1].owner_user_id},
    {...scope,actorCharacterId:f.pcs[1].id}])assert.equal(worldSimulationReceiptForAudience(f.db,f.guild,action.id,changed,
      {sourceRef:observation.source_ref}).status,'held_source');
}));

for(const revoke of ['travel','mutation','mutation-source','viewer','npc','scene','event','proof'])test(`current observation holds after ${revoke} changes without changing history`,()=>nativeFixture(f=>{
  const {action,scope,principal}=observe(f),history=inspectWorldSimulationReceipt(f.db,f.guild,action.id),
    observation=prepareWorldSimulationObservation(f.db,f.guild,action.id,scope,{principal});
  assert.equal(observation.status,'verified_native_observation');
  if(revoke==='travel'||revoke==='event')indexWorldEvent(f.db,f.guild,{key:revoke==='travel'?`travel:${action.id}`:observation.observation_ref,status:'retracted'},'fixture');
  if(revoke==='mutation')f.db.db.prepare('UPDATE mutation_ledger SET payload_json=? WHERE id=?').run('{}',history.mutation_id);
  if(revoke==='mutation-source')indexWorldEvent(f.db,f.guild,{key:history.source_ref,status:'retracted'},'fixture');
  if(revoke==='viewer')f.db.updateCharacterData(f.pcs[0].id,d=>{d.location='home';});
  if(revoke==='npc')configureSimulationEntity(f.db,f.guild,'npc','courier',{hidden:true});
  if(revoke==='scene')f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scene_continuity:false}});
  if(revoke==='proof')f.db.db.prepare("UPDATE city_records SET status='retracted' WHERE guild_id=? AND record_key=?").run(f.guild,observation.source_ref);
  const count=footprint(f.db);
  assert.equal(worldSimulationReceiptForAudience(f.db,f.guild,action.id,scope,{sourceRef:observation.source_ref}).status,'held_source');
  assert.equal(footprint(f.db),count);
  if(revoke!=='mutation')assert.deepEqual(inspectWorldSimulationReceipt(f.db,f.guild,action.id),history);
}));

test('actorless party camera verifies every current owner independently and survives restart',()=>nativeFixture(f=>{
  const {action,principal}=observe(f,'party'),scope={mode:'party',actorCharacterId:null,actorUserId:null},
    result=prepareWorldSimulationObservation(f.db,f.guild,action.id,scope,{principal});
  assert.equal(result.status,'verified_native_observation');
  const proof=f.db.getCityRecord(f.guild,'world_simulation_observation',result.source_ref);
  assert.equal(proof.data.viewers.length,f.pcs.length);
  assert.ok(proof.data.viewers.every(v=>v.principal_kind==='owner'&&v.principal_revision));
  assert.equal(proof.data.owner,null);assert.equal(proof.data.viewpoint,null);
  f.restart();const before=footprint(f.db);
  assert.deepEqual(worldSimulationReceiptForAudience(f.db,f.guild,action.id,scope,{sourceRef:result.source_ref}),result);
  assert.equal(footprint(f.db),before);
}));

for(const change of ['proxy','revision','owner','partial-actor','private-camera'])test(`actorless party rejects ${change} without authoring PC choices`,()=>nativeFixture(f=>{
  const {action,principal}=observe(f,'party'),scope={mode:'party',actorCharacterId:null,actorUserId:null},
    result=prepareWorldSimulationObservation(f.db,f.guild,action.id,scope,{principal});
  assert.equal(result.status,'verified_native_observation');
  const pc=f.pcs[2];let changedScope=scope;
  if(change==='proxy')f.db.assignCharacter(f.session.id,pc.owner_user_id,pc.id,
    {controlPolicy:'proxy',proxyUserId:f.pcs[1].owner_user_id});
  if(change==='revision')f.db.assignCharacter(f.session.id,pc.owner_user_id,pc.id,{controlPolicy:'player_only'});
  if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run('new-owner',pc.id);
  if(change==='partial-actor')changedScope={...scope,actorUserId:f.pcs[0].owner_user_id};
  if(change==='private-camera')changedScope={...scope,mode:'private'};
  const before=footprint(f.db);
  assert.equal(worldSimulationReceiptForAudience(f.db,f.guild,action.id,changedScope,{sourceRef:result.source_ref}).status,'held_source');
  assert.equal(footprint(f.db),before);
  if(change!=='revision')assert.equal(prepareWorldSimulationObservation(f.db,f.guild,action.id,changedScope,{principal}).status,'held_source');
}));

function legacyBirth(f,type,id,visibility='party',subject=null){
  const input=indexWorldEvent(f.db,f.guild,{key:`birth-input:${type}:${id}`,kind:'ai_gm_input',title:'Fixture identity input',
    source_id:'fixture-owner',visibility,subject_key:subject},'fixture');
  const birth=indexWorldEvent(f.db,f.guild,{key:`birth:${type}:${id}`,kind:'native_narrative_entity',title:'Fixture native identity',
    source_id:'native:narrative-authority',visibility,subject_key:subject,
    details:{entity_type:type,entity_key:id,input_source:input.event_key}},'native:narrative-authority');
  f.db.saveCityRecord(f.guild,{kind:'autonomous_entity',key:`${type}:${id}`,status:'active',visibility,subject_key:subject,
    source_event:birth.event_key,data:{kind:type,key:id,name:type==='npc'?'Courier':'Terminal',aliases:[],narrative_origin:input.event_key}});
  return {input,birth};
}

for(const type of ['npc','location'])for(const change of ['gm','private','birth-retracted','input-retracted'])
test(`${type} ${change} source cannot be laundered through later native travel`,()=>nativeFixture(f=>{
  const {action,scope,principal}=observe(f,'party'),id=type==='npc'?'courier':'terminal',
    source=legacyBirth(f,type,id,change==='gm'?'gm':change==='private'?'character':'party',change==='private'?f.pcs[0].id:null);
  if(change==='birth-retracted'||change==='input-retracted')indexWorldEvent(f.db,f.guild,
    {key:change==='birth-retracted'?source.birth.event_key:source.input.event_key,status:'retracted'},'fixture');
  const before=footprint(f.db);
  assert.equal(prepareWorldSimulationObservation(f.db,f.guild,action.id,scope,{principal}).status,'held_source');
  assert.equal(footprint(f.db),before);
  assert.equal(inspectWorldSimulationReceipt(f.db,f.guild,action.id).status,'verified_native_receipt');
}));

for(const type of ['npc','location'])test(`${type} character-private birth observes only exact current owner and holds after birth revocation`,()=>nativeFixture(f=>{
  const {action,scope,principal}=observe(f),id=type==='npc'?'courier':'terminal',source=legacyBirth(f,type,id,'character',scope.actorCharacterId);
  const result=prepareWorldSimulationObservation(f.db,f.guild,action.id,scope,{principal});
  assert.equal(result.status,'verified_native_observation');
  assert.equal(prepareWorldSimulationObservation(f.db,f.guild,action.id,{mode:'party',actorUserId:null,actorCharacterId:null},
    {principal}).status,'held_source');
  indexWorldEvent(f.db,f.guild,{key:source.birth.event_key,status:'retracted'},'fixture');
  const before=footprint(f.db);
  assert.equal(worldSimulationReceiptForAudience(f.db,f.guild,action.id,scope,{sourceRef:result.source_ref}).status,'held_source');
  assert.equal(footprint(f.db),before);
}));

for(const type of ['npc','location'])test(`legacy ${type} ordinary GM visibility is not disclosed by a native travel mutation`,()=>nativeFixture(f=>{
  const {action,scope,principal}=observe(f,'party');
  configureSimulationEntity(f.db,f.guild,type,type==='npc'?'courier':'terminal',{visibility:'gm'});
  assert.equal(prepareWorldSimulationObservation(f.db,f.guild,action.id,scope,{principal}).status,'held_source');
}));

test('unexpected conversation-control database failures propagate instead of becoming narrative holds',()=>nativeFixture(f=>{
  const {action,scope,principal}=observe(f),original=f.db.activeAssignment;
  f.db.activeAssignment=()=>{throw new Error('synthetic database failure');};
  try{assert.throws(()=>prepareWorldSimulationObservation(f.db,f.guild,action.id,scope,{principal}),/synthetic database failure/);}
  finally{f.db.activeAssignment=original;}
}));
