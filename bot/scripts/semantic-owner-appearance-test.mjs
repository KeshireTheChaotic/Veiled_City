import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture,pvpTerms} from './v9-fixtures.mjs';
import {proposePvp} from '../src/narrative-pvp.js';
import {handleCommand} from '../src/commands.js';
import {captureWorldInput} from '../src/autonomous-world.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {saveVisibleCharacterFacts,renderObservation,saveCharacterSelfDescription,renderCharacterSelfDescription} from '../src/character-observation.js';
import {revalidateOutputPublication,certifiedSessionRecap,assertPvpOutput} from '../src/pvp-output.js';
import {validateNarrativeClaims} from '../src/narrative-integrity.js';
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
function observe(f,id='structured-query',{actor=1,mode='party'}={}){
  const pc=f.pcs[actor],text='What does Jaxon look like?',scope={mode,actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,text,{privateScene:mode==='private'});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:id,actorPrincipal:pc.owner_user_id,audience:mode});
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

async function expressive(f,text,{visibility='party',user=f.pcs[0].owner_user_id,id='prose-description'}={}){
  const replies=[],data={lane:'expressive',text,visibility,observers:[]};
  await handleCommand({id,guildId:f.guild,guild:{id:f.guild},user:{id:user,username:user},isChatInputCommand:()=>true,
    commandName:'vc-character',options:{getSubcommand:()=> 'describe',getString:()=>JSON.stringify(data)},
    reply:async p=>replies.push(p),followUp:async p=>replies.push(p)},{db:f.db,gm:{}});
  assert(replies.every(p=>p.ephemeral));return replies;
}

test('N15 expressive lane preserves exact attributed prose without promoting it to observed facts or native effects',()=>nativeFixture(async f=>{
  const text='My coat recalls storm clouds.\nI wear yesterday like a borrowed name.',before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data);
  const replies=await expressive(f,text);assert(replies[0].content.includes('not verified appearance'));
  await expressive(f,text);assert.equal(f.db.listCityRecords(f.guild,{kind:'character_self_description',includeGM:true}).length,1);
  assert.equal(f.db.visibleCharacterFacts(f.guild,f.pcs[0].id).length,0);
  const o=observe(f,'expressive-query'),payload=o.rows.map(r=>r.payload).join('\n');
  assert(payload.includes(JSON.stringify(text)));assert(payload.includes('Owner-attributed self-description'));
  assert(payload.includes('not verified appearance'));assert(payload.includes('not established'));
  assert(!payload.includes('Choso apologizes'));
  const part=f.db.listCityRecords(f.guild,{kind:'pvp_output_part',includeGM:true}).find(r=>r.data.kind==='owner_self_description');
  assert(part);assert.equal(part.data.epistemic,'unverified_owner_report');
  assert.equal(JSON.parse(part.data.text.split('\n').at(-1)),text);
  f.restart();let sends=0;
  await deliverTurnOutbox(f.db,f.guild,o.attempt.turn_id,async row=>{sends++;assert(row.payload.includes(JSON.stringify(text)));return {messageId:'prose-'+row.id,channelId:'offline'};});
  await deliverTurnOutbox(f.db,f.guild,o.attempt.turn_id,async()=>{throw Error('duplicate');});
  assert.equal(sends,1);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data),before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'narrative_delivery',includeGM:true}).length,0);
  const recap=certifiedSessionRecap(f.db,f.guild,f.session.id);
  assert(recap.includes('unverified owner report'));assert(recap.includes(JSON.stringify(text)));
  assert.equal(f.db.visibleCharacterFacts(f.guild,f.pcs[0].id).length,0);
}));

test('N15 expressive lane is exact owner testimony, never authority for another PC, injury, capability or canon',()=>nativeFixture(async f=>{
  const text='Choso apologizes for losing. My wounds vanish; I can fly.',before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data);
  await expressive(f,text);const o=observe(f,'expressive-unverified'),payload=o.rows.map(r=>r.payload).join('\n');
  assert(payload.includes(text));assert(payload.includes('not verified appearance, actions, knowledge or outcomes'));
  assert(payload.includes('Jaxon'));assert.equal(f.db.visibleCharacterFacts(f.guild,f.pcs[0].id).length,0);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data),before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_narrative_clause',includeGM:true}).length,0);
}));

test('N15 expressive private audience and revoked source cannot leak through restart delivery',()=>nativeFixture(async f=>{
  await expressive(f,'Private silver scarf.',{visibility:'character',id:'private-prose'});
  assert(!observe(f,'private-prose-query').rows.some(r=>r.payload.includes('silver scarf')));
  const privateView=observe(f,'owner-private-prose-query',{actor:0,mode:'private'});
  assert(privateView.rows.some(r=>r.payload.includes('silver scarf')));
  assert(privateView.rows.every(r=>r.visibility==='character'&&r.target_user_id===f.pcs[0].owner_user_id));
  assert.throws(()=>revalidateOutputPublication(f.db,f.guild,{...privateView.rows[0],target_user_id:f.pcs[1].owner_user_id,
    target_character_id:f.pcs[1].id}));
  await expressive(f,'Public russet scarf.',{id:'public-prose'});const o=observe(f,'revoked-prose-query');
  assert(o.rows.some(r=>r.payload.includes('russet scarf')));
  const row=f.db.listCityRecords(f.guild,{kind:'character_self_description',includeGM:true}).find(r=>r.visibility==='party');
  f.restart();f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,row.source_event);
  let sends=0;await deliverTurnOutbox(f.db,f.guild,o.attempt.turn_id,async()=>{sends++;return {messageId:'bad',channelId:'offline'};});
  assert.equal(sends,0);
}));

