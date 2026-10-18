/** Generic playable-narration acceptance. Synthetic native state and fake providers; no production data. */
import test from 'node:test';
import {establishFixtureAdditions} from './native-world-fixtures.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {FakeResponses} from './contract-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {captureWorldInput,worldInputKey} from '../src/autonomous-world.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {recordCharacterArrival,recordScenePresence,currentScene} from '../src/scene-continuity.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {revalidateOutputPublication,prepareStoredOutput,certifiedSessionRecap} from '../src/pvp-output.js';
import {proposePvp} from '../src/narrative-pvp.js';
import {pvpTerms} from './v9-fixtures.mjs';
import {deliverVerifiedAssembly} from '../src/assembly-publications.js';
export const prompts=['Set the scene','What does the laundromat look like inside?','What else is going on currently?',
  'I head inside Twenty-Four Spin','What does it look like inside?','I examine the frozen terminal'];
const fiction={description:'Two rows of steel washers face a long folding counter. A blue bench stands beneath the front window. Detergent scents the warm air.',
  details:[{id:'washer-rows',category:'layout',text:'Two rows of steel washers face a long folding counter.'},
    {id:'blue-bench',category:'nonmechanical_prop',text:'A blue bench stands beneath the front window.'}],evidence_refs:[]};
function candidate(text,operation='describe_scene'){
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(k=>[k,{decision:'no_change',reason:'No consequential mutation.',confidence:100}]));
  state_review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  return {respond:true,narration:'UNVERIFIED RAW DRAFT',narrative_claims:[],
    gm_world_parts:[{version:7,kind:'scene_fiction_request',operation,source_refs:[]}],
    player_intents:[{type:'other',source_span:text,target_name:'',target_key:'',destination:'unspecified',operation,
      utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Owner observation request.'}],
    ordinary_effect_proposals:[],narrative_interpretation:null,world_additions:[],scene_actions:[],world_conflicts:[],context_memories:[],authored_candidates:null,
    private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,state_review};
}
function fixture(f,{mode='party',text=prompts[0],location='spin',placeType='laundromat',name=null}={}){
  const pc=f.pcs[0],messageId=`playable-${f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).length}`;
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,playable_narration:true,scene_continuity:true}});
  f.db.setSimulationEntity(f.guild,'location',location,{name:name||(location==='spin'?'Twenty-Four Spin':'Public Observatory'),place_type:placeType,visibility:'party'});
  f.db.updateCharacterData(pc.id,d=>{d.location=location;});
  const arrival=indexWorldEvent(f.db,f.guild,{key:`${messageId}:arrival`,kind:'arrival',title:'Owner-confirmed synthetic initial viewpoint',
    source_id:`player:${pc.owner_user_id}`,session_id:f.session.id,scene:currentScene(f.db,f.guild).key,location_key:location,
    visibility:mode==='private'?'character':'party',subject_key:mode==='private'?pc.id:null,
    details:{entity_type:'character',entity_key:pc.id,owner_user_id:pc.owner_user_id}},pc.owner_user_id);
  recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,location_key:location,source_event:arrival.event_key,
    zone:'interior',visibility:mode==='private'?'character':'party',subject_key:mode==='private'?pc.id:null,accepted_by:pc.owner_user_id},'native-fixture');
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,text,{privateScene:mode==='private'});
  return {pc,messageId,text,scope:{mode,actorUserId:pc.owner_user_id,actorCharacterId:pc.id},sourceRef:worldInputKey(messageId,pc.id)};
}
async function run(f,x,answers=[candidate(x.text),fiction],fastPath=false){
  const ai=new FakeResponses(answers),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',maxRecentMessages:10,maxContentChunks:2,playableObservationFastPath:fastPath}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,
    messageText:x.text,messageId:x.messageId,scope:x.scope.mode});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:x.scope.mode});
  const mutation=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:x.pc.name,label:'playable fixture',
    meta:{messageId:x.messageId,turnId:attempt.turn_id}});
  return {gm,ai,result,mutation,attempt,rows:f.db.listTurnPublications(f.guild,attempt.turn_id)};
}
test('PLAY01 sparse ordinary scene publishes specific local fiction, not raw prose or a neutral administrative answer',()=>nativeFixture(async f=>{
  const x=fixture(f),before=f.pcs.map(p=>f.db.getCharacter(p.id).data.resources),out=await run(f,x);
  const text=out.rows.map(r=>r.payload).join('\n');assert(text.includes('steel washers'));assert(text.includes('blue bench'));
  assert(!/UNVERIFIED RAW|No additional character response|not established|nonmechanical scene framing/.test(text));
  assert.deepEqual(f.pcs.map(p=>f.db.getCharacter(p.id).data.resources),before);
}));
test('PLAY02 authoring packet has actual question, canonical function and native interior viewpoint without private material',()=>nativeFixture(async f=>{
  const x=fixture(f,{text:prompts[1]});f.db.addFact(f.guild,{content:'GM_SECRET_UNRELATED',visibility:'gm'});
  f.db.addMessage({guildId:f.guild,sessionId:f.session.id,messageId:'secret',userId:f.pcs[1].owner_user_id,visibility:'player',subjectUserId:f.pcs[1].owner_user_id,content:'OTHER_PRIVATE_HOOK'});
  const {buildSceneFictionContext}=await import('../src/scene-fiction-context.js');
  const ctx=buildSceneFictionContext(f.db,f.guild,x.scope,x.sourceRef);
  assert.equal(ctx.packet.observation_request,x.text);assert.equal(ctx.packet.place.type,'laundromat');assert.equal(ctx.packet.viewpoint,'interior');
  assert(!JSON.stringify(ctx.packet).includes('GM_SECRET_UNRELATED'));assert(!JSON.stringify(ctx.packet).includes('OTHER_PRIVATE_HOOK'));
}));
test('PLAY03 general packet is not a laundromat special case',()=>nativeFixture(async f=>{
  const x=fixture(f,{location:'observatory',placeType:'observatory'}),{buildSceneFictionContext}=await import('../src/scene-fiction-context.js');
  const ctx=buildSceneFictionContext(f.db,f.guild,x.scope,x.sourceRef);assert.equal(ctx.packet.place.type,'observatory');
  assert(!JSON.stringify(ctx.packet).includes('laundromat'));assert.equal(ctx.packet.place.name,'Public Observatory');
}));
test('PLAY04 raw PC injury/choice drafts never become scene-fiction authority',()=>nativeFixture(async f=>{
  const x=fixture(f),draft=candidate(x.text);draft.narration='Choso apologizes for losing.';draft.gm_world_parts=[];
  const out=await run(f,x,[draft]);assert(out.rows.every(r=>!r.payload.includes('Choso apologizes for losing.')));
}));
test('PLAY05 current visible clues survive without closed grammar; private source ancestry and other owners stay excluded',()=>nativeFixture(async f=>{
  const x=fixture(f),{buildSceneFictionContext}=await import('../src/scene-fiction-context.js');
  for(const text of ['The terminal display is frozen.','A parcel rests on the counter.','Three knocks sound at the rear door.'])
    f.db.addFact(f.guild,{category:'clue',content:text,visibility:'party',provenance:{scene_location:'spin'}});
  const hidden=f.db.addFact(f.guild,{category:'clue',content:'SECRET_CAUSE',visibility:'gm',provenance:{scene_location:'spin'}});
  f.db.addFact(f.guild,{category:'scene',content:'LAUNDERED_SECRET',visibility:'party',provenance:{scene_location:'spin',
    epistemic:{kind:'observation',source_refs:[hidden],perspective:'test'}}});
  const out=buildSceneFictionContext(f.db,f.guild,x.scope,x.sourceRef),text=JSON.stringify(out.packet);
  assert(text.includes('terminal display is frozen'));assert(text.includes('Three knocks'));assert(text.includes('parcel rests'));
  assert(!text.includes('SECRET_CAUSE'));assert(!text.includes('LAUNDERED_SECRET'));
  const root=indexWorldEvent(f.db,f.guild,{key:'private-ancestry',kind:'observation',title:'Private evidence',source_id:'fixture-gm',visibility:'character',subject_key:f.pcs[1].id,details:{}},'fixture-gm'),
    wrapper=indexWorldEvent(f.db,f.guild,{key:'public-wrapper',kind:'observation',title:'Invalid wrapper',source_id:'fixture-gm',visibility:'party',details:{input_source:root.event_key}},'fixture-gm');
  f.db.addFact(f.guild,{category:'clue',content:'EVENT_LAUNDERED_SECRET',visibility:'party',provenance:{scene_location:'spin',
    epistemic:{kind:'observation',source_refs:[wrapper.event_key],perspective:'test'}}});
  f.db.upsertNpcProfile(f.guild,{npcKey:'private-occupant',displayName:'PRIVATE_OCCUPANT',role:'local'});
  f.db.setSimulationEntity(f.guild,'npc','private-occupant',{location_key:'spin',visibility:'party'});
  const npcSource=indexWorldEvent(f.db,f.guild,{key:'private-npc-arrival',kind:'arrival',title:'Private NPC viewpoint',source_id:'fixture-gm',visibility:'character',subject_key:f.pcs[1].id,location_key:'spin',
    details:{entity_type:'npc',entity_key:'private-occupant'}},'fixture-gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'private-occupant',location_key:'spin',source_event:npcSource.event_key,
    visibility:'character',subject_key:f.pcs[1].id},'fixture-gm');
  const closed=JSON.stringify(buildSceneFictionContext(f.db,f.guild,x.scope,x.sourceRef).packet);
  assert(!closed.includes('EVENT_LAUNDERED_SECRET'));assert(!closed.includes('PRIVATE_OCCUPANT'));
  const privateView=fixture(f,{mode:'private',text:prompts[4]});
  f.db.addFact(f.guild,{category:'scene',content:'OWNER_ONLY_WALL',visibility:'character',subjectCharacterId:x.pc.id,provenance:{scene_location:'spin'}});
  assert(JSON.stringify(buildSceneFictionContext(f.db,f.guild,privateView.scope,privateView.sourceRef).packet).includes('OWNER_ONLY_WALL'));
  assert.throws(()=>buildSceneFictionContext(f.db,f.guild,x.scope,privateView.sourceRef),/source|viewpoint/);
}));

