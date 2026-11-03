import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,triage} from '../../tooling/veilkeeper2/triage.mjs';
const use=o=>({callee:'getWorldEvent',write:false,kindExpression:null,expression:'db.getWorldEvent(g,k)',...o});
test('dynamic record uses are grouped by capability without dropping any',()=>{
  const uses=[use({}),use({callee:'listCityRecords'}),use({callee:'indexWorldEvent',write:true}),use({callee:'saveCityRecord',write:true,expression:'db.saveCityRecord(g,{...r,key})'}),use({callee:'saveCityRecord',write:true,kindExpression:'kind',expression:'db.saveCityRecord(g,{kind,key})'}),use({callee:'indexWorldEvent',write:true,expression:'indexWorldEvent(...args)'})];
  assert.deepEqual(uses.map(classify),['keyed-read','list-read','world-event-write','city-record-write-spread-kind','city-record-write-dynamic-kind','forwarding-wrapper']);
  assert.equal(Object.values(triage(uses)).reduce((n,g)=>n+g.count,0),uses.length);
});
