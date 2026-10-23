import test from 'node:test';
import assert from 'node:assert/strict';
import {parseModule} from '../../tooling/architecture/ast-imports.mjs';
import {checkBoundaries,applyTransitions,transitionBaselineHash,violationId} from '../../tooling/architecture/boundary-checker.mjs';
import {readStrictJson} from '../../tooling/architecture/read-project.mjs';

const names=['world','narrative','session','publication','discord','knowledge','persistence'];
const modulePath=(owner,file='public.js')=>`bot/src/frameworks/${owner}/${file}`;
function evaluate(sources,{legacy={groups:[]},pkg={},publicEntrypoints=null}={}){
  const published=publicEntrypoints||Object.fromEntries(names.filter(name=>sources[modulePath(name)]!==undefined).map(name=>[name,[modulePath(name)]]));
  for(const file of Object.keys(sources)){
    const pair=file.match(/^bot\/src\/framework-to-framework\/([^/]+)\/public.js$/)?.[1];
    if(pair&&pair.split('--').every(n=>names.includes(n))&&pair.split('--').sort().join('--')===pair)published[pair]=[file];
  }
  return checkBoundaries({sources,legacy,pkg:{name:'fixture',...pkg},policy:{frameworks:names,publicEntrypoints:published,
    stableEntrypoints:[],externalCapabilityOwners:{'node:sqlite':['persistence','tooling'],'node:module':['tooling']}}});
}
const codes=report=>report.violations.map(v=>v.code);
function debt(report){
  const counts={};for(const v of report.violations)counts[v.id]=(counts[v.id]||0)+1;
  const baseline={source_sha:'fixture-baseline',violations:counts};
  const entries=[...new Map(report.violations.map(v=>[v.id,v])).values()].map(v=>({...v,max_occurrences:counts[v.id],
    owner:v.owner,remove_in_feature:'RF04-F05',expires_after:'RF04',reason:'Exact original fixture edge',reviewed_base_sha:baseline.source_sha}));
  return {baseline,manifest:{version:1,baseline_sha256:transitionBaselineHash(baseline),entries},
    legacyPaths:new Set(report.modules.filter(m=>m.location?.startsWith('legacy')).map(m=>m.path))};
}
const apply=(report,state,phase='RF01')=>applyTransitions(report,state.manifest,{phase,legacyPaths:state.legacyPaths,baseline:state.baseline});

