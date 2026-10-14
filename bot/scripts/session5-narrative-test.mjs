/** NAR01-04: synthetic disclosure isolation and authentic scene/situation requests, never production text. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {FakeResponses} from './contract-fixtures.mjs';
import {ContentIndex} from '../src/content.js';
import {GMService} from '../src/gm.js';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {captureWorldInput} from '../src/autonomous-world.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {validateCandidateClaims} from '../src/narrative-integrity.js';
import {prepareAuthorizedTurnOutput,candidateNarrative,certifiedSessionRecap} from '../src/pvp-output.js';
import {recordCharacterArrival} from '../src/scene-continuity.js';
import {assemblyReadiness} from '../src/assembly-readiness.js';
import {deliverAssemblyParts} from '../src/assembly-delivery.js';

export function response(f,text,operation='describe_scene'){
  const review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(k=>[k,{decision:'no_change',reason:'No change.',confidence:100}]));
  review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  return {respond:true,narration:'Unverified generated candidate',narrative_claims:[],gm_world_parts:[],
    player_intents:[{type:'other',source_span:text,target_name:'',target_key:'',destination:'unspecified',operation,
      utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Owner asks for description.'}],
    narrative_interpretation:null,world_additions:[],scene_actions:[],world_conflicts:[],context_memories:[],authored_candidates:null,
    private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],npc_knowledge:[],npc_goals:[],
    canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,state_review:review};
}
function setup(f,mode='party',text='Set the scene'){
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scoped_disclosure_recovery:true,scene_descriptions:true,post_projection_answers:true}});
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Twenty-Four Spin',visibility:'party'});
  const pc=f.pcs[0],scope={mode,actorUserId:pc.owner_user_id,actorCharacterId:pc.id},messageId=`scene-${mode}-${text}`;
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,text,{privateScene:mode==='private'});
  return {pc,scope,messageId,text};
}
const windowEvidence={scene_location:'terminal',scene_observation:{version:1,subject:'window',quality:'rain-streaked',relation:'overlooks',target:'the alley'}};
function disclosure(f,result,visibility='gm',proposed='PRIVATE_FACT'){
  const id=f.db.addFact(f.guild,{category:'fact',content:'PRIVATE_FACT',visibility});result.narration='A hidden detail is asserted.';
  result.narrative_claims=[{actor:'',entity_type:'world',entity:'terminal',action:'disclosure',prior:'',proposed,
    source_ref:id,mutation_index:-1,visibility:'party',certainty:'committed',authored_source_span:'',output_claim_span:result.narration}];
  return id;
}
for(const mode of ['party','private'])test(`NAR02 ${mode}: held independent disclosure does not trigger provider replacement or leak`,()=>nativeFixture(async f=>{
  const x=setup(f,mode,'I wait.'),r=response(f,x.text,'wait'),fact=disclosure(f,r);
  r.gm_world_parts=[{version:1,kind:'scene_atmosphere',entity_key:'terminal',acts:['quiet_pause'],tone:'plain'}];
  const ai=new FakeResponses([r,r,r]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',maxRecentMessages:5,maxContentChunks:1,contextInputBudget:100000}});
  const output=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,
    actorAssignment:f.db.controlledAssignment(f.session.id,x.pc.owner_user_id),messageText:x.text,messageId:x.messageId,scope:mode});
  assert.equal(ai.requests.length,1);const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:mode});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:output,scope:x.scope,speaker:x.pc.name,label:'held disclosure',meta:{messageId:x.messageId,turnId:attempt.turn_id}});
  const rows=f.db.listTurnPublications(f.guild,attempt.turn_id);assert(rows.length);assert(rows.every(r=>!r.payload.includes('PRIVATE_FACT')&&!r.payload.includes('hidden detail')));
  assert.equal(f.db.getFact(f.guild,fact).visibility,'gm');assert.equal(f.db.listCityRecords(f.guild,{kind:'candidate_claim_review',includeGM:true})[0].data.diagnostics[0].reason_code,'audience_denied');
  f.restart();let count=0;const send=async()=>({messageId:`message-${++count}`,channelId:'synthetic'});
  await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,send);await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,send);assert.equal(count,rows.length);
}));
test('NAR02 direct/unprepared validation, staged dependency and sibling PC damage remain fatal',()=>nativeFixture(f=>{
  const x=setup(f),r=response(f,x.text);disclosure(f,r);
  assert.throws(()=>validateCandidateClaims(f.db,f.guild,r,x.scope,[]),/scoped_disclosure/);
  r.events=[{type:'fact',key:'dependent',value:'PRIVATE_FACT'}];
  const prepared=prepareAuthorizedTurnOutput(f.db,f.guild,r,x.scope);
  assert.throws(()=>validateCandidateClaims(f.db,f.guild,candidateNarrative(prepared),x.scope,[],{output:prepared}),/scoped_disclosure/);
}));
test('NAR02 complete original sibling claims cannot be laundered by dropping one disclosure',()=>nativeFixture(f=>{
  const x=setup(f),r=response(f,x.text);disclosure(f,r);r.narration+=' You are dead.';
  r.narrative_claims.push({...r.narrative_claims[0],entity_type:'character',entity:x.pc.id,action:'status',proposed:'dead',output_claim_span:'You are dead.'});
  const output=prepareAuthorizedTurnOutput(f.db,f.guild,r,x.scope);
  assert.throws(()=>validateCandidateClaims(f.db,f.guild,candidateNarrative(output),x.scope,[],{output}));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'candidate_claim_review',includeGM:true}).length,0);
}));
for(const mode of ['party','private'])for(const text of ['Set the scene','What is my current situation?'])test(`NAR03/04 ${mode} ${text}: actual GM path answers after projection`,()=>nativeFixture(async f=>{
  const x=setup(f,mode,text),r=response(f,text,text.startsWith('What')?'current_situation':'describe_scene');
  const secret=f.db.addFact(f.guild,{category:'environment',content:'PRIVATE_MARKER_SECRET',visibility:'character',subjectCharacterId:f.pcs[1].id,provenance:{scene_location:'terminal'}});
  const visible=f.db.addFact(f.guild,{category:'environment',content:'A rain-streaked window overlooks the alley.',visibility:'party',provenance:windowEvidence});
  const ai=new FakeResponses([r,r,r]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',maxRecentMessages:5,maxContentChunks:1,contextInputBudget:100000}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,
    actorAssignment:f.db.controlledAssignment(f.session.id,x.pc.owner_user_id),messageText:text,messageId:x.messageId,scope:mode});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:mode});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:x.pc.name,label:'source scene',meta:{messageId:x.messageId,turnId:attempt.turn_id}});
  const rows=f.db.listTurnPublications(f.guild,attempt.turn_id);assert(rows.some(r=>/saved location|viewpoint|rain-streaked|current location/i.test(r.payload)));
  assert(rows.every(r=>!r.payload.includes('PRIVATE_MARKER_SECRET')&&!r.payload.includes('No additional character response')));
  assert.equal(ai.requests.length,1);assert.equal(f.db.getFact(f.guild,secret).visibility,'character');assert(f.db.getFact(f.guild,visible));
}));

for(const mode of ['party','private'])test(`NAR03 ${mode}: source-backed grammar survives restart but not evidence revocation`,()=>nativeFixture(async f=>{
  const x=setup(f,mode);f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scene_continuity:true}});
  for(const pc of f.pcs)recordCharacterArrival(f.db,f.guild,pc,pc.owner_user_id,`arrival-${pc.id}`);
  const fact=f.db.addFact(f.guild,{category:'environment',content:'A rain-streaked window overlooks the alley.',visibility:'party',provenance:windowEvidence});
  const secret=f.db.addFact(f.guild,{category:'environment',content:'PRIVATE_MARKER_SECRET',visibility:'character',subjectCharacterId:f.pcs[1].id,provenance:{scene_location:'terminal'}});
  const r=response(f,x.text);r.gm_world_parts=[{version:5,kind:'scene_description',fact_refs:[fact],atmosphere:[{subject:'light',verb:'lingers',manner:'softly'}]}];
  const ai=new FakeResponses([r]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,config:{gmModel:'offline',contextInputBudget:100000}});
  const output=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,actorAssignment:f.db.controlledAssignment(f.session.id,x.pc.owner_user_id),messageText:x.text,messageId:x.messageId,scope:mode});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:mode});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:output,scope:x.scope,speaker:x.pc.name,label:'grammar',meta:{messageId:x.messageId,turnId:attempt.turn_id}});
  const rows=f.db.listTurnPublications(f.guild,attempt.turn_id);assert(rows.some(row=>row.payload.includes('rain-streaked')&&row.payload.includes('Light lingers softly.')));
  assert(rows.every(row=>!row.payload.includes('PRIVATE_MARKER_SECRET')));f.restart();let sent=0;
  await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,async()=>({messageId:`m${++sent}`,channelId:'offline'}));assert.equal(sent,rows.length);
  if(mode==='party')assert.match(certifiedSessionRecap(f.db,f.guild,f.session.id),/rain-streaked/);
  // A second distinct request is queued but evidence changes before send: fail closed, no native replay.
  const x2=setup(f,mode,'What is my current situation?'),r2=response(f,x2.text,'current_situation');r2.gm_world_parts=r.gm_world_parts;
  const out2=await new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai:new FakeResponses([r2]),config:{gmModel:'offline',contextInputBudget:100000}}).runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,actorAssignment:f.db.controlledAssignment(f.session.id,x.pc.owner_user_id),messageText:x2.text,messageId:x2.messageId,scope:mode});
  const a2=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x2.messageId,actorPrincipal:x.pc.owner_user_id,audience:mode});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:out2,scope:x.scope,speaker:x.pc.name,label:'revoked grammar',meta:{messageId:x2.messageId,turnId:a2.turn_id}});
  f.db.updateFactProvenance(f.guild,fact,{scene_location:'elsewhere'});f.restart();
  const failed=await deliverTurnOutbox(f.db,f.guild,a2.turn_id,async()=>{throw new Error('must not dispatch');});assert.equal(failed[0].ok,false);assert.equal(sent,rows.length);assert(f.db.getFact(f.guild,secret));
  if(mode==='party')assert.doesNotMatch(certifiedSessionRecap(f.db,f.guild,f.session.id),/rain-streaked/,'Revoked scene evidence cannot be republished through a recap.');
}));

for(const actor of ['npc','other_pc'])test(`NAR02 ${actor} knowledge is not recoverable`,()=>nativeFixture(f=>{
  const x=setup(f),r=response(f,x.text,'wait');disclosure(f,r);
  if(actor==='npc')f.db.upsertNpcProfile(f.guild,{npcKey:'keeper',name:'Keeper'});
  r.narrative_claims[0].actor=actor==='npc'?'npc:keeper':`character:${f.pcs[1].id}`;
  const output=prepareAuthorizedTurnOutput(f.db,f.guild,r,x.scope);
  assert.throws(()=>validateCandidateClaims(f.db,f.guild,candidateNarrative(output),x.scope,[],{output}));
}));

test('NAR03 private/GM ancestry, hypothetical facts and free-form grammar never enter the scene payload',()=>nativeFixture(f=>{
  const x=setup(f,'private'),secret=f.db.addFact(f.guild,{content:'ANCESTRY_PRIVATE',visibility:'gm'});
  const source=f.db.addFact(f.guild,{category:'environment',content:'A rain-streaked window overlooks the alley.',visibility:'party',provenance:{...windowEvidence,epistemic:{kind:'established',source_refs:[secret]}}});
  f.db.addFact(f.guild,{category:'environment',content:'A clouded window overlooks the alley.',visibility:'party',source:'ai_gm',provenance:{...windowEvidence,scene_observation:{...windowEvidence.scene_observation,quality:'clouded'}}});
  const r=response(f,x.text);r.gm_world_parts=[{version:5,kind:'scene_description',fact_refs:[source],atmosphere:[{subject:'Choso apologizes',verb:'settles',manner:'softly'}]}];
  const a=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:'private'});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:r,scope:x.scope,speaker:x.pc.name,label:'negative grammar',meta:{messageId:x.messageId,turnId:a.turn_id}});
  const rows=f.db.listTurnPublications(f.guild,a.turn_id);assert(rows.length);assert(rows.every(row=>!/ANCESTRY_PRIVATE|rain-streaked|clouded window|Choso apologizes/.test(row.payload)));
  assert(rows.some(row=>row.payload.includes('No sourced environmental details')));
}));

test('NAR03 an environmental fact label/GM assertion cannot smuggle PC reaction or injury through the scene lane',()=>nativeFixture(f=>{
  const x=setup(f,'private'),id=f.db.addFact(f.guild,{category:'environment',content:'Choso apologizes for losing. Jaxon is injured.',visibility:'party',provenance:{scene_location:'terminal'}});
  const r=response(f,x.text);r.gm_world_parts=[{version:5,kind:'scene_description',fact_refs:[id],atmosphere:[]}];
  const a=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:'private'});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:r,scope:x.scope,speaker:x.pc.name,label:'false environment class',meta:{messageId:x.messageId,turnId:a.turn_id}});
  assert(f.db.listTurnPublications(f.guild,a.turn_id).every(row=>!row.payload.includes('Choso apologizes')&&!row.payload.includes('Jaxon is injured')));
}));

test('NAR05 check-in is not assembly; existing delivery service resumes without duplicate hooks or opening',()=>nativeFixture(async f=>{
  assert.equal(assemblyReadiness(f.db,f.session).pending,true);assert.match(assemblyReadiness(f.db,f.session).guidance,/assemble/);
  let plan={public_opening:'Source-verified synthetic opening',character_entries:[{discord_user_id:f.pcs[0].owner_user_id,character_name:'Jaxon',private_hook:'Own hook only'}]},sent=0;
  f.db.setAssemblyPlan(f.session.id,plan);const savePlan=next=>{plan=next;f.db.setAssemblyPlan(f.session.id,next);};
  const options={savePlan,sendPublic:async()=>({id:`p${++sent}`}),sendPrivate:async()=>({ok:true,id:`h${++sent}`})};
  await deliverAssemblyParts({plan,...options});f.restart();await deliverAssemblyParts({plan:f.db.getAssemblyPlan(f.session.id),...options});
  assert.equal(sent,2);assert.equal(assemblyReadiness(f.db,f.session).delivered,2);
  assert.equal(assemblyReadiness(f.db,{...f.session,assembly_phase:'party'}).pending,false);
}));

test('NAR05 neutral delivery is archived truthfully, not synthesized into a scene recap',()=>nativeFixture(async f=>{
  const x=setup(f),r=response(f,'I wait.','wait');r.player_intents=[];
  const a=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:'party'});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:r,scope:x.scope,speaker:x.pc.name,label:'neutral archive',meta:{messageId:x.messageId,turnId:a.turn_id}});
  await deliverTurnOutbox(f.db,f.guild,a.turn_id,async()=>({messageId:'archive-ack',channelId:'synthetic'}));
  const recap=certifiedSessionRecap(f.db,f.guild,f.session.id);assert.match(recap,/not a scene description/);assert.doesNotMatch(recap,/Unverified generated candidate/);
}));

for(const mode of ['party','private'])test(`NAR01 ${mode}: actual strict disclosure predicate matrix and ancestry remain separate`,()=>nativeFixture(f=>{
  const x=setup(f,mode);
  for(const visibility of ['public','party','player','character','gm']){
    const r=response(f,x.text),id=disclosure(f,r,visibility);
    f.db.updateFact(f.guild,id,{subjectUserId:x.pc.owner_user_id,subjectCharacterId:x.pc.id});
    const allowed=['public','party'].includes(visibility)||mode==='private'&&visibility!=='gm';
    if(allowed)assert.doesNotThrow(()=>validateCandidateClaims(f.db,f.guild,r,x.scope,[]));
    else assert.throws(()=>validateCandidateClaims(f.db,f.guild,r,x.scope,[]),e=>e.diagnostic.reason_code==='audience_denied');
    r.narrative_claims[0].proposed='MISMATCH';
    assert.throws(()=>validateCandidateClaims(f.db,f.guild,r,x.scope,[]),e=>e.diagnostic.reason_code==='content_mismatch');
    f.db.archiveFact(f.guild,id);
    assert.throws(()=>validateCandidateClaims(f.db,f.guild,r,x.scope,[]),e=>e.diagnostic.reason_code==='fact_archived');
    r.narrative_claims[0].source_ref='missing';
    assert.throws(()=>validateCandidateClaims(f.db,f.guild,r,x.scope,[]),e=>e.diagnostic.reason_code==='fact_missing');
  }
  const parent=f.db.addFact(f.guild,{content:'old source',visibility:'party'}),r=response(f,x.text),id=disclosure(f,r,'party');
  f.db.updateFactProvenance(f.guild,id,{epistemic:{kind:'established',source_refs:[parent]}});f.db.archiveFact(f.guild,parent);
  assert.throws(()=>validateCandidateClaims(f.db,f.guild,r,x.scope,[]),e=>e.diagnostic.category==='epistemic_authority');
}));
