// Offline AF00 evidence builder. Reads source as text; never loads the bot or a database.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const out=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(out,'../../../..');
const rel=p=>path.relative(root,p).replaceAll('\\','/');
const sha=v=>createHash('sha256').update(v).digest('hex');
const jsonHash=v=>sha(JSON.stringify(v));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const head=git('rev-parse','HEAD').trim(),branch=git('branch','--show-current').trim();
const initialStatus=git('status','--porcelain=v1','--untracked-files=all');
const files=new Map(walk(path.join(root,'bot/src')).filter(p=>/\.(?:js|json)$/.test(p)).map(p=>[rel(p),fs.readFileSync(p,'utf8')]));
const amendment='docs/Implementation_Plans/phases/AF00/Veiled_City_Autonomous_Feature_Refactor_Amendment.md';
const definitions='bot/src/frameworks/daggerheart/native-feature-definitions.json';
const errataPath='bot/src/frameworks/daggerheart/native-house-errata.json';
const catalog=JSON.parse(files.get(definitions));
const errata=JSON.parse(files.get(errataPath));
const contentPaths=['content/GM_PRIVATE/ADVERSARIES/adversaries.json','content/GM_PRIVATE/ENVIRONMENTS/environments.json',
  'content/GM_PRIVATE/ADVERSARIES/ADVERSARY_COMPENDIUM.md','content/GM_PRIVATE/ENVIRONMENTS/ENVIRONMENT_COMPENDIUM.md','content/CARDS/DOMAINS/SIGNAL.md'];
