import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';import {createHash} from 'node:crypto';import {parse} from 'acorn';
import {checkProject} from '../../tooling/architecture/read-project.mjs';import {jsonHash} from '../../src/kernel/json-hash.js';import {jsonKey32} from '../../src/kernel/json-key32.js';import {stateRevision} from '../../src/kernel/state-revision.js';
const root=fileURLToPath(new URL('../../../',import.meta.url)),baseline=JSON.parse(readFileSync(path.join(root,'docs/Implementation_Plans/Framework_Refactor/features/RF04-F05/C35-SOURCE-BASELINE.json'))),hash=s=>createHash('sha256').update(s).digest('hex');
function clean(node){if(Array.isArray(node))return node.map(clean);if(node&&typeof node==='object')return Object.fromEntries(Object.entries(node).filter(([k])=>!['start','end','raw'].includes(k)).map(([k,v])=>[k,clean(v)]));return node;}
function tree(file){return parse(readFileSync(path.join(root,file),'utf8'),{ecmaVersion:'latest',sourceType:'module'});}
test('neutral import migration preserves every current production policy and function body AST',()=>{
 assert.equal(baseline.records.length,25);assert.equal(baseline.records.reduce((n,r)=>n+r.imports.length,0),27);
 for(const r of baseline.records){const t=tree(r.path),body=t.body.filter(n=>n.type!=='ImportDeclaration');assert.equal(hash(JSON.stringify(clean(body))),r.unchanged_body_ast_sha256,r.path);for(const i of r.imports){const exact=t.body.filter(n=>n.type==='ImportDeclaration'&&n.source.value===i.specifier&&n.specifiers.length===1&&n.specifiers[0].imported?.name===i.imported&&n.specifiers[0].local.name===i.local);assert.equal(exact.length,1,r.path+' native binding');}}
});
test('real startup graph retains native producer registration and architecture ratchet without new exceptions',()=>{
 const report=checkProject(root,{mode:'ratchet',phase:'RF04'});assert.equal(report.summary.unowned,0);assert.equal(report.summary.activeViolationGroups,0);assert.equal(report.summary.transitionErrors,0);const visited=new Set(['bot/src/index.js']),queue=[...visited];for(let i=0;i<queue.length;i++)for(const e of report.edges.filter(e=>e.from===queue[i]))if(!visited.has(e.to)){visited.add(e.to);queue.push(e.to);}
 for(const file of ['bot/src/ai-intents.js','bot/src/audience-native-v9.js','bot/src/native-group-features.js','bot/src/frameworks/npc/motivation-source.js'])assert.equal(visited.has(file),true,file+' native producer must remain reachable');
});
test('neutral primitives preserve exact serialized historical key revision and hash bytes',()=>{
 for(const row of [null,undefined,false,0,'',{status:'active',source:'fresh-native',data:{owner:'fresh-owner'}},['fresh',4,null]]){assert.equal(stateRevision(row),row?hash(JSON.stringify(row)):'absent');if(row!==undefined){assert.equal(jsonHash(row),hash(JSON.stringify(row)));assert.equal(jsonKey32(row),hash(JSON.stringify(row)).slice(0,32));}}
});
test('three previously dirty source files remain byte-identical to the preserved feature-start snapshot',()=>{
 assert.equal(baseline.skipped_dirty_fingerprints.length,3);for(const row of baseline.skipped_dirty_fingerprints)assert.equal(hash(readFileSync(path.join(root,row.path))),row.sha256,row.path);
});
