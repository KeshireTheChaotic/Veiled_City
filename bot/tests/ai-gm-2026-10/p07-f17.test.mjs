import test from 'node:test';
import assert from 'node:assert/strict';
import {indexWorldEvent} from '../../src/city-calendar.js';
import {worldNarrativeBridgePacket} from '../../src/world-narrative-bridge.js';
import {createP07NativeFixture} from './p07-native-fixture.mjs';

test('private authored conversation stays with its owner and revoked public source is not replayed',()=>{
  const f=createP07NativeFixture();
  try{
    const publicA=f.acceptSpeech('owner-a',f.pcs[0],'public-a','The pump is still humming.');
    const publicB=f.acceptSpeech('owner-b',f.pcs[1],'public-b','The station needs repairs.');
    const privateA=f.acceptSpeech('owner-a',f.pcs[0],'private-a','I found a private note.',{privateScene:true});
    assert.equal(publicA.dialogue.length,1);assert.equal(publicB.dialogue.length,1);assert.equal(privateA.dialogue.length,1);
    const party=worldNarrativeBridgePacket(f.db,f.guild,f.scope);
    assert.equal(party.signals.length,2,'party bridge must omit the character-private exchange');
    const ownerA={mode:'private',actorUserId:'owner-a',actorCharacterId:f.pcs[0].id};
    const ownerB={mode:'private',actorUserId:'owner-b',actorCharacterId:f.pcs[1].id};
    const privatePacketA=worldNarrativeBridgePacket(f.db,f.guild,ownerA);
    const privatePacketB=worldNarrativeBridgePacket(f.db,f.guild,ownerB);
    const privateOrigin=privateA.dialogue[0];
    assert.ok(privatePacketA.signals.some(signal=>signal.source_refs.some(ref=>ref.kind==='world_event'&&ref.key===privateOrigin.event_key)));
    assert.ok(!privatePacketB.signals.some(signal=>signal.source_refs.some(ref=>ref.kind==='world_event'&&ref.key===privateOrigin.event_key)));
    assert.equal(privatePacketA.signals.some(signal=>signal.source_refs.some(ref=>ref.kind==='world_event'&&ref.key===privateOrigin.event_key)),true);
    const origin=publicA.dialogue[0];
    indexWorldEvent(f.db,f.guild,{key:origin.event_key,status:'retracted'},'human_gm');
    const after=worldNarrativeBridgePacket(f.db,f.guild,f.scope);
    assert.equal(after.signals.length,1,'the current reader must rebuild selection after source revocation');
    assert.ok(after.signals.every(signal=>signal.source_refs.every(ref=>ref.key!==origin.event_key)));
    assert.equal(f.makeDirector().writer.packet.director_brief.world_bridge.beats.length,1,
      'writer projection follows the revalidated current packet');
  } finally {f.close();}
});
