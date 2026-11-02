import fs from 'node:fs';
import {bindingIndex,walkAst} from './binding-audit.mjs';
const read=file=>fs.readFileSync(new URL('../../../'+file,import.meta.url),'utf8');
const publicAudit=JSON.parse(read('docs/veilkeeper2/PUBLIC_BINDINGS.json'));
const index=bindingIndex(new Map(publicAudit.sources.map(({file})=>[file,read(file)])));
const uses=[];
for(const [file,module] of index.modules){
  const text=node=>node?module.source.slice(node.start,node.end):null;
  walkAst(module.ast,node=>{
    if(node.type!=='CallExpression')return;
    const callee=node.callee.type==='MemberExpression'&&!node.callee.computed?node.callee.property.name:node.callee.name;
    if(!/^(?:saveCityRecord|getCityRecord|listCityRecords|indexWorldEvent|saveWorldEvent|getWorldEvent|listWorldEvents)$/.test(callee??''))return;
    const object=node.arguments.find(n=>n.type==='ObjectExpression');
    const properties=Object.fromEntries((object?.properties??[]).filter(p=>p.type==='Property').map(p=>[p.key.name??p.key.value,p.value]));
    const kind=callee==='getCityRecord'?node.arguments[1]:properties.kind;
    const literal=kind?.type==='Literal'&&typeof kind.value==='string'?kind.value:null;
    uses.push({file,line:node.loc.start.line,callee,kind:literal,kindExpression:text(kind),source:text(properties.source_event??properties.source_id),visibility:text(properties.visibility),status:text(properties.status),classification:literal?'literal-kind':'dynamic-or-unfiltered',write:/^(save|index)/.test(callee),expression:text(node)});
  });
}
const kinds=[...new Set(uses.map(u=>u.kind).filter(Boolean))].sort().map(kind=>({kind,writers:uses.filter(u=>u.kind===kind&&u.write),readers:uses.filter(u=>u.kind===kind&&!u.write),migration:'retain original kind, record key, source, scope, status and payload in read-only legacy namespace until a parity-proven typed projection replaces it',deletionAuthorized:false}));
const destinations={
  daggerheart:['port','v2/rules/daggerheart','R3'],character:['port','v2/app/characters','R6'],
  content:['port','v2/context','R2'],knowledge:['port','v2/knowledge','R2'],npc:['port','v2/world/npc','R5'],
  world:['port','v2/world','R5'],session:['port','v2/app/session','R6'],publication:['port','v2/publication','R7'],
  persistence:['port','v2/persistence','R7'],discord:['port','v2/transport/discord','R6'],
  'ai-provider':['port','v2/transport/model','R4'],operations:['port','v2/app/operations','R6'],
  intent:['replace','v2/kernel','R3'],narrative:['replace','v2/gm and v2/publication','R4']
};
const dispositions=publicAudit.exports.map(row=>{
  const original=row.resolution.file;
  const owner=original.match(/^bot\/src\/frameworks\/([^/]+)\//)?.[1];
  let decision=destinations[owner];
  if(!decision)decision=original.includes('/kernel/')?['retain','v2/kernel shared pure utility','R1']:
    original.includes('/framework-to-framework/')||original.includes('/application/composition/')?['replace','v2/app explicit composition','R8']:
    original.includes('/application/workflows/')?['replace','v2/app','R6']:['port','v2/app legacy-contract adapter until assigned domain extraction','R6'];
  return {exposedBy:row.file,symbol:row.name,source:original,sourceSymbol:row.resolution.name,line:row.resolution.line,end:row.resolution.end,fate:decision[0],destination:decision[1],phase:decision[2],obligation:'preserve source-specific permission, effects, receipt, return/error and current consumer contracts; fresh coverage required before replacement',status:'destination-assigned-not-ported',deletionAuthorized:false};
});
const summary={recordUses:uses.length,literalKinds:kinds.length,dynamicUses:uses.filter(u=>u.classification==='dynamic-or-unfiltered').length,publicDestinations:dispositions.length};
const write=(name,value)=>fs.writeFileSync(new URL('../../../docs/veilkeeper2/'+name,import.meta.url),JSON.stringify(value,null,2)+'\n');
write('RECORD_CONTRACTS.json',{summary,kinds,dynamicUses:uses.filter(u=>u.classification==='dynamic-or-unfiltered'),limitations:['String values and source expressions are enumerated without execution.','Dynamic keys, spread updates, default visibility and injected repository methods still need per-port verification.','No dynamic record has been classified public or granted execution authority.']});
write('PUBLIC_DISPOSITIONS.json',dispositions);
console.log(JSON.stringify(summary,null,2));
