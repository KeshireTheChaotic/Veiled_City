import test from 'node:test';
import assert from 'node:assert/strict';
import {incomingConditionOdds,movementConditionIssue} from '../../src/frameworks/daggerheart/native-condition-rules.js';

const lanes={data:{feature:'adversary:traffic-saint:all-lanes-stop'}};
const unrelated={data:{feature:'adversary:other:condition'}};
const bands=['Melee','Very Close','Close','Far','Very Far'];

test('incoming Advantage and Disadvantage cancel and like conditions do not stack',()=>{
  assert.deepEqual(incomingConditionOdds({native_conditions:[{}]},{advantage:true}),{advantage:true,disadvantage:false});
  assert.deepEqual(incomingConditionOdds({native_conditions:[{},{}]},{disadvantage:true}),{advantage:false,disadvantage:false});
  assert.deepEqual(incomingConditionOdds({native_conditions:[{}]},{disadvantage:true}),{advantage:false,disadvantage:false});
  assert.deepEqual(incomingConditionOdds({},{}),{advantage:false,disadvantage:false});
});

test('Traffic Saint movement limit allows through Very Close and blocks farther bands',()=>{
  assert.equal(movementConditionIssue([lanes],{range:'Melee',rangeBands:bands}),null);
  assert.equal(movementConditionIssue([lanes],{range:'Very Close',rangeBands:bands}),null);
  assert.equal(movementConditionIssue([lanes],{range:'Close',rangeBands:bands}),'NATIVE_MOVEMENT_LIMIT_VERY_CLOSE');
  assert.equal(movementConditionIssue([lanes],{range:null,rangeBands:bands}),'NATIVE_MOVEMENT_LIMIT_VERY_CLOSE');
});

test('unrelated native conditions and empty evidence do not impose movement limits',()=>{
  assert.equal(movementConditionIssue([unrelated],{range:'Far',rangeBands:bands}),null);
  assert.equal(movementConditionIssue([],{range:'Far',rangeBands:bands}),null);
});
