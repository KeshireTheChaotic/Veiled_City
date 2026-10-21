import test from 'node:test';
import assert from 'node:assert/strict';
import {compileWriterV9} from '../../src/narrative-writer-v9.js';
test('malformed optional act does not erase an independently verified sibling',()=>{
  const binding={scope:{mode:'party'},task_ids:['t'],audience:'party',source_event:'s',proof_ref:'p'};
  const act={id:'valid',task_id:'t',kind:'scene_description',speaker_key:'',location_key:'street',text:'The tram bell echoes through the mist.',source_refs:['s']};
  let verified=0;
  const result=compileWriterV9({version:9,acts:[null,act],fiction_delta:[]},{authority:{inspect:()=>binding},grant:{}},()=>{verified++;});
  assert.equal(result.compiled[0].status,'held');assert.equal(result.compiled[1].status,'verified_candidate');
  assert.equal(result.answer.narrative_units[0].text,act.text);assert.equal(verified,1);
});
test('native rejection remains local and never fabricates a receipt',()=>{
  const binding={scope:{mode:'private'},task_ids:['t'],audience:'player_private',source_event:'s',proof_ref:'p'};
  const act={id:'bad',task_id:'t',kind:'npc_speech',speaker_key:'npc',location_key:'street',text:'Unverified testimony.',source_refs:['s']};
  const result=compileWriterV9({version:9,acts:[act],fiction_delta:[]},{authority:{inspect:()=>binding}},()=>{throw Object.assign(new Error('held'),{code:'SCENE_FICTION'});});
  assert.deepEqual(result.answer.narrative_units,[]);assert.equal(result.compiled[0].status,'held');
});
