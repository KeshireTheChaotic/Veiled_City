import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as compatibility from '../../src/ordinary-effect-proof.js';
import {nativeOrdinaryProofSource as native,nativeAccessOrdinaryProof} from '../../src/frameworks/daggerheart/public.js';
import {jsonHash} from '../../src/kernel/json-hash.js';
test('Native source port retains complete original lazy provider body and forwards original outputs',async()=>{
 const full=await readFile(new URL('../../src/ordinary-effect-proof.js',import.meta.url),'utf8');
 const source=full.slice(0,full.indexOf('\n// Provide original lazy proof functions'));
 const body=source.replace(/^import .*;\r?\n/gm,'').replace(/\r\n/g,'\n');
 assert.equal(createHash('sha256').update(body).digest('hex'),'c0bf72674d716b5bcc0fc2e71e0b44fe2b840f4d2a66a034a1007e4370b842a2');
 for(const name of Object.keys(compatibility))assert.equal(typeof native[name],'function',name);
 const error=new Error('same exception');assert.throws(()=>native.effectFail('test'),e=>e.reason==='test');
 assert.throws(()=>native.bind(Object.fromEntries(Object.keys(compatibility).map(name=>[name,()=>error]))),/replacement forbidden/);
});
test('original lazy provider preserves deterministic keys and source-authority refusal guards',()=>{
 const proposal={kind:'synthetic'},scope={mode:'private',actorUserId:'owner',actorCharacterId:'pc'};
 assert.equal(native.effectHash(proposal),jsonHash(proposal));assert.equal(compatibility.effectKey(proposal,scope),`ordinary-effect:${jsonHash([proposal,scope])}`);
 const db=new Proxy({}, {get(){throw new Error('Invalid source must fail before DB access');}});
 assert.throws(()=>native.ordinaryActionProof(db,'g','',scope),e=>e.code==='ORDINARY_EFFECT'&&e.reason==='CURRENT_ACTION_AUTHORITY_REQUIRED');
 assert.throws(()=>nativeAccessOrdinaryProof.ordinaryActionProof(db,'g','',scope),e=>e.code==='ORDINARY_EFFECT'&&e.reason==='CURRENT_ACTION_AUTHORITY_REQUIRED');
 assert.equal(native.assertOrdinaryBinding(db,'g',undefined,{},''),undefined);
 assert.throws(()=>compatibility.assertOrdinaryBinding(db,'g',undefined,{},'ordinary-effect:missing'),e=>e.code==='ORDINARY_EFFECT'&&e.reason==='VERSIONED_NATIVE_CHILD_BINDING_REQUIRED');
});
