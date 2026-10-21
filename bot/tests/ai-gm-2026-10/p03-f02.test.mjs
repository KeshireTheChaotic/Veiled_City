import test from 'node:test';import assert from 'node:assert/strict';
import {decayedNarrativeWeight} from '../../src/narrative-salience.js';
test('continuity decays only through fictional ticks',()=>{
 assert.equal(decayedNarrativeWeight(5,10,10),5);assert.equal(decayedNarrativeWeight(5,10,22),3);assert.equal(decayedNarrativeWeight(5,10,100),0);
});
test('invalid or future evidence cannot poison retrieval rankings',()=>{
 for(const args of [[NaN,0,0],[Infinity,0,0],[-1,0,0],[5,10,9],[5,0.5,10],[5,-1,10]])assert.equal(decayedNarrativeWeight(...args),0);
});
