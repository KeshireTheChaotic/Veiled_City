import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {indexWorldEvent} from '../../src/city-calendar.js';
import {recordScenePresence} from '../../src/scene-continuity.js';
import {worldNarrativeBridgePacket} from '../../src/world-narrative-bridge.js';

function addSecondNpc(f){
  f.db.upsertNpcProfile(f.guild,{npcKey:'sable',displayName:'Sable Rook',role:'night operator',publicIdentity:'Sable Rook'});
  f.db.setSimulationEntity(f.guild,'npc','sable',{name:'Sable Rook',location_key:'p07-station',visibility:'party',status:'active'});
  const event=indexWorldEvent(f.db,f.guild,{key:'p07:npc-arrival:sable',kind:'arrival',title:'Sable is present at the station',
    source_id:'human_gm',session_id:f.session.id,scene:f.scene.key,location_key:'p07-station',visibility:'party',truth_status:'established',
    details:{entity_type:'npc',entity_key:'sable',observers:[]}},'human_gm');
  recordScenePresence(f.db,f.guild,{source_event:event.event_key,entity_type:'npc',entity_key:'sable',location_key:'p07-station',
    visibility:'party',state:'actually_present'},'human_gm');
}

test('authenticated overlap wins only a comparable optional tie and distinct overlap sets retain source order',()=>{
  const f=createP07NativeFixture();
  try{
    addSecondNpc(f);
    const a=f.pcs[0],b=f.pcs[1];
    f.acceptSpeech('owner-a',a,'f22-mara-a','The pump is still humming.',{targetName:'Mara Vale'});
    const one=worldNarrativeBridgePacket(f.db,f.guild,f.scope);
    assert.equal(one.signals.length,1,'single-PC personal opportunity remains eligible');
    f.acceptSpeech('owner-b',b,'f22-mara-b','The station needs repairs.',{targetName:'Mara Vale'});
    const two=worldNarrativeBridgePacket(f.db,f.guild,f.scope),maraIds=two.signals.map(signal=>signal.id);
    assert.equal(two.signals.length,2);
    f.acceptSpeech('owner-a',a,'f22-sable-a','The lamps are flickering.',{targetKey:'sable',targetName:'Sable Rook'});
    const three=worldNarrativeBridgePacket(f.db,f.guild,f.scope);
    assert.equal(three.signals.length,3);
    assert.deepEqual(three.signals.slice(0,2).map(signal=>signal.id),maraIds,
      'verified two-owner overlap outranks the single-owner optional signal');
    const solo=three.signals[2];assert.ok(solo.source_refs.some(ref=>ref.kind==='typed_intent'));
    f.acceptSpeech('owner-b',b,'f22-sable-b','The night is settling in.',{targetKey:'sable',targetName:'Sable Rook'});
    const four=worldNarrativeBridgePacket(f.db,f.guild,f.scope);
    assert.equal(four.signals.length,4);
    const sourceOrder=f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(event=>event.kind==='authored_speech')
      .map(event=>four.signals.find(signal=>signal.source_refs.some(ref=>ref.kind==='world_event'&&ref.key===event.event_key))?.id)
      .filter(Boolean);
    assert.deepEqual(four.signals.map(signal=>signal.id),sourceOrder,
      'different verified overlap groups are equal; native source order is preserved');
    assert.equal(four.omitted,0);
    assert.ok(four.signals.every(signal=>signal.authority_disposition==='ranking_only'));
  } finally {f.close();}
});
