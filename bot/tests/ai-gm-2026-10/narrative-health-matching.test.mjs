import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {declare,intent} from './play-flow-helpers.mjs';
import {narrativeTasks,taskDispositions} from '../../src/narrative-tasks.js';
import {buildNarrativeContext} from '../../src/narrative-authority-context.js';

test('looking around without a named target resolves to the current scene',()=>{
 const f=createP07NativeFixture();try{
  const message='I look around.',look=intent(message,{type:'observe',operation:'observe surroundings from current position',target_key:'',target_name:'',utterance:'',resolution:'auto'});
  const {scope,sourceRef}=declare(f,'look-around',message,[look]);
  const tasks=narrativeTasks(f.db,f.guild,{player_intents:[look]},scope,sourceRef);
  assert.equal(tasks.length,1);
  assert.ok(tasks[0].accepted_intent);
  assert.equal(tasks[0].binding.target,'p07-station');
  const context=buildNarrativeContext(f.db,f.guild,scope,sourceRef,{operation:'describe_scene'});
  f.db.saveCityRecord(f.guild,{kind:'narrative_unit',key:'look-answer',status:'accepted_established',visibility:'party',source_event:sourceRef,
   data:{unit:{kind:'scene',subject_key:'',location_key:'p07-station'},binding:context.binding,act_v9:{task_id:tasks[0].id}}});
  assert.equal(taskDispositions(f.db,f.guild,{player_intents:[look]},[{record_key:'look-part',data:{kind:'gm_narrative_unit',ref:'look-answer'}}],scope,sourceRef)[0].disposition,'answered');
 }finally{f.close();}
});

test('health counts a unique NPC reply even when the writer selected another valid task id',()=>{
  const f=createP07NativeFixture();
  try{
    const message='I ask Mara about the east-road bathhouse.';
    const ask=intent(message,{type:'speak',operation:'speak',target_key:'mara',target_name:'Mara Vale',utterance:message,
      resolution:'conversational'});
    const {scope,sourceRef}=declare(f,'health-npc-match',message,[ask]);
    const result={player_intents:[ask]},tasks=narrativeTasks(f.db,f.guild,result,scope,sourceRef);
    assert.equal(tasks.length,1);
    assert.equal(tasks[0].kind,'npc_response');
    const context=buildNarrativeContext(f.db,f.guild,scope,sourceRef,{operation:'conversation'});
    const key='health-npc-reply';
    f.db.saveCityRecord(f.guild,{kind:'narrative_unit',key,status:'accepted_established',visibility:'party',source_event:sourceRef,
      location_key:'p07-station',data:{unit:{id:'mara-reply',kind:'npc_speech',subject_key:'mara',location_key:'p07-station',text:'The old bathhouse is on the east road.'},
        binding:{...context.binding,source:sourceRef,scope},act_v9:{task_id:'another-valid-task'}}});
    const parts=[{record_key:'part-mara',data:{kind:'gm_narrative_unit',ref:key}}];
    assert.equal(taskDispositions(f.db,f.guild,result,parts,scope,sourceRef)[0].disposition,'answered');
  }finally{f.close();}
});
