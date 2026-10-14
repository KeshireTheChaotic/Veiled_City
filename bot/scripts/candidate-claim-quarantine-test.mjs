/** Live-error reproductions use synthetic recaps; no production DB or provider access. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {FakeResponses} from './contract-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {captureWorldInput} from '../src/autonomous-world.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {validateNarrativeClaims,validateCandidateClaims} from '../src/narrative-integrity.js';
import {prepareAuthorizedTurnOutput,candidateNarrative} from '../src/pvp-output.js';

const knocks='After a brief pause, **three measured knocks** sound again from the laundromat’s closed rear supply door—evenly spaced, with no voice accompanying them.';
const failure='Twenty-Four Spin and the adjoining Night Owl Copy & Parcel have both suffered a simultaneous equipment failure.';
function setup(f,mode,which){
  const pc=f.pcs[0],scope={mode,actorUserId:pc.owner_user_id,actorCharacterId:pc.id},id=`candidate-${mode}-${which}`;
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});
  const factId=f.db.addFact(f.guild,{key:'historical-recap',category:'recap',content:'Earlier knocks and stopped equipment were recapped.',visibility:'party'});
  const fact=f.db.getFact(f.guild,factId);
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,'I wait.',{privateScene:mode==='private'});
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,{decision:'no_change',reason:'No new outcome.',confidence:100}]));
  state_review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  const claim={actor:which==='knocks'?`character:${pc.id}`:'',entity_type:'world',entity:which==='knocks'?'rear-supply-door':'Twenty-Four Spin and Night Owl Copy & Parcel',
    action:'status',prior:'',proposed:'',source_ref:fact.id,mutation_index:-1,visibility:mode==='private'?'character':'party',
    certainty:which==='knocks'?'committed':'uncertain',authored_source_span:'',output_claim_span:which==='knocks'?knocks:failure};
  const response={respond:true,narration:claim.output_claim_span,narrative_claims:[claim],world_additions:[],scene_actions:[],world_conflicts:[],
    narrative_interpretation:null,player_intents:[{type:'other',source_span:'I wait.',target_name:'',target_key:'',destination:'unspecified',
      operation:'wait',utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Owner waits.'}],
    gm_world_parts:[{version:1,kind:'scene_atmosphere',entity_key:'terminal',acts:['quiet_pause'],tone:'plain'}],
    context_memories:[],authored_candidates:null,private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],npc_knowledge:[],
    npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,state_review};
  return {pc,scope,id,claim,response,fact};
}
for(const mode of ['party','private'])for(const which of ['knocks','failure'])test(`${mode} ${which}: quarantined world annotation cannot abort safe GM/commit/restart delivery`,()=>nativeFixture(async f=>{
  const x=setup(f,mode,which),resources=f.pcs.map(p=>f.db.getCharacter(p.id).data.resources);
  const ai=new FakeResponses([x.response,x.response,x.response]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',routineGmModel:'offline',maxRecentMessages:5,maxContentChunks:1,contextInputBudget:100000}});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.id,actorPrincipal:x.pc.owner_user_id,audience:mode});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,
    actorAssignment:f.db.controlledAssignment(f.session.id,x.pc.owner_user_id),messageText:'I wait.',messageId:x.id,scope:mode});
  assert.equal(ai.requests.length,1,'Unpublished annotation recovery needs no model repair call.');
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:x.pc.name,label:'Candidate annotation regression',
    meta:{messageId:x.id,turnId:attempt.turn_id,channelId:'offline-play'}});
  const rows=f.db.listTurnPublications(f.guild,attempt.turn_id);
  assert(rows.length);assert(rows.every(row=>!row.payload.includes(x.claim.output_claim_span)));
  assert(rows.some(row=>row.payload.includes('For a moment, the surroundings are quiet.')));
  const audits=f.db.listCityRecords(f.guild,{kind:'candidate_claim_review',includeGM:true});
  assert.equal(audits.length,1);assert(audits.every(row=>row.visibility==='gm'&&row.status==='needs_review'));
  assert.equal(audits[0].data.diagnostics[0].category,which==='knocks'?'actor_status':'uncertainty_framing');
  f.restart();let sends=0;
  const send=async row=>{sends++;assert(!row.payload.includes(x.claim.output_claim_span));return {messageId:`sent-${sends}`,channelId:'offline-play'};};
  await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,send);await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,send);
  assert.equal(sends,rows.length);assert.deepEqual(f.pcs.map(p=>f.db.getCharacter(p.id).data.resources),resources);
  assert.equal(f.db.getFact(f.guild,x.fact.id).content,'Earlier knocks and stopped equipment were recapped.');
}));

test('Direct raw validation and unprepared audit never gain publication or annotation recovery authority',()=>nativeFixture(f=>{
  const x=setup(f,'party','knocks');
  assert.throws(()=>validateNarrativeClaims(f.db,f.guild,x.response,x.scope),/actor_status/);
  assert.throws(()=>validateCandidateClaims(f.db,f.guild,x.response,x.scope,[]),/actor_status/);
  assert.throws(()=>validateCandidateClaims(f.db,f.guild,x.response,x.scope,[],{output:x.response}),/PvP|output|proof/);
}));

test('A genuine unsupported PC lifecycle claim remains fatal and rolls back, not world-annotation recovery',()=>nativeFixture(f=>{
  const x=setup(f,'party','knocks');x.response.narration='You are dead.';
  x.response.narrative_claims=[{...x.claim,entity_type:'character',entity:x.pc.id,proposed:'dead',output_claim_span:'You are dead.'}];
  const before=f.db.getCharacter(x.pc.id);
  assert.throws(()=>commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:x.response,scope:x.scope,speaker:x.pc.name,
    label:'Invalid PC lifecycle',meta:{messageId:x.id}}),/actor_status/);
  assert.deepEqual(f.db.getCharacter(x.pc.id),before);
}));

test('Prepared proof must bind the exact original candidate and current final output bytes',()=>nativeFixture(f=>{
  const x=setup(f,'party','knocks');prepareAuthorizedTurnOutput(f.db,f.guild,x.response,x.scope);
  const raw=candidateNarrative(x.response),changed=structuredClone(raw);changed.narrative_claims[0].entity='another-target';
  assert.throws(()=>validateCandidateClaims(f.db,f.guild,changed,x.scope,[],{output:x.response}),/candidate_output_binding/);
  x.response.narration+=' Choso apologizes for losing.';
  assert.throws(()=>validateCandidateClaims(f.db,f.guild,raw,x.scope,[],{output:x.response}),/PvP|output|proof/);
}));

test('A held world annotation cannot swallow a second unsupported PC lifecycle claim or retain partial audit writes',()=>nativeFixture(f=>{
  const x=setup(f,'party','knocks');x.response.narration+=' You are dead.';
  x.response.narrative_claims.push({...x.claim,entity_type:'character',entity:x.pc.id,proposed:'dead',output_claim_span:'You are dead.'});
  assert.throws(()=>commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:x.response,scope:x.scope,speaker:x.pc.name,
    label:'Mixed annotations',meta:{messageId:x.id}}),/actor_status/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'candidate_claim_review',includeGM:true}).length,0);
}));

test('Independently owner-authorized native cost and receipt survive annotation quarantine without replay',()=>nativeFixture(async f=>{
  const {reviewFeatureEffect,reviewPcEffect,approvePcEffect,applyPcEffect}=await import('../src/pc-effects.js');
  const x=setup(f,'private','failure');f.db.updateCharacterData(x.pc.id,d=>{d.domain_cards=['Synthetic Focus'];});
  f.db.upsertRulesRuling(f.guild,{key:'candidate-focus',ruling:'Synthetic Focus costs one Hope.',createdBy:'gm'});
  const source=f.accepted(0,'I use Synthetic Focus.',x.pc.id).source_event;
  const authority=reviewFeatureEffect(f.db,f.guild,'gm',{character:x.pc.id,feature:'Synthetic Focus',ruling:'candidate-focus',
    source,resource:'hope',amount:-1},{gm:true,interactionId:'candidate-focus-review'});
  reviewPcEffect(f.db,f.guild,x.pc.owner_user_id,authority.record_key);
  approvePcEffect(f.db,f.guild,x.pc.owner_user_id,authority.record_key,{interactionId:'candidate-focus-choice'});
  const receipt=applyPcEffect(f.db,f.guild,authority.record_key);
  x.response.gm_world_parts.push({version:4,kind:'native_outcome',receipt_kind:'pc_effect_receipt',ref:receipt.record_key});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.id,actorPrincipal:x.pc.owner_user_id,audience:'private'});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:x.response,scope:x.scope,speaker:x.pc.name,label:'Native cost survives',
    meta:{messageId:x.id,turnId:attempt.turn_id,channelId:'offline-play'}});
  assert(f.db.listTurnPublications(f.guild,attempt.turn_id).some(row=>/native resource receipt/i.test(row.payload)));
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,1);f.restart();
  await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,async()=>({messageId:'cost-sent',channelId:'offline-play'}));
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,1);
}));
