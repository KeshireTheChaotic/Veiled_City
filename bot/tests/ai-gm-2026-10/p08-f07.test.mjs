import test from 'node:test';
import assert from 'node:assert/strict';
import {OperationalMetrics,measureStage} from '../../src/operational-metrics.js';

test('opening telemetry records scoped stages without recording narrative or fake provider usage',async()=>{
  const metrics=new OperationalMetrics({pricing:{}}),guildId='synthetic-guild';
  for(const stage of ['opening_authoring','opening_publish'])
    await measureStage(metrics,stage,async()=>({ok:true}),{guildId});
  metrics.record('opening_source',{guildId,durationMs:1.25});
  metrics.record('opening_native_accept',{guildId,durationMs:2.5});
  metrics.record('opening_commit',{guildId,durationMs:0.75});
  const snapshot=metrics.snapshot(guildId);
  for(const stage of ['opening_source','opening_authoring','opening_native_accept','opening_commit','opening_publish']){
    assert.equal(snapshot.stages[stage].count,1);
    assert.ok(snapshot.stages[stage].latency_ms.p50>=0);
  }
  assert.equal(snapshot.stages.model_request,undefined);
  assert.match(snapshot.privacy,/no prompts, narration, IDs or campaign text/);
});
