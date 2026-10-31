// Read-only current-consumer audit. This is deletion planning, never runtime equivalence proof.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const out=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(out,'../../../..');
const relative=p=>path.relative(root,p).replaceAll('\\','/');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const modules=new Map(walk(path.join(root,'bot/src')).filter(p=>p.endsWith('.js')).map(p=>[relative(p),fs.readFileSync(p,'utf8')]));
const digest=text=>createHash('sha256').update(text).digest('hex');
const base='bot/src/frameworks/daggerheart/',adversary=base+'adversary-contexts.js',environment=base+'environment-rule-contexts.js';
const wrappers=[...modules].filter(([p,t])=>p.startsWith(base+'native-environment-')&&t.includes("from './environment-rule-contexts.js'"));
assert.equal(wrappers.length,22,'Expected 22 current environment context facades; reconcile moved paths before deletion.');
const candidates=new Set([adversary,environment,...wrappers.map(([p])=>p)]);
const features=JSON.parse(fs.readFileSync(path.join(root,base+'native-feature-definitions.json'),'utf8')).features.filter(f=>f.native_handler?.endsWith('_context'));
assert.equal(features.length,49);
const refs=symbol=>[...modules].flatMap(([p,text])=>text.split(/\r?\n/).flatMap((line,i)=>new RegExp('\\b'+symbol+'\\b','u').test(line)?[{path:p,line:i+1,text:line.trim()}]:[]));
const entries=[...candidates].map(p=>{
  const text=modules.get(p),symbols=[...new Set([...text.matchAll(/export function (\w+)|projectors\.(\w+)\s*=/gu)].map(m=>m[1]||m[2]))];
  return {path:p,sha256:digest(text),symbols:symbols.map(symbol=>({symbol,
    external_references:refs(symbol).filter(r=>!candidates.has(r.path)),
    candidate_references:refs(symbol).filter(r=>r.path!==p&&candidates.has(r.path))})),
    durable_writer_calls:[...text.matchAll(/\b(saveCityRecord|recordMutation|updateCharacterData|updateCombatant|changeFear)\s*\(/gu)].map(m=>m[1])};
});
const outside=entries.flatMap(e=>e.symbols.flatMap(s=>s.external_references));
const report={phase:'AF06',status:'current_static_consumer_audit_only',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  method:'Exact JavaScript symbol references across current bot/src. Does not resolve dynamic property construction, external clients or runtime equivalence.',
  counts:{source_context_occurrences:features.length,adversary_projectors:features.filter(f=>f.actor_kind==='adversary').length,
    environment_facades:wrappers.length,candidate_modules:candidates.size,external_reference_sites:outside.length},
  external_consumers:[...new Set(outside.map(r=>r.path))],entries,
  protected_paths:[base+'professional-entry-rules.js','bot/src/native-professional-entry.js',base+'feature-context-projection.js',
    base+'adversary-binding-rules.js',base+'native-environment-scene.js'],
  deletion_gate:'Do not delete from this static artifact alone. Reconcile current public exports and ownership manifests with Agents A/B, verify shared context through native scene consumers, and preserve historical source/receipt readers and Professional Entry mechanics.'};
fs.writeFileSync(path.join(out,'CONTEXT-CONSUMERS.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,counts:report.counts,external_consumers:report.external_consumers}));