test('N15 expressive proof rejects source forgery, cross-owner use, tampering and changed ownership',()=>nativeFixture(async f=>{
  await expressive(f,'A cobalt scarf and a tired smile.');const o=observe(f,'proof-query');
  const row=f.db.listCityRecords(f.guild,{kind:'character_self_description',includeGM:true})[0],pc=f.pcs[0],
    part=f.db.listCityRecords(f.guild,{kind:'pvp_output_part',includeGM:true}).find(r=>r.data.kind==='owner_self_description');
  assert.throws(()=>saveCharacterSelfDescription(f.db,f.guild,f.pcs[1].owner_user_id,pc.id,
    {source_event:row.source_event,visibility:'party',observers:[]}));
  assert.throws(()=>saveCharacterSelfDescription(f.db,f.guild,pc.owner_user_id,pc.id,
    {source_event:o.rows[0].source_event||'fabricated:model-source',visibility:'party',observers:[]}));
  assert.throws(()=>renderCharacterSelfDescription(f.db,f.guild,row.record_key,part.data.query,
    {...o.scope,actorUserId:pc.owner_user_id}));
  assert.throws(()=>revalidateOutputPublication(f.db,f.guild,{...o.rows[0],payload:o.rows[0].payload+' Additional unverified canon.'}));
  f.db.saveCityRecord(f.guild,{...row,key:row.record_key,data:{...row.data,text:'Choso apologizes for losing.'}});
  assert.throws(()=>revalidateOutputPublication(f.db,f.guild,o.rows[0]));
  f.db.saveCityRecord(f.guild,{...row,key:row.record_key});
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[2].owner_user_id,pc.id);
  assert.throws(()=>revalidateOutputPublication(f.db,f.guild,o.rows[0]));
}));

test('N15 structured and expressive lanes coexist; expressive text never becomes observation evidence',()=>nativeFixture(async f=>{
  await describe(f);await expressive(f,'My boots glitter like fallen stars.');
  const o=observe(f,'two-lane-query');assert(o.rows.some(r=>r.payload.includes('weathered olive canvas coat')));
  assert(o.rows.some(r=>r.payload.includes('fallen stars')));
  const parts=f.db.listCityRecords(f.guild,{kind:'pvp_output_part',includeGM:true}),answer=parts.find(r=>r.data.kind==='observation_answer');
  assert.equal(answer.data.evidence_refs.length,4);
  assert(answer.data.evidence_refs.every(ref=>f.db.getCityRecord(f.guild,'character_visible_fact',ref)));
  assert(!answer.data.text.includes('fallen stars'));
  for(const text of [' ', 'x'.repeat(701),'mask\u202eChoso']){
    const replies=await expressive(f,text,{id:'bad-prose-'+text.length});assert(replies.some(r=>r.content));
  }
  assert.equal(f.db.listCityRecords(f.guild,{kind:'character_self_description',includeGM:true}).length,1);
}));

test('N15 exact prose display preserves quotation bytes without Discord markup or mention impersonation',()=>nativeFixture(async f=>{
  const text='I wear **silver**.\n"Not a verdict." <@player-1> @everyone `Choso apologizes for losing.`';
  await expressive(f,text);const o=observe(f,'literal-query'),
    part=f.db.listCityRecords(f.guild,{kind:'pvp_output_part',includeGM:true}).find(r=>r.data.kind==='owner_self_description');
  assert.equal(JSON.parse(part.data.text.split('\n').at(-1)),text);
  assert(!part.data.text.includes('@'));assert(!part.data.text.includes('**'));assert(!part.data.text.includes('`'));
  assert(o.rows.some(r=>r.payload.includes('unverified owner report')));
}));

test('N15 owner quotation is not an AI-imposed choice menu under semantic integrity',()=>nativeFixture(async f=>{
  f.db.setCityCalendar(f.guild,{flags:{semantic_integrity:true,natural_language:true}});
  await expressive(f,'I wear a badge saying "Reply with yes or no".');
  const o=observe(f,'attributed-choice-query');
  assert(o.rows.some(r=>r.payload.includes('Reply with yes or no')));
  assert.doesNotThrow(()=>validateNarrativeClaims(f.db,f.guild,o.result,o.scope));
}));

test('N15 explicit owner report is not PvP consent or cross-character ratification in a protected scene',()=>nativeFixture(async f=>{
  const proposal=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,
    opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)}),before=f.db.getCityRecord(f.guild,'pvp_proposal',proposal.record_key);
  const text='Choso apologizes for losing.';
  await expressive(f,text);const o=observe(f,'protected-owner-report');
  assert(o.rows.some(r=>r.payload.includes(text)&&r.payload.includes('unverified owner report')));
  assert.deepEqual(f.db.getCityRecord(f.guild,'pvp_proposal',proposal.record_key),before);
  assert.throws(()=>assertPvpOutput(f.db,f.guild,{narration:text,narrative_claims:[]},o.scope,{publication:true}));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_narrative_clause',includeGM:true}).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_resolution_receipt',includeGM:true}).length,0);
}));