test('PLAY06 isolated fiction rejects PC choices, injury, custody and forged evidence without effects',async()=>{
  for(const description of ['Choso apologizes for losing.','Jaxon agrees to surrender.','You have been taken into custody.',
    'Jaxon feels a sharp pain as his arm breaks.'])await nativeFixture(async f=>{
    const x=fixture(f),out=await run(f,x,[candidate(x.text),{...fiction,description}]);
    assert(out.rows.every(r=>!r.payload.includes(description)));assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_fiction',includeGM:true}).length,0);
    assert(f.db.listCityRecords(f.guild,{kind:'scene_fiction_hold',includeGM:true}).length);
    assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
  });
  await nativeFixture(async f=>{const x=fixture(f),out=await run(f,x,[candidate(x.text),{...fiction,evidence_refs:['invented-clue']}]);
    assert(out.rows.every(r=>!r.payload.includes('steel washers')));});
});

test('PLAY07 committed fiction is restart-safe, private and revoked at deferred publication; no duplicate native authoring',()=>nativeFixture(async f=>{
  const x=fixture(f,{mode:'private'}),out=await run(f,x);assert.equal(out.ai.requests.length,2);
  assert(out.rows.every(r=>r.visibility==='character'&&r.target_user_id===x.pc.owner_user_id));
  const count=f.db.listCityRecords(f.guild,{kind:'scene_fiction',includeGM:true}).length;assert.equal(count,1);
  f.restart();for(const row of out.rows)revalidateOutputPublication(f.db,f.guild,f.db.getPublication(f.guild,row.id));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_fiction',includeGM:true}).length,count);
  // Native event status is changed only in this disposable fixture; persisted payload remains unchanged, send must not occur.
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);
  let sends=0;await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{sends++;return {messageId:'fake',channelId:'fake'};});
  assert.equal(sends,0);assert(f.db.listTurnPublications(f.guild,out.attempt.turn_id).every(r=>r.status==='failed'));
}));

