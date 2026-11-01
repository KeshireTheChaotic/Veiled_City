import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {handleStoryCommand} from '../../src/story-commands.js';
import {intentOrdinaryBinding} from '../../src/frameworks/intent/public.js';
import {nativeOrdinaryProofSource} from '../../src/frameworks/daggerheart/public.js';
import {connectIntentNativeOrdinaryBinding} from '../../src/framework-to-framework/daggerheart--intent/public.js';
import {initializeEnvironmentScene} from '../../src/application/composition/environment-scene.js';
import {jsonHash} from '../../src/kernel/json-hash.js';
test('actual Application imports initialize original Native provider while Intent fails closed before composition',()=>{
 assert.equal(typeof handleStoryCommand,'function');assert.equal(nativeOrdinaryProofSource.effectHash({source:'original'}),jsonHash({source:'original'}));
 assert.throws(()=>intentOrdinaryBinding.assertOrdinaryBinding({},'g',null,{},''),{code:'INTENT_ORDINARY_BINDING_COMPOSITION'});
});
test('existing pair/runtime binds only original proof and retains refusal/error semantics',()=>{
 assert.equal(connectIntentNativeOrdinaryBinding(),intentOrdinaryBinding);connectIntentNativeOrdinaryBinding();
 assert.equal(initializeEnvironmentScene(),true);assert.equal(initializeEnvironmentScene(),true);
 assert.deepEqual(Object.keys(intentOrdinaryBinding).sort(),['assertOrdinaryBinding','bind']);
 const db=new Proxy({}, {get(){throw new Error('No database read expected');}});
 assert.equal(intentOrdinaryBinding.assertOrdinaryBinding(db,'g',null,{},''),undefined);
 assert.throws(()=>intentOrdinaryBinding.assertOrdinaryBinding(db,'g',null,{},'ordinary-effect:missing'),e=>e.code==='ORDINARY_EFFECT'&&e.reason==='VERSIONED_NATIVE_CHILD_BINDING_REQUIRED');
 const failure=new Error('original origin conversion failure'),origin={toString(){throw failure;}};
 assert.throws(()=>intentOrdinaryBinding.assertOrdinaryBinding(db,'g',null,{},origin),e=>e===failure);
 assert.throws(()=>intentOrdinaryBinding.bind({assertOrdinaryBinding(){}}),/replacement forbidden/);
});
test('Intent dispatcher has no direct root proof import or local proof binding',async()=>{
 const source=await readFile(new URL('../../src/ai-intents.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/from\s*['"]\.\/ordinary-effect-proof\.js['"]/);assert.doesNotMatch(source,/intentOrdinaryBinding\.bind/);
});
