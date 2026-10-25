import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneObservationOperation} from '../../src/frameworks/narrative/public.js';

test('read-only scene description phrases remain eligible for the existing observation path',()=>{
  for(const request of ['Describe the scene.','what does it look like','What do my surroundings look like?','set the scene'])
    assert.equal(sceneObservationOperation(request),'describe_scene');
  assert.equal(sceneObservationOperation('What does Ember Hall look like?','Ember Hall'),'describe_scene');
  assert.equal(sceneObservationOperation('What does the archive look like inside','','archive'),'describe_scene');
});

test('current-situation queries remain observations and do not admit action intent',()=>{
  for(const request of ['what else is going on currently','what is currently going on in the scene','what is my current situation'])
    assert.equal(sceneObservationOperation(request),'current_situation');
  for(const request of ['I go to the archive','attack the guard','open the sealed door','ask the witness about the letter'])
    assert.equal(sceneObservationOperation(request),null);
});

test('ambiguous, overlong, or quoted input stays on the existing semantic path',()=>{
  assert.equal(sceneObservationOperation(''),null);
  assert.equal(sceneObservationOperation('describe the scene '.repeat(20)),null);
  assert.equal(sceneObservationOperation('what does "the archive" look like'),null);
  assert.equal(sceneObservationOperation('what does the archive\nlook like'),null);
});
