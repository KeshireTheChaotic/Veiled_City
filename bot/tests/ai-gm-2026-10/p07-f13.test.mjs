import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {worldNarrativeBridgePacket} from '../../src/world-narrative-bridge.js';

test('two authenticated owners create source-bound NPC opportunities through World Director and writer context',async()=>{
  const f=createP07NativeFixture();
  try{
    for(const [i,pc] of f.pcs.entries()){
      const result=f.acceptSpeech(`owner-${i?'b':'a'}`,pc,`message-${i}`,[`The pump is still humming.`,`The station needs repairs.`][i]);
      assert.equal(result.accepted.length,1,'owner speech must pass native intent acceptance');
      assert.equal(result.dialogue.length,1,'NPC speech memory must come from actual authored speech');
    }
    const packet=worldNarrativeBridgePacket(f.db,f.guild,f.scope);
    assert.equal(packet.signals.length,2);
    assert.equal(packet.eligible,2);assert.equal(packet.omitted,0);
    assert.ok(packet.signals.every(signal=>signal.kind==='conversation_development'));
    const {result,providerCalls,lastRequest,brief,writer}=await f.runWorldDirector();
    assert.equal(result.act,false,'the Director retains its no-move choice');
    assert.equal(providerCalls,1,'the changed path adds no model call; the one Director request is mocked offline');
    assert.match(lastRequest.input,/WORLD NARRATIVE BRIDGE/);
    for(const signal of packet.signals)assert.ok(lastRequest.input.includes(signal.id),'selected signal reaches the existing Director prompt');
    assert.equal(brief.world_bridge.beats.length,2);
    assert.deepEqual(brief.world_bridge.beats.map(beat=>beat.signal_ref),packet.signals.map(signal=>signal.id));
    assert.deepEqual(writer.packet.director_brief.world_bridge,brief.world_bridge,
      'the current audience-bound writer context must receive the validated Director beats');
    assert.equal(brief.pending.length,0,'a proposal is not a committed outcome');
    assert.equal(brief.native_world_observations.receipts.length,0);
  } finally {f.close();}
});
