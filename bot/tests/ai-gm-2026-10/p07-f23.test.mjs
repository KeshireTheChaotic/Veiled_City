import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {indexWorldEvent} from '../../src/city-calendar.js';
import {directorBriefForAudience} from '../../src/narrative-director-source.js';
import {buildNarrativeContext} from '../../src/narrative-authority-context.js';
import {worldDirectorBridgeBeats} from '../../src/world-narrative-bridge.js';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('saved Director source survives SQLite reopen, then current readers hold retracted source authority',async()=>{
  const f=createP07NativeFixture();
  try{
    for(const [i,pc] of f.pcs.entries())f.acceptSpeech(i?'owner-b':'owner-a',pc,`f23-reopen-${i}`,
      i?'The station needs repairs.':'The pump is still humming.');
    const run=await f.runWorldDirector(),savedHash=hash(run.source),signalIds=run.source.details.world_bridge.signals.map(signal=>signal.id);
    assert.equal(signalIds.length,2);
    f.reopen();
    const saved=f.db.getWorldEvent(f.guild,run.sourceRef);
    assert.equal(hash(saved),savedHash,'same bound source and hash persist across an actual DB close/reopen');
    const replay=directorBriefForAudience(f.db,f.guild,saved,f.scope);
    const writer=buildNarrativeContext(f.db,f.guild,f.scope,run.sourceRef,{operation:'describe_scene'});
    assert.deepEqual(replay.world_bridge.beats.map(beat=>beat.signal_ref),signalIds);
    assert.deepEqual(writer.packet.director_brief.world_bridge,replay.world_bridge);

    const signal=saved.details.world_bridge.signals[0],origin=signal.source_refs.map(ref=>ref.kind==='world_event'&&f.db.getWorldEvent(f.guild,ref.key))
      .find(event=>event?.kind==='ai_gm_input');
    assert.ok(origin,'saved optional source retains its actual player-authored origin');
    indexWorldEvent(f.db,f.guild,{key:origin.event_key,status:'retracted'},'fixture-gm');
    const after=worldDirectorBridgeBeats(f.db,f.guild,saved,f.scope);
    assert.ok(after.held>=1);
    assert.ok(!after.beats.some(beat=>beat.signal_ref===signal.id),'a previously bound hint cannot revive a retracted owner source');
    const rebuilt=buildNarrativeContext(f.db,f.guild,f.scope,run.sourceRef,{operation:'describe_scene'});
    assert.ok(!rebuilt.packet.director_brief.world_bridge.beats.some(beat=>beat.signal_ref===signal.id));
  } finally {f.close();}
});

test('changed controller attendance, audience scope, and scene do not widen a saved signal binding',async()=>{
  const f=createP07NativeFixture();
  try{
    for(const [i,pc] of f.pcs.entries())f.acceptSpeech(i?'owner-b':'owner-a',pc,`f23-scope-${i}`,
      i?'The station needs repairs.':'The pump is still humming.');
    const run=await f.runWorldDirector(),saved=run.source;
    assert.equal(saved.details.world_bridge.signals.length,2);
    const privateScope={mode:'private',actorUserId:'owner-a',actorCharacterId:f.pcs[0].id};
    assert.equal(worldDirectorBridgeBeats(f.db,f.guild,saved,privateScope),null,'audience changes cannot read a party binding as a private grant');

    f.db.setPresence(f.session.id,'owner-b','absent');
    const changedControl=worldDirectorBridgeBeats(f.db,f.guild,saved,f.scope);
    assert.ok(changedControl.held>=1,'stale owner attendance makes its old hint held');
    const surviving=buildNarrativeContext(f.db,f.guild,f.scope,run.sourceRef,{operation:'describe_scene'});
    assert.ok(surviving.packet.director_brief.world_bridge.beats.length<=1);

    f.db.setDirectorState(f.session.id,{scene_number:2});
    const changedScene=worldDirectorBridgeBeats(f.db,f.guild,saved,f.scope);
    assert.ok(changedScene);
    assert.equal(changedScene.beats.length,0,'scene change cannot replay the old scene opportunities');
    assert.ok(changedScene.held>=1);
  } finally {f.close();}
});
