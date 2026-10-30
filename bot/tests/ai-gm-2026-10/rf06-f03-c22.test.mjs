import test from 'node:test';
import assert from 'node:assert/strict';
import {operationalReport,OperationalMetrics} from '../../src/frameworks/operations/public.js';
function fixture(){
  let reads=0;
  const native={groups:[{kind:'pc_incoming_attack',status:'awaiting_armor',count:2},{kind:'pvp_fear_trigger',status:'private raw status',count:1}],publications:[{status:'uncertain',count:1}],turns:[{status:'needs_recovery',count:1}],manual:3,reviews:4,archival:{archived:2,conflicts:1},incidents:[{kind:'publication',record_key:'private-record',status:'uncertain',source_status:'active',age_seconds:17,payload:'hidden narrative payload'},{kind:'pvp_fear_trigger',record_key:'private-fear',status:'awaiting_owner',source_status:'retracted',age_seconds:NaN},{kind:'turn',record_key:'private-turn',status:'private raw status',source_status:'invalid',age_seconds:Infinity}]};
  const db={operationalHealthData:()=>{reads++;return native;}},metrics=new OperationalMetrics();return {db,native,metrics,reads:()=>reads};
}

test('original authorization gate rejects before reading native operational data',()=>{
  const f=fixture();for(const [guild,options]of [['guild',{}],[null,{authorized:true}]])assert.throws(()=>operationalReport(f.db,guild,options),error=>error.code==='PERMISSION_DENIED'&&error.message==='GM/admin permission required.');assert.equal(f.reads(),0);
});
test('report retains closed counts/statuses/ages and no raw record keys or payload text',()=>{
  const f=fixture(),before=structuredClone(f.native),report=operationalReport(f.db,'guild',{authorized:true,metrics:f.metrics});
  assert.equal(report.native.counts[1].status,'unknown');assert.equal(report.native.publications[0].status,'uncertain');assert.equal(report.native.manual_mutation_receipts,3);assert.equal(report.native.fear_review_events,4);assert.equal(report.incidents[1].age_seconds,null);assert.equal(report.incidents[1].age_basis,'native_roll_created_at');assert.equal(report.incidents[2].status,'unknown');assert.equal(report.incidents[2].source_status,null);
  const text=JSON.stringify(report);for(const raw of ['private-record','private-fear','private-turn','hidden narrative payload','private raw status'])assert.ok(!text.includes(raw));assert.deepEqual(f.native,before);assert.equal(f.reads(),1);
});
test('exact native reference lookup retains guild-scoped hashed matching and minimal missing result',()=>{
  const f=fixture(),full=operationalReport(f.db,'guild',{authorized:true,metrics:f.metrics}),reference=full.incidents[0].reference;
  assert.match(reference,/^[0-9a-f]{24}$/);assert.deepEqual(operationalReport(f.db,'guild',{authorized:true,metrics:f.metrics,reference}).incident,full.incidents[0]);
  assert.equal(operationalReport(f.db,'other',{authorized:true,metrics:f.metrics,reference}).incident,null);const missing=operationalReport(f.db,'guild',{authorized:true,metrics:f.metrics,reference:'expired'});assert.deepEqual(Object.keys(missing),['incident','note']);assert.equal(missing.incident,null);
});
test('existing in-memory incident reference is returned without native recovery execution',()=>{
  const f=fixture();f.metrics.incident('publication',{guildId:'guild',reference:'raw-memory-key',code:'UNCERTAIN'});const memory=f.metrics.incidents('guild')[0],report=operationalReport(f.db,'guild',{authorized:true,metrics:f.metrics,reference:memory.reference});assert.deepEqual(report.incident,memory);assert.equal(f.reads(),1);assert.ok(!JSON.stringify(report).includes('raw-memory-key'));
});
test('uncertainty and age guidance remain truthful and read-only',()=>{
  const f=fixture(),report=operationalReport(f.db,'guild',{authorized:true,metrics:f.metrics});assert.equal(report.certainty,'Persisted delivering/uncertain is NOT delivered. This report performs no recovery or model execution.');assert.ok(report.age_note.includes('Unknown historical ages remain null'));assert.ok(report.live_quality_scores.includes('Not collected offline'));assert.equal(report.native_counts_capped,false);
});
test('native group cap marker preserves exact boundary without truncating returned rows',()=>{
  const f=fixture();f.native.groups=Array.from({length:256},()=>({kind:'fixture',status:'active',count:1}));const report=operationalReport(f.db,'guild',{authorized:true,metrics:f.metrics});assert.equal(report.native_counts_capped,true);assert.equal(report.native.counts.length,256);assert.equal(f.native.groups.length,256);
});
