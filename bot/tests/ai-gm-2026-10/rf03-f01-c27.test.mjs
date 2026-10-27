import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {applicationPrincipal,principalAllows} from '../../src/kernel/application-authority.js';
test('actual neutral primitive grants only the exact issued context and operation',()=>{
 const token=applicationPrincipal('context-k27','evidence.analyze','native-adapter-k27');assert.equal(principalAllows(token,'context-k27','evidence.analyze'),true);assert.equal(principalAllows(token,'other-context','evidence.analyze'),false);assert.equal(principalAllows(token,'context-k27','encounter.activate'),false);assert.equal(principalAllows(null,'context-k27','evidence.analyze'),false);
});
test('serialized, copied or inherited token fields never reproduce the actual in-process capability',()=>{
 const token=applicationPrincipal('context-k27','operation-k27','issuer-k27');for(const copy of [JSON.parse(JSON.stringify(token)),{...token},Object.create(token),{}])assert.equal(principalAllows(copy,'context-k27','operation-k27'),false);assert.equal(Object.isFrozen(token),true);assert.throws(()=>{token.operation='different';},TypeError);assert.equal(principalAllows(token,'context-k27','operation-k27'),true);
});
test('canonical relative and absolute imports share one issuer/verifier identity without a forwarding facade',async()=>{
 const file=fileURLToPath(new URL('../../src/kernel/application-authority.js',import.meta.url)),native=await import(pathToFileURL(file).href);assert.equal(native.applicationPrincipal,applicationPrincipal);assert.equal(native.principalAllows,principalAllows);const token=native.applicationPrincipal('same-process-k27','native-op-k27','issuer');assert.equal(principalAllows(token,'same-process-k27','native-op-k27'),true);assert.equal(existsSync(new URL('../../src/application-authority.js',import.meta.url)),false);
});
test('physical move preserves original source bytes and every actual production consumer names the one kernel primitive',()=>{
 const root=fileURLToPath(new URL('../../../',import.meta.url)),move=JSON.parse(readFileSync(resolve(root,'docs/Implementation_Plans/Framework_Refactor/features/RF03-F01/C27-MOVE.json'),'utf8')),bytes=readFileSync(resolve(root,move.target));assert.equal(createHash('sha256').update(bytes).digest('hex'),move.sha256);assert.equal(move.bytes_preserved,true);assert.equal(move.owner,'kernel');assert.equal(move.consumers.length,8);for(const file of move.consumers){const text=readFileSync(resolve(root,file),'utf8');assert.equal(text.includes("from './application-authority.js'"),false);assert.equal(text.includes('from "./application-authority.js"'),false);}
});
