import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {captureWorldInput} from '../src/autonomous-world.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {saveVisibleCharacterFacts,renderObservation} from '../src/character-observation.js';
function input(visibility='party'){
  const text='weathered olive canvas patched elbows';
  return {text,visibility,observers:[],facts:[['coat_finish','weathered'],['coat','olive'],['coat_material','canvas'],['coat_detail','patched elbows']]
    .map(([field,value])=>({field,value,start:text.indexOf(value),end:text.indexOf(value)+value.length}))};
}
async function describe(f,visibility='party'){
  const sent=[],data=input(visibility),pc=f.pcs[0];
  const interaction={id:'structured-appearance:'+visibility,guildId:f.guild,guild:{id:f.guild},user:{id:pc.owner_user_id,username:pc.name},
    isChatInputCommand:()=>true,commandName:'vc-character',options:{getSubcommand:()=> 'describe',getString:()=>JSON.stringify(data)},
    reply:async p=>sent.push(p),followUp:async p=>sent.push(p)};
  await handleCommand(interaction,{db:f.db,gm:{}});assert(sent.every(p=>p.ephemeral));return data;
}
function observe(f,id='structured-query'){
  const pc=f.pcs[1],text='What does Jaxon look like?',scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,text);
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:id,actorPrincipal:pc.owner_user_id,audience:'party'});
  const result={respond:true,narration:'Choso apologizes for losing.',narrative_claims:[],player_intents:[{type:'observe',source_span:text,
    target_key:f.pcs[0].id,target_name:'Jaxon',operation:'appearance',framing:'immediate',resolution:'conversational',
    destination:'unspecified',utterance:'',excluded_targets:[],reason:'An inquiry, not an owner description.'}]};
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:'Structured owner appearance',
    meta:{messageId:id,turnId:attempt.turn_id,triggerText:text}});
  return {attempt,result,scope,rows:f.db.listTurnPublications(f.guild,attempt.turn_id)};
}
test('N15 structured richer owner appearance reaches real command, native query and restart-safe outbox',()=>nativeFixture(async f=>{
  const resources=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  await describe(f);await describe(f);
  assert.equal(f.db.visibleCharacterFacts(f.guild,f.pcs[0].id).length,4);
  const o=observe(f),payload=o.rows.map(row=>row.payload).join('\n');
  assert(payload.includes('a weathered olive canvas coat with patched elbows'),payload);
  assert(!payload.includes('apologizes'));assert(!payload.includes('not established'));
  const part=f.db.listCityRecords(f.guild,{kind:'pvp_output_part',includeGM:true,limit:100}).find(row=>row.data.kind==='observation_answer');
  assert.equal(part.data.query.version,2);
  const historical=renderObservation(f.db,f.guild,{...part.data.query,version:1},o.scope);
  assert.equal(historical.state,'not_established');assert(!historical.text.includes('canvas'));
  f.restart();let sends=0;
  const send=async row=>{sends++;assert(row.payload.includes('weathered olive canvas coat'));return{messageId:'structured-'+row.id,channelId:'offline'};};
  await deliverTurnOutbox(f.db,f.guild,o.attempt.turn_id,send);await deliverTurnOutbox(f.db,f.guild,o.attempt.turn_id,send);
  assert.equal(sends,1);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),resources);
}));
test('N15 structured source ranges cannot authorize fabricated prose, another PC or altered offsets',()=>nativeFixture(async f=>{
  await describe(f);
  const pc=f.pcs[0],row=f.db.visibleCharacterFacts(f.guild,pc.id)[0],base={...input(),source_event:row.source_event};
  for(const facts of [[{field:'coat_detail',value:'Choso apologizes for losing.',start:0,end:27}],
    [{field:'coat_material',value:'canvas',start:0,end:6}],[{field:'armor',value:'invulnerable',start:0,end:12}]])
    assert.throws(()=>saveVisibleCharacterFacts(f.db,f.guild,pc.owner_user_id,pc.id,{...base,facts}));
  assert.throws(()=>saveVisibleCharacterFacts(f.db,f.guild,f.pcs[1].owner_user_id,pc.id,base));
  assert.equal(f.db.visibleCharacterFacts(f.guild,pc.id).length,4);
}));
test('N15 private structured fields stay private and retracted disclosure holds queued output without changing resources',()=>nativeFixture(async f=>{
  await describe(f,'character');const hidden=observe(f,'private-style-query');
  assert(!hidden.rows.some(row=>row.payload.includes('canvas')));
  await describe(f);const o=observe(f,'public-style-query');assert(o.rows.some(row=>row.payload.includes('canvas')));
  const source=f.db.visibleCharacterFacts(f.guild,f.pcs[0].id).find(row=>row.visibility==='party').source_event;
  const resources=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  f.restart();f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,source);
  let sends=0;await deliverTurnOutbox(f.db,f.guild,o.attempt.turn_id,async()=>{sends++;return{messageId:'unexpected'};});
  assert.equal(sends,0);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),resources);
}));
