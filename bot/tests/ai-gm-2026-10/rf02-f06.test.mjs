import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {parseModule} from '../../tooling/architecture/ast-imports.mjs';
import {checkBoundaries} from '../../tooling/architecture/boundary-checker.mjs';
import {ContentIndex,resolveContentRoot} from '../../src/frameworks/content/public.js';
import {normalizeNarrativeMarkdown,narrativeRelativePath} from '../../src/frameworks/character/public.js';
import {createInteractionTextDelivery} from '../../src/frameworks/discord/public.js';
import {KeyedSerialQueue} from '../../src/kernel/serial-queue.js';
import {StateConflictError} from '../../src/kernel/errors.js';

const api='bot/src/frameworks/character/public.js',app='bot/src/application/workflows/export-view.js';
function inspect(sources,legacy={groups:[]}){
  return checkBoundaries({sources,legacy,policy:{frameworks:['character','content'],publicEntrypoints:sources[api]!==undefined?{character:[api]}:{}}});
}
const missing=report=>report.violations.filter(v=>v.code==='MISSING_NAMED_EXPORT');
test('AST records requested source names rather than local aliases, including default and namespace imports',()=>{
  const result=parseModule(`import renamed,{safeStem as local} from './character.js';import * as archive from './zip.js';export {safeStem as fileStem} from './names.js';`);
  assert.deepEqual(result.imports.map(e=>e.importedNames),[['default','safeStem'],['*'],['safeStem']]);
});
test('real named public re-export aliases resolve without evaluating either source',()=>{
  const report=inspect({[app]:`import {safeStem as stem} from '../../frameworks/character/public.js';export const path=stem;`,
    [api]:`export {toStem as safeStem} from './file-name.js';`,'bot/src/frameworks/character/file-name.js':`throw new Error('never execute');export const toStem=x=>x;`});
  assert.deepEqual(report.violations,[]);
});
test('existing destination with absent requested name is rejected at the exact importer',()=>{
  const report=inspect({[app]:`import {missingName} from '../../frameworks/character/public.js';export const use=missingName;`,[api]:'export const safeStem=x=>x;'});
  assert.equal(missing(report).length,1);assert.equal(missing(report)[0].from,app);assert.equal(missing(report)[0].to,api);assert.equal(missing(report)[0].detail,'missingName');
});
test('a public alias cannot conceal an absent underlying implementation export',()=>{
  const report=inspect({[api]:`export {absent as safeStem} from './file-name.js';`,'bot/src/frameworks/character/file-name.js':'export const actual=x=>x;'});
  assert.deepEqual(missing(report).map(v=>v.detail),['absent']);
});
test('star exports expose named symbols through an acyclic same-framework chain',()=>{
  const report=inspect({[app]:`import {safeStem} from '../../frameworks/character/public.js';export {safeStem};`,[api]:`export * from './middle.js';`,
    'bot/src/frameworks/character/middle.js':`export * from './leaf.js';`,'bot/src/frameworks/character/leaf.js':'export const safeStem=x=>x;'});
  assert.deepEqual(report.violations,[]);
});
test('star exports never forward default, while namespace imports do not invent a named requirement',()=>{
  const sources={[app]:`import defaultValue from '../../frameworks/character/public.js';import * as view from '../../frameworks/character/public.js';export {defaultValue,view};`,
    [api]:`export * from './leaf.js';`,'bot/src/frameworks/character/leaf.js':'export default 1;'};
  assert.deepEqual(missing(inspect(sources)).map(v=>v.detail),['default']);
});
test('JSON has only its actual default export, not fabricated named properties',()=>{
  const report=inspect({'bot/src/frameworks/content/read.js':`import data from './manifest.json' with {type:'json'};import {absent} from './manifest.json' with {type:'json'};export {data,absent};`,
    'bot/src/frameworks/content/manifest.json':'{"name":"fresh"}'});
  assert.deepEqual(missing(report).map(v=>v.detail),['absent']);
});
test('star cycles terminate analysis and cannot supply an invented symbol',()=>{
  const report=inspect({[app]:`import {absent} from '../../frameworks/character/public.js';export {absent};`,
    [api]:`export * from './other.js';`,'bot/src/frameworks/character/other.js':`export * from './public.js';`});
  assert.deepEqual(missing(report).map(v=>v.detail),['absent']);assert.equal(report.summary.largestCycle,2);
});
test('an updated legacy consumer is also checked when its target belongs to the new topology',()=>{
  const report=inspect({'bot/src/old-character-client.js':`import {absent} from './frameworks/character/public.js';export {absent};`,[api]:'export const safeStem=x=>x;'},
    {groups:[{owner:'character',files:'old-character-client.js'}]});
  assert.deepEqual(missing(report).map(v=>v.detail),['absent']);
});
test('relocated content, character text and injected delivery cooperate using real disposable paths and a mock interaction',async t=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'rf02-composed-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const root=resolveContentRoot({cwd:base,root:'packaged'});fs.mkdirSync(path.join(root,'GM_PRIVATE'),{recursive:true});
  fs.writeFileSync(path.join(root,'public.md'),'# Lantern\nThe lantern keeper offers a public clue beside the ordinary station clock.');
  fs.writeFileSync(path.join(root,'GM_PRIVATE','secret.md'),'# Lantern\nThe hidden lantern plot belongs only to the GM and never the public scene.');
  const index=new ContentIndex(root),rows=index.search('lantern',10,{gm:false}),text=normalizeNarrativeMarkdown(rows.map(r=>r.body).join('\n'));
  const sends=[],send=createInteractionTextDelivery({splitDiscordText:value=>[value]}),q=new KeyedSerialQueue();
  const i={reply:async payload=>sends.push(payload)};
  assert.equal(await q.enqueue('guild:public',()=>send(i,text,{ephemeral:false})),1);await Promise.all([...q.tails.values()]);
  assert.equal(sends.length,1);assert.equal(sends[0].content,text);assert.equal(text.includes('hidden lantern plot'),false);
  assert.equal(narrativeRelativePath('Keeper','player'),'PLAYER/PLAYERS/Keeper.md');assert.equal(q.pending('guild:public'),false);
});
test('native stale-source exception crosses extracted queue/delivery boundaries unchanged without publication',async()=>{
  const original=new StateConflictError('Source changed',{code:'EXACT_SOURCE_CHANGED'}),calls=[],send=createInteractionTextDelivery({splitDiscordText:value=>[value]}),queue=new KeyedSerialQueue();
  await assert.rejects(queue.enqueue('g',()=>send({reply:async x=>calls.push(x)},'attempt',{beforeSend(){throw original;}})),e=>e===original);
  await Promise.all([...queue.tails.values()]);assert.deepEqual(calls,[]);assert.equal(original.code,'EXACT_SOURCE_CHANGED');
});
