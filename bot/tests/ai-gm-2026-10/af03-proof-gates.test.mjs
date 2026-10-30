import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureOperationDescriptor,requireFeatureOperation} from '../../src/frameworks/daggerheart/feature-operation-descriptors.js';

test('all nine exceptional proof gates remain supported exclusively through their original native paths',()=>{
  const definitions=JSON.parse(fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-feature-definitions.json',import.meta.url),'utf8')).features;
  const keys=['adversary:aster-vale-contractor:flashbang','adversary:pale-regent:command-the-blood','adversary:ritual-enforcement-team:coordinated-volley',
    'adversary:static-wraith:feedback','adversary:traffic-saint:all-lanes-stop','adversary:wraith-pack:many-deaths',
    'environment:after-hours-emergency-department:something-in-imaging','environment:aster-vale-predictive-lab:everything-logs','environment:haunted-nightclub:everybody-saw-something-different'];
  for(const key of keys){
    const feature=definitions.find(f=>f.feature_key===key);assert.equal(feature.status,'supported');assert.ok(feature.native_handler);
    assert.equal(featureOperationDescriptor(key),null);
    for(const kind of ['modifier','scene_event','resource_recovery','ordinary_arrival'])assert.throws(()=>requireFeatureOperation(feature,kind),/source_changed/);
    assert.throws(()=>requireFeatureOperation({...feature,feature_key:'adversary:pale-court-thrall:pack-pressure'},'modifier'),/source_changed/);
  }
});
