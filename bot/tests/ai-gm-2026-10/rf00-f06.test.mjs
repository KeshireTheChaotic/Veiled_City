import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectModule,resolveImport,stronglyConnected} from '../../tooling/architecture/source-graph.mjs';
import {ownership,analyzeSources,csv,runInventory,digest} from '../../tooling/architecture/inventory.mjs';

test('lexical imports ignore comment, regexp and literal prose; template expressions remain visible',()=>{
  const source=[
    `// import 'comment';`,
    `const r=/import('regexp')/; const text="import('string')";`,
    'const prose=`import("template") ${import("./inside.js")}`;',
    `import './side.js'; import value from './normal.js';`,
    `const lazy=import('./lazy.js'); const computed=import(target);`,
    'const fixed=import(`./fixed.js`); const variable=import(`./${name}.js`);',
    `const here=import.meta.url;`
  ].join('\n');
  const result=inspectModule(source);
  assert.deepEqual(result.imports.map(i=>i.specifier),['./inside.js','./side.js','./normal.js','./lazy.js',null,'./fixed.js',null]);
  assert.equal(result.imports.filter(i=>i.kind==='dynamic-computed').length,2);assert.deepEqual(result.warnings,[]);
});
test('re-export aliases and automatic-semicolon boundaries do not invent dependencies',()=>{
  const result=inspectModule(`export {original as renamed} from './one.js'\nexport {local}\nexport const result=fn(1,2), second={x:3};\nexport * from './two.js'; export async function run(){}; export default class Service{}; import * as utilities from './namespace.js'; utilities.run();`);
  assert.deepEqual(result.imports.map(i=>i.specifier),['./one.js','./two.js','./namespace.js']);
  assert.deepEqual(result.imports.at(-1).bindings,['utilities']);
  for(const name of ['renamed','local','result','second','*','run','default','Service'])assert.ok(result.exports.includes(name),name);
});
test('relative and package import aliases resolve deterministically, computed or missing imports remain explicit',()=>{
  const files=new Set(['bot/src/a.js','bot/src/deep/b.js']);
  assert.deepEqual(resolveImport('bot/src/deep/b.js','../a.js',files),{kind:'internal',target:'bot/src/a.js'});
  assert.equal(resolveImport('bot/src/a.js','#child/b',files,{'#child/*':'./src/deep/*.js'}).target,'bot/src/deep/b.js');
  assert.equal(resolveImport('bot/src/a.js','#unknown',files).kind,'unresolved-alias');
  assert.equal(resolveImport('bot/src/a.js','./missing.js',files).kind,'missing');
  assert.equal(resolveImport('bot/src/a.js',null,files).kind,'computed');
  assert.equal(resolveImport('bot/src/a.js','node:fs',files).kind,'external');
});
test('strongly connected components distinguish cycles, self-cycles and a one-way leaf',()=>{
  const cycles=stronglyConnected(['a','b','c','d'],[{from:'a',to:'b'},{from:'b',to:'a'},{from:'b',to:'c'},{from:'d',to:'d'}]);
  assert.deepEqual(cycles,[['a','b'],['d']]);
});
test('ownership rejects omissions, duplicates, stale paths and relocation collisions',()=>{
  const files=new Set(['bot/src/a.js']);
  assert.throws(()=>ownership([],files),/Unowned source/);
  const group={owner:'world',phase:'RF04',rationale:'fixture',files:'a.js'};
  assert.throws(()=>ownership([group,group],files),/Duplicate owner/);
  assert.throws(()=>ownership([{...group,files:'absent.js'}],files),/Stale ownership/);
  assert.throws(()=>ownership([{...group,files:'a.js nested/a.js'}],new Set(['bot/src/a.js','bot/src/nested/a.js'])),/Relocation collision/);
});
test('graph preserves cross-owner and bridge third-owner obligations plus injected storage without evaluating modules',()=>{
  const sources={
    'bot/src/a.js':`import {read as local} from './b.js'; export function work(db){local();db.saveCityRecord();} throw new Error('never evaluate');`,
    'bot/src/b.js':`export function read(){}`,
    'bot/src/bridge.js':`import './a.js'; import './b.js'; import './third.js';`,
    'bot/src/third.js':`export const marker=1;`
  };
  const decisions={groups:[['narrative','a.js'],['world','b.js'],['narrative--world','bridge.js'],['daggerheart','third.js']]
    .map(([owner,files])=>({owner,files,phase:'RF04',rationale:'fresh fixture'}))};
  const graph=analyzeSources(sources,decisions);
  assert.equal(graph.summary.unowned,0);
  assert.equal(graph.edges.find(e=>e.from.endsWith('/a.js')).obligation,'CROSS_OWNER_IMPORT_REQUIRES_PORT_OR_BRIDGE');
  assert.equal(graph.edges.find(e=>e.to.endsWith('/third.js')).obligation,'PAIR_THIRD_OWNER_REQUIRES_DECOMPOSITION');
  assert.equal(graph.modules.find(m=>m.path.endsWith('/a.js')).import_calls[0].specifier,'./b.js');
  assert.equal(graph.pairs.find(p=>p.pair==='narrative--persistence').injected_storage[0].method,'saveCityRecord');
});
test('CSV escapes quoted paths and hashes are deterministic without modifying input',()=>{
  assert.equal(csv(['path','owner'],[{path:'one,"two',owner:'world'}]),'path,owner\n"one,""two","world"\n');
  assert.equal(digest('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('inventory writes ownership, graph, bridge and complete repository metadata using a disposable source-only fixture',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vc-rf00-audit-'));
  try{
    const out='docs/Implementation_Plans/Framework_Refactor',fixtures={
      'bot/src/db.js':'export class Store{}; const revision="PRAGMA user_version=460";',
      'bot/src/native-feature-definitions.json':'{}',
      'bot/tooling/architecture/source-graph.mjs':'export const parser=true;',
      'bot/tooling/architecture/inventory.mjs':'export const inventory=true;',
      'bot/sql/schema.sql':'CREATE TABLE IF NOT EXISTS fixture (\n id TEXT PRIMARY KEY\n);',
      'bot/package.json':JSON.stringify({scripts:{start:'node src/index.js'}}),
      'bot/tests/historical.test.mjs':"throw new Error('must never be evaluated');",
      'content/fresh.json':'{}',
      [`${out}/OWNERSHIP_DECISIONS.json`]:JSON.stringify({groups:[{owner:'persistence',files:'db.js',phase:'RF06'},
        {owner:'daggerheart',files:'native-feature-definitions.json',phase:'RF03'}]})
    };
    for(const [file,body] of Object.entries(fixtures)){fs.mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});fs.writeFileSync(path.join(dir,file),body);}
    const tracked=Object.keys(fixtures).filter(file=>!file.startsWith('bot/tooling/'));
    const result=runInventory(dir,{gitRead:args=>args[0]==='ls-files'?tracked.join('\0')+'\0':args[0]==='rev-parse'?'fixture-sha':'fixture-branch'});
    assert.equal(result.baseline.schema_version,460);assert.equal(result.summary.runtime_source_paths,2);
    for(const file of ['FRAMEWORK_OWNERSHIP.csv','SOURCE_RELOCATION_CROSSWALK.csv','DEPENDENCY_GRAPH.json','BRIDGE_REGISTRY.md','REPOSITORY_INVENTORY.csv','PROJECTED_IMPORT_OBLIGATIONS.csv'])assert.ok(fs.existsSync(path.join(dir,out,file)),file);
    assert.ok(fs.readFileSync(path.join(dir,out,'TRACKED_APPLICATION_INVENTORY.csv'),'utf8').includes('historical-test-metadata-only'));
    const graph=JSON.parse(fs.readFileSync(path.join(dir,out,'DEPENDENCY_GRAPH.json'),'utf8'));
    assert.ok(!JSON.stringify(graph.modules).includes('must never be evaluated'));
    assert.ok(fs.readFileSync(path.join(dir,out,'REPOSITORY_INVENTORY.csv'),'utf8').includes('content/fresh.json'));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
