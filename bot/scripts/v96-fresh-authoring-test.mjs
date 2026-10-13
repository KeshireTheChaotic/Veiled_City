/** OUT03/05: fresh NPC language uses an audience-clean native authoring request, never PC outcome authority. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {nativeFixture} from './v9-fixtures.mjs';
import {FakeResponses} from './contract-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {captureWorldInput} from '../src/autonomous-world.js';
import {currentScene} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';

test('OUT03 new authoring and composition modules support independent production import order',()=>{
  for(const module of ['fresh-npc-authoring','gm-fiction-composition','native-hook-output']){
    const child=spawnSync(process.execPath,['--import','./scripts/offline-guard.mjs','--input-type=module','-e',
      `await import('./src/${module}.js')`],{encoding:'utf8'});
    assert.equal(child.status,0,child.stderr);
  }
});

function setup(f,{npcKey='attendant'}={}){
  const s=currentScene(f.db,f.guild);
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});
  f.db.upsertNpcProfile(f.guild,{npcKey,displayName:'Attendant',role:'attendant',
    publicIdentity:'PRIVATE-PROFILE-SECRET. Choso apologizes for losing.'});
  f.db.setSimulationEntity(f.guild,'npc',npcKey,{location_key:'terminal',visibility:'party'});
  f.db.addFact(f.guild,{key:'private-clue',content:'GM-SECRET-OTHER-OWNER',visibility:'gm'});
  const source=indexWorldEvent(f.db,f.guild,{key:'public-work',kind:'observation',source_id:'human_gm',
    title:'Public NPC knowledge',visibility:'party',truth_status:'observed',session_id:s.session_id,scene:s.key,
    location_key:'terminal',details:{npc_key:npcKey,quote:'The night crews need couriers.'}},'offline-gm');
  f.db.upsertNpcKnowledge(f.guild,{npcKey,knowledgeKey:'work',content:source.details.quote,
    sourceRef:source.event_key,beliefState:'known',isSecret:false});
  return {source,request:{version:3,kind:'npc_fresh_request',entity_key:npcKey,focus:'work',source_refs:[source.event_key]}};
}
function response(request){
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,
    {decision:'no_change',reason:'No mutation proposed.',confidence:100}]));
  state_review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  return {respond:true,narration:'Unverified main-model candidate.',world_additions:[],scene_actions:[],world_conflicts:[],
    narrative_interpretation:null,player_intents:[{type:'other',source_span:'I wait.',target_name:'',target_key:'',
      destination:'unspecified',operation:'wait',utterance:'',excluded_targets:[],framing:'immediate',
      resolution:'conversational',reason:'Owner waits; no mechanical effect.'}],context_memories:[],authored_candidates:null,
    narrative_claims:[],gm_world_parts:[request],private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],
    npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,state_review};
}
async function run(f,request,outputs,{id='fresh',mode='party',actor=0,beforeWriter=null,text='I wait.',memories=[],prose=null,claims=[],drafts={}}={}){
  const pc=f.pcs[actor],scope={mode,actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,text,{privateScene:mode==='private'});
  const candidate=response(request);candidate.player_intents[0].source_span=text;candidate.context_memories=memories;
  if(prose!==null)candidate.narration=prose;candidate.narrative_claims=claims;
  Object.assign(candidate,drafts);
  const ai=new FakeResponses([candidate,...outputs]);
  if(beforeWriter){const create=ai.responses.create;ai.responses.create=async req=>{
    if(req.text?.format?.name==='audience_scoped_npc_utterance')beforeWriter();return create(req);
  };}
  const gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',routineGmModel:'offline',maxRecentMessages:5,maxContentChunks:1,contextInputBudget:100000}});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:id,
    actorPrincipal:pc.owner_user_id,audience:mode});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,
    actorAssignment:f.db.controlledAssignment(f.session.id,pc.owner_user_id),messageText:text,messageId:id,scope:mode});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:'OUT03 fresh fixture',
    meta:{messageId:id,turnId:attempt.turn_id,channelId:'offline-play'}});
  return {ai,result,attempt};
}

function assertStructuredSchemaTypes(schema,at='$'){
  assert(schema&&typeof schema==='object',`${at}: schema required`);
  if(!schema.$ref&&!schema.anyOf)assert(Object.hasOwn(schema,'type'),`${at}: schema must have a type key`);
  for(const [key,property] of Object.entries(schema.properties||{}))assertStructuredSchemaTypes(property,`${at}.properties.${key}`);
  if(schema.items)assertStructuredSchemaTypes(schema.items,`${at}.items`);
  for(const [index,branch] of (schema.anyOf||[]).entries())assertStructuredSchemaTypes(branch,`${at}.anyOf.${index}`);
  for(const [key,definition] of Object.entries(schema.$defs||{}))assertStructuredSchemaTypes(definition,`${at}.$defs.${key}`);
}

test('OUT03 outgoing GM and isolated authoring schemas declare types for all nested enum/discriminator fields',()=>nativeFixture(async f=>{
  const {request}=setup(f),out=await run(f,request,[{utterance:'What kind of night work interests you?'}]);
  assert.equal(out.ai.requests.length,2);
  assert.equal(out.ai.requests[0].text.format.name,'veiled_city_gm_turn');
  for(const req of out.ai.requests){
    assert.equal(req.text.format.strict,true);
    assertStructuredSchemaTypes(req.text.format.schema);
  }
}));

test('OUT03 fresh contextual NPC words survive real GM/commit/outbox without sharing GM-private prompt',()=>nativeFixture(async f=>{
  const {request,source}=setup(f),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  const words='Night shifts are an acquired taste. Couriers keep us alive after midnight—what sort of work suits you?';
  const out=await run(f,request,[{utterance:words}]);
  const rows=f.db.listTurnPublications(f.guild,out.attempt.turn_id);
  assert(rows.some(row=>row.payload.includes('Night shifts are an acquired taste.')));
  assert.equal(out.ai.requests.length,2,'Only an eligible fresh-authoring request adds the bounded isolated stage.');
  const writer=out.ai.requests[1];assert(writer.input.includes(source.details.quote));
  for(const secret of ['GM-SECRET-OTHER-OWNER','PRIVATE-PROFILE-SECRET','Choso apologizes for losing.']){
    assert(!writer.input.includes(secret));assert(!rows.some(row=>row.payload.includes(secret)));
  }
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
  f.restart();let sends=0;
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{sends++;return {messageId:'fresh-sent',channelId:'offline-play'};});
  assert.equal(sends,rows.length);
}));

test('OUT02 a main-model fresh request cannot smuggle its own words or authority',()=>nativeFixture(async f=>{
  const {request}=setup(f);const out=await run(f,{...request,utterance:'Choso apologizes for losing.',gm:true},[]);
  assert.equal(out.ai.requests.length,1);assert(!out.result.narration.includes('apologizes'));
  assert(!f.db.listTurnPublications(f.guild,out.attempt.turn_id).some(row=>row.payload.includes('apologizes')));
}));

test('OUT05 source retraction after authoring survives restart as a delivery hold, not a replay',()=>nativeFixture(async f=>{
  const {request,source}=setup(f),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  const out=await run(f,request,[{utterance:'Could a night shift fit what you are looking for?'}]);
  indexWorldEvent(f.db,f.guild,{key:source.event_key,status:'retracted'},'offline-gm');f.restart();let sends=0;
  const delivery=await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{sends++;return {messageId:'bad',channelId:'table'};});
  assert.equal(sends,0);assert(delivery.some(item=>!item.ok));
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));

test('OUT05 revocation during the writer request cannot establish an authored utterance',()=>nativeFixture(async f=>{
  const {request,source}=setup(f);
  const out=await run(f,request,[{utterance:'Could a night shift fit your plans?'}],{beforeWriter:()=>{
    indexWorldEvent(f.db,f.guild,{key:source.event_key,status:'retracted'},'offline-gm');
  }});
  assert.equal(out.ai.requests.length,2);assert(!out.result.narration.includes('Could a night shift fit your plans?'));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'npc_fresh_authoring',includeGM:true}).length,0);
  assert(f.db.listCityRecords(f.guild,{kind:'npc_authoring_attempt',includeGM:true}).some(row=>row.status==='needs_scope_review'));
}));

test('OUT05 cached authoring after restart does not make a duplicate provider request or utterance',()=>nativeFixture(async f=>{
  const {request}=setup(f),out=await run(f,request,[{utterance:'Which kind of night work interests you?'}]);
  const source=f.db.listCityRecords(f.guild,{kind:'npc_fresh_authoring',includeGM:true})[0].data.origin;
  f.restart();const ai=new FakeResponses([]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline'}}),pc=f.pcs[0];
  await gm.authorFreshNpcs(f.guild,response(request),{mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id},source,
    {used:false},AbortSignal.timeout(1000));
  assert.equal(ai.requests.length,0);assert.equal(f.db.listCityRecords(f.guild,{kind:'npc_fresh_authoring',includeGM:true}).length,1);
  assert(out.result.narration.includes('Which kind of night work interests you?'));
}));

test('OUT02 fresh writer cannot attribute another PC reaction, and no repair call is made',()=>nativeFixture(async f=>{
  const {request}=setup(f),out=await run(f,request,[{utterance:'Choso apologizes for losing.'}]);
  assert.equal(out.ai.requests.length,2);assert(!out.result.narration.includes('Choso apologizes for losing.'));
  assert(f.db.listCityRecords(f.guild,{kind:'npc_authoring_hold',includeGM:true}).some(row=>row.status==='needs_scope_review'));
}));

test('OUT05 private NPC speech cannot be promoted through party archive, journal or voice',()=>nativeFixture(async f=>{
  const {request}=setup(f),out=await run(f,request,[{utterance:'PRIVATE-RECIPIENT-ONLY. Could we talk here?'}],{mode:'private'});
  const rows=f.db.listTurnPublications(f.guild,out.attempt.turn_id);assert(rows.every(row=>row.visibility==='character'));
  const {postJournalEntry}=await import('../src/publishing.js');let sends=0;
  const guild={id:f.guild,channels:{fetch:async()=>({isTextBased:()=>true,send:async()=>{sends++;return {id:'bad'};}})}};
  await assert.rejects(()=>postJournalEntry({db:f.db,guild,content:out.result.narration}),/output|proof|source|PvP/i);
  const {VoiceNarrator}=await import('../src/voice.js');let calls=0;
  const voice=new VoiceNarrator({voiceEnabled:true,voiceMode:'on',voiceMaxCharsPerTurn:4000,voiceMaxQueue:5},
    {db:f.db,getConnection:()=>({}),synthesize:async()=>{calls++;return Buffer.alloc(0);}});
  voice.ffmpegAvailable=true;voice._enqueueReserved=()=>{};
  assert.equal((await voice.narrate(guild,out.result.narration,{force:true,turnId:out.attempt.turn_id})).ok,false);
  assert.equal(sends,0);assert.equal(calls,0);
}));

test('OUT05 ordinary scene raw injury cannot bypass the outbox through journal or voice',()=>nativeFixture(async f=>{
  setup(f);const {postJournalEntry}=await import('../src/publishing.js');let sends=0;
  const guild={id:f.guild,channels:{fetch:async()=>({isTextBased:()=>true,send:async()=>{sends++;return {id:'bad'};}})}};
  await assert.rejects(()=>postJournalEntry({db:f.db,guild,content:"Jaxon's left leg has been reduced to an unusable mess."}),/output|proof|source|PvP/i);
  const {VoiceNarrator}=await import('../src/voice.js');let calls=0;
  const voice=new VoiceNarrator({voiceEnabled:true,voiceMode:'on',voiceMaxCharsPerTurn:4000,voiceMaxQueue:5},
    {db:f.db,getConnection:()=>({}),synthesize:async()=>{calls++;return Buffer.alloc(0);}});
  voice.ffmpegAvailable=true;voice._enqueueReserved=()=>{};
  assert.equal((await voice.narrate(guild,'Choso apologizes for losing.',{force:true})).ok,false);
  assert.equal(sends,0);assert.equal(calls,0);
}));

test('OUT06 private native resource receipt projects only its exact outcome without spending again',()=>nativeFixture(async f=>{
  const {reviewFeatureEffect,reviewPcEffect,approvePcEffect,applyPcEffect}=await import('../src/pc-effects.js');
  const pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.domain_cards=['Synthetic Focus'];});
  f.db.upsertRulesRuling(f.guild,{key:'projection-focus',ruling:'Synthetic Focus costs one Hope.',createdBy:'gm'});
  const source=f.accepted(0,'I use Synthetic Focus.',pc.id).source_event;
  const authority=reviewFeatureEffect(f.db,f.guild,'gm',{character:pc.id,feature:'Synthetic Focus',ruling:'projection-focus',
    source,resource:'hope',amount:-1},{gm:true,interactionId:'projection-review'});
  reviewPcEffect(f.db,f.guild,pc.owner_user_id,authority.record_key);
  approvePcEffect(f.db,f.guild,pc.owner_user_id,authority.record_key,{interactionId:'projection-choice'});
  const receipt=applyPcEffect(f.db,f.guild,authority.record_key),request={version:4,kind:'native_outcome',
    receipt_kind:'pc_effect_receipt',ref:receipt.record_key};
  const out=await run(f,request,[],{mode:'private',id:'project-effect'});
  assert.match(out.result.narration,/native resource receipt/i);assert.match(out.result.narration,/hope.*-1/i);
  assert(!out.result.narration.includes('Unverified main-model candidate.'));
  assert.equal(f.db.getCharacter(pc.id).data.resources.hope,1);
  const publicAttempt=await run(f,request,[],{id:'no-private-resource-promotion'});
  assert(!/native resource receipt/i.test(publicAttempt.result.narration));
  assert.equal(f.db.getCharacter(pc.id).data.resources.hope,1);
}));

test('OUT06 native NPC injury projection requires the real defense, Armor and terminal damage receipt',()=>nativeFixture(async f=>{
  const {incomingFixture}=await import('./v94-incoming-fixtures.mjs');
  const {prepareIncomingAttack,reviewIncomingAttack,confirmIncomingDefense,rollIncomingAttack,resolveIncomingDamage}=await import('../src/pc-incoming.js');
  const {pc,lib,input}=incomingFixture(f),a=prepareIncomingAttack(f.db,f.guild,'gm',input,{gm:true,interactionId:'output-incoming',library:lib});
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library:lib});
  confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  let n=0;rollIncomingAttack(f.db,f.guild,'gm',a.record_key,{gm:true,library:lib,rng:()=>[15,8][n++]});
  const receipt=resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:true,library:lib});
  const before=structuredClone(f.db.getCharacter(pc.id).data.resources);
  const out=await run(f,{version:4,kind:'native_outcome',receipt_kind:'pc_effect_receipt',ref:receipt.record_key},[],
    {mode:'private',actor:1,id:'injury-projection'});
  assert.match(out.result.narration,/hp marked \+1/);assert.equal(n,2);
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources,before);
}));

test('OUT06 actual owner collection projects custody, not an adjacent concession or ownership invention',()=>nativeFixture(async f=>{
  const {manageEvidence}=await import('../src/evidence-custody.js'),{stateRevision}=await import('../src/ai-intents.js');
  const {recordScenePresence}=await import('../src/scene-continuity.js');setup(f);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,evidence_custody:true,scene_continuity:true}});
  const pc=f.pcs[0],scene=currentScene(f.db,f.guild),artifact=f.db.createHandout(f.guild,{title:'Courier case',visibility:'party',
    metadata:{internal:'GM-SECRET-ARTIFACT'}});
  const source=(key,from,to)=>indexWorldEvent(f.db,f.guild,{key,kind:'evidence_transfer',source_id:'gm',title:'Adjudicated native custody',
    visibility:'party',session_id:scene.session_id,scene:scene.key,location_key:'terminal',
    details:{evidence:{handout_id:artifact.id,from,to}}},'gm').event_key;
  const registered=source('case-register',null,'location:terminal');
  manageEvidence(f.db,f.guild,{op:'register',key:'register',id:artifact.id,source_event:registered,holder:'location:terminal',
    expected_revision:stateRevision(undefined)},'gm',{gm:true});
  recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,source_event:registered,location_key:'terminal',
    visibility:'party',accepted_by:pc.owner_user_id},'gm');
  const collected=source('case-collect','location:terminal',`character:${pc.id}`);
  manageEvidence(f.db,f.guild,{op:'collect',key:'collect',id:artifact.id,source_event:collected,
    expected_revision:stateRevision(f.db.getHandout(artifact.id).metadata.evidence)},pc.owner_user_id);
  const out=await run(f,{version:4,kind:'native_outcome',receipt_kind:'evidence_receipt',ref:`${artifact.id}:collect`},[],{id:'custody-output'});
  assert.match(out.result.narration,/Native custody record/);assert(out.result.narration.includes(`character:${pc.id}`));
  assert(!out.result.narration.includes('GM-SECRET-ARTIFACT'));assert(!out.result.narration.includes('Unverified main-model candidate.'));
}));

test('OUT06 authenticated exact commitment is privately projectable, but private acceptance is not public disclosure',()=>nativeFixture(async f=>{
  const {establishCommitment}=await import('../src/city-core.js'),{consentOffers,respondConsent}=await import('../src/consent-language.js');
  setup(f);f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,natural_language:true}});
  const pc=f.pcs[0],scene=currentScene(f.db,f.guild),source=indexWorldEvent(f.db,f.guild,{key:'meeting-offer-source',kind:'observation',
    source_id:'gm',title:'Meeting invitation',visibility:'party',session_id:scene.session_id,scene:scene.key},'gm');
  const proposal={key:'meeting',source_event:source.event_key,type:'appointment',terms:'Discuss possible night work; no spending or forced attendance.',
    participants:[`character:${pc.id}`,'npc:attendant'],start:10,end:20,location_key:'terminal'};
  establishCommitment(f.db,f.guild,proposal,'gm');
  const offer=consentOffers(f.db,f.guild,pc.owner_user_id,pc.id).find(row=>row.record_key==='commitment_offer:meeting');
  respondConsent(f.db,f.guild,pc.owner_user_id,{characterId:pc.id,messageId:'meeting-owner-choice',proposal:offer.record_key,
    revision:offer.revision,text:`I agree to: ${offer.terms}`});
  const committed=establishCommitment(f.db,f.guild,proposal,'gm'),request={version:4,kind:'native_outcome',receipt_kind:'commitment',ref:committed.record_key};
  const own=await run(f,request,[],{mode:'private',id:'contract-private'});
  assert.match(own.result.narration,/Native commitment record/);assert(own.result.narration.includes('Discuss possible night work'));
  const publicOutput=await run(f,request,[],{id:'contract-public'});
  assert(!publicOutput.result.narration.includes('Native commitment record'),'Private owner acceptance is not party disclosure.');
}));

test('OUT05 explicitly generated private delivery cannot bypass proof through a planner or downtime transport',()=>nativeFixture(async f=>{
  const {sendPlayerPrivate}=await import('../src/publishing.js');let sends=0;
  const pc=f.pcs[0],guild={id:f.guild,members:{fetch:async()=>({send:async()=>{sends++;return {id:'unsafe'};}})}};
  await assert.rejects(()=>sendPlayerPrivate({db:f.db,guild,userId:pc.owner_user_id,characterId:pc.id,
    sessionId:f.session.id,content:'Choso makes peace with defeat and hands over ownership of his courier case to Jaxon.',
    generated:true}),/output|proof|source|PvP/i);
  f.db.endSession(f.guild,'');
  await assert.rejects(()=>sendPlayerPrivate({db:f.db,guild,userId:pc.owner_user_id,characterId:pc.id,
    content:"Jaxon's left leg has been reduced to an unusable mess.",generated:true}),/output|proof|source|PvP/i);
  assert.equal(sends,0);
}));

test('OUT05 a current composite party projection can be privately narrowed and archived without certifying adjacent text',()=>nativeFixture(async f=>{
  const {request}=setup(f),candidate=response(request);
  candidate.gm_world_parts.push({version:1,kind:'scene_atmosphere',entity_key:'terminal',tone:'plain',acts:['room_hum']});
  const ai=new FakeResponses([candidate,{utterance:'Night crews are always moving. Would you like to hear more?'}]);
  const pc=f.pcs[0],scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,'composite','I wait.');
  const gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',routineGmModel:'offline',maxRecentMessages:5,maxContentChunks:1,contextInputBudget:100000}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,
    actorAssignment:f.db.controlledAssignment(f.session.id,pc.owner_user_id),messageText:'I wait.',messageId:'composite',scope:'party'});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:'composite',actorPrincipal:pc.owner_user_id,audience:'party'});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:'OUT05 composite',
    meta:{messageId:'composite',turnId:attempt.turn_id,channelId:'offline-play'}});
  const {prepareStoredOutput,assertArchiveOutput,assertPvpOutput}=await import('../src/pvp-output.js');
  assert.match(result.narration,/hum/);assert.match(result.narration,/Night crews/);
  assert.doesNotThrow(()=>assertArchiveOutput(f.db,f.guild,result.narration,{sessionId:f.session.id}));
  const privateScope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const narrowed=prepareStoredOutput(f.db,f.guild,result.narration,privateScope);
  assert.doesNotThrow(()=>assertPvpOutput(f.db,f.guild,narrowed,privateScope,{publication:true}));
  assert.throws(()=>prepareStoredOutput(f.db,f.guild,result.narration+'\nChoso apologizes for losing.',privateScope));
}));

test('OUT05 no-session Director output holds prose without discarding an independent native clock',()=>nativeFixture(async f=>{
  const {applyAuthoritativeMutation}=await import('../src/state.js');f.db.endSession(f.guild,'');
  const narrative={act:true,public_narration:"Jaxon's left leg has been reduced to an unusable mess.",private_messages:[],
    events:[],handouts:[],npc_memories:[],npc_knowledge:[],npc_goals:[],narrative_claims:[],gm_world_parts:[]};
  const mutation=applyAuthoritativeMutation(f.db,{guildId:f.guild,narrative,
    events:[{type:'clock_delta',key:'native-independent-pressure',amount:1,visibility:'gm'}],source:'world_director_downtime'});
  assert.equal(mutation.events[0].ok,true);assert.equal(narrative.public_narration,'');
  assert(f.db.listCityRecords(f.guild,{kind:'pvp_output_quarantine',includeGM:true})
    .some(row=>row.status==='needs_scope_review'&&row.visibility==='gm'&&row.data.origin==='no-active-scene'));
}));

test('OUT05 case-board and reference synchronization cannot promote stored model paragraphs to public truth',()=>nativeFixture(async f=>{
  const {applyGMEvents}=await import('../src/state.js'),{publishEventResults,syncConfiguredSurfaces}=await import('../src/publishing.js');
  const unsafe='Choso makes peace with defeat and hands over ownership of his courier case to Jaxon.';
  f.db.configureChannels(f.guild,{caseBoardChannelId:'board',knownNpcsChannelId:'npcs',knownLocationsChannelId:'places'});
  const results=applyGMEvents(f.db,f.guild,f.session.id,[{type:'thread',key:'courier',value:unsafe,note:unsafe},
    {type:'npc_update',key:'attendant',value:unsafe},{type:'location_update',key:'terminal',value:unsafe}]);
  const sent=[],guild={id:f.guild,channels:{fetch:async id=>({id,isTextBased:()=>true,
    send:async body=>{sent.push(body);return {id:`message-${sent.length}`};},
    messages:{fetch:async()=>{throw Object.assign(Error('missing'),{code:10008});}}})}};
  await publishEventResults({db:f.db,guild,results});f.restart();await syncConfiguredSurfaces({db:f.db,guild});
  assert(sent.length>=3);assert(sent.every(body=>!body.includes(unsafe)));
  assert(f.db.listCityRecords(f.guild,{kind:'pvp_output_quarantine',includeGM:true})
    .some(row=>row.data.origin==='reference-publication'&&row.visibility==='gm'));
}));

for(const mode of ['party','private'])test(`OUT05 fresh ${mode} World Director uses the same isolated author and exact output boundary`,()=>nativeFixture(async f=>{
  const {request}=setup(f),{queueDirectorPublications}=await import('../src/publication-outbox.js');
  const {applyAuthoritativeMutation}=await import('../src/state.js'),pc=f.pcs[2];
  const scope={mode,actorUserId:mode==='private'?pc.owner_user_id:null,actorCharacterId:mode==='private'?pc.id:null};
  const candidate={...response(request),act:true,public_narration:'Choso apologizes for losing.',gm_notes:'',confidence:100,player_intents:[]};
  const ai=new FakeResponses([candidate,{utterance:'Night work keeps strange hours. What would you like to know?'}]);
  const gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline-director',routineGmModel:'offline-routine',maxRecentMessages:5,maxContentChunks:1,contextInputBudget:100000}});
  const result=await gm.runWorldDirector({guildId:f.guild,layer:'manual',trigger:{scope:mode,
    actor_user_id:scope.actorUserId,actor_character_id:scope.actorCharacterId}});
  applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,narrative:result,scope});
  const turnId=queueDirectorPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope,key:`fresh-director-${mode}`});
  f.restart();const sent=[];
  await deliverTurnOutbox(f.db,f.guild,turnId,async row=>{sent.push(row);return {messageId:'director',channelId:'offline'};});
  assert(sent.length);assert(sent.every(row=>row.payload.includes('Night work keeps strange hours.')&&!row.payload.includes('apologizes')));
  assert(sent.every(row=>row.visibility===(mode==='party'?'party':'character')));
  assert.equal(ai.requests.length,2);assert(!ai.requests[1].input.includes('GM-SECRET-OTHER-OWNER'));
  assert.equal(ai.requests[1].model,ai.requests[0].model,'New authoring must not silently downgrade the owning GM operation model.');
}));

test('OUT05 reference content is revalidated after asynchronous channel lookup',()=>nativeFixture(async f=>{
  const {request,source}=setup(f),out=await run(f,request,[{utterance:'Night work is available. What would you like to ask?'}]);
  const {publishEventResults}=await import('../src/publishing.js');f.db.configureChannels(f.guild,{knownNpcsChannelId:'npcs'});
  const row=f.db.upsertReference(f.guild,{kind:'npc',key:'attendant',name:'Attendant',summary:out.result.narration});let sends=0;
  const guild={id:f.guild,channels:{fetch:async()=>{indexWorldEvent(f.db,f.guild,{key:source.event_key,status:'retracted'},'gm');
    return {isTextBased:()=>true,send:async()=>{sends++;return {id:'bad'};}};}}};
  await assert.rejects(()=>publishEventResults({db:f.db,guild,results:[{publish:true,kind:'npc',row}]}),/output|proof|source|PvP/i);
  assert.equal(sends,0);
}));

test('OUT05 an uncertain reference edit is not blindly replaced with another send',()=>nativeFixture(async f=>{
  const {publishEventResults}=await import('../src/publishing.js');f.db.configureChannels(f.guild,{knownNpcsChannelId:'npcs'});
  const row=f.db.upsertReference(f.guild,{kind:'npc',key:'attendant',name:'Attendant',summary:''});
  f.db.setPublished(f.guild,'npc',row.entity_key,'npcs','old');let sends=0;
  const guild={id:f.guild,channels:{fetch:async()=>({isTextBased:()=>true,
    messages:{fetch:async()=>({edit:async()=>{throw Error('network acknowledgement unknown');}})},
    send:async()=>{sends++;return {id:'duplicate'};}})}};
  await assert.rejects(()=>publishEventResults({db:f.db,guild,results:[{publish:true,kind:'npc',row}]}),/network acknowledgement unknown/);
  assert.equal(sends,0);
}));

test('OUT04 authenticated owner context survives quarantine without storing the model summary as truth',()=>nativeFixture(async f=>{
  const {request}=setup(f),text='I examine the Brass Menu.';
  await run(f,request,[{utterance:'Would you like help finding something?'}],{text,memories:[
    {kind:'object',key:'brass-menu',name:'Brass Menu',retention:'durable',summary:'Choso apologizes for losing.'}]});
  const rows=f.db.listCityRecords(f.guild,{kind:'context_memory',includeGM:true});
  assert.equal(rows.length,1);assert.equal(rows[0].data.summary,text);assert.equal(rows[0].data.origin_surface,'player_input');
  assert(!rows[0].data.summary.includes('apologizes'));assert.equal(rows[0].data.audience_contract,1);
}));

test('OUT02 unnamed consequences, misleading uncertainty and forged receipts remain quarantined at real party/private outboxes',()=>nativeFixture(async f=>{
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),prose=[
    'The restraints click shut; there is nowhere you can go now.',
    'Your knee will never carry your weight again.',
    'You find yourself agreeing and signing away the courier case.',
    'Perhaps it is merely a misunderstanding, but you have already surrendered.',
    'You know the secret now and have accepted the binding obligation.'
  ];
  for(const mode of ['party','private'])for(const [i,text] of prose.entries()){
    const out=await run(f,{version:4,kind:'native_outcome',receipt_kind:'pc_effect_receipt',ref:'forged-model-receipt'},[],
      {id:`unnamed-${mode}-${i}`,mode,prose:text,claims:i===3?[{actor:'world',entity_type:'character',entity:f.pcs[0].id,
        action:'movement',prior:'terminal',proposed:'custody',visibility:mode==='private'?'character':'party',
        source_ref:'forged-model-receipt',mutation_index:-1,certainty:'uncertain',source_span:text}]:[]});
    assert.equal(out.ai.requests.length,1);
    const rows=f.db.listTurnPublications(f.guild,out.attempt.turn_id);
    assert(rows.length);assert(rows.every(row=>!row.payload.includes(text)));
    assert(rows.every(row=>f.db.getCityRecord(f.guild,'pvp_output_publication',row.id)?.status==='verified'));
  }
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));

test('OUT01 provisional prose validation explicitly confers no publication authority',()=>nativeFixture(async f=>{
  const {validateNarrativeClaims}=await import('../src/narrative-integrity.js');
  const {queueTurnPublications}=await import('../src/publication-outbox.js'),scope={mode:'party'};
  const raw={narration:'Rain falls on the pavement.',narrative_claims:[]};
  assert.equal(validateNarrativeClaims(f.db,f.guild,raw,scope).publication_authorized,false);
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:'provisional-not-publication',actorPrincipal:'gm',audience:'party'});
  assert.throws(()=>queueTurnPublications(f.db,{guild:{id:f.guild},session:f.session,result:raw,scope,turnId:attempt.turn_id}));
  assert.equal(f.db.listTurnPublications(f.guild,attempt.turn_id).length,0);
}));

test('OUT04 post-turn review reflects quarantined handouts without claiming a mutation or losing the audit',()=>nativeFixture(async f=>{
  const {request}=setup(f);
  const out=await run(f,request,[{utterance:'What would you like to ask?'}],{id:'quarantined-review',drafts:{handouts:[
    {title:'Candidate',kind:'note',authority:'illustrative',visibility:'party',player_visible_text:'Choso apologizes for losing.',
      canonical_facts:[],target_user_id:'',target_character_id:'',case_key:'',npc_key:'',location_key:'',
      epistemic:{kind:'hypothesis',perspective:'model proposal',source_refs:[]}}]}});
  assert.equal(out.result.handouts.length,0);assert.equal(out.result.state_review.handouts.decision,'no_change');
  const audit=f.db.getCityRecord(f.guild,'post_turn_review_audit','review:quarantined-review');
  assert(audit.data.corrections.some(c=>c.category==='handouts'&&c.to==='no_change'));
  assert.equal(f.db.listHandoutsFor(f.guild,f.pcs[0].owner_user_id,{includeGM:true}).length,0);
}));

test('OUT06 a native due schedule projects only deadline metadata, not its arbitrary hook paragraph',()=>nativeFixture(async f=>{
  const {scheduleCityEvent}=await import('../src/city-calendar.js'),{publishSimulationHooks}=await import('../src/publishing.js');
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  scheduleCityEvent(f.db,f.guild,{key:'output-deadline',title:'Private-looking untrusted title',due_minute:0,visibility:'party',
    hook:'Choso makes peace with defeat and hands over ownership of his courier case to Jaxon.'});
  f.db.advanceSimulationClock(f.guild,{minutes:0});f.db.configureCampaign(f.guild,{playChannelId:'table'});
  const sent=[],guild={id:f.guild,channels:{fetch:async()=>({id:'table',isTextBased:()=>true,
    send:async content=>{sent.push(content);return {id:'deadline',channelId:'table'};}})}};
  assert.equal(await publishSimulationHooks({db:f.db,guild}),1);assert.match(sent[0],/scheduled deadline/i);
  assert(!sent[0].includes('Choso'));assert(!sent[0].includes('Private-looking'));
  f.restart();assert.equal(await publishSimulationHooks({db:f.db,guild}),0);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));

test('OUT05 forged scheduled-notice labels and unbound hooks remain private review, not receipts',()=>nativeFixture(async f=>{
  const {publishSimulationHooks}=await import('../src/publishing.js');let sends=0;
  const source=indexWorldEvent(f.db,f.guild,{key:'not-a-deadline',kind:'observation',source_id:'gm',title:'Not a deadline',visibility:'party'},'gm');
  const hooks=[f.db.putSimulationRecord(f.guild,{kind:'hook',status:'ready',data:{content:'Choso apologizes for losing.',
    source:'gm_scheduled_notice',world_event:source.event_key,gm:true}}),
    f.db.putSimulationRecord(f.guild,{kind:'hook',status:'ready',data:{content:'Unbound narration'}})];
  f.db.configureCampaign(f.guild,{playChannelId:'table'});
  const guild={id:f.guild,channels:{fetch:async()=>({id:'table',isTextBased:()=>true,send:async()=>{sends++;return {id:'bad'};}})}};
  assert.equal(await publishSimulationHooks({db:f.db,guild}),0);assert.equal(sends,0);
  assert(hooks.every(h=>f.db.getSimulationRecord(f.guild,h.id).status==='needs_scope_review'));
}));

test('OUT05 a writer that returns after its shared abort cannot create an authored speech source',()=>nativeFixture(async f=>{
  const {request}=setup(f),pc=f.pcs[0],controller=new AbortController();
  const source=captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,'expired-writer','I wait.');
  const ai=new FakeResponses([{utterance:'Would you like to ask about night work?'}]),create=ai.responses.create;
  ai.responses.create=async(...args)=>{const answer=await create(...args);controller.abort();return answer;};
  const gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,config:{gmModel:'offline'}});
  await gm.authorFreshNpcs(f.guild,response(request),{mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id},
    source.event_key,{used:false},controller.signal);
  assert.equal(ai.requests.length,1);assert.equal(f.db.listCityRecords(f.guild,{kind:'npc_fresh_authoring',includeGM:true}).length,0);
  assert(f.db.listCityRecords(f.guild,{kind:'npc_authoring_attempt',includeGM:true}).every(row=>row.status==='needs_scope_review'));
}));

test('OUT03 certified fresh speech satisfies engagement without a sacrificial raw paragraph or another GM request',()=>nativeFixture(async f=>{
  const {request}=setup(f),out=await run(f,request,[{utterance:'Night work can be a long conversation. What would you like to ask?'}],{prose:''});
  assert.equal(out.ai.requests.length,2);assert.match(out.result.narration,/Night work can be a long conversation/);
  assert(f.db.listTurnPublications(f.guild,out.attempt.turn_id).some(row=>row.payload.includes('Night work can be a long conversation')));
}));

test('OUT05 a visible NPC presence does not disclose its private canonical identity through the speaker label',()=>nativeFixture(async f=>{
  const npcKey='private-canonical-identity',{request}=setup(f,{npcKey});
  const out=await run(f,request,[{utterance:'Would you like to ask about night work?'}]);
  assert(!out.ai.requests[1].input.includes(npcKey));
  assert(!out.result.narration.includes(npcKey));
  assert(f.db.listTurnPublications(f.guild,out.attempt.turn_id).every(row=>!row.payload.includes(npcKey)));
}));

for(const revoke of ['source','owner'])test(`OUT06 legacy delegated arrival projects only its native receipt; ${revoke} changes hold delivery after restart`,()=>nativeFixture(async f=>{
  const {prepareSceneEntry,configureEntryPolicy}=await import('../src/scene-entry.js');
  const {configureDelegation,stateRevision}=await import('../src/ai-intents.js');
  const {prepareStoredOutput}=await import('../src/pvp-output.js');
  const pc=f.pcs[0],id=`legacy-entry-${revoke}`,scope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const resources=f.db.getCharacter(pc.id).data.resources;
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,natural_language:true,scene_continuity:true}});
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});
  f.db.setSimulationEntity(f.guild,'location','lobby',{name:'Lobby'});
  const entry=prepareSceneEntry(f.db,f.guild,pc.owner_user_id,pc.id,id,'I enter Lobby.',{privateScene:true});
  configureEntryPolicy(f.db,f.guild,{op:'entry-policy',location_key:'lobby',from_locations:['terminal']},'offline-gm');
  configureDelegation(f.db,f.guild,{mode:'routine_delegated',allow:['scene.enter'],max_operations:2,max_cost:0,expires_minute:100},'offline-gm');
  const result={narration:'Choso apologizes for losing.',narrative_claims:[],ai_intents:[{version:1,feature:'scene',
    target_key:entry.record_key,expected_revision:stateRevision(entry),policy_revision:1,source_prerequisites:[],
    payload:{op:'enter',entry_key:entry.record_key,location_key:'lobby',source_event:entry.source_event}}]};
  const turn=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:id,actorPrincipal:pc.owner_user_id,audience:'private'});
  const committed=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:'Legacy native arrival',
    meta:{messageId:id,turnId:turn.turn_id}});
  assert.equal(committed.intents[0].status,'accepted');assert.equal(result.narration,'You have entered the Lobby.');
  assert(f.db.listTurnPublications(f.guild,turn.turn_id).every(row=>!row.payload.includes('Choso')));
  assert.throws(()=>prepareStoredOutput(f.db,f.guild,result.narration,{mode:'party'}),/output|proof/i);
  f.restart();
  if(revoke==='source')indexWorldEvent(f.db,f.guild,{key:entry.source_event,status:'retracted'},'offline-gm');
  else f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,pc.id);
  let sends=0;await deliverTurnOutbox(f.db,f.guild,turn.turn_id,async()=>{sends++;return {messageId:'forbidden'};});
  assert.equal(sends,0);assert.equal(f.db.getCharacter(pc.id).data.location,'lobby');
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources,resources);
}));
