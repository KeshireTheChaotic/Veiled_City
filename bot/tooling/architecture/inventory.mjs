/** RF inventory CLI: filesystem/Git source reads only; no application/legacy-test execution. */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectModule,resolveImport,stronglyConnected} from './source-graph.mjs';

export const digest=text=>createHash('sha256').update(text).digest('hex');
const csvCell=value=>`"${String(value??'').replaceAll('"','""')}"`;
export const csv=(columns,rows)=>[columns.join(','),...rows.map(row=>columns.map(key=>csvCell(row[key])).join(','))].join('\n')+'\n';
const framework=owner=>!['kernel','bootstrap','application','tooling'].includes(owner)&&!owner.includes('--');
const frameworkMembers=owner=>owner.includes('--')?owner.split('--'):framework(owner)?[owner]:[];
export function ownership(groups,files){
  const assigned=new Map();
  for(const group of groups)for(const name of group.files.split(/\s+/).filter(Boolean)){
    const old_path=`bot/src/${name}`;if(assigned.has(old_path))throw new Error(`Duplicate owner: ${old_path}`);
    if(!files.has(old_path))throw new Error(`Stale ownership path: ${old_path}`);
    const owner=group.owner;
    const new_path=['index.js','register-commands.js'].includes(name)?old_path:
      owner==='kernel'||owner==='bootstrap'?`bot/src/${owner}/${path.posix.basename(name)}`:
      owner==='application'?`bot/src/application/workflows/${path.posix.basename(name)}`:
      owner.includes('--')?`bot/src/framework-to-framework/${owner}/${path.posix.basename(name)}`:
      `bot/src/frameworks/${owner}/${path.posix.basename(name)}`;
    assigned.set(old_path,{old_path,new_path,owner,rationale:group.rationale,move_phase:group.phase});
  }
  const missing=[...files].filter(file=>file.startsWith('bot/src/')&&!assigned.has(file));
  if(missing.length)throw new Error(`Unowned source: ${missing.join(', ')}`);
  for(const file of files)if(file.startsWith('bot/tooling/'))assigned.set(file,{old_path:file,new_path:file,owner:'tooling',
    rationale:'Offline architecture audit only; no runtime module is imported/evaluated.',move_phase:'RF00'});
  for(const file of files)if(file.startsWith('bot/scripts/'))assigned.set(file,{old_path:file,new_path:file,owner:'tooling',
    rationale:'Supported non-test CLI wrapper; preserve path until RF07 compatibility verification.',move_phase:'RF07'});
  const targets=new Set();for(const entry of assigned.values()){if(targets.has(entry.new_path))throw new Error(`Relocation collision: ${entry.new_path}`);targets.add(entry.new_path);}
  return assigned;
}
export function analyzeSources(sources,decisions,aliases={}){
  const files=new Set(Object.keys(sources)),owners=ownership(decisions.groups,files),modules=[],edges=[];
  for(const [file,source] of Object.entries(sources).sort(([a],[b])=>a.localeCompare(b))){
    const parsed=file.endsWith('.json')?{imports:[],exports:[],functions:[],calls:[],topLevelCalls:[],moduleState:[],coupling:[],warnings:[]}:inspectModule(source);
    const owner=owners.get(file)?.owner||'tooling';
    const local=[];
    for(const entry of parsed.imports){
      const resolution=resolveImport(file,entry.specifier,files,aliases),to=resolution.target,
        targetOwner=owners.get(to)?.owner||(files.has(to)&&to.startsWith('bot/tooling/')?'tooling':null);
      const edge={from:file,to,kind:entry.kind,line:entry.line,specifier:entry.specifier,resolution:resolution.kind,
        from_owner:owner,to_owner:targetOwner||null};
      if(resolution.kind==='internal'&&owner!==targetOwner&&targetOwner!=='kernel'){
        edge.obligation=owner.includes('--')&&frameworkMembers(owner).includes(targetOwner)?'PAIR_PUBLIC_CONTRACT_REQUIRED':
          owner==='application'||owner==='bootstrap'?'COMPOSITION_PUBLIC_CONTRACT_REQUIRED':'CROSS_OWNER_IMPORT_REQUIRES_PORT_OR_BRIDGE';
        if(owner.includes('--')&&!frameworkMembers(owner).includes(targetOwner))edge.obligation='PAIR_THIRD_OWNER_REQUIRES_DECOMPOSITION';
      }
      edges.push(edge);local.push(edge);
    }
    const bindings=new Map(parsed.imports.flatMap(entry=>(entry.bindings||[]).map(name=>[name,entry.specifier])));
    const callSites=parsed.calls.filter(call=>bindings.has(call.receiver||call.name)).map(call=>({...call,specifier:bindings.get(call.receiver||call.name)}));
    modules.push({path:file,owner,sha256:digest(source),bytes:Buffer.byteLength(source),lines:source.split('\n').length,
      exports:parsed.exports,functions:parsed.functions,import_calls:callSites,top_level_calls:parsed.topLevelCalls,
      module_state:parsed.moduleState,storage_transport_serialization_calls:parsed.coupling,
      resource_resolution:source.includes('import.meta.url'),environment_access:source.includes('process.env'),warnings:parsed.warnings,
      dependencies:local.filter(e=>e.resolution==='internal').map(e=>e.to)});
  }
  const internal=edges.filter(e=>e.resolution==='internal'),cycles=stronglyConnected([...files],internal),reverse=new Map();
  for(const edge of internal){if(!reverse.has(edge.to))reverse.set(edge.to,new Set());reverse.get(edge.to).add(edge.from);}
  const rows=modules.filter(m=>owners.has(m.path)).map(m=>{
    const entry=owners.get(m.path),obligations=edges.filter(e=>e.from===m.path&&e.obligation),otherOwners=new Set(obligations.map(e=>e.to_owner));
    const complexity=m.bytes>40000||otherOwners.size>3?'high':obligations.length||m.storage_transport_serialization_calls.length?'medium':'low';
    return {...entry,complexity,public_exports:m.exports.join(';'),bytes:m.bytes,lines:m.lines,sha256:m.sha256,
      reverse_dependents:reverse.get(m.path)?.size||0,import_obligations:obligations.length,
      side_effects:m.top_level_calls.map(c=>`${c.receiver?c.receiver+'.':''}${c.name}@${c.line}`).join(';')||'No top-level call candidate found; not a semantic purity proof',
      risk:[m.module_state.length?'module-state':'',m.storage_transport_serialization_calls.length?'storage/transport/serialization-calls':'',m.resource_resolution?'resource-resolution':'',complexity==='high'?'decompose-before-relocation':''].filter(Boolean).join(';'),
      action:decisions.overrides?.[m.path]?.action||(['application','persistence','bootstrap'].includes(entry.owner)||complexity==='high'?'DECOMPOSE_BEFORE_MOVE':obligations.length?'EXTRACT_PORTS_BEFORE_MOVE':'PILOT_MOVE_CANDIDATE')};
  });
  const pairs=new Map();
  function pair(a,b,evidence){
    if(!framework(a)||!framework(b)||a===b)return;const key=[a,b].sort().join('--');
    if(!pairs.has(key))pairs.set(key,{pair:key,edges:[],injected_storage:[]});pairs.get(key)[evidence.type==='storage'?'injected_storage':'edges'].push(evidence);
  }
  for(const edge of internal)pair(edge.from_owner,edge.to_owner,{type:'import',from:edge.from,to:edge.to,line:edge.line});
  for(const module of modules)if(module.owner!=='persistence')for(const call of module.storage_transport_serialization_calls.filter(c=>c.receiver==='db'))
    pair(module.owner,'persistence',{type:'storage',from:module.path,method:call.name,line:call.line});
  return {owners:rows,modules,edges,cycles,pairs:[...pairs.values()].sort((a,b)=>a.pair.localeCompare(b.pair)),summary:{
    source_paths:rows.length,runtime_source_paths:rows.filter(r=>r.old_path.startsWith('bot/src/')).length,
    source_modules:modules.length,unowned:0,imports:edges.length,internal_imports:internal.length,
    projected_import_obligations:edges.filter(e=>e.obligation).length,missing_imports:edges.filter(e=>e.resolution==='missing').length,
    computed_imports:edges.filter(e=>e.resolution==='computed').length,unresolved_aliases:edges.filter(e=>e.resolution==='unresolved-alias').length,
    cycle_components:cycles.length,cyclic_modules:new Set(cycles.flat()).size,proposed_pairs:pairs.size}};
}

