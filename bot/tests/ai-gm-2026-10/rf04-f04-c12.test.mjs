import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyResourceOverlap as sessionClassifier} from '../../src/frameworks/session/public.js';
import {classifyResourceOverlap as compatibilityClassifier} from '../../src/scene-action-window.js';

const action=(operation,reads=[],writes=[])=>({operation,reads,writes});

test('Session owns the unchanged resource-overlap classifier and the compatibility reader preserves identity',()=>{
 assert.strictEqual(compatibilityClassifier,sessionClassifier);
 assert.equal(sessionClassifier(action('observe',['place:market']),action('inspect',['item:bell'])),'independent');
 assert.equal(sessionClassifier(action('testimony',['fact:ledger']),action('testimony',['fact:ledger'])),'contradictory_testimony');
 assert.equal(sessionClassifier(action('take',[],['item:bell']),action('take',[],['item:bell'])),'same_scarce_resource');
 assert.equal(sessionClassifier(action('opposed',[],['door:gate']),action('force',[],['door:gate'])),'opposed_action');
 assert.equal(sessionClassifier(action('open',[],['door:gate']),action('enter',['door:gate'])),'sequential_dependency');
 assert.equal(sessionClassifier(action('help'),action('lift')),'cooperative');
 assert.equal(sessionClassifier(action('testimony',['item:bell'],['item:bell']),action('testimony',['item:bell'],['item:bell'])),'contradictory_testimony');
});