test('PLAY08 protected PvP and active native windows cannot acquire broad scene fiction or extra writer calls',async()=>{
  for(const kind of ['pvp','window'])await nativeFixture(async f=>{
    const x=fixture(f);
    if(kind==='pvp'){
      f.db.updateCharacterData(f.pcs[1].id,d=>{d.location='spin';});
      proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});
    }
    else f.db.saveCityRecord(f.guild,{kind:'scene_action_window',key:'native-fixture-window',status:'locked',source_event:x.sourceRef,
      location_key:'spin',data:{scene:currentScene(f.db,f.guild).key}});
    const out=await run(f,x,[candidate(x.text)]);assert.equal(out.ai.requests.length,1);
    assert(out.rows.every(r=>!r.payload.includes('steel washers')));
  });
});

test('PLAY09 real native movement publishes one arrival plus the existing or newly authored destination interior',async()=>{
  for(const fresh of [false,true])await nativeFixture(async f=>{
  const x=fixture(f,{location:'street',placeType:'street',text:prompts[3]});
  if(!fresh){
    f.db.setSimulationEntity(f.guild,'location','spin',{name:'Twenty-Four Spin',place_type:'laundromat',parent_location_key:'street',visibility:'party'});
    f.db.upsertReference(f.guild,{kind:'location',key:'spin',name:'Twenty-Four Spin',summary:'A public laundromat.',visibility:'party'});
  }
  const r=candidate(x.text);r.player_intents=[{...r.player_intents[0],type:'move',target_name:'Twenty-Four Spin',target_key:'spin',destination:'interior',operation:'move',resolution:'auto'}];
  if(fresh)r.world_additions=[{kind:'location',key:'spin',name:'Twenty-Four Spin',summary:'A public laundromat.',parent_location_key:'street',visibility:'party'}];
  if(fresh)establishFixtureAdditions(f.db,{guildId:f.guild,scope:x.scope,provenance:{messageId:x.messageId},narrative:r});
  if(fresh){
    const get=f.db.getCityRecord.bind(f.db);let reads=0;
    f.db.getCityRecord=(guild,kind,key)=>{const row=get(guild,kind,key);
      return row&&kind==='autonomous_entity'?{...row,created_at:`audit-clock-${++reads}`,updated_at:`audit-clock-${reads}`}:row;};
  }
  r.scene_actions=[{kind:'move',entity_ref:'spin',source_span:x.text,zone:'interior'}];
  const out=await run(f,x,[r,fiction]),text=out.rows.map(r=>r.payload).join('\n');
  assert.equal(f.db.getCharacter(x.pc.id).data.location,'spin');assert.match(text,/has arrived at spin/);assert.match(text,/steel washers/);
  const packet=JSON.parse(out.ai.requests[1].input);assert.equal(packet.place.name,'Twenty-Four Spin');assert.equal(packet.viewpoint,'interior');
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.kind==='arrival'&&e.details.input_source===x.sourceRef).length,1);
  });
});