test('AST parsing distinguishes real imports from comments, regex and template prose, including JSON import attributes',()=>{
  const parsed=parseModule(`// import 'fake';\nconst re=/import('fake')/; const prose=\`import('fake')\`;
    import data from './data.json' with {type:'json'}; export * from './reexport.js';
    export const lazy=()=>import('./lazy.js'); const inside=\`text \${import('./inside.js')}\`;
    export const computed=name=>import(name);`);
  assert.deepEqual(parsed.imports.map(i=>i.specifier),['./data.json','./reexport.js','./lazy.js','./inside.js',null]);
  assert.equal(parsed.imports.at(-1).kind,'dynamic-computed');
});
test('AST public export collection handles aliases, defaults and destructured declarations',()=>{
  const parsed=parseModule(`const original=1;export {original as renamed};export const {a,b}={a:1,b:2};export default class {};`);
  assert.deepEqual(parsed.exports,['a','b','default','renamed']);
});
test('intra-framework and neutral kernel imports pass without exceptions',()=>{
  const report=evaluate({[modulePath('world')]:`import {x} from './internal.js'; export {x};`,
    [modulePath('world','internal.js')]:`import {hash} from '../../kernel/hash.js';export const x=hash;`,
    'bot/src/kernel/hash.js':'export const hash=value=>value;'});
  assert.deepEqual(report.violations,[]);
});
test('a framework cannot directly import another framework even through its public API',()=>{
  const report=evaluate({[modulePath('narrative')]:`import {x} from '../world/public.js';export {x};`,[modulePath('world')]:'export const x=1;'});
  assert.ok(codes(report).includes('DIRECT_CROSS_FRAMEWORK_IMPORT'));
});
test('a framework cannot import its own pair adapter',()=>{
  const pair='bot/src/framework-to-framework/narrative--world/public.js';
  const report=evaluate({[modulePath('narrative')]:`import {x} from '../../framework-to-framework/narrative--world/public.js';export {x};`,[pair]:'export const x=1;'});
  assert.ok(codes(report).includes('FRAMEWORK_IMPORTS_PAIR'));
});
test('an alphabetical pair may use exactly its two frameworks through registered public entrypoints',()=>{
  const report=evaluate({'bot/src/framework-to-framework/narrative--world/public.js':
    `import {n} from '../../frameworks/narrative/public.js';import {w} from '../../frameworks/world/public.js';export {n,w};`,
    [modulePath('narrative')]:'export const n=1;',[modulePath('world')]:'export const w=1;'});
  assert.deepEqual(report.violations,[]);
});
test('pair imports of a third framework or another pair are rejected',()=>{
  for(const target of ['frameworks/knowledge/public.js','framework-to-framework/knowledge--world/public.js']){
    const report=evaluate({'bot/src/framework-to-framework/narrative--world/public.js':`import '../../${target}';export const p=1;`,
      ['bot/src/'+target]:'export const other=1;'});
    assert.ok(codes(report).includes('PAIR_IMPORTS_THIRD_OWNER'));
  }
});
test('private imports cannot hide behind a nested public.js filename',()=>{
  const report=evaluate({'bot/src/framework-to-framework/narrative--world/public.js':`import '../../frameworks/world/internal/public.js';export const p=1;`,
    [modulePath('world','internal/public.js')]:'export const w=1;'});
  assert.ok(codes(report).includes('PAIR_IMPORTS_PRIVATE_API'));
});
test('application code imports only registered public framework APIs',()=>{
  const report=evaluate({'bot/src/application/workflows/use.js':`import '../../frameworks/world/private.js';export const workflow=()=>{};`,
    [modulePath('world','private.js')]:'export const privateValue=1;'});
  assert.ok(codes(report).includes('IMPORTS_PRIVATE_API'));
});
test('unsorted pairs and unowned root files fail ownership classification',()=>{
  const report=evaluate({'bot/src/framework-to-framework/world--narrative/public.js':'export const x=1;','bot/src/new-unclassified.js':'export const x=1;'});
  assert.equal(report.summary.unowned,2);assert.equal(codes(report).filter(c=>c==='UNOWNED_MODULE').length,2);
});
test('aliases resolve to actual owners and do not bypass cross-framework checks',()=>{
  const sources={[modulePath('narrative')]:`import '#domain/world';export const n=1;`,[modulePath('world')]:'export const w=1;'};
  const report=evaluate(sources,{pkg:{imports:{'#domain/*':'./src/frameworks/*/public.js'}}});
  assert.ok(codes(report).includes('DIRECT_CROSS_FRAMEWORK_IMPORT'));
  const unsupported=evaluate(sources,{pkg:{imports:{'#domain/world':{unknown:'./src/frameworks/world/public.js'}}}});
  assert.ok(codes(unsupported).includes('IMPORT_ALIAS_REVIEW'));
});
test('literal dynamic imports use normal boundary rules and computed ones require review',()=>{
  const report=evaluate({[modulePath('narrative')]:`export const load=()=>import('../world/public.js');export const unknown=name=>import(name);`,
    [modulePath('world')]:'export const w=1;'});
  assert.ok(codes(report).includes('DIRECT_CROSS_FRAMEWORK_IMPORT'));assert.ok(codes(report).includes('COMPUTED_IMPORT_REVIEW'));
});
test('missing imports, malformed source and empty public entrypoints fail closed',()=>{
  assert.ok(codes(evaluate({[modulePath('world')]:`import './missing.js';export const w=1;`})).includes('MISSING_IMPORT'));
  assert.ok(codes(evaluate({[modulePath('world')]:'export const broken = ;'})).includes('SOURCE_PARSE_ERROR'));
  assert.ok(codes(evaluate({[modulePath('world')]:'export {};'})).includes('EMPTY_PUBLIC_ENTRYPOINT'));
});
test('loader factories, eval and wrong-owner SQLite imports require explicit review',()=>{
  const report=evaluate({[modulePath('narrative')]:`import {createRequire as make} from 'node:module';import {DatabaseSync} from 'node:sqlite';
    export const load=()=>make(import.meta.url);export const execute=x=>eval(x);`});
  for(const code of ['MODULE_LOADER_REVIEW','DYNAMIC_CODE_REVIEW','EXTERNAL_CAPABILITY_OWNER'])assert.ok(codes(report).includes(code));
});
test('eager database construction detects imported aliases while an explicit lazy factory is permitted',()=>{
  const eager=evaluate({[modulePath('persistence')]:`import {DatabaseSync as Store} from 'node:sqlite';export const db=new Store('unused');`});
  assert.ok(codes(eager).includes('EAGER_MODULE_CONSTRUCTION'));
  const lazy=evaluate({[modulePath('persistence')]:`import {DatabaseSync as Store} from 'node:sqlite';export const open=()=>new Store('unused');`});
  assert.deepEqual(lazy.violations,[]);
});
test('inter-owner and intra-owner import cycles are detected per actual edge',()=>{
  const report=evaluate({[modulePath('world')]:`export {n} from '../narrative/public.js';export const w=1;`,
    [modulePath('narrative')]:`export {w} from '../world/public.js';export const n=1;`});
  assert.equal(report.summary.largestCycle,2);assert.equal(codes(report).filter(c=>c==='CYCLIC_IMPORT_EDGE').length,2);
});
test('exact baseline transitions accept only original counted violations and expire by phase',()=>{
  const report=evaluate({'bot/src/a.js':`import {w} from './b.js';export {w};`,'bot/src/b.js':'export const w=1;'},
    {legacy:{groups:[{owner:'narrative',files:'a.js'},{owner:'world',files:'b.js'}]}}),state=debt(report);
  assert.equal(apply(report,state).summary.pass,true);assert.equal(apply(report,state).summary.acceptedLegacyOccurrences,report.violations.length);
  const expired=apply(report,state,'RF05');assert.equal(expired.summary.pass,false);assert.ok(expired.transitionErrors.some(e=>e.code==='EXPIRED_TRANSITION'));
});
test('duplicate, wildcard, forged and unused transition entries are rejected',()=>{
  const report=evaluate({'bot/src/a.js':'export const a=1;'},{legacy:{groups:[{owner:'world',files:'a.js'}]}}),state=debt(report);
  state.manifest.entries.push({...state.manifest.entries[0]});assert.ok(apply(report,state).transitionErrors.some(e=>e.code==='DUPLICATE_TRANSITION'));
  const wildcard=debt(report);wildcard.manifest.entries[0].from='*';assert.ok(apply(report,wildcard).transitionErrors.some(e=>e.code==='INVALID_TRANSITION'));
  const unused=debt(report);assert.ok(apply({...report,violations:[]},unused).transitionErrors.some(e=>e.code==='UNUSED_TRANSITION'));
  const forged=debt(report);forged.manifest.baseline_sha256='forged';assert.throws(()=>apply(report,forged),/baseline mismatch/);
});
test('another occurrence of an accepted legacy import fails the count ratchet',()=>{
  const legacy={groups:[{owner:'narrative',files:'a.js'},{owner:'world',files:'b.js'}]},
    sources={'bot/src/a.js':`import {w} from './b.js';export const a=w;`,'bot/src/b.js':'export const w=1;'},state=debt(evaluate(sources,{legacy}));
  const changed=evaluate({...sources,'bot/src/a.js':`import {w as x} from './b.js';import {w as y} from './b.js';export const a=x+y;`},{legacy});
  assert.ok(apply(changed,state).activeViolations.some(v=>v.reason==='TRANSITION_COUNT_EXCEEDED'));
});
test('an added cycle edge fails even when SCC membership remains identical, and cannot be appended to transitions',()=>{
  const legacy={groups:[{owner:'world',files:'a.js b.js c.js'}]},sources={
    'bot/src/a.js':`import './b.js';export const a=1;`,'bot/src/b.js':`import './c.js';export const b=1;`,'bot/src/c.js':`import './a.js';export const c=1;`},
    original=evaluate(sources,{legacy}),state=debt(original),changed=evaluate({...sources,'bot/src/a.js':`import './b.js';import './c.js';export const a=1;`},{legacy});
  assert.deepEqual(original.cycles,changed.cycles);const result=apply(changed,state);assert.equal(result.summary.pass,false);
  const edge=result.activeViolations.find(v=>v.code==='CYCLIC_IMPORT_EDGE');assert.ok(edge);
  state.manifest.entries.push({...edge,id:violationId(edge),max_occurrences:1,owner:'world',remove_in_feature:'RF04-F05',expires_after:'RF04',reason:'attempted baseline growth',reviewed_base_sha:state.baseline.source_sha});
  assert.ok(apply(changed,state).transitionErrors.some(e=>e.code==='INVALID_TRANSITION'));
});
test('new public barrels cannot forward legacy monoliths or acquire legacy exceptions',()=>{
  const report=evaluate({[modulePath('world')]:`export {w} from '../../world-old.js';`,'bot/src/world-old.js':'export const w=1;'},
    {legacy:{groups:[{owner:'world',files:'world-old.js'}]}});
  assert.ok(codes(report).includes('NEW_TO_LEGACY_IMPORT'));
  const state=debt(report);assert.ok(apply(report,state).transitionErrors.some(e=>e.code==='INVALID_TRANSITION'));
});
test('undeclared packages, URL suffixes and root escapes cannot hide source dependencies',()=>{
  for(const [specifier,code] of [['not-declared','UNDECLARED_PACKAGE'],['./public.js?alias','IMPORT_SPECIFIER_REVIEW'],
    ['data:text/javascript,export default 1','IMPORT_URL_REVIEW'],['../../../../outside.js','IMPORT_ROOT_ESCAPE']]){
    const report=evaluate({[modulePath('world')]:`import '${specifier}';export const w=1;`});assert.ok(codes(report).includes(code),specifier);
  }
});
test('configuration rejects duplicate JSON keys including escaped equivalents and nested maps',()=>{
  assert.throws(()=>readStrictJson('{"a":1,"\\u0061":2}'),/Duplicate JSON/);
  assert.throws(()=>readStrictJson('{"public":{"owner":1,"owner":2}}'),/Duplicate JSON/);
  assert.deepEqual(readStrictJson('{"a":[{"name":"ok"}]}'),{a:[{name:'ok'}]});
});
test('unsupported source extensions cannot silently bypass import analysis',()=>{
  const report=evaluate({[modulePath('world','hidden.ts')]:`import '../narrative/public.js';`});
  assert.ok(codes(report).includes('SOURCE_TYPE_REVIEW'));
});
