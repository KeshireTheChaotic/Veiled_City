/** Repeatable synthetic comparison only. Controlled provider clock ticks are not real model timings or quality evidence. */
import path from 'node:path';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/frameworks/content/public.js';
import {captureWorldInput} from '../src/autonomous-world.js';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {turnLatency} from '../src/turn-latency.js';
import {withTurnTrace} from '../src/turn-trace-context.js';
const report={synthetic:true,network:'denied',live_requests:0,billable_tokens:0,
  limitations:['Controlled clock ticks, not measured live provider latency.','No reported usage: token cost is unknown.','B/none is request design only; runtime low is unchanged.'],comparisons:[]};
for(const enabled of [false,true])await nativeFixture(async f=>{
  let now=0,calls=0,stage='failed';const originalClock=turnLatency.clock;turnLatency.clock=()=>now;
  const trace=turnLatency.begin(f.guild);trace.category='observation';trace.queueStarted(0);
  try{await withTurnTrace(trace,async()=>{
    const pc=f.pcs[0],text='I wait.',scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
    f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scoped_disclosure_recovery:enabled}});
    f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});
    const fact=f.db.addFact(f.guild,{content:'Synthetic secret',visibility:'gm'});
    captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,'synthetic-benchmark',text);
    const review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(k=>[k,{decision:'no_change',reason:'No change.',confidence:100}]));
    review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
    const candidate={respond:true,narration:'Held synthetic disclosure.',narrative_claims:[{actor:'',entity_type:'world',entity:'terminal',action:'disclosure',prior:'',proposed:'Synthetic secret',source_ref:fact,mutation_index:-1,visibility:'party',certainty:'committed',authored_source_span:'',output_claim_span:'Held synthetic disclosure.'}],
      gm_world_parts:[{version:1,kind:'scene_atmosphere',entity_key:'terminal',acts:['quiet_pause'],tone:'plain'}],
      player_intents:[{type:'other',source_span:text,target_name:'',target_key:'',destination:'unspecified',operation:'wait',utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Wait.'}],
      narrative_interpretation:null,world_additions:[],scene_actions:[],world_conflicts:[],context_memories:[],authored_candidates:null,private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,state_review:review};
    const ai={responses:{create:async()=>{calls++;now+=6000;return {output_text:JSON.stringify(candidate)};}}};
    const gm=new GMService({db:f.db,ai,content:new ContentIndex(path.resolve('../content')),config:{gmModel:'offline',contextInputBudget:100000}});
    try{
      const result=await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,actorAssignment:f.db.controlledAssignment(f.session.id,pc.owner_user_id),messageText:text,messageId:'synthetic-benchmark'});
      const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:'synthetic-benchmark',actorPrincipal:pc.owner_user_id,audience:'party'});turnLatency.bind(f.guild,attempt.turn_id,trace);
      commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:'synthetic benchmark',meta:{messageId:'synthetic-benchmark',turnId:attempt.turn_id}});
      now+=1000;await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,async()=>({messageId:'synthetic-ack',channelId:'synthetic'}));stage='delivered';
    }catch(error){if(error.code!=='NARRATIVE_INTEGRITY')throw error;}
    trace.finish(stage);report.comparisons.push({recovery_enabled:enabled,status:stage,provider_calls:calls,
      controlled_first_substantive_ms:trace.first,reported_tokens:null});
  });}finally{turnLatency.clock=originalClock;}
});
assert.equal(report.comparisons[0].status,'failed');assert.equal(report.comparisons[1].status,'delivered');
assert.equal(report.comparisons[1].provider_calls,1);assert.equal(report.comparisons[1].controlled_first_substantive_ms,7000);
console.log(JSON.stringify(report,null,2));
