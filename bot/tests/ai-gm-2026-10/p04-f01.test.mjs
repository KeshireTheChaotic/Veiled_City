import test from 'node:test';import assert from 'node:assert/strict';
import {classifyResourceOverlap} from '../../src/scene-action-window.js';
const action=(operation,reads=[],writes=[])=>({operation,reads,writes});
test('independent testimony does not force unrelated players into a contested beat',()=>{
 assert.equal(classifyResourceOverlap(action('testimony',['clue:harbor']),action('observe',['door:archive'])),'independent');
 assert.equal(classifyResourceOverlap(action('testimony',['clue:harbor']),action('testimony',['clue:harbor'])),'contradictory_testimony');
});
test('native resource dependencies and contention still determine coordination',()=>{
 assert.equal(classifyResourceOverlap(action('take',[],['item:key']),action('take',[],['item:key'])),'same_scarce_resource');
 assert.equal(classifyResourceOverlap(action('open',[],['door:archive']),action('enter',['door:archive'])),'sequential_dependency');
 assert.equal(classifyResourceOverlap(action('help'),action('lift')),'cooperative');
});
