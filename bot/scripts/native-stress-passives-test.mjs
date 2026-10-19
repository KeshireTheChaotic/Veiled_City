/** Test-first: Taste the Fear reacts only to a verified native PC Stress mark. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeFixture} from './v9-fixtures.mjs';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {reviewFeatureEffect,reviewPcEffect,approvePcEffect,applyPcEffect} from '../src/pc-effects.js';
import {applyNativeStressPassive} from '../src/native-stress-passives.js';
import {inspectNativeStressPassive} from '../src/native-stress-passives.js';

function pcArrival(f,pc,key,location='terminal'){
  const scene=currentScene(f.db,f.guild);
  const arrival=indexWorldEvent(f.db,f.guild,{key:`${key}-arrival`,kind:'arrival',source_id:`player:${pc.owner_user_id}`,
    title:'Owner-established PC presence',session_id:f.session.id,scene:scene.key,location_key:location,visibility:'character',subject_key:pc.id,
    details:{entity_type:'character',entity_key:pc.id,owner_user_id:pc.owner_user_id}},pc.owner_user_id);
  recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,source_event:arrival.event_key,location_key:location,zone:'interior',
    visibility:'character',subject_key:pc.id,accepted_by:pc.owner_user_id},pc.owner_user_id);
  return arrival;
}
function leechFixture(f,{stress=2,leechStress=2,present=true}={}){
  const pc=f.pcs[0],scene=currentScene(f.db,f.guild),actor=f.accepted(0,'I invoke Mnemonic Brace to steady my nerves.',pc.id);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_encounters:true,scene_continuity:true}});
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Public Terminal',place_type:'parcel office',visibility:'party'});
  if(present)pcArrival(f,pc,'pc-in-scene');
  f.db.updateCharacterData(pc.id,d=>{d.resources.hp.current=5;d.resources.stress.current=stress;d.domain_cards=[{name:'Mnemonic Brace',active:true}];delete d.death_state;});
  f.db.upsertRulesRuling(f.guild,{key:'fixture-stress-feature',ruling:'Exact owner-approved fixture feature marks 1 Stress.',createdBy:'gm'});
  const npc='memory-leech';f.db.upsertNpcProfile(f.guild,{npcKey:npc,displayName:'Memory Leech'});
  f.db.setSimulationEntity(f.guild,'npc',npc,{name:'Memory Leech',location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:'memory-leech-source',kind:'observation',source_id:'gm',title:'Memory Leech present',
    session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:npc,source_event:source.event_key,location_key:'terminal',zone:'interior',range:'Melee',
    visibility:'party',accepted_by:'gm'},'gm');
  const library=new EncounterLibrary('../content'),encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,
    base_bp:14,budget_bp:14,composition:[{name:'Memory Leech',quantity:1}]}),combatant=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library))[0];
  f.db.updateCombatant(combatant.id,{stress_current:leechStress});
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,data:{combatants:[{actor:npc,id:combatant.id}]}});
  return {pc,actor,npc,source,encounter,combatant};
}

function ownerStressMark(f,x){
  return markPcStress(f,x.pc,x.actor.source_event);
}
function markPcStress(f,pc,source){
  const authority=reviewFeatureEffect(f.db,f.guild,'gm',{character:pc.id,feature:'Mnemonic Brace',ruling:'fixture-stress-feature',
    source,resource:'stress',amount:1},{gm:true,interactionId:`gm-review-stress-${pc.id}`});
  reviewPcEffect(f.db,f.guild,pc.owner_user_id,authority.record_key);
  approvePcEffect(f.db,f.guild,pc.owner_user_id,authority.record_key,{interactionId:`owner-approve-stress-${pc.id}`});
  return applyPcEffect(f.db,f.guild,authority.record_key);
}
function leechStress(f,x){return f.db.listCombatants(x.encounter.id).find(row=>row.id===x.combatant.id).stress_current;}
function passiveRows(f){return f.db.listCityRecords(f.guild,{kind:'native_stress_passive_receipt',includeGM:true,limit:100});}

test('Taste the Fear first real owner-approved PC Stress mark clears one Leech Stress once',()=>nativeFixture(f=>{
  const x=leechFixture(f),effect=ownerStressMark(f,x);
  assert.equal(effect.status,'resolved');assert.equal(effect.data.resource,'stress');assert.equal(effect.data.amount,1);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3,'the separately authorized PC mark remains committed');
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2,'passive does not alter PC Hope');
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,5,'passive does not alter PC HP');
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.armor.current,0,'passive does not alter PC Armor');
  assert.equal(f.db.listCombatants(x.encounter.id).find(row=>row.id===x.combatant.id).stress_current,1,
    'verified first PC Stress mark clears exactly one Memory Leech Stress');
  const events=f.db.worldEventsAfter(f.guild,{after:0,limit:50});
  assert.ok(!events.some(row=>/roll|fear|hope|publication|narrative/i.test(row.kind)&&row.kind!=='native_stress_passive_effect'),
    'the passive creates no roll, Fear, Hope, or publication outputs');
}));

test('native Stress history is scene-bounded, ordered, capped, and preserves revoked/orphan ancestry',()=>nativeFixture(f=>{
  const scene='history-scene';
  const add=(i,{session=f.session.id,sc=scene,kind='gm_group_feature_effect',resource='stress',orphan=false}={})=>{
    const event=indexWorldEvent(f.db,f.guild,{key:`stress-history-source-${i}`,kind:'fixture_native_cause',source_id:'gm',title:'fixture',
      session_id:session,scene:sc,visibility:'gm',details:{}},'gm');
    const row=f.db.saveCityRecord(f.guild,{kind,key:`stress-history-${i}`,status:'resolved',source_event:event.event_key,visibility:'gm',data:
      kind==='pc_effect_receipt'?{resource,owner_choice:orphan?`missing-owner-choice-${i}`:event.event_key}:{}});
    return {event,row};
  };
  const other=add('other',{sc:'different-scene'});
  const otherOrphan=add('other-orphan',{sc:'different-scene',kind:'pc_effect_receipt',orphan:true});
  const revoked=add('revoked');indexWorldEvent(f.db,f.guild,{key:revoked.event.event_key,status:'retracted'},'gm');
  const orphan=add('orphan',{kind:'pc_effect_receipt',orphan:true});
  add('nonstress',{kind:'pc_effect_receipt',resource:'hp'});
  const batch=[];for(let i=0;i<202;i++)batch.push(add(`cap-${i}`));
  const rows=f.db.nativeStressMarkHistory(f.guild,f.session.id,scene,{limit:201});
  assert.equal(rows.length,201);
  assert.ok(rows.every((row,index)=>index===0||rows[index-1].record_sequence<row.record_sequence));
  assert.ok(!rows.some(row=>row.record_key===other.row.record_key),'other scene excluded');
  assert.ok(!rows.some(row=>row.record_key===otherOrphan.row.record_key),'a missing choice in a proven other scene is not local history');
  assert.ok(!rows.some(row=>row.record_key==='stress-history-nonstress'),'non-Stress PC effects excluded');
  const retainedRevoked=rows.find(row=>row.record_key===revoked.row.record_key);
  assert.equal(retainedRevoked.source.status,'retracted','revocation does not erase first-cause history');
  const retainedOrphan=rows.find(row=>row.record_key===orphan.row.record_key);
  assert.equal(retainedOrphan.source,null,'orphaned owner-choice ancestry is visible as ambiguous');
  assert.equal(rows.at(-1).record_sequence,f.db.cityRecordSequence(f.guild,'gm_group_feature_effect',batch[198].row.record_key));
}));

test('the passive is once per Leech and scene across duplicate calls, restart, and another PC mark',()=>nativeFixture(f=>{
  const x=leechFixture(f);ownerStressMark(f,x);
  assert.equal(leechStress(f,x),1);
  const effect=f.db.listCityRecords(f.guild,{kind:'pc_effect_receipt',includeGM:true,limit:100})
    .find(row=>row.data.character===x.pc.id&&row.data.resource==='stress');
  assert.ok(effect);
  applyNativeStressPassive(f.db,f.guild,'pc',effect.record_key);
  assert.equal(leechStress(f,x),1,'duplicate source replay does not clear twice');
  f.restart();
  const saved=passiveRows(f)[0];
  assert.ok(inspectNativeStressPassive(f.db,f.guild,saved.record_key));
  applyNativeStressPassive(f.db,f.guild,'pc',effect.record_key);
  assert.equal(leechStress(f,x),1,'restart replay preserves one-clear idempotency');
  const pc=f.pcs[1],source=f.accepted(1,'I steady myself with Mnemonic Brace.',pc.id);
  pcArrival(f,pc,'second-pc-in-scene');
  f.db.updateCharacterData(pc.id,d=>{d.resources.hp.current=5;d.resources.stress.current=2;d.domain_cards=[{name:'Mnemonic Brace',active:true}];delete d.death_state;});
  markPcStress(f,pc,source.source_event);
  assert.equal(f.db.getCharacter(pc.id).data.resources.stress.current,3);
  assert.equal(leechStress(f,x),1,'later PC Stress marks do not clear a second time');
  assert.equal(passiveRows(f).length,1);
  const tampered=passiveRows(f)[0];
  f.db.saveCityRecord(f.guild,{...tampered,key:tampered.record_key,data:{...tampered.data,cleared:0}});
  assert.throws(()=>inspectNativeStressPassive(f.db,f.guild,tampered.record_key),/ancestry/i,'tampered passive snapshot is rejected');
  assert.equal(leechStress(f,x),1,'reader tamper detection does not replay or undo the native effect');
}));

test('a genuine first mark consumes the passive when Leech Stress is zero',()=>nativeFixture(f=>{
  const x=leechFixture(f,{leechStress:0});ownerStressMark(f,x);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3);
  assert.equal(leechStress(f,x),0);
  assert.equal(passiveRows(f).length,1);
  assert.equal(passiveRows(f)[0].data.cleared,0);
}));

test('retracting an already committed private cause does not reverse or replay the passive',()=>nativeFixture(f=>{
  const x=leechFixture(f),effect=ownerStressMark(f,x),saved=passiveRows(f)[0],pcBefore=f.db.getCharacter(x.pc.id).data;
  indexWorldEvent(f.db,f.guild,{key:effect.data.owner_choice,status:'retracted'},'gm');f.restart();
  assert.deepEqual(inspectNativeStressPassive(f.db,f.guild,saved.record_key),saved);
  applyNativeStressPassive(f.db,f.guild,'pc',effect.record_key);
  assert.equal(leechStress(f,x),1);assert.equal(passiveRows(f).length,1);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data,pcBefore);
}));

test('unapproved and sheet-only Stress changes do not trigger the passive',()=>nativeFixture(f=>{
  const x=leechFixture(f),authority=reviewFeatureEffect(f.db,f.guild,'gm',{character:x.pc.id,feature:'Mnemonic Brace',ruling:'fixture-stress-feature',
    source:x.actor.source_event,resource:'stress',amount:1},{gm:true,interactionId:'gm-review-unapproved'});
  reviewPcEffect(f.db,f.guild,x.pc.owner_user_id,authority.record_key);
  assert.throws(()=>applyPcEffect(f.db,f.guild,authority.record_key),/approval|owner/i);
  f.db.updateCharacterData(x.pc.id,d=>{d.resources.stress.current++;});
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3);
  assert.equal(leechStress(f,x),2);
  assert.equal(passiveRows(f).length,0);
}));

test('missing current PC presence holds only the passive and preserves the approved PC mark',()=>nativeFixture(f=>{
  const x=leechFixture(f,{present:false});ownerStressMark(f,x);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3);
  assert.equal(leechStress(f,x),2);
  assert.equal(passiveRows(f).length,0);
  assert.ok(f.db.listCityRecords(f.guild,{kind:'native_stress_passive_review',includeGM:true,limit:100}).length>0);
}));

test('stale NPC source, active proxy, and nonlocal PC presence hold the passive without undoing PC Stress',async()=>{
  await nativeFixture(f=>{
    const x=leechFixture(f);indexWorldEvent(f.db,f.guild,{key:x.source.event_key,status:'retracted'},'gm');ownerStressMark(f,x);
    assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3);assert.equal(leechStress(f,x),2);
    assert.ok(f.db.listCityRecords(f.guild,{kind:'native_stress_passive_review',includeGM:true,limit:100}).length>0);
  });
  await nativeFixture(f=>{
    const x=leechFixture(f);f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'memory-leech',userId:f.pcs[1].owner_user_id,status:'active'});
    ownerStressMark(f,x);assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3);assert.equal(leechStress(f,x),2);
    assert.ok(f.db.listCityRecords(f.guild,{kind:'native_stress_passive_review',includeGM:true,limit:100}).length>0);
  });
  await nativeFixture(f=>{
    const x=leechFixture(f);f.db.setSimulationEntity(f.guild,'location','remote',{name:'Remote Room',place_type:'room',visibility:'party'});
    pcArrival(f,x.pc,'pc-moved-before-stress','remote');ownerStressMark(f,x);
    assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3);assert.equal(leechStress(f,x),2);
    assert.ok(f.db.listCityRecords(f.guild,{kind:'native_stress_passive_review',includeGM:true,limit:100}).length>0);
  });
});

test('a revoked earlier Stress cause prevents a retroactive Leech clear',()=>nativeFixture(f=>{
  const x=leechFixture(f);
  // A completed earlier producer-family receipt is deliberately ambiguous/retracted;
  // it must remain in bounded history and block this later first-use attempt.
  const earlier=indexWorldEvent(f.db,f.guild,{key:'earlier-stress-source',kind:'native_many_deaths_effect',source_id:'native:feature-gate',
    title:'Earlier native Stress cause',session_id:f.session.id,scene:currentScene(f.db,f.guild).key,visibility:'character',subject_key:x.pc.id,
    details:{}},'native:feature-gate');
  f.db.saveCityRecord(f.guild,{kind:'gm_feature_effect_receipt',key:'earlier-stress-receipt',status:'resolved',source_event:earlier.event_key,
    visibility:'character',subject_key:x.pc.id,data:{feature:'unsupported-native-feature'}});
  indexWorldEvent(f.db,f.guild,{key:earlier.event_key,status:'retracted'},'gm');
  ownerStressMark(f,x);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3);
  assert.equal(leechStress(f,x),2);
  assert.equal(passiveRows(f).length,0);
  assert.ok(f.db.listCityRecords(f.guild,{kind:'native_stress_passive_review',includeGM:true,limit:100}).length>0);
}));

test('a PC masquerading as a Leech and malformed NPC resources never acquire passive authority',async()=>{
  await nativeFixture(f=>{
    const x=leechFixture(f),actor=`character:${f.pcs[1].id}`,scene=currentScene(f.db,f.guild),
      source=indexWorldEvent(f.db,f.guild,{key:'masked-leech',kind:'observation',source_id:'gm',title:'Synthetic collision',
        session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'gm'},'gm');
    f.db.upsertNpcProfile(f.guild,{npcKey:actor,displayName:'Memory Leech'});
    f.db.setSimulationEntity(f.guild,'npc',actor,{name:'Memory Leech',location_key:'terminal',visibility:'gm'});
    recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:actor,source_event:source.event_key,location_key:'terminal',
      zone:'interior',visibility:'gm'},'gm');
    const binding=f.db.getCityRecord(f.guild,'encounter_binding',x.encounter.id),otherBefore=f.db.getCharacter(f.pcs[1].id).data;
    f.db.saveCityRecord(f.guild,{...binding,key:binding.record_key,data:{combatants:[{actor,id:x.combatant.id}]}});
    ownerStressMark(f,x);assert.equal(leechStress(f,x),2);assert.equal(passiveRows(f).length,0);
    assert.deepEqual(f.db.getCharacter(f.pcs[1].id).data,otherBefore);assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3);
  });
  await nativeFixture(f=>{
    const x=leechFixture(f);f.db.updateCombatant(x.combatant.id,{stress_current:1.5});ownerStressMark(f,x);
    assert.equal(leechStress(f,x),1.5);assert.equal(passiveRows(f).length,0);
    assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3);
    assert(f.db.listCityRecords(f.guild,{kind:'native_stress_passive_review',includeGM:true}).length>0);
  });
});

test('a PC Stress mark before Leech binding is historical and cannot grant a later clear',()=>nativeFixture(f=>{
  const x=leechFixture(f),binding=f.db.getCityRecord(f.guild,'encounter_binding',x.encounter.id),firstMarkRoster=binding.data.combatants;
  f.db.saveCityRecord(f.guild,{...binding,key:binding.record_key,data:{...binding.data,combatants:[]}});
  ownerStressMark(f,x);
  assert.equal(leechStress(f,x),2,'no eligible Leech is bound at the first native mark');
  f.db.saveCityRecord(f.guild,{...binding,key:binding.record_key,data:{...binding.data,combatants:firstMarkRoster}});
  const next=f.accepted(0,'I steady myself again with Mnemonic Brace.',x.pc.id);
  markPcStress(f,x.pc,next.source_event);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,4);
  assert.equal(leechStress(f,x),2,'later binding cannot retroactively consume the earlier trigger');
  assert.equal(passiveRows(f).length,0);
  assert.ok(f.db.listCityRecords(f.guild,{kind:'native_stress_passive_review',includeGM:true,limit:100}).length>0);
}));

test('bounded history overflow holds the optional passive without undoing the PC mark',()=>nativeFixture(f=>{
  const x=leechFixture(f),scene=currentScene(f.db,f.guild).key;
  for(let i=0;i<200;i++){
    const source=indexWorldEvent(f.db,f.guild,{key:`overflow-stress-source-${i}`,kind:'fixture_history',source_id:'gm',title:'fixture',
      session_id:f.session.id,scene,visibility:'gm',details:{}},'gm');
    f.db.saveCityRecord(f.guild,{kind:'gm_group_feature_effect',key:`overflow-stress-${i}`,status:'resolved',source_event:source.event_key,
      visibility:'gm',data:{stress:0}});
  }
  ownerStressMark(f,x);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3);
  assert.equal(leechStress(f,x),2);
  assert.equal(passiveRows(f).length,0);
  assert.ok(f.db.listCityRecords(f.guild,{kind:'native_stress_passive_review',includeGM:true,limit:100}).length>0);
}));

test('later owner placement cannot retroactively authorize a delayed passive callback',()=>nativeFixture(f=>{
  const x=leechFixture(f,{present:false}),binding=f.db.getCityRecord(f.guild,'encounter_binding',x.encounter.id);
  f.db.saveCityRecord(f.guild,{...binding,key:binding.record_key,data:{combatants:[]}});
  const effect=ownerStressMark(f,x);assert.equal(leechStress(f,x),2);
  f.db.saveCityRecord(f.guild,{...binding,key:binding.record_key});
  pcArrival(f,x.pc,'late-owner-presence');
  applyNativeStressPassive(f.db,f.guild,'pc',effect.record_key);
  assert.equal(leechStress(f,x),2,'placement after the saved mark is not historical co-presence');
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3);assert.equal(passiveRows(f).length,0);
  assert(f.db.listCityRecords(f.guild,{kind:'native_stress_passive_review',includeGM:true}).length>0);
}));
