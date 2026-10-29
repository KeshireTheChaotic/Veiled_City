import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {authorNarrativeRequests,establishNarrativeUnits} from '../../src/narrative-authority.js';
import {prepareAuthorizedTurnOutput} from '../../src/pvp-output.js';
import {declare} from './play-flow-helpers.mjs';

test('a rejected writer identity retains its native diagnostic instead of a generic label',async()=>{
  const f=createP07NativeFixture();
  try{
    const message='I call this place the Folding Yard.';
    const {scope,sourceRef}=declare(f,'folding-yard-diagnostic',message,[]);
    const request={version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]},result={gm_world_parts:[request]};
    await authorNarrativeRequests({db:f.db,guild:f.guild,result,scope,sourceRef,budget:{used:false},generate:async packet=>{
      const task=packet.audience_v9.task_ids[0];
      return {version:9,fiction_delta:[{kind:'location',key:'folding-yard',name:'Folding Yard',summary:'An empty paved yard behind the station.',
        location_key:'',parent_location_key:'p07-station',role:'',aliases:[]}],acts:[{id:'yard-scene',task_id:task,kind:'scene_description',speaker_key:'',
        location_key:'folding-yard',text:'A wide paved yard opens behind the station.',source_refs:[]}]};
    }});
    assert.equal(establishNarrativeUnits(f.db,f.guild,request,scope,sourceRef).length,0);
    const review=f.db.listCityRecords(f.guild,{kind:'narrative_unit_fates',includeGM:true,limit:10})
      .find(row=>row.source_event===sourceRef);
    assert.equal(review.data.entity_results[0].reason,'owner_named_identity_requires_independent_authoring_source');
  }finally{f.close();}
});

test('a fully held response uses a neutral GM-review notice',()=>{
  const f=createP07NativeFixture();
  try{
    const {scope,sourceRef}=declare(f,'neutral-review','I look around the station.',[]);
    const result={respond:true,act:true,narration:'',player_summary:'',private_messages:[],events:[],
      gm_world_parts:[{version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]}]};
    prepareAuthorizedTurnOutput(f.db,f.guild,result,scope,{sourceRef});
    assert.equal(result.narration,'That response is held for GM review.');
  }finally{f.close();}
});
