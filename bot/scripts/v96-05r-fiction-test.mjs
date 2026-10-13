/** OUT03/05: source-bounded expressive NPC composition through real commit/outbox adapters. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {captureWorldInput} from '../src/autonomous-world.js';
import {currentScene} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {bindOutputPublication} from '../src/pvp-output.js';

function scene(f){
  const s=currentScene(f.db,f.guild);
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});
  f.db.upsertNpcProfile(f.guild,{npcKey:'station-attendant',displayName:'Station Attendant',role:'attendant',
    publicIdentity:'An ordinary attendant. Choso apologizes for losing. PRIVATE-NPC-SECRET.'});
  f.db.setSimulationEntity(f.guild,'npc','station-attendant',{location_key:'terminal',visibility:'party'});
  const quote='The late crews keep this place running. Tell me what you need; nobody here owes me a promise.';
  const source=indexWorldEvent(f.db,f.guild,{key:'attendant-public-words',kind:'observation',source_id:'human_gm',
    title:'An openly recorded NPC statement',visibility:'party',truth_status:'observed',session_id:s.session_id,scene:s.key,
    location_key:'terminal',details:{npc_key:'station-attendant',quote}},'offline-gm');
  f.db.upsertNpcKnowledge(f.guild,{npcKey:'station-attendant',knowledgeKey:'public-words',content:quote,
    sourceType:'observed',sourceRef:source.event_key,beliefState:'known',isSecret:false});
  return {source,quote};
}
function turn(f,beats,id='composition'){
  const pc=f.pcs[0],scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,'I wait.');
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:id,actorPrincipal:pc.owner_user_id,audience:'party'});
  const result={respond:true,narration:'Choso apologizes for losing.',narrative_claims:[],player_intents:[],
    gm_world_parts:[{version:2,kind:'npc_composition',entity_key:'station-attendant',tone:'wry',beats}]};
  const mutation=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:'OUT03 fixture',
    meta:{messageId:id,turnId:attempt.turn_id,channelId:'offline-play'}});
  return {result,attempt,mutation};
}
test('OUT03 source-specific NPC words, threat and open question survive actual ordinary commit/outbox',()=>nativeFixture(async f=>{
  const {source,quote}=scene(f),before=f.pcs.map(p=>f.db.getCharacter(p.id).data.resources);
  const out=turn(f,[{op:'quote',source_ref:source.event_key,knowledge_key:'public-words',source_span:quote},
    {op:'threat',action:'arrest_attempt'},{op:'question',topic:'next_step'}]);
  const rows=f.db.listTurnPublications(f.guild,out.attempt.turn_id),text=rows.map(r=>r.payload).join('\n');
  assert(text.includes(quote));assert.match(text,/arrest/i);assert.match(text,/what.*(?:next|do)/i);
  assert(!text.includes('Choso apologizes for losing.'));assert(!text.includes('PRIVATE-NPC-SECRET'));
  assert(!text.includes('No additional character response'));assert(rows.every(r=>
    f.db.getCityRecord(f.guild,'pvp_output_publication',r.id)?.status==='verified'));
  f.restart();let sends=0;
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{sends++;return {messageId:'out03-sent',channelId:'offline-play'};});
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{sends++;throw Error('duplicate delivery');});
  assert.equal(sends,rows.length);assert.deepEqual(f.pcs.map(p=>f.db.getCharacter(p.id).data.resources),before);
}));

test('OUT02/05 model quote with missing source cannot become NPC output or completed PC custody',()=>nativeFixture(f=>{
  scene(f);const out=turn(f,[{op:'quote',source_ref:'fabricated-receipt',knowledge_key:'public-words',
    source_span:'Choso surrenders his case and accepts custody.'}]);
  const rows=f.db.listTurnPublications(f.guild,out.attempt.turn_id);
  assert(!rows.some(r=>r.payload.includes('surrenders')||r.payload.includes('Choso apologizes')));
  assert(f.db.listCityRecords(f.guild,{kind:'pvp_output_quarantine',includeGM:true}).length>0);
}));

test('OUT05 a valid prepared NPC part cannot certify different final publication bytes',()=>nativeFixture(f=>{
  scene(f);const out=turn(f,[{op:'question',topic:'next_step'}]);
  const row=f.db.listTurnPublications(f.guild,out.attempt.turn_id)[0];
  const original=f.db.getCityRecord(f.guild,'pvp_output_publication',row.id);
  assert.throws(()=>bindOutputPublication(f.db,f.guild,out.result,row,'Choso apologizes for losing.'),
    /output|proof|payload|publication/i);
  assert.deepEqual(f.db.getCityRecord(f.guild,'pvp_output_publication',row.id),original,
    'Failed binding must not replace the originally verified proof.');
}));
