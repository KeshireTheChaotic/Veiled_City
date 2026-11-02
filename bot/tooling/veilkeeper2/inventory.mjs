import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {analyzeModule, verifyReferences, destination, hash} from './source-audit.mjs';

const root = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const baseline = '1ba6c7e15db1a66ba34b36336f31437beffe44d6';
const git = (...args) => execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024,encoding:'utf8'});
const out = path.join(root,'docs/veilkeeper2');
fs.mkdirSync(out,{recursive:true});
const write = (name,value) => fs.writeFileSync(path.join(out,name),typeof value === 'string' ? value : JSON.stringify(value,null,2)+'\n');
const tracked = git('ls-tree','-r','--name-only',baseline).trim().split('\n');
const files = new Set(tracked);
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const modules = [];
const errors = [];
const manifest = [];
const legacyTestArtifact = file => /(?:^|\/)(?:tests?|[^/]*fixtures)\/|(?:test|spec|regression|fixture|benchmark)[^/]*\.(?:m?js|cjs)$/.test(file);
git('diff','--exit-code',baseline,'--','bot/src','bot/sql','content');
for (const file of tracked) {
  const bytes = fs.readFileSync(path.join(root,file));
  manifest.push({file,bytes:bytes.length,sha256:hash(bytes)});
  // Tests are inventoried by filename/hash only. Never import or repurpose legacy tests.
  if (/\.(?:m?js|cjs)$/.test(file) && (file.startsWith('bot/src/') || (!legacyTestArtifact(file) && !/(?:validate|check|quality)[^/]*\.(?:m?js|cjs)$/.test(file) && !file.startsWith('.github/')))) {
    try { modules.push(analyzeModule(file,bytes.toString('utf8'),files)); }
    catch(error) {errors.push({file,error:error.message});}
  }
}
const moduleMap = new Map(modules.map(m=>[m.file,m]));
const edges = modules.flatMap(m=>m.imports.map(e=>({from:m.file,...e})));
const incoming = new Map();
for(const e of edges) if(e.target) incoming.set(e.target,[...(incoming.get(e.target)??[]),{from:e.from,line:e.line}]);
const runtime = modules.filter(m=>m.file.startsWith('bot/src/'));
const entries = ['bot/src/index.js','bot/src/register-commands.js'];
const reachable = new Set();
function visit(file) { if(reachable.has(file)) return; reachable.add(file); for(const edge of moduleMap.get(file)?.imports??[]) if(edge.target) visit(edge.target); }
entries.forEach(visit);
const handoff = read('docs/veilkeeper2/VEILKEEPER_2_ASTRA6_REBUILD_HANDOFF.md');
const references = verifyReferences(handoff,file=>git('show',`${baseline}:${file}`));
const symbolReferences=[];
for(const match of handoff.matchAll(/\[([^\]\n]+)\]\(https:\/\/github\.com\/KeshireTheChaotic\/Veiled_City\/blob\/[a-f0-9]{40}\/([^#)]+)#L(\d+)-L(\d+)\)/g)){
  const [,label,file,start,end]=match;
  for(const nameMatch of label.matchAll(/(?:\b[A-Za-z_$][\w$]*\.)?([A-Za-z_$][\w$]*)\(\)/g)){
    const name=nameMatch[1];
    const found=(moduleMap.get(file)?.functions??[]).filter(f=>f.name===name);
    symbolReferences.push({file,name,citedStart:Number(start),citedEnd:Number(end),definitions:found,status:found.some(f=>f.line<=Number(end)&&f.end>=Number(start))?'definition-overlaps-cited-range':'manual-semantic-review-required'});
  }
}
// Build only the declarative Discord schema. No client, token, login or registration.
const {buildCommands} = await import('../../src/frameworks/discord/command-definitions.js');
const commands = buildCommands();
const commandPaths = [];
function commandWalk(node, prefix=[]) {
  const names = [...prefix,node.name];
  const children = (node.options??[]).filter(x=>x.type===1||x.type===2);
  if(children.length) children.forEach(x=>commandWalk(x,names));
  else commandPaths.push({path:names.join(' '),schema:node,destination:'R6 thin authenticated Discord adapter',status:'not-ported'});
}
commands.forEach(c=>commandWalk(c));
// Schema inspection is confined to a fresh in-memory SQLite database.
const db = new DatabaseSync(':memory:');
db.exec(read('bot/sql/schema.sql'));
const tables = db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>({
  ...row,columns:db.prepare(`PRAGMA table_info('${row.name.replaceAll("'","''")}')`).all(),foreignKeys:db.prepare(`PRAGMA foreign_key_list('${row.name.replaceAll("'","''")}')`).all(),
  destination:'R7 read-only legacy projection preserving original IDs and scopes',status:'mapping-not-implemented'
}));
db.close();
const schemas = modules.flatMap(m=>m.sql.filter(s=>/CREATE\s+TABLE|ALTER\s+TABLE|PRAGMA\s+user_version/i.test(s.text)).map(s=>({file:m.file,...s})));
const formats = [];
for(const m of modules) {
  const source=read(m.file);
  for(const match of source.matchAll(/['"](veiled[-_][a-zA-Z0-9_.:-]+)['"]/g)) formats.push({file:m.file,line:source.slice(0,match.index).split('\n').length,identifier:match[1],status:'compatibility-review-required'});
}
const rules = JSON.parse(read('bot/src/frameworks/daggerheart/native-feature-definitions.json'));
const houseRules=JSON.parse(read('bot/src/frameworks/daggerheart/native-house-errata.json'));
const {compileNativeFeatureRuleContexts}=await import('../../src/frameworks/daggerheart/native-feature-catalog.js');
let featureSources;
try { featureSources={status:'source-verified',rows:compileNativeFeatureRuleContexts()}; }
catch(error) {featureSources={status:'source-hold',error:error.message};}
const registrations = modules.flatMap(m=>m.registrations.map(r=>({file:m.file,...r})));
const dispositions = runtime.map(m=>({file:m.file,...destination(m.file),review:'candidate-not-individually-approved',functions:m.functions.map(f=>f.id),incoming:incoming.get(m.file)??[],reachableFromKnownEntry:reachable.has(m.file),deletionAuthorized:false}));
const tests = manifest.filter(m=>legacyTestArtifact(m.file) && !m.file.startsWith('bot/src/'));
const content = manifest.filter(m=>/^content\//.test(m.file));
const unresolved = edges.filter(e=>e.status==='missing'||e.status==='dynamic-unresolved');
const summary = {baseline,head:git('rev-parse','HEAD').trim(),trackedFiles:tracked.length,parsedModules:modules.length,runtimeModules:runtime.length,functions:modules.reduce((n,m)=>n+m.functions.length,0),imports:edges.length,unresolvedImports:unresolved.length,parseErrors:errors.length,commands:commands.length,commandLeaves:commandPaths.length,tables:tables.length,referenceRanges:references.length,invalidReferences:references.filter(r=>!r.rangeValid).length,legacyTestArtifacts:tests.length,contentFiles:content.length,gate:'R0 HOLD: candidate dispositions, dynamic call binding, migration and mechanic completeness need review'};
write('BASELINE_MANIFEST.json',manifest);
write('CALL_GRAPH.json',{summary,limitations:['AST callsites are not resolved runtime dispatch edges.','Injected callbacks, computed members and string registries require explicit binding review.','Known-entry reachability cannot prove dead code.','Legacy tests are hashed and listed only, not executed or parsed.'],modules,edges,unresolved,errors});
write('MODULE_DISPOSITIONS.json',dispositions);
write('SOURCE_REFERENCE_AUDIT.json',references);
write('SYMBOL_REFERENCE_AUDIT.json',symbolReferences);
write('COMMAND_SCHEMA.json',commands);
write('COMMAND_PATHS.json',commandPaths);
write('STATE_SCHEMA.json',{tables,migrations:schemas,sqlAccess:modules.flatMap(m=>m.sql.map(s=>({file:m.file,...s})))});
write('RULE_CATALOG.json',{definitions:rules,houseRules,featureSources,registrations:registrations.filter(r=>!r.callee.endsWith('.setName')),ruleModules:runtime.filter(m=>m.file.includes('/daggerheart/')).map(m=>({file:m.file,sha256:m.sha256,functions:m.functions,exports:m.exports}))});
write('COMPATIBILITY_FORMATS.json',{formats,content,tests});
write('SUMMARY.json',summary);
write('REBUILD_INVENTORY.md',`# R0 inventory\n\nBaseline: \`${baseline}\`. Generated with \`node bot/tooling/veilkeeper2/inventory.mjs\`.\n\n${Object.entries(summary).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n\nThe complete tracked-file hash manifest, AST module/function/import/callsite graph, command schema, SQL tables and foreign keys, source-reference hashes, rule definitions and registration sites are adjacent JSON artifacts. Every parsed runtime module has a candidate destination in MODULE_DISPOSITIONS.json. These are review obligations, not approved deletions.\n\nNo runtime, campaign, migration, live model, or Discord execution has occurred. No legacy test was run. Historical test paths/hashes identify coverage obligations only. No source/receipt graph or dynamic dispatch completeness is claimed.\n`);
write('COMMAND_COMPATIBILITY.md',`# Discord compatibility obligations\n\n${commands.length} top-level commands, ${commandPaths.length} leaf paths. Full option types, choices and required fields: COMMAND_SCHEMA.json. All await R6 implementation and fresh behavior coverage.\n\n| Command | Destination | Status |\n|---|---|---|\n${commandPaths.map(c=>`| \`${c.path}\` | Authenticated R6 adapter | Not ported |`).join('\n')}\n`);
write('STATE_MIGRATION_MAP.md',`# State migration obligations\n\nBaseline schema inspection used an isolated in-memory SQLite database only. STATE_SCHEMA.json retains full column/default/foreign-key definitions and statically found migration/SQL sites. Dynamic ALTER calls and JavaScript backfills require individual review; schema execution alone is not a migration dry run.\n\nAll tables retain original identifiers, source lineage, ownership, privacy and pending/delivery status. No importer exists yet. No production data was opened. Rollback at this phase is simply retaining the unchanged baseline: no data or runtime conversion occurred.\n\n| Table | Destination | Status |\n|---|---|---|\n${tables.map(t=>`| \`${t.name}\` | Read-only legacy projection then explicit R7 mapping | Not implemented |`).join('\n')}\n`);
write('RULE_PARITY_MATRIX.md',`# Rule parity obligations\n\nRULE_CATALOG.json preserves complete native-feature definitions and registration callsites, plus every parsed Daggerheart module/function/export. A catalog entry is not proof of mechanical parity. No legacy tests or fixtures may be reused. Each port needs fresh fixed-native-RNG cases, authenticated owner/consent/source checks, no-effect previews, replay and concurrency checks.\n\n| Source module | Destination | Parity |\n|---|---|---|\n${runtime.filter(m=>m.file.includes('/daggerheart/')).map(m=>`| \`${m.file}\` | Internal R3 ruleset behind action_propose | Not tested |`).join('\n')}\n\nHolds: enumerate all public mechanics beyond feature definitions, map exact SRD/house-rule authority per operation, resolve injected handler registrations, and independently review every rule before replacement.\n`);
write('REMOVE_LIST.md',`# Removal gate\n\n**No deletion is authorized.** Every candidate in MODULE_DISPOSITIONS.json has deletionAuthorized=false. Static incoming imports are supplied; neither zero imports nor unreachable-from-index is a zero-consumer proof for dynamically dispatched commands, factories or persisted readers.\n\nR8 requires fresh replacement coverage, complete command/consumer binding, semantic migration and rollback proof. The legacy runtime, tests, data readers and writer contracts remain unchanged.\n`);
console.log(JSON.stringify(summary,null,2));
