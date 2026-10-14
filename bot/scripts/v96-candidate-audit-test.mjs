/** Supplemental candidate-annotation regressions, retained separately from origin's original hotfix suite. */
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
import {validateCandidateClaims,validateNarrativeClaims} from '../src/narrative-integrity.js';
import {prepareAuthorizedTurnOutput,candidateNarrative} from '../src/pvp-output.js';

const knocks='After a brief pause, **three measured knocks** sound again from the laundromat’s closed rear supply door—evenly spaced, with no voice accompanying them.';
const failure='Twenty-Four Spin and the adjoining Night Owl Copy & Parcel have both suffered a simultaneous equipment failure.';
function setup(f,mode,prose,certainty='committed'){
  const pc=f.pcs[0],scope={mode,actorUserId:pc.owner_user_id,actorCharacterId:pc.id},messageId=`candidate-${mode}-${certainty}`;
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});
  const factId=f.db.addFact(f.guild,{category:'recap',content:'Earlier knocks and stopped equipment were recapped.',visibility:'party'});
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,'I wait.',{privateScene:mode==='private'});
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,{decision:'no_change',reason:'No new outcome.',confidence:100}]));
  state_review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  const claim={actor:'world',entity_type:'world',entity:'terminal',action:'status',prior:'',proposed:'knocking',
    source_ref:factId,mutation_index:-1,visibility:mode==='private'?'player':'party',certainty,source_span:prose};
  const result={respond:true,narration:prose,narrative_claims:[claim],gm_world_parts:[],player_intents:[{
    type:'other',source_span:'I wait.',target_name:'',target_key:'',destination:'unspecified',operation:'wait',utterance:'',
    excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Owner waits, no new effect.'}],
    private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],npc_knowledge:[],npc_goals:[],
    canon_proposals:[],simulation_updates:[],ai_intents:[],state_review};
  return {pc,scope,messageId,result};
}
for(const mode of ['party','private'])for(const [name,prose,certainty] of [['knocks',knocks,'committed'],['equipment',failure,'uncertain']]){
  test(`unpublished world ${name} annotation is GM-private review, ${mode} actual turn/restart`,()=>nativeFixture(async f=>{
    const {pc,scope,messageId,result}=setup(f,mode,prose,certainty),before=f.pcs.map(p=>f.db.getCharacter(p.id).data.resources);
    const ai=new FakeResponses([result]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
      config:{gmModel:'offline',maxRecentMessages:5,maxContentChunks:1}});
    const prepared=await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,messageText:'I wait.',messageId,scope:mode});
    const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId,actorPrincipal:pc.owner_user_id,audience:mode});
    commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:prepared,scope,speaker:pc.name,label:'candidate quarantine',
      meta:{messageId,turnId:attempt.turn_id,channelId:'offline-play'}});
    assert.equal(ai.requests.length,1,'unpublished annotation must not trigger semantic repair or invent an outcome');
    const review=f.db.listCityRecords(f.guild,{kind:'candidate_claim_review',includeGM:true});
    assert.equal(review.length,1);assert.equal(review[0].visibility,'gm');assert.equal(review[0].status,'needs_review');
    assert.deepEqual(f.pcs.map(p=>f.db.getCharacter(p.id).data.resources),before);
    const rows=f.db.listTurnPublications(f.guild,attempt.turn_id);
    assert(rows.every(row=>!row.payload.includes(prose)),'reviewed annotation is not published fiction');
    f.restart();const sent=[];
    await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,async row=>{sent.push(row.payload);return {messageId:'offline-sent',channelId:'offline-play'};});
    assert(!sent.join('\n').includes(prose));
    assert.deepEqual(f.pcs.map(p=>f.db.getCharacter(p.id).data.resources),before);
  }));
}
test('candidate audit requires a real projection with exactly matching original bytes',()=>nativeFixture(f=>{
  const {scope,result}=setup(f,'party',knocks);
  const output=prepareAuthorizedTurnOutput(f.db,f.guild,structuredClone(result),scope);
  assert.throws(()=>validateCandidateClaims(f.db,f.guild,{...result,narration:'different'},scope,[],{output}),/binding|source_span/);
  assert.throws(()=>validateCandidateClaims(f.db,f.guild,result,scope,[],{output:{...result,narrative_claims:[]}}),/output|authority|receipt|proof/);
  assert.throws(()=>validateNarrativeClaims(f.db,f.guild,result,scope),/output|authority|receipt|actor_status/);
}));
test('unpublished PC damage annotation still fails without a native effect receipt',()=>nativeFixture(f=>{
  const {scope,result}=setup(f,'party',"Jaxon's left leg has been reduced to an unusable mess.");
  result.narrative_claims[0]={...result.narrative_claims[0],entity_type:'character',entity:f.pcs[0].id,action:'damage',proposed:'1'};
  const output=prepareAuthorizedTurnOutput(f.db,f.guild,structuredClone(result),scope);
  assert.throws(()=>validateCandidateClaims(f.db,f.guild,candidateNarrative(output),scope,[],{output}),/uncommitted_damage/);
}));