test('PLAY10 repeat situation keeps committed layout and current cues, excludes secret explanations',()=>nativeFixture(async f=>{
  const x=fixture(f),out=await run(f,x);assert(out.rows.some(r=>r.payload.includes('blue bench')));
  const ref=f.db.addFact(f.guild,{category:'clue',content:'Three measured knocks sound at the rear door.',visibility:'party',provenance:{scene_location:'spin'}});
  f.db.addFact(f.guild,{category:'clue',content:'SECRET_CAUSE_TOLLMAN',visibility:'gm',provenance:{scene_location:'spin'}});
  const text=prompts[2],messageId='follow-up',source=captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,messageId,text);
  const next={...x,text,messageId,sourceRef:source.event_key},answer={...fiction,description:'The blue bench remains beneath the window. The rear door is the focus of the repeated knocking.',evidence_refs:[ref]};
  const follow=await run(f,next,[candidate(text,'current_situation'),answer]),packet=JSON.parse(follow.ai.requests[1].input);
  assert(packet.scene_local_details.some(d=>d.id==='blue-bench'));assert.equal(packet.operation,'current_situation');
  const published=follow.rows.map(r=>r.payload).join('\n');assert(published.includes('Three measured knocks'));assert(!published.includes('SECRET_CAUSE_TOLLMAN'));
}));

test('PLAY11 real assembly delivers an opening and owner-scoped views once; uncertain or delivered parts are not regenerated',()=>nativeFixture(async f=>{
  const x=fixture(f);f.db.setAssemblyPlan(f.session.id,{public_opening:'Choso apologizes for losing.',character_entries:[]});
  const ai=new FakeResponses([fiction,fiction]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,config:{gmModel:'offline'}}),sent=[];
  const deliver=async({turnId})=>{
    await deliverTurnOutbox(f.db,f.guild,turnId,async row=>{sent.push(row);return {messageId:`assembly-${sent.length}`,channelId:'offline'};});
    return {pending:f.db.listTurnPublications(f.guild,turnId).filter(r=>r.status!=='delivered')};
  };
  await deliverVerifiedAssembly({db:f.db,guild:{id:f.guild},session:f.db.getActiveSession(f.guild),gm,deliver});
  assert(sent.some(r=>r.visibility==='party'&&r.payload.includes('steel washers')));
  assert(sent.some(r=>r.visibility==='character'&&r.target_user_id===x.pc.owner_user_id&&r.payload.includes('blue bench')));
  assert(sent.every(r=>!r.payload.includes('Choso apologizes for losing.')));
  assert.equal(ai.requests.length,2);const count=sent.length;f.restart();
  await deliverVerifiedAssembly({db:f.db,guild:{id:f.guild},session:f.db.getActiveSession(f.guild),gm,deliver});
  assert.equal(sent.length,count);assert.equal(ai.requests.length,2);
}));

