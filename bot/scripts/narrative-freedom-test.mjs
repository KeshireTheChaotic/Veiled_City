/** New creative authority contract: real commit/outbox adapters, synthetic provider, temporary SQLite only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {FakeResponses} from './contract-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {captureWorldInput,worldInputKey} from '../src/autonomous-world.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {recordScenePresence,currentScene} from '../src/scene-continuity.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
export const unit=(id,kind,text,fields={})=>({id,kind,text,subject_key:'',location_key:'terminal',visibility:'party',
  epistemic:kind==='rumor'?'testimony':kind==='npc_action_attempt'?'attempt':'observation',source_refs:[],receipt_kind:'',receipt_ref:'',...fields});
export function setup(f,{text='Set the scene',privateScene=false,placed=true}={}){
  const pc=f.pcs[0],messageId=`freedom-${f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).length}`,
    scope={mode:privateScene?'private':'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,playable_narration:true,scene_continuity:true,
    narrative_authority:true,narrative_camera:true}});
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Public Terminal',place_type:'parcel office',visibility:'party'});
  if(placed){
    const arrival=indexWorldEvent(f.db,f.guild,{key:`${messageId}:initial`,kind:'arrival',title:'Native fixture initial position',source_id:`player:${pc.owner_user_id}`,
      scene:currentScene(f.db,f.guild).key,session_id:f.session.id,location_key:'terminal',visibility:privateScene?'character':'party',subject_key:privateScene?pc.id:null,
      details:{entity_type:'character',entity_key:pc.id,owner_user_id:pc.owner_user_id}},pc.owner_user_id);
    recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,location_key:'terminal',zone:'interior',source_event:arrival.event_key,
      visibility:arrival.visibility,subject_key:arrival.subject_key,accepted_by:pc.owner_user_id},'fixture-native');
  }else f.db.updateCharacterData(pc.id,d=>{delete d.location;});
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,text,{privateScene});
  return {pc,text,messageId,scope,sourceRef:worldInputKey(messageId,pc.id)};
}
export function candidate(text){
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(k=>[k,{decision:'no_change',reason:'No native consequential change.',confidence:100}]));
  state_review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  const result={respond:true,narration:'UNTRUSTED COMBINED DRAFT',narrative_claims:[],state_review,decision_advisory:null,narrative_interpretation:null,authored_candidates:null,
    player_intents:[{type:'other',source_span:text,target_name:'',target_key:'',destination:'unspecified',operation:'describe_scene',utterance:'',excluded_targets:[],
      framing:'immediate',resolution:'conversational',reason:'Source-owned observation.'}],
    gm_world_parts:[{version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]}]};
  for(const key of ['ordinary_effect_proposals','world_additions','scene_actions','world_conflicts','context_memories','private_messages',
    'events','handouts','relationships','npc_memories','npc_knowledge','npc_goals','canon_proposals','simulation_updates','ai_intents'])result[key]=[];
  return result;
}
export async function run(f,x,answer,r=candidate(x.text),fast=false){
  const ai=new FakeResponses(fast?[answer]:[r,answer]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',maxRecentMessages:2,maxContentChunks:1,playableObservationFastPath:fast}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,messageId:x.messageId,messageText:x.text,scope:x.scope.mode});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:x.scope.mode});
  const mutation=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.db.getActiveSession(f.guild),result,scope:x.scope,speaker:x.pc.name,label:'Narrative freedom fixture',
    meta:{messageId:x.messageId,turnId:attempt.turn_id}});
  return {ai,gm,result,attempt,mutation,rows:f.db.listTurnPublications(f.guild,attempt.turn_id)};
}
const setting=()=>({narrative_units:[unit('setting','scene','Warm lamplight pools on a slate counter. A red notice flutters beside the open public doorway.')],fiction_delta:[]});
test('N01 fresh empty scene retains expressive fiction, not the raw combined draft',()=>nativeFixture(async f=>{
  const x=setup(f),out=await run(f,x,setting()),text=out.rows.map(r=>r.payload).join('\n');
  assert.match(text,/slate counter/);assert.match(text,/red notice/);assert(!/UNTRUSTED|No additional character response/.test(text));
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
  const camera=setup(f,{placed:false}),direct=await run(f,camera,setting(),undefined,true);
  assert.equal(direct.ai.requests.length,1);assert.equal(JSON.parse(direct.ai.requests[0].input).viewpoint.kind,'camera');
  assert.equal(f.db.getCharacter(x.pc.id).data.location,undefined);assert(direct.rows.some(r=>r.payload.includes('slate counter')));
}));
test('N02 native creation establishes new named place and NPC without moving a PC',()=>nativeFixture(async f=>{
  const x=setup(f),answer=setting();answer.fiction_delta=[
    {kind:'location',key:'copper-arcade',name:'Copper Arcade',summary:'An ordinary public arcade.',location_key:'',parent_location_key:'terminal',role:'arcade',aliases:['Copper Walk']},
    {kind:'npc',key:'mara-lane',name:'Mara Lane',summary:'An ordinary night-shift porter.',location_key:'copper-arcade',parent_location_key:'',role:'porter',aliases:['Mara']}];
  answer.narrative_units=[unit('arcade','scene','Copper Arcade lies beyond a brass-framed arch.',{location_key:'copper-arcade'}),
    unit('porter','npc_speech','Late parcels again? Leave the story sealed if you like—what are you looking for?',{subject_key:'mara-lane',location_key:'copper-arcade',epistemic:'testimony'})];
  const out=await run(f,x,answer);assert(out.rows.some(r=>r.payload.includes('Copper Arcade')));
  assert(f.db.getSimulationEntity(f.guild,'location','copper-arcade'));assert(f.db.getNpcProfile(f.guild,'mara-lane'));
  assert.equal(f.db.getCharacter(x.pc.id).data.location,'terminal');assert.equal(out.mutation.world.length,0);
}));
test('N03 observed soft clue and attributed rumor do not establish a hidden cause or canon',()=>nativeFixture(async f=>{
  const x=setup(f),answer={narrative_units:[unit('knocks','lead','Three uneven knocks come from the wall behind the parcel rack.'),
    unit('rumor','rumor','A handwritten note claims the night ferry carries letters without stamps.',{epistemic:'testimony'})],fiction_delta:[]},out=await run(f,x,answer);
  assert(out.rows.some(r=>r.payload.includes('Three uneven knocks')));assert(out.rows.some(r=>r.payload.includes('claims')));
  assert.equal(f.db.listCanon(f.guild,{includeGM:true,limit:500}).length,0);
}));
test('N10 legitimate AI-GM observation is retrieved; private ancestor is excluded',()=>nativeFixture(async f=>{
  const x=setup(f),source=indexWorldEvent(f.db,f.guild,{key:'observed-lamp',kind:'observation',title:'Native visible lamp',source_id:'native:fixture',
    truth_status:'observed',visibility:'party',location_key:'terminal',session_id:f.session.id,scene:currentScene(f.db,f.guild).key,details:{}},'native:fixture');
  f.db.addFact(f.guild,{source:'ai_gm',category:'environment',content:'A green lamp stands on the counter.',visibility:'party',
    provenance:{scene_location:'terminal',epistemic:{kind:'observation',source_refs:[source.event_key],perspective:'native:fixture'}}});
  const hidden=indexWorldEvent(f.db,f.guild,{key:'hidden-lamp-source',kind:'observation',title:'Secret cause',source_id:'native:fixture',visibility:'gm',details:{}},'native:fixture'),
    wrapper=indexWorldEvent(f.db,f.guild,{key:'bad-public-wrapper',kind:'observation',title:'Not audience authority',source_id:'native:fixture',visibility:'party',details:{input_source:hidden.event_key}},'native:fixture');
  f.db.addFact(f.guild,{source:'ai_gm',category:'environment',content:'LAUNDERED_PRIVATE_CAUSE',visibility:'party',
    provenance:{scene_location:'terminal',epistemic:{kind:'observation',source_refs:[wrapper.event_key],perspective:'native:fixture'}}});
  const {buildNarrativeContext}=await import('../src/narrative-authority-context.js'),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
  assert(JSON.stringify(ctx.packet).includes('green lamp'));
  assert(!JSON.stringify(ctx.packet).includes('LAUNDERED_PRIVATE_CAUSE'));
}));
test('N11 PC surname and alias attempts are held without suppressing an independent scene unit',()=>nativeFixture(async f=>{
  const x=setup(f);f.db.updateCharacterData(f.pcs[1].id,d=>{d.aliases=['Calesh','Quietblade'];});
  const answer=setting();answer.narrative_units.push(unit('forced','scene','Quietblade apologizes and surrenders.'));
  const out=await run(f,x,answer),text=out.rows.map(r=>r.payload).join('\n');assert(text.includes('slate counter'));assert(!text.includes('apologizes'));
}));
test('N18 cross-audience reference cannot launder a secret through an invented scene unit',()=>nativeFixture(async f=>{
  const x=setup(f),secret=f.db.addFact(f.guild,{content:'PRIVATE_SYNTHETIC_ORIGIN',visibility:'character',subjectCharacterId:f.pcs[1].id}),answer=setting();
  const hidden=indexWorldEvent(f.db,f.guild,{key:'hidden-porter-origin',kind:'native_narrative_entity',title:'Private NPC',source_id:'native:narrative-authority',
    visibility:'character',subject_key:f.pcs[1].id,details:{}},'native:narrative-authority');
  f.db.upsertNpcProfile(f.guild,{npcKey:'secret-porter',displayName:'SECRET PORTER',role:'PRIVATE ROLE'});
  f.db.setSimulationEntity(f.guild,'npc','secret-porter',{location_key:'terminal',visibility:'party'});
  f.db.saveCityRecord(f.guild,{kind:'autonomous_entity',key:'npc:secret-porter',source_event:hidden.event_key,visibility:'character',subject_key:f.pcs[1].id,data:{}});
  const {buildNarrativeContext}=await import('../src/narrative-authority-context.js');
  assert(!JSON.stringify(buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef).packet).includes('SECRET PORTER'));
  answer.narrative_units.push(unit('secret','scene','PRIVATE_SYNTHETIC_ORIGIN',{source_refs:[secret]}));
  const out=await run(f,x,answer);assert(out.rows.every(r=>!r.payload.includes('PRIVATE_SYNTHETIC_ORIGIN')));assert(out.rows.some(r=>r.payload.includes('slate counter')));
}));
test('N04 one isolated writer preserves essential NPC response alongside scenery instead of starving it',()=>nativeFixture(async f=>{
  const x=setup(f,{text:'I ask the attendant about work.'});
  f.db.upsertNpcProfile(f.guild,{npcKey:'attendant',displayName:'Attendant',role:'night porter',publicIdentity:'PRIVATE_PROFILE_NOT_WRITER_CONTEXT'});
  f.db.setSimulationEntity(f.guild,'npc','attendant',{location_key:'terminal',visibility:'party'});
  const r=candidate(x.text);r.gm_world_parts=[{version:7,kind:'scene_fiction_request',operation:'describe_scene',source_refs:[]},
    {version:3,kind:'npc_fresh_request',entity_key:'attendant',focus:'work',source_refs:[]}];
  const answer=setting();answer.narrative_units.push(unit('reply','npc_speech','Night sorting needs steady hands. What sort of work interests you?',{subject_key:'attendant',epistemic:'testimony'}));
  const out=await run(f,x,answer,r),text=out.rows.map(r=>r.payload).join('\n');assert.match(text,/Night sorting/);assert.match(text,/slate counter/);
  assert.equal(out.ai.requests.length,2);assert(!JSON.stringify(out.ai.requests[1]).includes('PRIVATE_PROFILE_NOT_WRITER_CONTEXT'));
}));
test('N05 material unit is held while two independent fiction units and native state survive',()=>nativeFixture(async f=>{
  const x=setup(f),answer=setting();answer.narrative_units.push(unit('bad','scene','Choso agrees to surrender.'),unit('lead','lead','A delivery ticket protrudes from the public noticeboard.'));
  const out=await run(f,x,answer),text=out.rows.map(r=>r.payload).join('\n');assert(text.includes('slate counter'));assert(text.includes('delivery ticket'));assert(!text.includes('surrender'));
  assert.equal(out.result.narrative_completion.status,'complete');assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);
}));
test('N09 accepted fiction is not disclosed by queued/uncertain delivery; restart/reconciliation never duplicates it',()=>nativeFixture(async f=>{
  const {disclosedNarrativeMemory}=await import('../src/narrative-memory.js'),x=setup(f);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_memory:true}});
  const out=await run(f,x,setting());assert.equal(disclosedNarrativeMemory(f.db,f.guild,x.scope).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'narrative_unit',includeGM:true}).length,1);
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{throw new Error('Synthetic uncertain transport');});
  assert.equal(disclosedNarrativeMemory(f.db,f.guild,x.scope).length,0);f.restart();let calls=0;
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{calls++;return {messageId:'must-not-send',channelId:'offline'};});
  assert.equal(calls,0);assert.equal(f.db.listCityRecords(f.guild,{kind:'narrative_unit',includeGM:true}).length,1);
}));
test('N12 acknowledged fiction survives recall and source revocation holds reuse without undoing native resources',()=>nativeFixture(async f=>{
  const {disclosedNarrativeMemory}=await import('../src/narrative-memory.js'),x=setup(f);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_memory:true}});
  const out=await run(f,x,setting());let sends=0;
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>({messageId:`sent-${++sends}`,channelId:'offline'}));
  assert(disclosedNarrativeMemory(f.db,f.guild,x.scope).some(r=>r.text.includes('slate counter')));
  const follow=setup(f,{text:'What is still here?'}),{buildNarrativeContext}=await import('../src/narrative-authority-context.js');
  assert(buildNarrativeContext(f.db,f.guild,follow.scope,follow.sourceRef).packet.prior_fiction.some(r=>r.text.includes('slate counter')));
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);
  assert.equal(disclosedNarrativeMemory(f.db,f.guild,x.scope).length,0);assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
  const {retrieveMemoryRevisions}=await import('../src/memory-lifecycle.js');
  assert(!retrieveMemoryRevisions(f.db,f.guild,x.scope).some(r=>r.summary.includes('slate counter')),'generic memory sink must follow disclosure ancestry too');
}));

test('N07 assembly camera opens an unplaced split party without fictional co-location and never repeats delivery',()=>nativeFixture(async f=>{
  setup(f,{placed:false});for(const pc of f.pcs)f.db.updateCharacterData(pc.id,d=>{delete d.location;});
  f.db.setAssemblyPlan(f.session.id,{public_opening:'RAW MUST STAY PRIVATE',character_entries:[]});
  const {deliverVerifiedAssembly}=await import('../src/assembly-publications.js'),ai=new FakeResponses(Array(5).fill(setting())),
    gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,config:{gmModel:'offline'}});
  const sent=[];const deliver=async({turnId})=>{const rows=await deliverTurnOutbox(f.db,f.guild,turnId,async row=>{
    sent.push(row.payload);return {messageId:`asm-${sent.length}`,channelId:'offline'};});return {pending:rows.filter(r=>r.status!=='delivered')};};
  await deliverVerifiedAssembly({db:f.db,guild:{id:f.guild},session:f.session,gm,deliver});
  assert(sent.some(t=>t.includes('slate counter')));assert(!sent.some(t=>t.includes('RAW MUST')));
  assert(f.pcs.every(pc=>!f.db.getCharacter(pc.id).data.location));const count=sent.length;
  await deliverVerifiedAssembly({db:f.db,guild:{id:f.guild},session:f.session,gm,deliver});assert.equal(sent.length,count);
}));

test('N08 exact owner initial-position declaration uses native setup once, never travel or a locked-location shortcut',()=>nativeFixture(async f=>{
  const x=setup(f,{placed:false,text:'My initial position is the Public Terminal.'}),r=candidate(x.text);
  r.player_intents[0]={...r.player_intents[0],operation:'initial_position',target_key:'terminal',target_name:'Public Terminal'};
  const out=await run(f,x,setting(),r);assert.equal(f.db.getCharacter(x.pc.id).data.location,'terminal');
  const arrivals=f.db.listWorldEvents(f.guild,{includeGM:true,limit:500}).filter(e=>e.kind==='arrival');
  assert.equal(arrivals.length,1);assert.equal(arrivals[0].details.initial_setup,true);assert.equal(arrivals[0].details.not_travel,true);
  assert(out.rows.some(row=>row.payload.includes('slate counter')));assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
  const {applyAuthoredInitialPosition}=await import('../src/scene-setup.js');
  const accepted=f.db.listCityRecords(f.guild,{kind:'typed_intent',includeGM:true}).find(i=>i.data.operation==='initial_position');
  applyAuthoredInitialPosition(f.db,f.guild,accepted,x.scope);assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:500}).filter(e=>e.kind==='arrival').length,1);
}));

test('N08 initial setup cannot bypass protected access or previous position history',()=>nativeFixture(async f=>{
  const x=setup(f,{placed:false,text:'My initial position is the Public Terminal.'});
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Public Terminal',visibility:'party',locked:true});
  const {prepareSceneSetup}=await import('../src/scene-setup.js');assert.equal(prepareSceneSetup(f.db,f.guild,x.pc.owner_user_id,x.pc.id),null);
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Public Terminal',visibility:'party'});
  setup(f,{placed:true});f.db.updateCharacterData(x.pc.id,d=>{delete d.location;});assert.equal(prepareSceneSetup(f.db,f.guild,x.pc.owner_user_id,x.pc.id),null);
}));

test('N06 protected duel retains evocative NPC refusal and scenery while withholding a PC response',()=>nativeFixture(async f=>{
  const x=setup(f,{text:'I ask the attendant to comment on the contest.'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_encounters:true}});
  const {pvpTerms}=await import('./v9-fixtures.mjs'),{proposePvp,reviewPvp,respondPvp}=await import('../src/narrative-pvp.js');
  let p=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});
  for(let i=0;i<2;i++){reviewPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);p=respondPvp(f.db,f.guild,f.pcs[i].owner_user_id,
    {proposal:p.record_key,expected_revision:p.data.terms_hash,decision:'accept',interaction_id:`freedom-approve-${i}`});}
  f.db.upsertNpcProfile(f.guild,{npcKey:'attendant',displayName:'Attendant',role:'porter'});
  f.db.setSimulationEntity(f.guild,'npc','attendant',{location_key:'terminal',visibility:'party'});
  const answer=setting();answer.narrative_units.push(unit('refusal','npc_speech','No bets on neighbors. I have a midnight freight queue to mind.',{subject_key:'attendant',epistemic:'testimony'}),
    unit('agency','npc_action_attempt','Choso apologizes for losing.',{subject_key:'attendant',epistemic:'attempt'}));
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),out=await run(f,x,answer);
  assert(out.rows.some(row=>row.payload.includes('No bets on neighbors')));assert(out.rows.some(row=>row.payload.includes('slate counter')));
  assert(out.rows.every(row=>!row.payload.includes('Choso apologizes')));assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));

test('N06 native result is exposed to the isolated writer but invented outcome prose never replaces the receipt',()=>nativeFixture(async f=>{
  const x=setup(f,{privateScene:true}),{prepareRollRequest,rollRevision}=await import('../src/roll-requests.js'),{contributeRoll}=await import('../src/roll-collaboration.js');
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,roll_requests:true,roll_collaboration:true}});
  const a=f.accepted(0,'I inspect the parcel.',null,{type:'search',operation:'inspect',target:{kind:'object',key:'terminal',phrase:'terminal',grounding:'known'}});
  const {adjudicateRollSource}=await import('../src/roll-collaboration.js');
  f.db.upsertRulesRuling(f.guild,{key:'narrative-reaction',createdBy:'gm',ruling:'Native fixture reaction Difficulty 10.'});
  const difficulty=adjudicateRollSource(f.db,f.guild,{key:'narrative-reaction-difficulty',character_id:x.pc.id,kind:'difficulty',
    ruling_key:'narrative-reaction',data:{declaration:a.source_event,value:10}},'gm').event_key;
  const q=prepareRollRequest(f.db,f.guild,{source_event:a.source_event,accepted_intent:a.record_key,character_id:x.pc.id,
    trait:'Knowledge',kind:'reaction',modifier_keys:[],difficulty_source:difficulty,attack_source:'',adjudication:'Native fixture reaction.'},'gm',{scope:x.scope});
  let n=0;const saved=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:'native-fiction-roll'}, {rng:()=>[9,3][n++]});
  assert.equal(saved.status,'resolved');
  const {nativeOutcomeProjection}=await import('../src/native-outcome-output.js');
  assert(nativeOutcomeProjection(f.db,f.guild,{version:4,kind:'native_outcome',receipt_kind:'roll_request',ref:saved.record_key},x.scope).text);
  const r=candidate(x.text);r.gm_world_parts.push({version:4,kind:'native_outcome',receipt_kind:'roll_request',ref:saved.record_key});
  const answer=setting();answer.narrative_units.push(unit('result','native_outcome_render','Choso is injured and surrenders.',
    {receipt_kind:'roll_request',receipt_ref:saved.record_key,epistemic:'native_outcome'}));
  answer.narrative_units.forEach(u=>{u.visibility='character';});
  const out=await run(f,x,answer,r),packet=JSON.parse(out.ai.requests[1].input);
  assert(packet.native_results.some(receipt=>receipt.ref===saved.record_key));
  assert(out.rows.some(row=>row.payload.includes('slate counter')));assert(out.rows.every(row=>!row.payload.includes('surrenders')));
}));

test('N06 a new human proxy revokes queued delegated NPC speech without reversing established native state',()=>nativeFixture(async f=>{
  const x=setup(f);f.db.upsertNpcProfile(f.guild,{npcKey:'porter',displayName:'Porter',role:'porter'});
  f.db.setSimulationEntity(f.guild,'npc','porter',{location_key:'terminal',visibility:'party'});
  const answer={fiction_delta:[],narrative_units:[unit('warning','npc_speech','I will not open the freight cage. Ask at the public desk.',{subject_key:'porter',epistemic:'testimony'})]};
  const out=await run(f,x,answer),proxy=f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'porter',userId:f.pcs[3].owner_user_id});
  f.db.activateNpcProxy(proxy.id,f.pcs[3].owner_user_id);let calls=0;
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{calls++;return {messageId:'unsafe',channelId:'offline'};});
  assert.equal(calls,0);assert.equal(f.db.getCharacter(x.pc.id).data.location,'terminal');
}));
test('N20 native substantive and missing-response metrics contain counts, never scene or private prose',()=>nativeFixture(async f=>{
  const x=setup(f),{operationalMetrics}=await import('../src/operational-metrics.js');
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_completeness:true}});
  const before=operationalMetrics.snapshot(f.guild).stages.narrative_completed?.count||0;
  await run(f,x,setting());assert.equal(operationalMetrics.snapshot(f.guild).stages.narrative_completed.count,before+1);
  const next=setup(f,{text:'Describe another part.'}),answer={fiction_delta:[],narrative_units:[unit('bad','scene','Choso surrenders.')]};
  const out=await run(f,next,answer);assert.equal(out.result.narrative_completion.status,'held_irrecoverable');
  const metrics=operationalMetrics.snapshot(f.guild);assert(metrics.stages.narrative_missing.count>=1);
  assert(!JSON.stringify(metrics).includes('slate counter'));assert(!JSON.stringify(metrics).includes('Choso'));
}));