export function runInventory(root,{gitRead=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'})}={}){
  const output=path.join(root,'docs/Implementation_Plans/Framework_Refactor');
  const repositoryPaths=gitRead(['ls-files','-z']).split('\0').filter(Boolean).sort(),tracked=repositoryPaths.filter(file=>file.startsWith('bot/'));
  const sourcePaths=tracked.filter(file=>file.startsWith('bot/src/'));
  const tooling=['bot/tooling/architecture/source-graph.mjs','bot/tooling/architecture/inventory.mjs'];
  const supportedCli=['bot/scripts/export-campaign.mjs','bot/scripts/cost-estimate.mjs'].filter(file=>tracked.includes(file));
  const sources=Object.fromEntries([...sourcePaths,...tooling,...supportedCli].map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]));
  const decisions=JSON.parse(fs.readFileSync(path.join(output,'OWNERSHIP_DECISIONS.json'),'utf8'));
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'bot/package.json'),'utf8'));
  const audit=analyzeSources(sources,decisions,pkg.imports||{}),schema=fs.readFileSync(path.join(root,'bot/sql/schema.sql'),'utf8');
  const moduleMap=new Map(audit.modules.map(m=>[m.path,m]));
  const inventory=tracked.map(file=>({path:file,category:file.startsWith('bot/src/')?'runtime-source':supportedCli.includes(file)?'supported-cli-source':file.startsWith('bot/tests/')?'historical-test-metadata-only':
    file.startsWith('bot/scripts/')?'script-metadata-only':file.startsWith('bot/sql/')?'schema':'support-asset',
    owner:moduleMap.get(file)?.owner||(file.startsWith('bot/sql/')?'persistence':file.startsWith('bot/tests/')||file.startsWith('bot/scripts/')?'tooling':'bootstrap'),
    bytes:fs.statSync(path.join(root,file)).size,inspected:file.startsWith('bot/src/')||supportedCli.includes(file)||file.startsWith('bot/sql/')||file==='bot/package.json'?'source-read':'path/stat-only'}));
  const baseline={sha:gitRead(['rev-parse','HEAD']).trim(),branch:gitRead(['branch','--show-current']).trim(),node:process.version,
    repository_tracked_files:repositoryPaths.length,
    tracked_bot_files:tracked.length,src_root_files:sourcePaths.filter(f=>f.slice('bot/src/'.length).indexOf('/')<0).length,
    scripts:tracked.filter(f=>f.startsWith('bot/scripts/')).length,tests:tracked.filter(f=>f.startsWith('bot/tests/')).length,
    schema_sha256:digest(schema),schema_version:Number(sources['bot/src/db.js'].match(/PRAGMA user_version=(\d+)/)?.[1]),
    schema_tables:[...schema.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/g)].map(m=>m[1]),
    schema_references:[...schema.matchAll(/REFERENCES\s+(\w+)\s*\(([^)]+)\)/g)].map(m=>({table:m[1],columns:m[2]})),
    schema_contracts:[...schema.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(([\s\S]*?)\n\);/g)].map(m=>({table:m[1],
      json_columns:[...m[2].matchAll(/\b(\w+_json)\s+TEXT/g)].map(c=>c[1]),
      identity_constraints:m[2].split('\n').map(s=>s.trim()).filter(s=>/PRIMARY KEY|UNIQUE|FOREIGN KEY|REFERENCES/.test(s))})),
    package_scripts:pkg.scripts,native_catalog_sha256:digest(sources['bot/src/native-feature-definitions.json']),
    native_catalog_statuses:(JSON.parse(sources['bot/src/native-feature-definitions.json']).features||[])
      .reduce((counts,feature)=>({...counts,[feature.status]:(counts[feature.status]||0)+1}),{}),
    working_tree_additions:[...tooling,'bot/tests/ai-gm-2026-10/rf00-f06.test.mjs'].filter(file=>!tracked.includes(file)&&fs.existsSync(path.join(root,file)))};
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'FRAMEWORK_OWNERSHIP.csv'),csv(Object.keys(audit.owners[0]),audit.owners));
  fs.writeFileSync(path.join(output,'SOURCE_RELOCATION_CROSSWALK.csv'),csv(['old_path','new_path','owner','move_phase','action','reverse_dependents','import_obligations'],audit.owners));
  fs.writeFileSync(path.join(output,'TRACKED_APPLICATION_INVENTORY.csv'),csv(['path','category','owner','bytes','inspected'],inventory));
  const inventoryByPath=new Map(inventory.map(row=>[row.path,row]));
  const repositoryInventory=repositoryPaths.map(file=>inventoryByPath.get(file)||{path:file,
    category:file.startsWith('content/')?'static-content':file.startsWith('docs/')?'documentation':/\.(?:js|mjs|cjs|ts|py|ps1|sh)$/.test(file)?'external-tooling':'repository-support',
    owner:file.startsWith('content/')?'content':file.startsWith('docs/')?'documentation':'tooling',bytes:fs.statSync(path.join(root,file)).size,inspected:'path/stat-only'});
  fs.writeFileSync(path.join(output,'REPOSITORY_INVENTORY.csv'),csv(['path','category','owner','bytes','inspected'],repositoryInventory));
  fs.writeFileSync(path.join(output,'PROJECTED_IMPORT_OBLIGATIONS.csv'),csv(['from','line','from_owner','to','to_owner','obligation'],audit.edges.filter(e=>e.obligation)));
  const pairRows=audit.pairs.map(pair=>{
    const directions=new Map();for(const edge of pair.edges){const a=moduleMap.get(edge.from)?.owner,b=moduleMap.get(edge.to)?.owner,label=`${a} → ${b}`;
      directions.set(label,(directions.get(label)||0)+1);}
    const sample=pair.edges[0]||pair.injected_storage[0];
    return `| ${pair.pair} | ${[...directions].map(([label,count])=>`${label}: ${count}`).join('; ')||'injected storage only'} | ${pair.injected_storage.length} | ${sample.from}:${sample.line} | PROPOSED; no API exists |`;
  });
  fs.writeFileSync(path.join(output,'BRIDGE_REGISTRY.md'),`# Observed integration registry — RF00\n\nGenerated from current source; proposals are not implemented/public APIs. Pair names are alphabetical. Every record's complete edges and injected db callsites are in DEPENDENCY_GRAPH.json. Do not create all pairs as empty directories. Review each at its owning migration slice; RF01-F05 defines exact contracts/lifecycle/consumer tests before implementation.\n\nObserved directions are dependency directions, not proof of bidirectional runtime traffic. Injected storage calls have no module import and still require an owned port/mapping. Application orchestration and telemetry wiring must not be hidden in pairs.\n\nAll pairs: validation preserves original principal/source/audience/session/revision/receipt fields; mapping may not expand authority. Lifecycle is plan → contract → fresh boundary test → implementation → remove old edge; deletion gate RF07-F03. Current consumers are the complete graph callsites, not fabricated new APIs.\n\n| Proposed pair | Import direction/count | Injected db calls | First actual evidence | State |\n|---|---|---|---|---|\n${pairRows.join('\n')}\n\nPre-existing logical integrations narrative--world, session--world and discord--persistence have manifest owners, but their current implementations may include third owners. Those edges remain explicit obligations; no exemption is granted.\n`);
  const hubs=[...audit.owners].sort((a,b)=>b.reverse_dependents-a.reverse_dependents).slice(0,20);
  fs.writeFileSync(path.join(output,'DEPENDENCY_REPORT.md'),`# RF00 dependency report\n\n${JSON.stringify(audit.summary)}\n\nThese are projected migration obligations under the target rules; the current flat tree has not acquired isolation by classification. Import occurrences include re-exports, side-effect imports and literal dynamic imports. Cycles are strongly connected components, not an enumeration of every simple path.\n\n| Current module | Accountable owner | Reverse dependents | Import obligations | Migration action |\n|---|---|---:|---:|---|\n${hubs.map(m=>`| ${m.old_path} | ${m.owner} | ${m.reverse_dependents} | ${m.import_obligations} | ${m.action} |`).join('\n')}\n\n${audit.cycles.map((cycle,i)=>`Component ${i+1}: ${cycle.length} modules. Members and every edge are retained in DEPENDENCY_GRAPH.json.`).join('\n')}\n\nLexer limits: calls are syntactic import-binding callsites; object aliases, computed properties, reflective calls and runtime conditional reachability require manual review. Top-level call candidates include initializers, not proof of side effects. Legacy tests/scripts are path/stat-only inventory.\n`);
  fs.writeFileSync(path.join(output,'DEPENDENCY_GRAPH.json'),JSON.stringify({version:1,baseline,limitations:[
    'Lexer-backed static import/re-export/literal dynamic import inventory, not a full JavaScript AST or resolved runtime call graph.',
    'Function/method and top-level call candidates require semantic review; conditional imports, reflective calls and object aliasing are not execution proof.',
    'Injected db member calls are storage-port evidence, not SQL schema enforcement or authorization.',
    'Historical tests/scripts are inventoried by path and filesystem stat only; never imported, parsed or executed.'
  ],...audit},null,2)+'\n');
  return {baseline,summary:audit.summary};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=runInventory(path.resolve(process.argv[2]||path.join(path.dirname(fileURLToPath(import.meta.url)),'../../..')));
  console.log(JSON.stringify({sha:result.baseline.sha,schema_version:result.baseline.schema_version,...result.summary},null,2));
}