for(const p of contentPaths)files.set(p,read(p));
const dispositions=new Map([...read(amendment).matchAll(/^\|\s*\d+\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/gm)].map(m=>[m[1],{status:m[2],disposition:m[3]}]));
assert.equal(dispositions.size,153);
const hits=needle=>[...files].filter(([p])=>p.endsWith('.js')).flatMap(([p,text])=>text.split(/\r?\n/).flatMap((line,i)=>line.includes(needle)?[{path:p,line:i+1,text:line.trim()}]:[]));
const modules=[...files].filter(([p])=>p.endsWith('.js'));
const edges=[];
for(const [p,text] of modules){
  for(const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])(\.[^'"\n]+)\1/g)){
    const target=path.posix.normalize(path.posix.join(path.posix.dirname(p),m[2]));
    edges.push({from:p,to:target,line:text.slice(0,m.index).split('\n').length,present:files.has(target)});
  }
}
const totals={},rows=[];
for(const f of catalog.features){
  const d=dispositions.get(f.feature_key);assert.ok(d,f.feature_key);assert.equal(d.status,f.status);
  totals[d.disposition]=(totals[d.disposition]||0)+1;
  const contentPath=f.source_ref.split('#')[0],actors=JSON.parse(files.get(contentPath));
  const matches=actors.filter(a=>a.name===f.actor_name);assert.equal(matches.length,1,f.feature_key);
  const actor=matches[0],printed=actor.features[f.index];
  assert.equal(jsonHash(printed),f.source_hash,`${f.feature_key} printed rule`);
  assert.equal(jsonHash(actor),f.template_hash,`${f.feature_key} template`);
  const versions=errata.entries.filter(e=>e.sources.some(s=>s.kind==='feature'&&s.key===f.feature_key));
  for(const e of versions){const s=e.sources.find(s=>s.key===f.feature_key);assert.equal(s.source_hash,f.source_hash);assert.equal(s.template_hash,f.template_hash);}
  if(f.authored_rule){const e=versions.find(e=>e.id===f.authored_rule.id&&e.version===f.authored_rule.version);assert.ok(e);assert.equal(jsonHash(e),f.authored_rule.hash);}
  const codeHits=[...hits(f.feature_key),...(f.native_handler?hits(f.native_handler):[])];
  const unique=[...new Map(codeHits.map(h=>[`${h.path}:${h.line}`,h])).values()];
  rows.push({feature_key:f.feature_key,disposition:d.disposition,catalog_status:f.status,native_handler:f.native_handler,
    source_ref:f.source_ref,source_hash:f.source_hash,template_hash:f.template_hash,printed_rule:printed,
    trigger_kind:f.trigger_kind,target_policy:f.target_policy,roll_protocol:f.roll_protocol,costs:f.costs,
    catalog_limitation:f.reason,authored_rule:f.authored_rule||null,
    house_rules:versions.map(e=>({id:e.id,version:e.version,status:e.status,hash:jsonHash(e),interpretation:e.interpretation,limitations:e.limitations||[]})),
    current_use_precedence:'Exact printed JSON plus applicable versioned native house rule and current native validator. Preserve all historical versions; latest version is not automatic authority for old receipts.',
    authority:{gm:'Select GM-owned intent and describe entitled fiction within source and campaign gates.',player:'Own PC declarations, rolls, reactions, optional payments and any source-granted choice; silence remains pending.',engine:'Validate source, actor, trigger, audience, target and costs; commit only implemented operations atomically with replay receipts.'},
    migration_gate:d.disposition==='RETIRE_CONTEXT'?'AF01: exact rule, binding, audience, costs-as-information and ordinary adjudication parity before wrapper removal.':
      d.disposition==='GENERALIZE_EXISTING'?'AF03: native effect and historical receipt/replay parity before replacement.':
      d.disposition==='RETAIN_PROOF_GATE'?'AF03: preserve unique source, owner choice, audience and transaction proof.':'AF04: source-qualified implementation required; current review-only hold remains.',
    runtime_references:unique});
}
assert.equal(rows.length,153);assert.equal(new Set(rows.map(r=>r.feature_key)).size,153);
assert.deepEqual(totals,{GENERALIZE_EXISTING:20,RETIRE_CONTEXT:49,RETAIN_PROOF_GATE:9,ADD_SHARED_OPS:42,GM_JUDGMENT_NATIVE_COSTS:5,ADD_DOMAIN_PROOF:28});
const supported=rows.filter(r=>r.catalog_status==='supported');
assert.equal(supported.length,78);assert.equal(supported.filter(r=>r.native_handler.endsWith('_context')).length,49);
for(const r of supported)assert.ok(r.runtime_references.some(h=>!h.path.endsWith('/feature-catalog.js')),`No implementation reference: ${r.feature_key}`);
// This is a conservative static graph: exact identifiers and local import/re-export edges,
// not a claim that text matches are executed or that indirect JS calls are resolved.
const seeds=new Set(supported.flatMap(r=>r.runtime_references.map(h=>h.path)));
for(const p of ['bot/src/frameworks/daggerheart/native-feature-catalog.js','bot/src/native-feature-catalog.js','bot/src/native-house-errata.js'])seeds.add(p);
const affected=new Set(seeds);let changed=true;
while(changed){changed=false;for(const e of edges)if(affected.has(e.to)&&!affected.has(e.from)){affected.add(e.from);changed=true;}}
const symbols=[];
for(const p of [...seeds].sort()){
  const text=files.get(p);if(!text)continue;
  const names=new Set([...text.matchAll(/\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
  for(const name of names)if(/^(?:create|project|inspect|native|compile|require|commit|capture|resolve|authorize|apply|prepare|publish|replay)/.test(name))symbols.push({name,declared_in:p,references:hits(name)});
}
const recordNames=new Set();
for(const p of seeds)for(const m of (files.get(p)||'').matchAll(/\bkind\s*:\s*['"]([^'"]+)['"]|\b(?:getCityRecord|listCityRecords)\([^\n]*?['"]([^'"]+)['"]/g)){
  const name=m[1]||m[2];if(/(?:feature|receipt|environment|reaction|incoming|gm_action|adversary|prepared_position)/.test(name))recordNames.add(name);
}
const records=[...recordNames].sort().map(kind=>({kind,candidate_writers_and_readers:hits(kind)}));
const pins=[definitions,errataPath,...contentPaths,...[...affected].sort()];
const fingerprints=[...new Set(pins)].map(p=>({path:p,sha256:sha(files.get(p)),bytes:Buffer.byteLength(files.get(p))}));
// HEAD pins are independent of concurrent dirty-tree bytes.
const headPins=[definitions,errataPath,...contentPaths].map(p=>({path:p,sha256:sha(git('show',`${head}:${p}`))}));
const drift=fingerprints.filter(p=>!fs.existsSync(path.join(root,p.path))||sha(fs.readFileSync(path.join(root,p.path)))!==p.sha256);
assert.equal(drift.length,0,'Inputs changed during audit; snapshot is not internally stable');
assert.equal(git('rev-parse','HEAD').trim(),head,'HEAD changed during audit');
write('BASELINE.json',{phase:'AF00',agent:'C',captured_utc:new Date().toISOString(),head,branch,node:process.version,
  amendment_sha256:sha(read(amendment)),initial_worktree_status:initialStatus,final_worktree_status:git('status','--porcelain=v1','--untracked-files=all'),
  catalog_version:catalog.version,rules_edition:catalog.rules_edition,errata_authority:errata.authority,
  errata_versions:errata.entries.map(e=>({id:e.id,version:e.version,status:e.status,hash:jsonHash(e)})),
  head_source_pins:headPins,worktree_source_pins:fingerprints,source_snapshot_stable:true,
  boundary:'Static offline audit only. Concurrent agents may change files after capture; compare pins before deletion. No runtime, provider, Discord, database or release validation.'});
write('MIGRATION_LEDGER.json',{phase:'AF00',head,totals,features:rows});
write('DEPENDENCIES.json',{phase:'AF00',head,method:'Conservative local import/re-export graph plus exact identifier/handler/feature references. Candidate call edges require source inspection; no dynamic execution trace.',
  seed_modules:[...seeds].sort(),reverse_import_closure:[...affected].sort(),imports:edges.filter(e=>affected.has(e.from)||affected.has(e.to)),symbols,records});
write('CHECKS.json',{phase:'AF00',head,command:'node docs/Implementation_Plans/phases/AF00/audit.mjs',exit_code:0,
  completed:['153 distinct amendment dispositions match catalog statuses','153 exact printed-rule and actor-template hashes match',
    'All feature-linked house-rule source hashes match','Explicit authored-rule hashes match','78 supported / 75 review-only; 49 context / 29 other handlers',
    'All 78 supported handlers have non-registry production references','Six disposition counts match amendment','Captured source files and HEAD stable during collection'],
  totals,production_tests:'Not run: no production module modified or imported.',runtime_parity:'Not tested; mandatory before AF01/AF03 deletion.'});
console.log(JSON.stringify({head,features:rows.length,totals,modules:affected.size,symbols:symbols.length,records:records.length,checks:'PASS'}));
