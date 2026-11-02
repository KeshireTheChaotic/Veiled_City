import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeModule,verifyReferences,destination,hash} from '../../tooling/veilkeeper2/source-audit.mjs';

test('AST inventory resolves relative imports and reexports while retaining unresolved dynamic edges',()=>{
  const result=analyzeModule('src/a.js',`import {x} from './b.js'; export {x} from './b.js'; import(variable); import('./missing.js');`,new Set(['src/a.js','src/b.js']));
  assert.deepEqual(result.imports.map(x=>x.status),['resolved','resolved','dynamic-unresolved','missing']);
  assert.equal(result.imports[0].target,'src/b.js');
});
test('functions, methods, exports and callback calls keep exact source locations',()=>{
  const source=`export function outer(){\n const callback=()=>invoke();\n return callback();\n}\nclass A { method(){ send(); } }`;
  const result=analyzeModule('src/a.js',source,new Set());
  assert.deepEqual(result.functions.map(f=>f.name),['outer','callback','method']);
  assert.equal(result.calls.find(c=>c.callee==='invoke').from,result.functions[1].id);
  assert.equal(result.functions[0].end,4);
  assert.equal(result.exports.length,1);
  assert.equal(result.sha256,hash(source));
});
test('literal and dynamic SQL are separately identified without executing code',()=>{
  const source='const a="SELECT * FROM facts"; const b=`ALTER TABLE ${table} ADD COLUMN x TEXT`; registerIntentAdapter("travel", handler);';
  const result=analyzeModule('src/a.js',source,new Set());
  assert.deepEqual(result.sql.map(s=>s.dynamic),[false,true]);
  assert.equal(result.registrations[0].arguments[0],'"travel"');
});
test('pinned references report missing and out-of-range sources rather than accepting a URL',()=>{
  const prefix='https://github.com/KeshireTheChaotic/Veiled_City/blob/'+'a'.repeat(40)+'/';
  const refs=verifyReferences(`${prefix}good.js#L1-L2 ${prefix}good.js#L1-L3 ${prefix}missing.js#L1 ${prefix}good.js#L1-L2`,file=>{if(file==='good.js')return 'one\ntwo\n';throw new Error('absent');});
  assert.equal(refs.length,3);
  assert.equal(refs[0].rangeSha256,hash('one\ntwo'));
  assert.equal(refs[1].status,'invalid-range');
  assert.equal(refs[2].status,'missing-file');
});
test('unsupported syntax fails explicitly and destination heuristics cannot approve deletion',()=>{
  assert.throws(()=>analyzeModule('broken.js','export function {',new Set()));
  assert.equal(destination('bot/src/frameworks/daggerheart/death.js').fate,'port');
  assert.equal(destination('bot/src/unknown.js').gate,'R0 explicit symbol disposition required');
});
