import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,triage,candidateKinds} from '../../tooling/veilkeeper2/triage.mjs';
const use=o=>({callee:'getWorldEvent',write:false,kindExpression:null,expression:'db.getWorldEvent(g,k)',...o});
test('dynamic record uses are grouped by capability without dropping any',()=>{
  const uses=[use({}),use({callee:'listCityRecords'}),use({callee:'indexWorldEvent',write:true}),use({callee:'saveCityRecord',write:true,expression:'db.saveCityRecord(g,{...r,key})'}),use({callee:'saveCityRecord',write:true,kindExpression:'kind',expression:'db.saveCityRecord(g,{kind,key})'}),use({callee:'indexWorldEvent',write:true,expression:'indexWorldEvent(...args)'})];
  assert.deepEqual(uses.map(classify),['keyed-read','list-read','world-event-write','city-record-write-spread-kind','city-record-write-dynamic-kind','forwarding-wrapper']);
  assert.equal(Object.values(triage(uses)).reduce((n,g)=>n+g.count,0),uses.length);
});
test('candidate kinds are the sorted unique literal kinds in a source text',()=>{
  assert.deepEqual(candidateKinds("a({kind:'plan',x:1});b({ kind : \"plan\" });c({kind:`note`});d({kind});e({kind:other})"),['note','plan']);assert.deepEqual(candidateKinds('none'),[]);
});
test('every resolved writer is a real city-record writer file with a non-empty closed kind set',async()=>{
  const {RESOLVED_WRITERS}=await import('../../tooling/veilkeeper2/triage.mjs'),fs=await import('node:fs');
  for(const [file,r] of Object.entries(RESOLVED_WRITERS)){assert.ok(fs.existsSync(new URL('../../../'+file,import.meta.url)),file);assert.ok(r.kinds.length>0&&r.kinds.every(k=>/^[a-z_]+$/.test(k))&&r.evidence);}
});
