import test from 'node:test';
import assert from 'node:assert/strict';
import {movementConditionIssue} from '../../src/frameworks/daggerheart/native-condition-rules.js';

const ranges=['Melee','Very Close','Close','Far','Very Far'];

test('Restrained blocks every movement range until its native condition is cleared',()=>{
  const restrained=[{data:{condition:'Restrained'}}];
  for(const range of ranges)assert.equal(movementConditionIssue(restrained,{range,rangeBands:ranges}),'NATIVE_MOVEMENT_RESTRAINED');
  assert.equal(movementConditionIssue([],{range:'Close',rangeBands:ranges}),null);
});

test('existing source-qualified lane restriction still limits movement only beyond Very Close',()=>{
  const lanes=[{data:{feature:'adversary:traffic-saint:all-lanes-stop'}}];
  assert.equal(movementConditionIssue(lanes,{range:'Very Close',rangeBands:ranges}),null);
  assert.equal(movementConditionIssue(lanes,{range:'Close',rangeBands:ranges}),'NATIVE_MOVEMENT_LIMIT_VERY_CLOSE');
});