test('PLAY12 read-only observation uses one isolated provider call and the same native commit/outbox gates',()=>nativeFixture(async f=>{
  const x=fixture(f,{location:'observatory',placeType:'observatory',text:'What does the observatory look like inside?'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,decision_advisory:true}});
  const answer={description:'A brass telescope rises above a circular gallery. Tall windows catch the silver evening light.',
    details:[{id:'telescope',category:'nonmechanical_prop',text:'A brass telescope rises above a circular gallery.'},
      {id:'windows',category:'layout',text:'Tall windows catch the silver evening light.'}],evidence_refs:[]};
  const out=await run(f,x,[answer],true);assert.equal(out.ai.requests.length,1);
  assert.equal(out.ai.requests[0].text.format.name,'audience_scoped_scene_fiction');
  assert(out.rows.some(r=>r.payload.includes('brass telescope')));assert.equal(out.mutation.typedIntents[0].data.type,'other');
  assert.equal(out.mutation.world.length,0);assert.equal(out.mutation.ordinaryEffects.length,0);
  for(const row of out.rows)revalidateOutputPublication(f.db,f.guild,row);
  assert(await out.gm.shouldRespond({guildId:f.guild,message:{id:x.messageId,author:{id:x.pc.owner_user_id},content:x.text},mode:'active'}));
  assert.equal(out.ai.requests.length,1,'real intake engagement has zero router calls for this admitted observation');
}));

test('PLAY13 mixed/action/quoted requests never use observation admission; malformed writer holds with no extra call',async()=>{
  const {sceneObservationOperation}=await import('../src/scene-observation-route.js');
  for(const text of ['Describe the scene; I open the locked door.','I head inside Twenty-Four Spin','I examine the frozen terminal',
    '"Describe the scene"','What does it look like? I attack Choso.','Describe the scene\nI surrender.'])assert.equal(sceneObservationOperation(text),null);
  await nativeFixture(async f=>{const x=fixture(f),out=await run(f,x,[{description:'bad shape'}],true);
    assert.equal(out.ai.requests.length,1);assert(out.rows.every(r=>!r.payload.includes('bad shape')));
    assert(out.rows.some(r=>r.payload.includes('held for review')));assert.equal(out.mutation.world.length,0);
  });
});

