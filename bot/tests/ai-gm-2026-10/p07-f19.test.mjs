import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {nativeDirectorNarrativeSource} from '../../src/narrative-director-source.js';
import {worldNarrativeBridgePacket} from '../../src/world-narrative-bridge.js';

test('native source proof is selected, bound to one real Director request, and reaches entitled writer context',async()=>{
  const f=createP07NativeFixture();
  try{
    const sourceEvents=[];
    for(const [i,pc] of f.pcs.entries()){
      const speech=f.acceptSpeech(i?'owner-b':'owner-a',pc,`f19-${i}`,i?'The station needs repairs.':'The pump is still humming.');
      assert.equal(speech.accepted.length,1);
      sourceEvents.push(speech.accepted[0].source_event);
    }
    const selected=worldNarrativeBridgePacket(f.db,f.guild,f.scope);
    assert.equal(selected.signals.length,2);
    const run=await f.runWorldDirector();
    assert.equal(run.providerCalls,1);
    assert.equal(run.result.act,false);
    assert.ok(nativeDirectorNarrativeSource(run.result));
    for(const event of sourceEvents)assert.ok(run.lastRequest.input.includes(event));
    assert.equal(run.brief.world_bridge.beats.length,2);
    assert.deepEqual(run.writer.packet.director_brief.world_bridge,run.brief.world_bridge);
    assert.equal(selected.omitted,0);
    assert.equal(run.brief.pending.length,0);
  } finally {f.close();}
});
