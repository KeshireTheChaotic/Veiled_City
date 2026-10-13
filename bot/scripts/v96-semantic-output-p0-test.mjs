/** SEM06 red-first: novel material PC assertions must not become publication through an empty claim list. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {captureWorldInput} from '../src/autonomous-world.js';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {FakeResponses} from './contract-fixtures.mjs';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {validateNarrativeClaims} from '../src/narrative-integrity.js';

for(const [id,prose] of [
  ['injury',"Jaxon's left leg has been reduced to an unusable mess."],
  ['choice-custody',"Choso makes peace with defeat and hands over ownership of his courier case to Jaxon."]
]){
  test(`SEM06 ${id}: direct ordinary-scene output boundary rejects unreceipted material prose`,()=>nativeFixture(f=>{
    const pc=f.pcs[0],resources=f.pcs.map(p=>f.db.getCharacter(p.id).data.resources);
    f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,semantic_integrity:true}});
    assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_proposal',includeGM:true}).length,0);
    assert.throws(()=>validateNarrativeClaims(f.db,f.guild,{narration:prose,narrative_claims:[],events:[]},
      {mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id}),
      /Narrative integrity|output|authority|receipt|claim/i);
    assert.deepEqual(f.pcs.map(p=>f.db.getCharacter(p.id).data.resources),resources);
  }));

  test(`SEM06 ${id}: actual combined GM turn cannot commit or queue unreceipted PC material prose`,()=>nativeFixture(async f=>{
    const pc=f.pcs[0],text='I wait.',messageId=`v96-sem06-${id}`,scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
    const resources=f.pcs.map(p=>f.db.getCharacter(p.id).data.resources);
    captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,text);
    f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,semantic_integrity:true}});
    const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,
      {decision:'no_change',reason:'No mutation proposed.',confidence:100}]));
    state_review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
    const response={respond:true,narration:prose,world_additions:[],scene_actions:[],world_conflicts:[],narrative_interpretation:null,
      player_intents:[{type:'other',source_span:text,target_name:'',target_key:'',destination:'unspecified',operation:'wait',utterance:'',
        excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Owner waits; no injury, choice or transfer authorized.'}],
      context_memories:[],authored_candidates:null,narrative_claims:[],gm_world_parts:[],private_messages:[],events:[],handouts:[],
      relationships:[],npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,state_review};
    const ai=new FakeResponses([response]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
      config:{gmModel:'offline',routineGmModel:'offline',maxRecentMessages:5,maxContentChunks:1,contextInputBudget:100000}});
    const turn=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId,actorPrincipal:pc.owner_user_id,audience:'party'});
    let rejected=false;
    try{
      const result=await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,
        actorAssignment:f.db.controlledAssignment(f.session.id,pc.owner_user_id),messageText:text,messageId});
      commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:'SEM06 offline P0',
        meta:{messageId,turnId:turn.turn_id,channelId:'offline-play'}});
    }catch(error){
      if(!['NARRATIVE_INTEGRITY','NARRATIVE_PVP','STATE_MUTATION_REJECTED'].includes(error.code))throw error;
      rejected=true;
    }
    const publications=f.db.listTurnPublications(f.guild,turn.turn_id);
    assert.deepEqual(f.pcs.map(p=>f.db.getCharacter(p.id).data.resources),resources,'No native PC damage or cost exists.');
    assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0);
    assert.equal(ai.requests.length,1,'No semantic repair call should be needed to manufacture missing authority.');
    assert.equal(publications.filter(row=>row.payload.includes(prose)).length,0,
      'Unverified PC material prose must not enter a delivery queue.');
    assert(rejected||publications.length===0||publications.every(row=>
      f.db.getCityRecord(f.guild,'pvp_output_publication',row.id)?.status==='verified'),
      'A native authority boundary must reject or safely quarantine/project unsupported PC consequences.');
  }));
}

test('SEM06 existing declared novel damage claim already requires native effect proof',()=>nativeFixture(f=>{
  const prose="Jaxon's left leg has been reduced to an unusable mess.",pc=f.pcs[0];
  const claim={actor:'world',entity_type:'character',entity:pc.id,action:'damage',prior:'0',proposed:'1',
    visibility:'party',source_ref:'not-a-native-receipt',mutation_index:-1,certainty:'committed',source_span:prose};
  assert.throws(()=>validateNarrativeClaims(f.db,f.guild,{narration:prose,narrative_claims:[claim],events:[]},
    {mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id}),/uncommitted_damage/);
}));

test('SEM06 harmless idiom and ordinary GM atmosphere remain valid, not a global prose freeze',()=>nativeFixture(f=>{
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,semantic_integrity:true}});
  const result=validateNarrativeClaims(f.db,f.guild,{
    narration:'The rain drums against the roof. Jaxon bleeds money. Choso is dead to me, as the saying goes.',narrative_claims:[],events:[]},
    {mode:'party',actorUserId:f.pcs[0].owner_user_id,actorCharacterId:f.pcs[0].id});
  assert.equal(result.ok,true);
}));