// This is a deterministic acceptance check of explicit physical fixture expectations, not an LLM judge or semantic certifier.
function usefulScene(out,specifics){
  const payload=out.rows.map(r=>r.payload).join('\n');
  for(const detail of specifics)assert(payload.includes(detail),`Missing usable fixture detail: ${detail}`);
  assert(!/UNVERIFIED RAW|No additional character response|insufficient details|nonmechanical scene framing/.test(payload));
  assert(out.rows.length);return payload;
}
test('PLAY14 contextual narration is generic across exploration, investigation, social setting, supernatural evidence and story aftermath',async()=>{
  const scenarios=[
    {name:'Ash Quarry',type:'quarry',text:'Set the scene',details:['Limestone terraces step down toward a gravel floor.','Dust glows in the pale afternoon light.']},
    {name:'Parcel Office',type:'parcel office',text:prompts[5],details:['Sorting shelves flank a narrow work counter.','A brass desk lamp warms the scarred wood.'],cue:'The terminal display is frozen.'},
    {name:'Evening Market',type:'market',text:'Describe the scene',details:['Canvas awnings shade a cobbled passage.','The scent of baked bread drifts past the stalls.']},
    {name:'Old Shrine',type:'shrine',text:'What else is going on currently?',details:['Stone arches frame a shallow alcove.','Cold air stirs the dust on its flagstones.'],cue:'A violet light is visible along the altar edge.'},
    {name:'Courtyard Aftermath',type:'courtyard',text:'What does it look like inside?',details:['Broken paving surrounds a dry fountain.','Evening light rests on the weathered stone.'],cue:'The earlier clash has ended; its explanation is not established.'}
  ];
  for(const s of scenarios)await nativeFixture(async f=>{
    const x=fixture(f,{location:'generic-place',placeType:s.type,name:s.name,text:s.text}),refs=[];
    if(s.cue)refs.push(f.db.addFact(f.guild,{category:'clue',content:s.cue,visibility:'party',provenance:{scene_location:'generic-place'}}));
    const answer={description:s.details.join(' '),details:s.details.map((text,i)=>({id:`detail-${i}`,category:i?'sensory':'layout',text})),evidence_refs:refs};
    const r=candidate(s.text,s.cue?'current_situation':'describe_scene');
    if(s.text===prompts[5]){
      f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
      const evidence=indexWorldEvent(f.db,f.guild,{key:'visible-terminal',kind:'observation',source_id:'fixture-gm',title:'Visible terminal',
        truth_status:'observed',visibility:'party',location_key:'generic-place',session_id:f.session.id,scene:currentScene(f.db,f.guild).key,
        details:{description:s.cue}},'fixture-gm');
      r.player_intents=[{...r.player_intents[0],type:'observe',operation:'examine',resolution:'auto',gm_ruling:{version:1,
        disposition:'narrative_no_roll',context_refs:[evidence.event_key],capability:{kind:'mundane',ref:''},effect_class:'observation',
        trait:null,difficulty:null,risk:'none',stakes:'none',explanation:'Examining an already visible display has no uncertain consequence.',
        difficulty_reason:'No check required for accessible evidence.',saved_ruling_key:'',override_refs:[],raw_refs:[],house_refs:[],homebrew_refs:[],modifier_keys:[]}}];
    }
    const out=await run(f,x,[r,answer]),payload=usefulScene(out,s.details),packet=JSON.parse(out.ai.requests[1].input);
    assert.equal(packet.place.name,s.name);assert.equal(packet.place.type,s.type);if(s.cue)assert(payload.includes(s.cue));
    assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);assert.equal(out.ai.requests.length,2);
  });
  // Conversations still use the existing native NPC-owned authoring lane, not environmental prose or player control.
  await nativeFixture(async f=>{
    const x=fixture(f,{text:'I ask the attendant what work is available.'});
    f.db.upsertNpcProfile(f.guild,{npcKey:'attendant',displayName:'Attendant',role:'local attendant',publicIdentity:'PRIVATE_NPC_HOOK'});
    f.db.setSimulationEntity(f.guild,'npc','attendant',{location_key:'spin',visibility:'party'});
    const r=candidate(x.text);r.gm_world_parts=[{version:3,kind:'npc_fresh_request',entity_key:'attendant',focus:'work',source_refs:[]}];
    const out=await run(f,x,[r,{utterance:'There might be a night shift worth asking about. What sort of work interests you?'}]);
    assert(out.rows.some(row=>row.payload.includes('night shift')));assert(out.rows.every(row=>!row.payload.includes('PRIVATE_NPC_HOOK')));
    assert.equal(out.ai.requests.length,2);assert.equal(out.mutation.world.length,0);
  });
});

test('PLAY15 fresh fiction fails audience/payload/owner/scene TOCTOU without resource changes; archives remain scoped',async()=>{
  for(const change of ['audience','payload','owner','scene'])await nativeFixture(async f=>{
    const x=fixture(f,{mode:'private'}),out=await run(f,x),row=out.rows[0];
    if(change==='audience')assert.throws(()=>revalidateOutputPublication(f.db,f.guild,{...row,visibility:'party',target_user_id:null}));
    if(change==='payload')assert.throws(()=>revalidateOutputPublication(f.db,f.guild,{...row,payload:row.payload+' Choso apologizes for losing.'}));
    if(change==='owner'){
      f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,x.pc.id);
      assert.throws(()=>revalidateOutputPublication(f.db,f.guild,row));
    }
    if(change==='scene'){
      f.db.setDirectorState(f.session.id,{scene_number:f.db.getDirectorState(f.session.id).scene_number+1,scene_label:'Another native scene'});
      assert.throws(()=>revalidateOutputPublication(f.db,f.guild,row));
    }
    assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
  });
  for(const mode of ['party','private'])await nativeFixture(async f=>{
    const x=fixture(f,{mode}),out=await run(f,x);let sends=0;
    await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>({messageId:`delivered-${++sends}`,channelId:'offline'}));
    assert.equal(sends,out.rows.length);assert.doesNotThrow(()=>prepareStoredOutput(f.db,f.guild,out.result.narration,x.scope));
    const recap=certifiedSessionRecap(f.db,f.guild,f.session.id);
    assert.equal(recap.includes('steel washers'),mode==='party');
    if(mode==='private')assert.throws(()=>prepareStoredOutput(f.db,f.guild,out.result.narration,{mode:'party'}));
  });
});
