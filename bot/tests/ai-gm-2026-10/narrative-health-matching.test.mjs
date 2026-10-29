import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {declare,intent} from './play-flow-helpers.mjs';
import {narrativeTasks,taskDispositions} from '../../src/narrative-tasks.js';
import {buildNarrativeContext} from '../../src/narrative-authority-context.js';

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
