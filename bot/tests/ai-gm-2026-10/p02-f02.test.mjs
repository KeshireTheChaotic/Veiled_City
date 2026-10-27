import test from 'node:test';import assert from 'node:assert/strict';
import {dualityRoll,gmD20Roll} from '../../src/frameworks/daggerheart/dice.js';
test('actual Duality faces and helper results are preserved independently of caller mutation',()=>{
 const faces=[4,9],helper=[3];const r=dualityRoll({modifier:2,helperDice:helper},s=>{assert.equal(s,12);return faces.shift();});
 helper[0]=6;assert.deepEqual(r.helper_dice,[3]);assert.equal(r.total,18);assert.equal(r.duality,'Fear');
});
test('overflow or invented faces cannot enter native results',()=>{
 assert.throws(()=>dualityRoll({modifier:Number.MAX_SAFE_INTEGER},()=>12),/safe integer/);
 assert.throws(()=>dualityRoll({},()=>13),/out of range/);
 assert.throws(()=>gmD20Roll({difficulty:10},()=>0),/out of range/);
});
test('NPC dice remain native d20 without PC Hope or Fear',()=>{
 const faces=[3,17],r=gmD20Roll({kind:'attack',difficulty:16,advantage:true},s=>{assert.equal(s,20);return faces.shift();});
 assert.equal(r.selected,17);assert.equal(r.success,true);assert.equal('hope' in r,false);assert.equal('fear' in r,false);
});
