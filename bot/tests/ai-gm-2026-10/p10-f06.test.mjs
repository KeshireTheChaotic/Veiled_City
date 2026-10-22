import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './p10-fixture.mjs';
import {sceneSetupAvailability,prepareSceneSetup,confirmSceneSetup} from '../../src/scene-setup.js';
import {deliverOpeningEntry} from '../../src/opening-entry.js';
test('typed setup diagnostics preserve owner boundary, history and explicit decline',()=>{
 const f=fixture();try{const a=f.attend('a');assert.equal(sceneSetupAvailability(f.db,'g','b',a.pc.id).code,'owner_invalid');
  assert.equal(sceneSetupAvailability(f.db,'g','a',a.pc.id).code,'setup_offer_available');
  const offer=prepareSceneSetup(f.db,'g','a',a.pc.id);assert.ok(offer.options.some(o=>o.visibility==='party'));assert.ok(offer.options.some(o=>o.visibility==='character'));
  assert.throws(()=>confirmSceneSetup(f.db,'g','b',offer.key,'0'));
  confirmSceneSetup(f.db,'g','a',offer.key,'decline');assert.ok(!f.db.getCharacter(a.pc.id).data.location);
  f.db.setCityCalendar('g',{flags:{scene_continuity:false}});assert.equal(sceneSetupAvailability(f.db,'g','a',a.pc.id).code,'scene_continuity_disabled');
  f.db.setCityCalendar('g',{flags:{scene_continuity:true}});
  f.db.saveCityRecord('g',{kind:'scene_presence',key:'old-placement',status:'archived',visibility:'gm',source_event:a.opportunity.source_event,data:{entity_type:'character',entity_key:a.pc.id}});
  assert.equal(sceneSetupAvailability(f.db,'g','a',a.pc.id).code,'placement_history_requires_review');assert.equal(prepareSceneSetup(f.db,'g','a',a.pc.id),null);
  f.db.updateCharacterData(a.pc.id,d=>{d.location='already-saved';});assert.equal(sceneSetupAvailability(f.db,'g','a',a.pc.id).code,'position_already_set');
 }finally{f.close();}
});
test('no safe initial location permits invented provisional camera without character placement or resource changes',async()=>{
 const f=fixture();try{const a=f.attend('a');f.db.setSimulationEntity('g','location','market',{visibility:'gm',hidden:true});
  const before=f.db.getCharacter(a.pc.id).data;
  assert.equal(sceneSetupAvailability(f.db,'g','a',a.pc.id).code,'no_eligible_safe_locations');assert.equal(prepareSceneSetup(f.db,'g','a',a.pc.id),null);
  f.gm.generateNarrative=async(_g,packet)=>{const answer=f.answer(packet);answer.acts[0].location_key='rain-stop';answer.fiction_delta=[{kind:'location',key:'rain-stop',name:'Rain Stop',summary:'An ordinary sheltered kiosk.',location_key:'',parent_location_key:'',role:'',aliases:[]}];return answer;};
  const result=await deliverOpeningEntry({db:f.db,guild:f.guild,gm:f.gm,key:a.opportunity.record_key});
  assert.equal(result.status,'delivered',JSON.stringify(result.data));assert.equal(result.data.evidence.narrative_verified,true);
  assert.deepEqual(f.db.getCharacter(a.pc.id).data,before);assert.equal(f.db.hasCharacterPlacementHistory('g',a.pc.id),false);
  assert.ok(f.db.getSimulationEntity('g','location','rain-stop'));assert.equal(f.db.getPartyState('g').established,false);
 }finally{f.close();}
});
