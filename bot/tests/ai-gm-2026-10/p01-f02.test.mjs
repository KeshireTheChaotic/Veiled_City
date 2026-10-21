import test from 'node:test';
import assert from 'node:assert/strict';
import {NARRATIVE_V9_INSTRUCTIONS,actToNativeUnit} from '../../src/narrative-writer-v9.js';
test('creative brief invites distinct dialogue and flexible endings while preserving PC ownership',()=>{
  assert.match(NARRATIVE_V9_INSTRUCTIONS,/distinct NPC voices/);
  assert.match(NARRATIVE_V9_INSTRUCTIONS,/ending need not be a menu/);
  assert.match(NARRATIVE_V9_INSTRUCTIONS,/leave PC decisions and feelings open/);
});
test('freeform scene and NPC dialogue retain their exact words and native audience',()=>{
  for(const [kind,speaker,text] of [['scene_description','','Copper light trembles across the rain-streaked window.'],['npc_speech','vendor','“I can spare a key. What are you really looking for?”']]){
    const result=actToNativeUnit({id:'a',task_id:'t',kind,speaker_key:speaker,location_key:'stall',text,source_refs:['s']},{scope:{mode:'private'}});
    assert.equal(result.text,text);assert.equal(result.visibility,'character');assert.equal(result.receipt_ref,'');
  }
});
