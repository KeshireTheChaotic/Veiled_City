import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {intentNativeRollReview} from '../../src/frameworks/intent/public.js';
import {nativeIntentRollReview} from '../../src/frameworks/daggerheart/public.js';
import {connectNativeWorldSource} from '../../src/framework-to-framework/daggerheart--world/public.js';
import {initializeIntentNativeRolls} from '../../src/application/composition/intent-native-rolls.js';

test('Intent roll operations and Native source fail closed before runtime composition',()=>{
 assert.throws(()=>intentNativeRollReview.reviewRollDeclaration({},'g',{},'gm'),{code:'INTENT_NATIVE_ROLL_REVIEW_COMPOSITION'});
 assert.throws(()=>nativeIntentRollReview.reviewRollDeclaration({},'g',{},'gm'),{code:'NATIVE_INTENT_ROLL_REVIEW_COMPOSITION'});
});

test('Application connects the original captured-owner review operation through the existing pair',async()=>{
 await import('../../src/ai-intents.js');
 assert.throws(()=>intentNativeRollReview.reviewRollDeclaration({},'g',{},'gm'),{code:'INTENT_NATIVE_ROLL_REVIEW_COMPOSITION'});
 assert.equal(initializeIntentNativeRolls(),true);
 assert.equal(initializeIntentNativeRolls(),true);
 connectNativeWorldSource();
 assert.deepEqual(Object.keys(intentNativeRollReview).sort(),['bind','reviewRollDeclaration']);
 assert.deepEqual(Object.keys(nativeIntentRollReview).sort(),['bind','reviewRollDeclaration']);
 const reviewFailure=new Error('original review source failure'),reviewDb={getWorldEvent(){throw reviewFailure;}};
 assert.throws(()=>intentNativeRollReview.reviewRollDeclaration(reviewDb,'g',{source_event:'source'},'gm'),error=>error===reviewFailure);
 assert.throws(()=>intentNativeRollReview.bind({reviewRollDeclaration(){}}),/replacement forbidden/);
});

test('Application owns the pair connection and Intent adapter invokes only its fixed port',async()=>{
 const [dispatcher,bridge,composition,startup]=await Promise.all([
  readFile(new URL('../../src/ai-intents.js',import.meta.url),'utf8'),
  readFile(new URL('../../src/framework-to-framework/daggerheart--intent/public.js',import.meta.url),'utf8'),
  readFile(new URL('../../src/application/composition/intent-native-rolls.js',import.meta.url),'utf8'),
  readFile(new URL('../../src/application/composition/runtime-initializers.js',import.meta.url),'utf8')
 ]);
 assert.match(dispatcher,/intentNativeRollReview\.reviewRollDeclaration/);
 assert.match(dispatcher,/prepareRollRequest\(db,guild,intent\.payload,actor,context\)/);
 assert.match(dispatcher,/import\s+\{reviewRollDeclaration\}\s+from\s+['"]\.\/roll-declaration-review\.js['"]/);
 assert.doesNotMatch(dispatcher,/connectIntentNativeRollReview|nativeIntentRollReview/);
 assert.match(bridge,/reviewRollDeclaration:nativeIntentRollReview\.reviewRollDeclaration/);
 assert.match(composition,/connectIntentNativeRollReview\(\)/);
 assert.match(startup,/initializeIntentNativeRolls\(\)/);
});
