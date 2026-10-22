import test from 'node:test';
import assert from 'node:assert/strict';
import {worldNarrativeBridgePacket} from '../../src/world-narrative-bridge.js';
import {createP07NativeFixture} from './p07-native-fixture.mjs';

test('source-validated optional conversation survives into the writer when beat capacity is available',()=>{
  const f=createP07NativeFixture();
  try{
    const first=f.acceptSpeech('owner-a',f.pcs[0],'tie-a','I noticed the stopped pump.');
    const second=f.acceptSpeech('owner-b',f.pcs[1],'tie-b','I can ask about the pump.');
    assert.equal(first.dialogue.length,1);assert.equal(second.dialogue.length,1);
    const selected=worldNarrativeBridgePacket(f.db,f.guild,f.scope);
    assert.equal(selected.signals.length,2);assert.equal(selected.omitted,0);
    const {brief,writer}=f.makeDirector();const bridge=brief.world_bridge;
    assert.equal(bridge.beats.length,2);assert.ok(bridge.beats.length<4);
    assert.deepEqual(bridge.beats.map(row=>row.signal_ref),selected.signals.map(row=>row.id),
      'equally validated shared-NPC opportunities retain stable source ordering and reach the bound writer context');
    assert.ok(bridge.beats.every(row=>row.kind==='pacing_hint'&&row.execution_authority===false&&row.publication_authority===false));
    assert.deepEqual(writer.packet.director_brief.world_bridge,bridge);
    assert.equal(bridge.omitted,0);
  } finally {f.close();}
});
