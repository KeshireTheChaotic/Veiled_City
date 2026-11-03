import fs from 'node:fs';
const root=new URL('../../../docs/veilkeeper2/',import.meta.url);
const contracts=JSON.parse(fs.readFileSync(new URL('RECORD_CONTRACTS.json',root),'utf8'));
/** Mechanical grouping of dynamic record uses by what the call can do. It closes no hold:
 * every group keeps its legacy payload read-only until a typed projection is proved.
 */
export function classify(use){
  if(/\(\s*\.\.\.\s*\w+\s*\)/.test(use.expression))return 'forwarding-wrapper';
  if(!use.write)return /^(?:get)/.test(use.callee)?'keyed-read':'list-read';
  if(/^(?:indexWorldEvent|saveWorldEvent)$/.test(use.callee))return 'world-event-write';
  return use.kindExpression===null&&/\{\s*\.\.\./.test(use.expression)?'city-record-write-spread-kind':'city-record-write-dynamic-kind';
}
export function triage(uses){
  const groups={};for(const use of uses){const g=classify(use);(groups[g]??={count:0,callees:{},files:{}});groups[g].count++;groups[g].callees[use.callee]=(groups[g].callees[use.callee]??0)+1;groups[g].files[use.file]=(groups[g].files[use.file]??0)+1;}
  return groups;
}
if(import.meta.url===new URL(`file:///${process.argv[1].replace(/\\/g,'/')}`).href){
  const groups=triage(contracts.dynamicUses),report={total:contracts.dynamicUses.length,scope:'mechanical grouping only; no record is classified public, migrated or granted execution authority',groups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,{count:v.count,callees:v.callees,topFiles:Object.entries(v.files).sort((a,b)=>b[1]-a[1]).slice(0,10)}]))};
  fs.writeFileSync(new URL('DYNAMIC_RECORD_TRIAGE.json',root),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.count])),null,1),report.total);
}
