import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {declare} from './play-flow-helpers.mjs';
import {authorNarrativeRequests,establishNarrativeUnits} from '../../src/narrative-authority.js';

test('one held-act repair restores coherent scenery before establishment',async()=>{
 const f=createP07NativeFixture();
 try{
  const {scope,sourceRef}=declare(f,'repair-scene','I look around.',[]);
  const request={version:8,kind:'narrative_request',operation:'continuation',source_refs:[]};
  let calls=0;
  await authorNarrativeRequests({db:f.db,guild:f.guild,result:{gm_world_parts:[request]},scope,sourceRef,budget:{used:false},generate:async packet=>{
   calls++;
   if(calls===2)assert.equal(packet.repair.held.length,1);
   return {version:9,fiction_delta:[],acts:[{id:'scene',task_id:packet.audience_v9.task_ids[0],kind:'scene_description',speaker_key:'',location_key:'p07-station',source_refs:[],text:calls===1?'You surrender to the watch.':'Rain taps against the station windows.'}]};
  }});
  assert.equal(calls,2);
  const rows=establishNarrativeUnits(f.db,f.guild,request,scope,sourceRef);
  assert.equal(rows.length,1);
  assert.match(rows[0].data.text,/Rain taps/);
 }finally{f.close();}
});
