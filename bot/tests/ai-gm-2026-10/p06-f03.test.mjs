import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {runFreshDelta} from '../../scripts/ai-gm-delta.mjs';
import {selectFreshTests} from '../../src/frameworks/operations/ai-gm-test-selection.js';
import {gmRulingSchema,validateGmRulingProposal} from '../../src/gm-ruling-schema.js';
import {gmRulingSchema as compatibilitySchema} from '../../src/gm-action-ruling.js';
import {playerIntentSchema} from '../../src/typed-intents.js';
test('independent runner executes a fresh frozen union once and never falls back for unknown code',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'veiled-delta-')),source='bot/src/current.js',file='bot/tests/ai-gm-2026-10/p06-f03.test.mjs';
 try{for(const p of [source,file]){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),'// fresh local input');}
 const calls=[],execute=(_exe,args)=>{calls.push(args);return {status:0,stdout:'# tests 1\n# pass 1\n# fail 0\n',stderr:''};};
 const r=runFreshDelta({changedPaths:[source],coverage:{[source]:[file]},root,execute});
 assert.equal(r.status,'TARGETED_PASS');assert.equal(calls.filter(a=>a[0]==='--test').length,1);assert.deepEqual(r.selection.tests,[file]);
 const count=calls.length;assert.throws(()=>runFreshDelta({changedPaths:['bot/src/uncovered.js'],coverage:{},root,execute}),/Fresh coverage required/);assert.equal(calls.length,count);
 }finally{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(root,{recursive:true,force:true});}
});
test('absolute and aliased paths cannot silently bypass changed-code coverage',()=>{
 for(const p of ['/bot/src/a.js','C:/bot/src/a.js','./bot/src/a.js','bot//src/a.js'])assert.throws(()=>selectFreshTests([p],{}),/canonical paths/);
});
test('dependency-free schema preserves legacy export and rejects forged mechanical authority',()=>{
 assert.equal(gmRulingSchema,compatibilitySchema);assert.ok(playerIntentSchema.items.anyOf.some(s=>s.properties.gm_ruling===gmRulingSchema));
 assert.throws(()=>validateGmRulingProposal({version:1,disposition:'native_resolved',damage:999}),/Closed versioned/);
});
