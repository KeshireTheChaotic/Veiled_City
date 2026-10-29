import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {authorNarrativeRequests,establishNarrativeUnits} from '../../src/narrative-authority.js';
import {declare,intent} from './play-flow-helpers.mjs';
import {applyAuthoritativeMutation} from '../../src/state.js';
import {queueDirectorPublications,deliverTurnOutbox} from '../../src/publication-outbox.js';
import {speakerBrief} from '../../src/narrative-speakers.js';
import {buildNarrativeContext} from '../../src/narrative-authority-context.js';
import {creativeBrief} from '../../src/narrative-delegation.js';
import {resolvePlaceReference} from '../../src/frameworks/world/location-language.js';

test('a held move can persist its requested adjacent destination without creating an arrival',async()=>{
  const f=createP07NativeFixture();
  try{
    const phrase='the open narrow doorway beside the boarded bathhouse',message=`I go to ${phrase}.`;
    const move=intent(message,{type:'move',operation:'travel',target_key:'',target_name:phrase,utterance:'',resolution:'blocked'});
    const {scope,sourceRef}=declare(f,'persist-place',message,[move]);
    const request={version:8,kind:'narrative_request',operation:'continuation',source_refs:[]},result={player_intents:[move],gm_world_parts:[request]};
    let createdKey;
    await authorNarrativeRequests({db:f.db,guild:f.guild,result,scope,sourceRef,budget:{used:false},generate:async packet=>{
      const task=packet.creative_brief.source_tasks.find(item=>item.kind==='held_move');
      assert.ok(packet.creative_brief.requested_places.some(item=>item.task_id===task.id&&item.phrase===phrase));
      createdKey='bathhouse-doorway';
      return {version:9,fiction_delta:[{kind:'location',key:createdKey,name:'Bathhouse Doorway',summary:'A narrow unmarked doorway beside the boarded bathhouse.',
        location_key:'',parent_location_key:'p07-station',role:'',aliases:[phrase]}],acts:[{id:'doorway-scene',task_id:task.id,kind:'scene_description',
        speaker_key:'',location_key:createdKey,text:'The narrow doorway sits beside the boarded bathhouse, its lintel dark with old rain.',source_refs:[]}]};
    }});
    const rows=establishNarrativeUnits(f.db,f.guild,request,scope,sourceRef);
    assert.equal(rows.length,1,JSON.stringify(f.db.listCityRecords(f.guild,{kind:'narrative_unit_fates',includeGM:true,limit:10}).map(row=>row.data)));
    assert.ok(f.db.getSimulationEntity(f.guild,'location',createdKey));
    assert.equal(resolvePlaceReference(f.db,f.guild,f.pcs[0].id,phrase).location.entity_key,createdKey);
    assert.equal(f.db.getCharacter(f.pcs[0].id).data.location,'p07-station','persisting the future target is not a character arrival');
  }finally{f.close();}
});

test('an unknown held travel target is sent to the writer as a future-place request, not a current arrival',()=>{
  const f=createP07NativeFixture();
  try{
    const message='I go to the open narrow doorway beside the boarded bathhouse.';
    const move=intent(message,{type:'move',operation:'travel',target_key:'',target_name:'the open narrow doorway beside the boarded bathhouse',
      utterance:'',resolution:'blocked'});
    const {scope,sourceRef}=declare(f,'unknown-place',message,[move]);
    const request={version:8,kind:'narrative_request',operation:'continuation',source_refs:[]},result={player_intents:[move]};
    const ctx=buildNarrativeContext(f.db,f.guild,scope,sourceRef,{operation:'continuation'});
    const brief=creativeBrief(ctx,result,request);
    assert.equal(brief.requested_places[0].phrase,move.target_name);
    assert.match(brief.constraints.join(' '),/does not move the character/);
    assert.match(brief.constraints.join(' '),/only the scene-description act/);
  }finally{f.close();}
});

test('a delivered writer lead becomes a clue and case thread; delivered NPC speech enters that NPC knowledge',async()=>{
  const f=createP07NativeFixture();
  try{
    const message='I search the station for a clue about the copper token.';
    const search=intent(message,{type:'search',operation:'search',target_key:'p07-station',target_name:'station',utterance:'',resolution:'conversational'});
    const {scope,sourceRef}=declare(f,'lead-writer',message,[search]);
    const request={version:8,kind:'narrative_request',operation:'continuation',source_refs:[]},result={gm_world_parts:[request],player_intents:[search]};
    let taskId;
    await authorNarrativeRequests({db:f.db,guild:f.guild,result,scope,sourceRef,budget:{used:false},generate:async packet=>{
      taskId=packet.creative_brief.source_tasks.find(task=>task.kind==='investigation')?.id;
      assert.ok(taskId,'the investigation task is available to the writer');
      return {version:9,fiction_delta:[],acts:[
        {id:'copper-token-lead',task_id:taskId,kind:'lead',speaker_key:'',location_key:'p07-station',
          text:'A red fiber clings to the copper token, matching the weave on the east-road parcels.',source_refs:[]},
        {id:'mara-testimony',task_id:taskId,kind:'npc_speech',speaker_key:'mara',location_key:'p07-station',
          text:'The carter left a red fiber on the token before taking the east road.',source_refs:[]}
      ]};
    }});
    const narrative={act:true,narration:'',public_narration:'',player_summary:'',private_messages:[],narrative_claims:[],events:[],
      player_intents:[search],gm_world_parts:[request]};
    applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,narrative,scope,source:'ai_gm',
      provenance:{actorType:'ai',actorId:'veilkeeper',messageId:'lead-writer'},events:narrative.events});
    const rows=f.db.listCityRecords(f.guild,{kind:'narrative_unit',includeGM:true,limit:20})
      .filter(row=>row.status==='accepted_established'&&row.data.binding.source===sourceRef);
    assert.deepEqual(rows.map(row=>row.data.unit.kind).sort(),['lead','npc_speech']);
    assert.equal(f.db.listNpcKnowledge(f.guild,'mara',{limit:200}).filter(row=>row.source_type==='narrative_self_testimony').length,0,
      'unacknowledged prose does not become NPC knowledge');
    const turnId=queueDirectorPublications(f.db,{guild:{id:f.guild},session:f.session,result:narrative,scope,key:'lead-writer-delivery'});
    await deliverTurnOutbox(f.db,f.guild,turnId,async row=>({messageId:`mock-${row.ordinal}`,channelId:row.channel_id||'mock-play-channel'}));
    const delivery=f.db.listCityRecords(f.guild,{kind:'narrative_delivery',includeGM:true,limit:20})
      .find(row=>row.data.turn===turnId&&row.data.unit===rows.find(unit=>unit.data.unit.kind==='lead').record_key);
    assert.equal(delivery.status,'acknowledged_to_audience');
    assert.equal(f.db.getFact(f.guild,delivery.data.lead_clue).category,'clue');
    assert.equal(f.db.getThread(f.guild,delivery.data.lead_thread).status,'active');
    assert.match(speakerBrief(f.db,f.guild,'mara',f.scope,'p07-station').knowledge.map(row=>row.text).join(' '),/red fiber/,
      'the speaker proof admits the NPC’s own delivered testimony for later speech');
  }finally{f.close();}
});
