import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {checkProject} from '../../tooling/architecture/read-project.mjs';
import {transitionBaselineHash} from '../../tooling/architecture/boundary-checker.mjs';

const cli=fileURLToPath(new URL('../../tooling/architecture/check-boundaries.mjs',import.meta.url));
const base='docs/Implementation_Plans/Framework_Refactor',world='bot/src/frameworks/world/public.js',narrative='bot/src/frameworks/narrative/public.js';
function project(t,{sources={[world]:'export const world=1;'},legacy={groups:[]},pkg={}}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vc-rf01-enforcement-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const write=(file,value)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),typeof value==='string'?value:JSON.stringify(value));};
  const publicEntrypoints=Object.fromEntries(['world','narrative'].filter(owner=>sources[`bot/src/frameworks/${owner}/public.js`]!==undefined).map(owner=>[owner,[`bot/src/frameworks/${owner}/public.js`]]));
  write(`${base}/RF01/PACKAGES.json`,{version:1,frameworks:['world','narrative','session'],publicEntrypoints,legacyOwnership:`${base}/OWNERSHIP_DECISIONS.json`});
  write(`${base}/OWNERSHIP_DECISIONS.json`,legacy);write('bot/package.json',{name:'rf01-disposable-source',type:'module',...pkg});
  write(`${base}/RF01/BRIDGE_CONTRACTS.json`,{version:1,pairs:[]});
  const baseline={source_sha:'fresh-rf01-fixture',violations:{}};
  write(`${base}/RF01/TRANSITION_BASELINE.json`,baseline);write(`${base}/RF01/TRANSITIONS.json`,{version:1,baseline_sha256:transitionBaselineHash(baseline),entries:[]});
  for(const [file,body] of Object.entries(sources))write(file,body);
  const run=(...args)=>{
    const result=spawnSync(process.execPath,[cli,'--root',root,...args],{encoding:'utf8',timeout:5000,windowsHide:true});
    assert.ifError(result.error);assert.equal(result.signal,null);
    return {exit:result.status,output:JSON.parse(result.stdout||result.stderr)};
  };
  return {root,write,run};
}
function grandfather(p){
  const report=checkProject(p.root,{mode:'strict'}),counts={};for(const v of report.violations)counts[v.id]=(counts[v.id]||0)+1;
  const baseline={source_sha:'fresh-rf01-fixture',violations:counts};
  const entries=[...new Map(report.violations.map(v=>[v.id,v])).values()].map(v=>({...v,max_occurrences:counts[v.id],owner:v.owner,
    reviewed_base_sha:baseline.source_sha,remove_in_feature:'RF04-F01',expires_after:'RF04',reason:'Original disposable source only'}));
  p.write(`${base}/RF01/TRANSITION_BASELINE.json`,baseline);p.write(`${base}/RF01/TRANSITIONS.json`,{version:1,baseline_sha256:transitionBaselineHash(baseline),entries});
}
test('actual CLI scans source without evaluating its throw or starting services; strict and ratchet both pass clean source',t=>{
  const p=project(t,{sources:{[world]:`throw new Error('Source must never execute');export const world=1;`}});
  for(const mode of ['--strict','--ratchet']){const result=p.run(mode);assert.equal(result.exit,0);assert.equal(result.output.pass,true);assert.equal(result.output.sourceModules,1);}
});
test('a new unauthorized cross-framework import exits nonzero with its exact offending paths',t=>{
  const p=project(t,{sources:{[world]:`import {n} from '../narrative/public.js';export const world=n;`,[narrative]:'export const n=1;'}});
  const result=p.run();assert.equal(result.exit,1);assert.equal(result.output.firstErrors[0].code,'DIRECT_CROSS_FRAMEWORK_IMPORT');
  assert.equal(result.output.firstErrors[0].from,world);assert.equal(result.output.firstErrors[0].to,narrative);
});
test('unowned source and unsupported source types are real CLI failures',t=>{
  const p=project(t);p.write('bot/src/unclassified.js','export const hidden=1;');p.write('bot/src/frameworks/world/hidden.ts','export const hidden=1;');
  const result=p.run();assert.equal(result.exit,1);assert.equal(result.output.unowned,1);
  assert.ok(result.output.firstErrors.some(e=>e.code==='SOURCE_TYPE_REVIEW'));
});
test('deep imports and package aliases are resolved through the actual loader',t=>{
  const p=project(t,{sources:{'bot/src/application/workflows/open.js':`import '#hidden';export const run=()=>{};`,
    'bot/src/frameworks/world/internal.js':'export const value=1;'},pkg:{imports:{'#hidden':'./src/frameworks/world/internal.js'}}});
  const result=p.run();assert.equal(result.exit,1);assert.ok(result.output.firstErrors.some(e=>e.code==='IMPORTS_PRIVATE_API'));
});
test('actual CLI distinguishes accepted old debt from strict failure and phase expiry',t=>{
  const p=project(t,{sources:{'bot/src/old.js':'export const old=1;'},legacy:{groups:[{owner:'world',files:'old.js'}]}});grandfather(p);
  const ratchet=p.run();assert.equal(ratchet.exit,0);assert.equal(ratchet.output.acceptedLegacyOccurrences,1);
  const strict=p.run('--strict');assert.equal(strict.exit,1);assert.equal(strict.output.rawViolationOccurrences,1);
  const expired=p.run('--phase','RF07');assert.equal(expired.exit,1);assert.equal(expired.output.transitionErrors,1);
});
test('adding a cycle edge in an unchanged component fails the real frozen-baseline CLI',t=>{
  const p=project(t,{sources:{'bot/src/a.js':`import './b.js';export const a=1;`,'bot/src/b.js':`import './c.js';export const b=1;`,
    'bot/src/c.js':`import './a.js';export const c=1;`},legacy:{groups:[{owner:'world',files:'a.js b.js c.js'}]}});grandfather(p);
  assert.equal(p.run().exit,0);
  p.write('bot/src/a.js',`import './b.js';import './c.js';export const a=1;`);
  const changed=p.run();assert.equal(changed.exit,1);assert.equal(changed.output.largestCycle,3);
  assert.ok(changed.output.firstErrors.some(e=>e.code==='CYCLIC_IMPORT_EDGE'));
});
test('duplicate JSON policy keys fail before silently replacing framework policy',t=>{
  const p=project(t);p.write(`${base}/RF01/PACKAGES.json`,'{"frameworks":[],"frameworks":["world"]}');
  const result=p.run();assert.equal(result.exit,1);assert.equal(result.output.code,'ARCHITECTURE_CONFIGURATION');
});
test('registry-only proposals cannot conceal an unregistered pair implementation',t=>{
  const p=project(t);p.write('bot/src/framework-to-framework/narrative--world/public.js','export const fake=1;');
  const result=p.run();assert.equal(result.exit,1);assert.ok(result.output.firstErrors.some(e=>e.code==='UNREGISTERED_BRIDGE_PACKAGE'));
});
test('missing baseline and invalid flags fail closed; no acceptance or rebaseline option exists',t=>{
  const p=project(t);fs.unlinkSync(path.join(p.root,`${base}/RF01/TRANSITION_BASELINE.json`));
  assert.equal(p.run().exit,1);assert.equal(p.run('--accept-baseline').exit,1);
});
test('malformed source reports only a location/error type, never its private text',t=>{
  const privateText='PRIVATE-FIXTURE-NOT-AN-ERROR-MESSAGE';const p=project(t,{sources:{[world]:`export const x=; // ${privateText}`}});
  const result=p.run('--strict');assert.equal(result.exit,1);assert.equal(JSON.stringify(result.output).includes(privateText),false);
  assert.ok(result.output.firstErrors.some(e=>e.code==='SOURCE_PARSE_ERROR'));
});
