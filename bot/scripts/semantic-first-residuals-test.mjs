/** W1 residuals: real GM/outbox and disclosed-memory readers, temporary SQLite, no provider network. */
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,run,unit,candidate} from './narrative-fixtures.mjs';
import {explicitSilence,semanticResponseObligation} from '../src/gameplay-intake.js';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {disclosedNarrativeMemory} from '../src/narrative-memory.js';
import {FakeResponses} from './contract-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {proposeIntents,acceptIntentForAdjudication,persistPlayerIntents} from '../src/typed-intents.js';
import {captureAuthoredTurnEnvelope} from '../src/authored-turn-envelope.js';
import {persistAuthoredCandidates} from '../src/authored-candidates.js';
import {captureContextSource,contextSourceKey} from '../src/narrative-context.js';
import {rankNarrativeMemory} from '../src/narrative-salience.js';
import {saveVisibleCharacterFacts} from '../src/character-observation.js';
const usage={fake_provider_requests:0,real_provider_requests:0,billable_test_tokens:0,discord_requests:0};
after(()=>console.log('W1_USAGE '+JSON.stringify(usage)));

test('N13 explicit IC continuation after bounded OOC is not whole-message silence',()=>{
  for(const text of ['OOC: my headset broke\nIC: I ask about the parcel.',
    '((my headset broke)) I ask about the parcel.', '// headset broke\nI ask about the parcel.']){
    assert.equal(explicitSilence(text),false,text);
    assert(semanticResponseObligation(text,[{type:'speak',source_span:'I ask about the parcel.',framing:'immediate',resolution:'conversational'}],
      {authenticated:true}).needed,text);
  }
  for(const text of ['OOC: my headset broke','((my headset broke))','// headset broke',
    'OOC: I might say "IC: surrender" someday.','((unterminated IC: I surrender.'])assert(explicitSilence(text),text);
});

test('N13 formatting never consumes a quoted IC marker or genuine owner speech',()=>{
  for(const text of ['OOC: "IC: I surrender."','OOC: rules discussion\n"IC: I surrender."'])assert(explicitSilence(text));
  assert.equal(explicitSilence('I say "((no comment))".'),false);
});

test('N13 real router sees the original mixed source once and does not invent an action',()=>nativeFixture(async f=>{
  const text='OOC: my headset broke\nIC: What is happening here?',x=setup(f,{text});
  const ai=new FakeResponses([{respond:true,reason:'Explicit in-character inquiry',engagement_kind:'scene_description',observation_only:true,target_scope:'current_location'}]);
  const gm=new GMService({db:f.db,ai,config:{routerModel:'offline',gmModel:'offline',playableObservationFastPath:false}});
  assert(await gm.shouldRespond({guildId:f.guild,message:{id:x.messageId,content:text,author:{id:x.pc.owner_user_id,username:'fixture'}},mode:'active'}));
  assert.equal(ai.requests.length,1);assert(ai.requests[0].input.includes(text));
  usage.fake_provider_requests+=ai.requests.length;
  assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,0);
}));

test('N13 a model immediate label cannot authorize an explicitly OOC span; independent IC candidate survives',()=>nativeFixture(f=>{
  const text='OOC: I surrender.\nIC: I inspect the counter.',x=setup(f,{text});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,natural_language:true}});
  const make=span=>({...candidate(text).player_intents[0],type:'search',operation:'inspect',source_span:span});
  const rows=persistPlayerIntents(f.db,f.guild,['I surrender.','I inspect the counter.'].map(make),x.scope,{messageId:x.messageId});
  assert.deepEqual(rows.map(r=>r.data.source_span),['I inspect the counter.']);
  assert.equal(rows[0].data.start,text.indexOf('I inspect'));
  captureContextSource(f.db,f.guild,x.pc.owner_user_id,x.pc.id,x.messageId,text);
  const span='I inspect the counter.',start=text.indexOf(span);
  const saved=persistAuthoredCandidates(f.db,f.guild,[{version:2,kind:'action',source_ref:contextSourceKey(x.messageId,x.pc.id),
    source_span:span,target:'',quote:'',start,end:start+span.length,framing:'immediate'}],x.scope,{messageId:x.messageId});
  assert.equal(saved[0].status,'pending');assert.equal(saved[0].data.typed_intent_key,rows[0].record_key);
}));

test('N13 direct typed acceptance rejects OOC/quoted scope even with forged immediate framing',()=>nativeFixture(f=>{
  const text='OOC: I surrender.\nIC: She says "I surrender."',pc=f.pcs[0],scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const env=captureAuthoredTurnEnvelope(f.db,f.guild,pc.owner_user_id,pc.id,'mixed-acceptance',text);
  for(const start of [text.indexOf('I surrender.'),text.lastIndexOf('I surrender.')]){
    const span='I surrender.',proposal={version:2,proposal_id:'',source_event:env.source_event,start,end:start+span.length,
      source_span:span,actor_character_id:pc.id,sequence_index:start,dependencies:[],type:'interact',operation:'surrender',
      target:{kind:'',key:'',phrase:'',grounding:'unknown'},framing:'immediate',destination_scope:'none',attempted_action:span,
      desired_outcome:null,authored_outcome_claim:null,temporal_relation:'sequential'};
    proposal.sequence_index=start===text.indexOf('I surrender.')?0:1;
    const [row]=proposeIntents(f.db,f.guild,[proposal],scope,{messageId:'mixed-acceptance'});
    assert.throws(()=>acceptIntentForAdjudication(f.db,f.guild,row,scope),/OOC|quot|character|proposed/i);
  }
  assert.equal(f.db.listCityRecords(f.guild,{kind:'typed_intent',includeGM:true}).length,0);
}));

