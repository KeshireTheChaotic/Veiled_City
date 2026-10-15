/** 10.2 regressions: temporary native fixtures and synthetic responses, never provider traffic. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {FakeResponses,fakeInteraction} from './contract-fixtures.mjs';
import {setup,candidate,unit,run} from './narrative-fixtures.mjs';
import {INTENT_PAYLOADS,intentOperations} from '../src/ai-intent-contracts.js';
import {configureDelegation,delegationPolicy,delegationOperation} from '../src/ai-intents.js';
import {delegationCatalog} from '../src/delegation-catalog.js';
import {handleStoryCommand} from '../src/story-commands.js';
import {coordinateNarrative,narrativeModel} from '../src/narrative-delegation.js';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {configurePortrayal} from '../src/portrayal.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene} from '../src/scene-continuity.js';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
export const allOperations=()=>[...new Set(Object.keys(INTENT_PAYLOADS).flatMap(f=>intentOperations(f).map(op=>`${f}.${op}`)))].sort();
export async function qualityTurn(f,{omit=false,fast=false,text='Describe the scene',answer=null,config={},mutate=null}={}){
  const x=setup(f,{text}),r=candidate(text);if(omit)r.gm_world_parts=[];if(mutate)mutate(r);
  const ai=new FakeResponses(fast?[answer]:[r,answer]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline-main',routineGmModel:'offline-routine',maxRecentMessages:2,maxContentChunks:1,playableObservationFastPath:fast,...config}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,messageId:x.messageId,messageText:text,scope:x.scope.mode});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:x.scope.mode});
  commitGmTurn({db:f.db,content:gm.content,guild:{id:f.guild},session:f.db.getActiveSession(f.guild),result,scope:x.scope,speaker:x.pc.name,
    label:'Quality fixture',meta:{messageId:x.messageId,turnId:attempt.turn_id}});
  return {x,ai,result,rows:f.db.listTurnPublications(f.guild,attempt.turn_id)};
}
const scene=()=>({narrative_units:[unit('scene','scene','Amber light falls across a brass parcel counter.')],fiction_delta:[]});
test('DQ01 all registered permissions exceed forty and persist',()=>nativeFixture(f=>{
  const allow=allOperations();assert.equal(allow.length,41);
  configureDelegation(f.db,f.guild,{mode:'manual',allow,private_allow:[],max_operations:1,max_cost:0,expires_minute:null},'gm');
  assert.deepEqual(delegationPolicy(f.db,f.guild).allow,allow);f.restart();assert.deepEqual(delegationPolicy(f.db,f.guild).allow,allow);
}));
test('DP01 registry growth and private eligibility have no numeric grant cap',()=>nativeFixture(f=>{
  const operations=INTENT_PAYLOADS.density.properties.op.enum;operations.push('future_inspect');
  try{
    const allow=allOperations();assert.equal(allow.length,42);
    configureDelegation(f.db,f.guild,{mode:'manual',allow,private_allow:delegationCatalog().private_eligible,max_operations:4,max_cost:20,expires_minute:null},'gm');
    assert.equal(delegationPolicy(f.db,f.guild).allow.length,42);
    for(const private_allow of [['density.future_inspect'],['scene.unknown']])assert.throws(()=>configureDelegation(f.db,f.guild,
      {mode:'manual',allow,private_allow,max_operations:1,max_cost:0,expires_minute:null},'gm'),/Private world/);
    assert.throws(()=>configureDelegation(f.db,f.guild,{mode:'manual',allow:[],private_allow:['scene.record'],max_operations:1,max_cost:0,expires_minute:null},'gm'));
  }finally{operations.pop();}
}));
test('DP02 CAS patches preserve governance and fail atomically',()=>nativeFixture(f=>{
  const patch=value=>delegationOperation(f.db,f.guild,{op:'patch',...value},'gm');
  patch({expected_revision:0,allow_add:['scene.record'],private_allow_add:['scene.record']});
  const before=delegationPolicy(f.db,f.guild);assert.equal(before.mode,'manual');assert.equal(before.max_operations,1);assert.equal(before.max_cost,0);assert.equal(before.expires_minute,null);
  assert.equal(patch({expected_revision:1}).unchanged,true);assert.equal(delegationPolicy(f.db,f.guild).revision,1);
  for(const bad of [{expected_revision:0,allow_add:['density.inspect']},{expected_revision:1,allow_add:['bad.operation']},
    {expected_revision:1,allow_add:['scene.enter','scene.enter']},{expected_revision:1,allow_add:['density.inspect'],max_cost:21},
    {expected_revision:1,mode:'routine_delegated'},{expected_revision:1,private_allow_add:['roll.prepare']},
    {expected_revision:1,allow_add:'scene.enter'},{expected_revision:1,extra:true},{expected_revision:1,private_allow_add:['scene.enter']}]){
    assert.throws(()=>patch(bad));assert.deepEqual(delegationPolicy(f.db,f.guild),before);
  }
  const removed=patch({expected_revision:1,allow_remove:['scene.record']});assert.equal(removed.policy.revision,2);assert.deepEqual(removed.policy.private_allow,[]);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:500}).filter(e=>e.event_key.startsWith('ai-policy:')).length,2);
  assert.throws(()=>configureDelegation(f.db,f.guild,{mode:'manual',allow:[],max_operations:5,max_cost:0,expires_minute:null},'gm'));
  assert.notEqual(f.db.getCityCalendar(f.guild).flags.scene_continuity,true);
}));
test('DP03 existing JSON command catalog/status/patch remain GM-private, unauthorized rejected',()=>nativeFixture(async f=>{
  const interaction=(json,gm=true)=>({...fakeInteraction({gm,sub:'delegation',json}),guildId:f.guild});
  const no=interaction({op:'patch',expected_revision:0,allow_add:['scene.enter']},false);
  await assert.rejects(handleStoryCommand(no,{db:f.db,gm:{}}),/permission/);assert.equal(delegationPolicy(f.db,f.guild).revision,0);
  for(const input of [{op:'catalog'},{op:'status'},{op:'patch',expected_revision:0,allow_add:allOperations()}]){
    const i=interaction(input);await handleStoryCommand(i,{db:f.db,gm:{}});
    assert.equal(i.deliveries.length,1);assert.equal(i.deliveries[0].ephemeral,true);assert.equal(i.deliveries[0].files.length,1);
    const json=JSON.parse(i.deliveries[0].files[0].attachment.toString());assert(json.total===41||json.count===0||json.count===41);
  }
  assert.equal(delegationPolicy(f.db,f.guild).allow.length,41);
}));
test('DQ02 omitted v8 still produces one isolated creative response',()=>nativeFixture(async f=>{
  const out=await qualityTurn(f,{omit:true,answer:scene()});
  assert.equal(out.ai.requests.length,2);assert(out.rows.some(r=>r.payload.includes('brass parcel counter')));
}));
test('DQ03 configured narrative model independent of routine planner',()=>nativeFixture(async f=>{
  const out=await qualityTurn(f,{answer:scene(),config:{narrativeModel:'offline-writer'}});
  assert.equal(out.ai.requests[0].model,'offline-routine');assert.equal(out.ai.requests[1].model,'offline-writer');
}));
test('DN01 direct observation writer model and bounded routing contrasts',()=>nativeFixture(async f=>{
  const out=await qualityTurn(f,{fast:true,answer:scene(),config:{narrativeModel:'offline-writer'}});
  assert.equal(out.ai.requests.length,1);assert.equal(out.ai.requests[0].model,'offline-writer');
  const assemblyAi=new FakeResponses([scene()]),assemblyGm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai:assemblyAi,
    config:{gmModel:'offline-main',routineGmModel:'offline-routine'}});
  await assemblyGm.authorAssemblyScene(f.guild,f.session.id,{mode:'party',actorUserId:null,actorCharacterId:null});
  assert.equal(assemblyAi.requests.length,1);assert.equal(assemblyAi.requests[0].model,'offline-main');
  assert.equal(narrativeModel({gmModel:'main',narrativeModel:'writer',narrativeFastModel:'fast'},{protected_scene:false},'observation'),'fast');
  assert.equal(narrativeModel({gmModel:'main',narrativeModel:'writer',narrativeFastModel:'fast'},{protected_scene:true},'observation'),'writer');
  const x=setup(f,{text:'OOC how do I configure the bot?'}),r=candidate(x.text);
  coordinateNarrative(f.db,f.guild,r,{scope:x.scope,sourceRef:x.sourceRef});assert(!r.gm_world_parts.some(p=>p.version===8));
  const quiet=candidate(x.text);quiet.respond=false;quiet.gm_world_parts=[];
  coordinateNarrative(f.db,f.guild,quiet,{scope:x.scope,sourceRef:x.sourceRef});assert.deepEqual(quiet.gm_world_parts,[]);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_authority:false}});
  const legacy={respond:true,gm_world_parts:[{version:7,kind:'scene_fiction_request',operation:'describe_scene',source_refs:[]}]};
  coordinateNarrative(f.db,f.guild,legacy,{scope:x.scope,sourceRef:x.sourceRef});assert.equal(legacy.gm_world_parts[0].version,7);
}));
test('DQ04 native known surname NPC vocative is allowed without PC agency',()=>nativeFixture(async f=>{
  f.db.updateCharacterData(f.pcs[0].id,d=>{d.aliases=['Raven'];});
  f.db.upsertNpcProfile(f.guild,{npcKey:'attendant',displayName:'Attendant',role:'porter'});
  f.db.setSimulationEntity(f.guild,'npc','attendant',{location_key:'terminal',visibility:'party'});
  // Name entitlement is supplied by an actual recorded native listener source below, not a writer label.
  const x=setup(f,{text:'I tell the attendant to call me Raven.'});
  f.db.upsertNpcKnowledge(f.guild,{npcKey:'attendant',knowledgeKey:`character-name:${x.pc.id}`,content:'Raven',
    beliefState:'known',sourceType:'observed',sourceRef:x.sourceRef,isSecret:false});
  const answer=scene();answer.narrative_units.push(unit('address','npc_speech','Mr. Raven, the evening parcels are delayed.',{subject_key:'attendant',epistemic:'testimony'}),
    unit('forced','npc_speech','Mr. Raven, you agreed to surrender.',{subject_key:'attendant',epistemic:'testimony'}),
    unit('third','npc_speech','Mr. Raven, Choso apologizes for losing.',{subject_key:'attendant',epistemic:'testimony'}));
  const out=await qualityTurn(f,{answer});assert(out.rows.some(r=>r.payload.includes('Mr. Raven')));
  assert(out.rows.every(r=>!r.payload.includes('surrender')&&!r.payload.includes('apologizes')));
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);
  let sends=0;await deliverTurnOutbox(f.db,f.guild,out.rows[0].turn_id,async()=>{sends++;return {messageId:'offline',channelId:'offline'};});
  assert.equal(sends,0);
}));
test('NS01 differentiated public portrayal and native own knowledge exclude secrets/proxies',()=>nativeFixture(f=>{
  const x=setup(f);
  for(const [npc,tone] of [['porter','terse'],['clerk','warm']]){
    f.db.upsertNpcProfile(f.guild,{npcKey:npc,displayName:npc,role:'desk staff',portrayal:'PRIVATE_DOSSIER'});
    f.db.setSimulationEntity(f.guild,'npc',npc,{location_key:'terminal',visibility:'party'});
    configurePortrayal(f.db,f.guild,{npc,source_event:x.sourceRef,direction:{emotional_tone:tone},public_voice_approved:true},'gm');
    f.db.upsertNpcKnowledge(f.guild,{npcKey:npc,knowledgeKey:'seen',content:`${npc} saw a parcel`,sourceRef:x.sourceRef,isSecret:false});
    f.db.upsertNpcKnowledge(f.guild,{npcKey:npc,knowledgeKey:'secret',content:'PRIVATE_SECRET',sourceRef:x.sourceRef,isSecret:true});
  }
  const packet=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef).packet;
  assert.equal(packet.npcs.find(n=>n.key==='porter').speaker_brief.direction.emotional_tone,'terse');
  assert.equal(packet.npcs.find(n=>n.key==='clerk').speaker_brief.direction.emotional_tone,'warm');
  assert(JSON.stringify(packet).includes('porter saw a parcel'));assert(!JSON.stringify(packet).includes('PRIVATE_'));
  const proxy=f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'porter',userId:f.pcs[3].owner_user_id});f.db.activateNpcProxy(proxy.id,f.pcs[3].owner_user_id);
  assert(!buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef).packet.npcs.find(n=>n.key==='porter').speaker_brief);
}));
test('ND01 Director one-call multi-beat brief is native-grounded and excludes trigger planning',()=>nativeFixture(async f=>{
  const x=setup(f);f.db.upsertNpcProfile(f.guild,{npcKey:'porter',displayName:'Porter',role:'porter'});
  f.db.setSimulationEntity(f.guild,'npc','porter',{location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:'director-visible-change',kind:'observation',title:'Native public observation',source_id:'native:fixture',
    visibility:'party',scene:currentScene(f.db,f.guild).key,session_id:f.session.id,location_key:'terminal',truth_status:'observed',details:{description:'A service bell sounds.'}},'native:fixture');
  const draft={...candidate(x.text),act:true,public_narration:'PRIVATE_TRIGGER_SECRET',confidence:100,gm_notes:'PRIVATE_TRIGGER_SECRET'};
  draft.player_intents=[];draft.gm_world_parts=[{version:8,kind:'narrative_request',operation:'conversation',source_refs:[]},
    {version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]}];
  const answer=scene();answer.narrative_units.push(unit('refusal','npc_speech','The freight cage stays shut tonight. The public desk may help.',{subject_key:'porter',epistemic:'testimony'}),
    unit('attempt','npc_action_attempt','The porter raises a hand toward the service bell.',{subject_key:'porter',epistemic:'attempt'}));
  const ai=new FakeResponses([draft,answer]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,config:{gmModel:'offline',narrativeModel:'offline-writer'}});
  const result=await gm.runWorldDirector({guildId:f.guild,layer:'manual',trigger:{requested_by:'gm',notes:'PRIVATE_TRIGGER_SECRET'}});
  assert.equal(ai.requests.length,2);const packet=JSON.parse(ai.requests[1].input);
  assert(packet.director_brief.events.some(e=>e.ref===source.event_key&&e.state==='established'&&e.observation==='A service bell sounds.'));
  assert(packet.creative_brief.tasks.includes('conversation')&&packet.creative_brief.tasks.includes('scene'));
  assert(!JSON.stringify(packet).includes('PRIVATE_TRIGGER_SECRET'));
  const {applyAuthoritativeMutation}=await import('../src/state.js'),{queueDirectorPublications}=await import('../src/publication-outbox.js'),scope={mode:'party',actorUserId:null,actorCharacterId:null};
  applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,narrative:result,scope,source:'world_director_manual'});
  const turn=queueDirectorPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope,key:'quality-director'}),rows=f.db.listTurnPublications(f.guild,turn);
  assert(rows.some(r=>r.payload.includes('freight cage')));assert(rows.some(r=>r.payload.includes('raises a hand')));assert(rows.every(r=>!r.payload.includes('PRIVATE_TRIGGER_SECRET')));
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,source.event_key);
  let sends=0;await deliverTurnOutbox(f.db,f.guild,turn,async()=>{sends++;return {messageId:'unsafe',channelId:'offline'};});assert.equal(sends,0);
}));
test('ND02 proposed Director work stays unresolved, private references excluded, quiet pass has no writer',()=>nativeFixture(async f=>{
  const x=setup(f),hidden=indexWorldEvent(f.db,f.guild,{key:'hidden-director',kind:'observation',title:'Private change',source_id:'native:fixture',
    visibility:'character',subject_key:f.pcs[1].id,scene:currentScene(f.db,f.guild).key,session_id:f.session.id,truth_status:'observed',
    details:{description:'PRIVATE_UNSEEN_CHANGE'}},'native:fixture');
  const {bindDirectorNarrativeSource,directorBriefForAudience}=await import('../src/narrative-director-source.js');
  const scope={mode:'party',actorUserId:null,actorCharacterId:null},r={act:true,events:[{type:'resource_delta',note:'UNTRUSTED_COMPLETED_DAMAGE'}]};
  const ref=bindDirectorNarrativeSource(f.db,f.guild,r,scope,'manual',{event_refs:[hidden.event_key]},null),brief=directorBriefForAudience(f.db,f.guild,f.db.getWorldEvent(f.guild,ref),scope);
  assert(brief.events.every(e=>e.ref!==hidden.event_key));assert(brief.pending.every(p=>p.state==='proposed_requires_native_validation'));
  assert(!JSON.stringify(brief).includes('UNTRUSTED')&&!JSON.stringify(brief).includes('PRIVATE_UNSEEN_CHANGE'));
  const draft={...candidate(x.text),act:false,public_narration:'',confidence:100,gm_notes:''};draft.player_intents=[];
  const ai=new FakeResponses([draft]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,config:{gmModel:'offline'}});
  await gm.runWorldDirector({guildId:f.guild,layer:'manual',trigger:{requested_by:'gm'}});assert.equal(ai.requests.length,1);
}));
test('NH01 investigation coverage flags missing answer, accepts source-bound clue and counts held siblings',()=>nativeFixture(async f=>{
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_completeness:true}});
  const mutate=r=>{r.player_intents[0].operation='investigate';};
  const missing=await qualityTurn(f,{text:'What stands out on the counter?',answer:scene(),mutate});
  assert.equal(missing.result.narrative_completion.status,'investigation_response_missing');
  const answer=scene();answer.narrative_units.push(unit('clue','lead','A second postmark peeks out beneath the delivery label.'),unit('blocked','scene','Choso surrenders.'));
  const good=await qualityTurn(f,{text:'What stands out on the parcel label?',answer,mutate});
  assert.equal(good.result.narrative_completion.status,'complete');assert.equal(good.result.narrative_completion.held_parts,1);
  assert(good.result.narrative_completion.diagnostics.includes('validated_siblings_salvaged'));
  assert(good.rows.some(r=>r.payload.includes('postmark')));assert(good.rows.every(r=>!r.payload.includes('surrenders')));
  assert.equal(good.ai.requests.length,2);
}));
test('NH02 native combat atmosphere and camera diagnostics preserve independent fiction',()=>nativeFixture(async f=>{
  const encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,base_bp:14,budget_bp:14,composition:[]});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_encounters:true,narrative_completeness:true}});
  const out=await qualityTurn(f,{answer:scene(),mutate:r=>{r.gm_world_parts[0].operation='combat';}});
  assert.equal(out.result.narrative_completion.status,'complete');assert(out.rows.some(r=>r.payload.includes('brass parcel counter')));
  assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hp.current,0);f.db.setEncounterStatus(encounter.id,'ended');
  const x=setup(f,{placed:false}),answer=scene();answer.narrative_units.push(unit('bad-pov','scene','You see the red notice.'));
  const camera=await run(f,x,answer);assert(camera.result.narrative_completion.diagnostics.includes('camera_misframed'));
  assert(camera.rows.some(r=>r.payload.includes('brass parcel counter')));assert(camera.rows.every(r=>!r.payload.includes('You see')));
}));
test('DN02 coordinator retains four native proof proposals and its single creative task',()=>nativeFixture(async f=>{
  const x=setup(f,{text:'Describe the scene'}),r=candidate(x.text),proofs=Array.from({length:4},(_,i)=>
    ({version:4,kind:'native_outcome',receipt_kind:'roll_request',ref:`unverified-${i}`}));
  r.gm_world_parts=structuredClone(proofs);coordinateNarrative(f.db,f.guild,r,{scope:x.scope,sourceRef:x.sourceRef});
  assert.deepEqual(r.gm_world_parts.filter(p=>p.version===4),proofs);assert.equal(r.gm_world_parts.filter(p=>p.version===8).length,1);
  const out=await qualityTurn(f,{answer:scene(),mutate:r=>{r.gm_world_parts=structuredClone(proofs);}});
  assert.equal(out.ai.requests.length,2);assert(out.rows.some(row=>row.payload.includes('brass parcel counter')));
  assert(out.rows.every(row=>!row.payload.includes('unverified-')),'Preserving a proposal never fabricates its missing native receipt.');
}));
