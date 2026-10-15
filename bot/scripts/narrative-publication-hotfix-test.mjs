/** Session 7 saved draft structures; IDs/source references sanitized, prose retained. No production writes or provider calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate,unit} from './narrative-fixtures.mjs';
import {ContentIndex} from '../src/content.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {authorNarrativeRequests} from '../src/narrative-authority.js';
import {prepareAuthorizedTurnOutput,assemblyNarrativeCandidate} from '../src/pvp-output.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox,queueDirectorPublications,queueTurnPublications} from '../src/publication-outbox.js';
import {recordNarrativeHealth} from '../src/narrative-completeness.js';
import {bindDirectorNarrativeSource} from '../src/narrative-director-source.js';
import {GMService} from '../src/gm.js';
import {FakeResponses} from './contract-fixtures.mjs';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/session7-narrative-drafts.json',import.meta.url),'utf8'));
const content=new ContentIndex(path.resolve('../content'));
function sceneSetup(f,fixture){
  const x=setup(f,{text:'Describe the scene',privateScene:fixture.scope==='private'}),location=fixture.location;
  f.db.setSimulationEntity(f.guild,'location',location,{name:location==='twenty-four-spin'?'Twenty-Four Spin':'Night Owl Copy & Parcel',place_type:'public shop',visibility:'party',description:'Established description; never overwritten.'});
  f.db.updateCharacterData(x.pc.id,d=>{d.location=location;});
  const arrival=indexWorldEvent(f.db,f.guild,{key:'hotfix-arrival',kind:'arrival',title:'Native fixture placement',source_id:`player:${x.pc.owner_user_id}`,
    scene:currentScene(f.db,f.guild).key,session_id:f.session.id,location_key:location,visibility:'party',details:{entity_type:'character',entity_key:x.pc.id,owner_user_id:x.pc.owner_user_id}},x.pc.owner_user_id);
  recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:x.pc.id,location_key:location,zone:'interior',source_event:arrival.event_key,visibility:'party',accepted_by:x.pc.owner_user_id},'native-fixture');
  const assembly=assemblyNarrativeCandidate(f.db,f.guild,f.session.id,x.scope);
  return {...x,sourceRef:fixture.origin==='assembly'?assembly.source.event_key:x.sourceRef,assemblyRef:assembly.source.event_key,location};
}
async function project(f,fixture,{edit=null,health=false,diagnosticFailure=false,director=false,typedObservation=false}={}){
  const x=sceneSetup(f,fixture),answer=structuredClone(fixture.answer),result=candidate(x.text);if(!typedObservation)result.player_intents=[];
  for(const u of answer.narrative_units)u.source_refs=u.source_refs.map(ref=>ref==='$SOURCE'?x.sourceRef:ref==='$ASSEMBLY'?x.assemblyRef:ref);
  if(edit)edit(answer,x);
  if(health)f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_completeness:true}});
  if(director)x.sourceRef=bindDirectorNarrativeSource(f.db,f.guild,result,x.scope,'manual',{requested_by:'fixture'},content);
  let packet;
  await authorNarrativeRequests({db:f.db,guild:f.guild,result,scope:x.scope,sourceRef:x.sourceRef,budget:{used:false},generate:async p=>{packet=p;return answer;}});
  const before=f.db.getSimulationEntity(f.guild,'location',x.location);
  prepareAuthorizedTurnOutput(f.db,f.guild,result,x.scope,{sourceRef:x.sourceRef,content});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:x.scope.mode});
  const save=f.db.saveCityRecord;
  if(diagnosticFailure)f.db.saveCityRecord=function(g,args){if(args.kind==='narrative_health')throw Object.assign(new Error('Synthetic optional diagnostic constraint'),{code:'ERR_SQLITE_ERROR',errcode:787});return save.call(this,g,args);};
  let turnId=attempt.turn_id;
  try{
    if(director)turnId=queueDirectorPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope:x.scope,key:'hotfix-director'});
    else if(fixture.origin==='assembly')f.db.transaction(()=>{
      // Assembly adapters publish verified output; they do not re-run an owner-message mutation with another source.
      queueTurnPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope:x.scope,turnId});
      f.db.updateTurnAttempt(turnId,{stage:'committed',committed:'yes',nativeCommitId:'fixture-assembly'});
    });
    else commitGmTurn({db:f.db,content,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:x.pc.name,label:'Hotfix fixture',meta:{messageId:x.messageId,turnId}});
  }finally{f.db.saveCityRecord=save;}
  const rows=f.db.listTurnPublications(f.guild,turnId),fates=f.db.listCityRecords(f.guild,{kind:'narrative_unit_fates',includeGM:true,limit:10}).find(r=>r.source_event===x.sourceRef)?.data;
  assert.deepEqual(f.db.getSimulationEntity(f.guild,'location',x.location),before,'Existing location is not rewritten.');
  assert.equal(f.db.getCharacter(x.pc.id).data.location,x.location,'No fabricated movement.');
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
  return {x,result,answer,packet,turnId,rows,fates};
}
test('HOT01 authentic party draft reuses Twenty-Four Spin and publishes substantive prose',()=>nativeFixture(async f=>{
  const out=await project(f,fixtures[2]);assert(out.rows.some(r=>r.payload.includes('change machine hums')));
  const delivered=[];await deliverTurnOutbox(f.db,f.guild,out.turnId,async row=>{delivered.push(row.payload);return {id:'offline-delivery'};});
  assert(delivered.some(text=>text.includes('change machine hums')));assert(out.fates.fates.every(r=>r.fate==='published'));
}));
test('HOT02 all eight exact saved draft structures retain strict audience and cognition holds',async()=>{
  // Isolated fixture per draft avoids changing continuity or creating an NPC twice.
  const totals={published:0,held_scope:0,held_secret:0};
  for(const fixture of fixtures)await nativeFixture(async inner=>{
    const out=await project(inner,fixture);for(const fate of out.fates.fates)totals[fate.fate]++;
    for(const u of out.answer.narrative_units){
      if(fixture.scope==='party'&&u.visibility==='character')assert(out.rows.every(r=>!r.payload.includes(u.text)));
      if(u.kind==='npc_speech'&&u.source_refs.length)assert(out.rows.every(r=>!r.payload.includes(u.text)),'Assembly scope is not NPC knowledge.');
    }
  });assert.deepEqual(totals,{published:6,held_scope:6,held_secret:1});
});
test('HOT03 new writer has native audience/identity and NPC-reference instructions; corrected party output is published',()=>nativeFixture(async f=>{
  const out=await project(f,fixtures[5],{edit:answer=>{for(const u of answer.narrative_units)u.visibility='party';}});
  assert.equal(out.packet.audience.unit_visibility,'party');assert.equal(out.packet.audience.mode,'party');
  assert.equal(out.packet.place.identity_state,'established_reuse_only');
  assert(out.packet.reference_rules.npc_speech.includes('knowledge'));
  assert(out.rows.some(r=>r.payload.includes('Coffee')),JSON.stringify(out.fates));assert(out.fates.fates.every(r=>r.fate==='published'));
}));
test('HOT04 invalid new identity does not poison an independent scene that mentions its name',()=>nativeFixture(async f=>{
  const out=await project(f,fixtures[2],{edit:answer=>{
    answer.fiction_delta.push({kind:'npc',key:'invalid_key',name:'Parcel Clerk',summary:'An ordinary clerk',location_key:'twenty-four-spin',parent_location_key:'',role:'local',aliases:[]});
    answer.narrative_units.push(unit('independent','scene','A notice advertises a Jaxon evening special.',{location_key:'twenty-four-spin'}));
    const e=answer.fiction_delta.at(-1);answer.narrative_units.at(-1).text='A notice advertises the Parcel Clerk evening special.';
    answer.narrative_units.push(unit('dependent','npc_speech','The counter closes at midnight.',{subject_key:e.key,location_key:'twenty-four-spin',epistemic:'testimony'}));
    answer.narrative_units.push(unit('dependent-scene','scene','An attendant sorts papers.',{subject_key:e.key,location_key:'twenty-four-spin'}));
  }});
  assert(out.rows.some(r=>r.payload.includes('Parcel Clerk evening special')));assert(out.rows.every(r=>!r.payload.includes('counter closes')));
  assert(out.rows.every(r=>!r.payload.includes('An attendant sorts papers.')));
  assert(!f.db.getNpcProfile(f.guild,'invalid_key'));assert(out.fates.entity_results.some(e=>e.key==='invalid_key'&&e.status==='rejected'));
}));
test('HOT05 health provenance does not require accepted intents and optional diagnostic failure cannot roll back output',()=>nativeFixture(async f=>{
  const out=await project(f,fixtures[2],{health:true});assert(out.rows.length);
  const health=f.db.getCityRecord(f.guild,'narrative_health',`narrative-health:${out.turnId}`);
  assert(health&&f.db.getWorldEvent(f.guild,health.source_event));assert.equal(health.source_event,out.x.sourceRef);
  f.restart();assert(f.db.listTurnPublications(f.guild,out.turnId).length);
  assert.equal(f.db.db.prepare('PRAGMA foreign_key_check').all().length,0);
  await nativeFixture(async inner=>{const safe=await project(inner,fixtures[2],{health:true,diagnosticFailure:true});assert(safe.rows.length);assert.equal(inner.db.getTurnAttempt(safe.turnId).committed,'yes');});
}));
test('HOT06 missing/forged health source is omitted, Director health uses native source',()=>nativeFixture(async f=>{
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_completeness:true}});
  for(const ref of ['', 'forged-source'])assert.doesNotThrow(()=>recordNarrativeHealth(f.db,f.guild,{narrative_completion:{status:'complete',diagnostics:[]}},'missing:'+ref,ref));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'narrative_health',includeGM:true}).length,0);
  const fixture=structuredClone(fixtures[2]);fixture.answer.narrative_units[0].source_refs=[];
  const out=await project(f,fixture,{health:true,director:true});
  const health=f.db.getCityRecord(f.guild,'narrative_health',`narrative-health:${out.turnId}`);
  assert.equal(f.db.getWorldEvent(f.guild,health.source_event).kind,'native_director_narrative_scope');
}));
test('HOT07 legacy observation fallback is not reported as completed creative narration',()=>nativeFixture(async f=>{
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,post_projection_answers:true,scene_descriptions:true}});
  const out=await project(f,fixtures[2],{typedObservation:true,edit:answer=>{answer.narrative_units[0].visibility='character';}});
  assert.notEqual(out.result.narrative_completion.status,'complete');assert.equal(out.result.narrative_completion.coverage.creative,false);
  assert(f.db.listCityRecords(f.guild,{kind:'pvp_output_part',includeGM:true}).some(r=>r.data.kind==='scene_description'));
}));
test('HOT08 private Night Owl units survive restart, cannot leak or resend after source revocation',()=>nativeFixture(async f=>{
  const out=await project(f,fixtures[7]);
  assert(out.rows.some(r=>r.payload.includes(out.answer.narrative_units[0].text)));
  assert(out.rows.every(r=>r.visibility==='character'&&r.target_character_id===out.x.pc.id));
  assert(out.rows.every(r=>!r.payload.includes(out.answer.narrative_units[1].text)));
  f.restart();f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,out.x.sourceRef);
  let sends=0;await deliverTurnOutbox(f.db,f.guild,out.turnId,async()=>{sends++;return {id:'must-not-send'};});assert.equal(sends,0);
  assert.equal(f.db.getCharacter(out.x.pc.id).data.resources.hp.current,0);
}));
test('HOT09 repeated established entity projection does not recreate an NPC or duplicate publications',()=>nativeFixture(async f=>{
  const fixture=structuredClone(fixtures[6]),out=await project(f,fixture);
  assert(out.rows.some(r=>r.payload.includes(out.answer.narrative_units[1].text)));
  const before=f.db.getCityRecord(f.guild,'autonomous_entity','npc:inez-vale');assert(before);
  const result=candidate(out.x.text);result.player_intents=[];
  prepareAuthorizedTurnOutput(f.db,f.guild,result,out.x.scope,{sourceRef:out.x.sourceRef,content});
  assert.deepEqual(f.db.getCityRecord(f.guild,'autonomous_entity','npc:inez-vale'),before);
  const delivered=[];const send=async row=>{delivered.push(row.id);return {id:'offline-'+row.id};};
  await deliverTurnOutbox(f.db,f.guild,out.turnId,send);f.restart();await deliverTurnOutbox(f.db,f.guild,out.turnId,send);
  assert.equal(delivered.length,out.rows.length);assert.equal(new Set(delivered).size,out.rows.length);
}));
test('HOT10 NPC factual reference needs actual entitled knowledge, not request scope',()=>nativeFixture(async f=>{
  const fixture=structuredClone(fixtures[6]);
  await project(f,fixture); // Native creation receipt, not an invented existing actor.
  // A new authenticated player turn, not a rewrite/replay of the immutable assembly draft.
  const out=await project(f,{...fixture,origin:'player'},{edit:(answer,x)=>{
    const observation=indexWorldEvent(f.db,f.guild,{key:'npc-entitled-observation',kind:'observation',title:'NPC fixture observation',source_id:'native:fixture',
      scene:currentScene(f.db,f.guild).key,session_id:f.session.id,location_key:x.location,visibility:'party',truth_status:'observed',details:{description:'The counter clock reads eleven.'}},'native:fixture');
    f.db.upsertNpcKnowledge(f.guild,{npcKey:'inez-vale',knowledgeKey:'counter-clock',content:'The counter clock reads eleven.',sourceRef:observation.event_key,isSecret:false});
    answer.narrative_units[1].text='The counter clock reads eleven.';answer.narrative_units[1].source_refs=[observation.event_key];
  }});
  assert(out.rows.some(r=>r.payload.includes('counter clock reads eleven')),JSON.stringify(out.fates));
  const speaker=out.packet.npcs.find(n=>n.key==='inez-vale');assert(speaker.speaker_brief.speech_source_refs.includes('npc-entitled-observation'));
  f.restart();f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key='npc-entitled-observation'").run(f.guild);
  let sends=0;await deliverTurnOutbox(f.db,f.guild,out.turnId,async()=>{sends++;return {id:'unsafe'};});assert.equal(sends,0);
}));
test('HOT11 publication failure still rolls back commit; only optional health errors are isolated',()=>nativeFixture(async f=>{
  const enqueue=f.db.enqueuePublication;
  f.db.enqueuePublication=()=>{throw Object.assign(new Error('Synthetic required outbox failure'),{code:'ERR_SQLITE_ERROR',errcode:787});};
  try{await assert.rejects(project(f,fixtures[2],{health:true}),/required outbox failure/);}finally{f.db.enqueuePublication=enqueue;}
  assert.equal(f.db.listCityRecords(f.guild,{kind:'narrative_health',includeGM:true}).length,0);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM publication_outbox').get().n,0);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM turn_attempts WHERE committed=?').get('yes').n,0);
}));
test('HOT12 real GM observation adapter publishes saved creative prose with one fake writer and no movement',()=>nativeFixture(async f=>{
  const fixture=fixtures[2],x=sceneSetup(f,fixture),answer=structuredClone(fixture.answer);
  answer.narrative_units[0].source_refs=[x.sourceRef];
  const before=f.db.getSimulationEntity(f.guild,'location',x.location),ai=new FakeResponses([answer]);
  const gm=new GMService({db:f.db,content,ai,config:{gmModel:'offline',playableObservationFastPath:true,maxRecentMessages:2,maxContentChunks:1}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,messageId:x.messageId,messageText:x.text,scope:x.scope.mode});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:x.scope.mode});
  commitGmTurn({db:f.db,content,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:x.pc.name,label:'Hotfix live-path fixture',meta:{messageId:x.messageId,turnId:attempt.turn_id}});
  const delivered=[];await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,async row=>{delivered.push(row.payload);return {id:'fake-discord'};});
  assert.equal(ai.requests.length,1);assert(delivered.some(text=>text.includes(answer.narrative_units[0].text)));
  assert.deepEqual(f.db.getSimulationEntity(f.guild,'location',x.location),before);assert.equal(f.db.getCharacter(x.pc.id).data.location,x.location);
}));
