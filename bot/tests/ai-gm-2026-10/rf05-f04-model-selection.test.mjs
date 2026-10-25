import test from 'node:test';
import assert from 'node:assert/strict';
import {narrativeModel} from '../../src/frameworks/narrative/model-selection.js';

test('observation uses the fast model only for an unprotected scene',()=>{
  const config={narrativeFastModel:'fast',narrativeModel:'narrative',gmModel:'gm'};
  assert.equal(narrativeModel(config,{protected_scene:false},'observation'),'fast');
  assert.equal(narrativeModel(config,{protected_scene:true},'observation'),'narrative');
});

test('configured narrative model takes precedence across lanes',()=>{
  const config={narrativeFastModel:'fast',narrativeModel:'narrative',routineGmModel:'routine',downtimeModel:'downtime',gmModel:'gm'};
  assert.equal(narrativeModel(config,{},'assembly'),'narrative');
  assert.equal(narrativeModel(config,{},'downtime'),'narrative');
  assert.equal(narrativeModel(config,{},'combined'),'narrative');
});

test('lane-specific and general fallbacks keep their existing order',()=>{
  assert.equal(narrativeModel({routineGmModel:'routine',gmModel:'gm'}, {}, 'combined'),'routine');
  assert.equal(narrativeModel({downtimeModel:'downtime',gmModel:'gm'}, {}, 'downtime'),'downtime');
  assert.equal(narrativeModel({gmModel:'gm'}, {}, 'observation'),'gm');
  assert.equal(narrativeModel({}, {}, 'combined'),undefined);
});