test('N14 context finds older entitled relevant fiction before its recent-40 cut; restart/retraction still bind',()=>nativeFixture(async f=>{
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_memory:true,narrative_salience:true}});
  const first=setup(f,{messageId:'older-parcel'}),oldText='A violet parcel waits beneath the brass clock.';
  const old=await run(f,first,{narrative_units:[unit('parcel','scene',oldText)],fiction_delta:[]});
  usage.fake_provider_requests+=old.ai.requests.length;
  assert(old.rows.some(row=>row.payload.includes(oldText)));
  const deliver=async row=>({messageId:'offline-'+row.id,channelId:'offline'});
  await deliverTurnOutbox(f.db,f.guild,old.attempt.turn_id,deliver);
  for(let turn=0;turn<6;turn++){
    const x=setup(f,{text:'Describe the counter.',messageId:`newer-counter-${turn}`});
    const o=await run(f,x,{narrative_units:Array.from({length:8},(_,i)=>unit(`recent-${turn}-${i}`,'scene',`Amber light falls across numbered folding counter ${turn*8+i}.`)),fiction_delta:[]});
    usage.fake_provider_requests+=o.ai.requests.length;
    await deliverTurnOutbox(f.db,f.guild,o.attempt.turn_id,deliver);
  }
  assert.equal(f.db.listCityRecords(f.guild,{kind:'narrative_delivery',includeGM:true,limit:100}).length,49);
  f.restart();
  const x=setup(f,{text:'What about the violet parcel?',messageId:'recall-parcel'}),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
  assert(ctx.packet.prior_fiction.some(row=>row.text.includes(oldText)),JSON.stringify({
    message:'older query-relevant source must reach ranking',selected:ctx.packet.prior_fiction.map(row=>row.text),
    candidates:disclosedNarrativeMemory(f.db,f.guild,x.scope,{query:'violet parcel',limit:40}).map(row=>row.text)}));
  assert(JSON.stringify(ctx.packet.prior_fiction).length<=9000);
  assert.equal(ctx.packet.memory_selection.eligible,49);
  assert.equal(ctx.packet.memory_selection.omitted,9);
  assert(ctx.packet.memory_selection.omitted_from_prompt>0);
  const ack=disclosedNarrativeMemory(f.db,f.guild,x.scope,{query:'violet parcel',limit:1})[0];
  assert(ack.text.includes(oldText));
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,first.sourceRef);
  assert(!buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef).packet.prior_fiction.some(row=>row.text.includes(oldText)));
}));

test('N14 flags-off historical retrieval also obeys its native prompt character budget',()=>nativeFixture(f=>{
  const rows=Array.from({length:12},(_,i)=>({unit:`saved-${i}`,text:'A harmless long description. '.repeat(20)}));
  const selected=rankNarrativeMemory(f.db,f.guild,{mode:'party'},rows,{maxChars:1500});
  assert(selected.length>0);assert(JSON.stringify(selected).length<=1500);
}));

test('N14 relevance never admits another owner or party to a private recalled clue',()=>nativeFixture(async f=>{
  const x=setup(f,{privateScene:true});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_memory:true}});
  const text='A violet envelope rests inside the private drawer.',o=await run(f,x,{narrative_units:[unit('private-clue','scene',text,{visibility:'character'})],fiction_delta:[]});
  usage.fake_provider_requests+=o.ai.requests.length;
  await deliverTurnOutbox(f.db,f.guild,o.attempt.turn_id,async row=>({messageId:'private-'+row.id,channelId:'offline-private'}));
  assert(disclosedNarrativeMemory(f.db,f.guild,x.scope,{query:'violet envelope'}).some(row=>row.text.includes(text)));
  for(const scope of [{...x.scope,mode:'party'},{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}])
    assert.equal(disclosedNarrativeMemory(f.db,f.guild,scope,{query:'violet envelope'}).length,0);
}));

test('N15 existing source-exact owner fields remain valid; rich and cross-PC prose are not silently authorized',()=>nativeFixture(f=>{
  const pc=f.pcs[0],text='black; A weathered olive canvas coat with patched elbows.',
    e=captureAuthoredTurnEnvelope(f.db,f.guild,pc.owner_user_id,pc.id,'n15-description',text);
  const input={source_event:e.source_event,visibility:'party',observers:[],facts:[{field:'hair',value:'black',start:0,end:5}]};
  assert.equal(saveVisibleCharacterFacts(f.db,f.guild,pc.owner_user_id,pc.id,input).length,1);
  assert.throws(()=>saveVisibleCharacterFacts(f.db,f.guild,f.pcs[1].owner_user_id,pc.id,input),/owner|source/i);
  const rich={...input,facts:[{field:'description',value:text.slice(7),start:7,end:text.length}]};
  assert.throws(()=>saveVisibleCharacterFacts(f.db,f.guild,pc.owner_user_id,pc.id,rich),/explicit visible fields/i);
  const foreign='Choso apologizes for losing.',foreignSource=captureAuthoredTurnEnvelope(f.db,f.guild,pc.owner_user_id,pc.id,'n15-foreign-prose',foreign);
  assert.throws(()=>saveVisibleCharacterFacts(f.db,f.guild,pc.owner_user_id,pc.id,{...input,source_event:foreignSource.source_event,
    facts:[{field:'description',value:foreign,start:0,end:foreign.length}]}),/explicit visible fields/i);
  // This is a retained policy boundary, NOT a passing richer-description acceptance case.
  assert.equal(f.db.visibleCharacterFacts(f.guild,pc.id).length,1);
}));
