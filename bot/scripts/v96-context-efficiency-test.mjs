/** TOK01–04: synthetic paired context, scoped retrieval and complete structured output; no provider traffic. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {configureCityFlags} from '../src/city-core.js';
import {ContextPlanner} from '../src/context-planner.js';
import * as budget from '../src/prompt-budget.js';
import {OperationalMetrics} from '../src/operational-metrics.js';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {FakeResponses} from './contract-fixtures.mjs';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';

const response=()=>{
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,
    {decision:'no_change',reason:'No mutation.',confidence:100}]));
  state_review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  return {respond:true,narration:'What would you like to examine?',narrative_claims:[],gm_world_parts:[],
    ordinary_effect_proposals:[],private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],
    npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],state_review};
};
const service=(f,ai,metrics=new OperationalMetrics())=>new GMService({db:f.db,ai,metrics,
  content:new ContentIndex(path.resolve('../content')),config:{gmModel:'offline',maxRecentMessages:10,maxContentChunks:2}});

test('MEASURE paired combined GM requests, synthetic bytes/timing and unknown usage',()=>nativeFixture(async f=>{
  configureCityFlags(f.db,f.guild,{adaptive_context:true},'gm');
  for(let i=0;i<24;i++)f.db.addFact(f.guild,{content:`Terminal evidence ${i}: `+'intact testimony '.repeat(12),visibility:'party'});
  const ai=new FakeResponses([response(),response()]),gm=service(f,ai),timings=[];
  for(const scope of ['party','private']){
    const start=performance.now();
    await gm.runTurn({guildId:f.guild,actorUserId:f.pcs[0].owner_user_id,actorName:f.pcs[0].name,
      actorAssignment:f.db.controlledAssignment(f.session.id,f.pcs[0].owner_user_id),
      messageText:'I examine terminal evidence and ask what remains unknown.',scope});
    timings.push(performance.now()-start);
  }
  const snapshot=gm.metrics.snapshot(f.guild);
  assert.equal(ai.requests.length,2);assert.equal(snapshot.stages.model_request.usage_unknown,2);
  console.log(JSON.stringify({measurement:'TOK_paired_synthetic',scopes:['party','private'],
    input_characters:ai.requests.map(r=>r.input.length),instruction_characters:ai.requests.map(r=>r.instructions.length),
    full_turn_local_ms:timings,model_stage:snapshot.stages.model_request,structured_stage:snapshot.stages.gm,
    omissions:ai.requests.map(r=>r.input.includes('CONTEXT BUDGET')),live_requests:0,billable_tokens:0}));
}));

test('TOK01 exact source/scope/revision duplicates alone become detail references',()=>{
  const row={source:'fact:a',data:{id:'a',guild_id:'g',visibility:'party',content:'contradictory testimony',revision:1}};
  const plan={actor:{type:'gm',key:''},scope:'gm',segments:[row]};
  const projected=budget.referenceContextPlan(plan,[structuredClone(row.data)]);
  assert.equal(projected.segments[0].data,undefined);assert.equal(projected.segments[0].detail_ref,'fact:a');
  for(const field of ['guild_id','visibility','revision','content','subject_user_id','subject_character_id']){
    const different={...row.data,[field]:'other'};
    assert.deepEqual(budget.referenceContextPlan(plan,[different]).segments[0].data,row.data,field);
  }
  assert.deepEqual(plan.segments[0].data,row.data,'projection is read-only');
});

test('TOK02 nonlexical page and exact scoped expansion retain obscure evidence and contradictions',()=>nativeFixture(f=>{
  const id=f.db.addFact(f.guild,{content:'The witness saw a copper button.',visibility:'party'});
  const contradiction=f.db.addFact(f.guild,{content:'The witness denied seeing any button.',visibility:'party'});
  const secret=f.db.addFact(f.guild,{content:'OWNER_ONLY_MARKER',visibility:'player',subjectUserId:f.pcs[1].owner_user_id});
  f.db.db.prepare("UPDATE facts SET created_at='2000-01-01' WHERE id IN (?,?)").run(id,contradiction);
  for(let i=0;i<80;i++)f.db.addFact(f.guild,{content:`Recent unrelated ${i}`,visibility:'party'});
  const planner=new ContextPlanner(f.db),options={actorType:'player',userId:f.pcs[0].owner_user_id,scope:'party',query:'What now?'};
  const first=planner.plan(f.guild,options);
  assert(first.segments.some(r=>r.source.startsWith('fact:')),'unrelated query must not filter away all nonlexical evidence');
  const expanded=planner.plan(f.guild,{...options,sourceRefs:[`fact:${id}`,`fact:${contradiction}`,`fact:${secret}`]});
  assert(expanded.segments.some(r=>r.source===`fact:${id}`));
  assert(expanded.segments.some(r=>r.source===`fact:${contradiction}`));
  assert(!JSON.stringify(expanded).includes('OWNER_ONLY_MARKER'));
  assert(!planner.plan('foreign',{...options,sourceRefs:[`fact:${id}`]}).segments.length);
  assert.throws(()=>planner.plan(f.guild,{...options,sourceRefs:Array(13).fill(`fact:${id}`)}),/bounded/);
  const recovered=planner.plan(f.guild,{...options,factPage:1,maxTokens:6000});
  assert(recovered.fact_page.page===1);assert(recovered.fact_page.next_page!==undefined);
  assert(recovered.segments.some(r=>r.source===`fact:${id}`),'bounded nonlexical page can recover old obscure evidence');
}));

test('TOK03 retain reported cached tokens separately and reject impossible cache counts',()=>{
  const m=new OperationalMetrics();
  m.record('model_request',{guildId:'g',inputTokens:100,outputTokens:10,cachedInputTokens:40});
  m.record('model_request',{guildId:'g',inputTokens:20,outputTokens:3,cachedInputTokens:30});
  m.record('model_request',{guildId:'g'});
  const row=m.snapshot('g').stages.model_request;
  assert.equal(row.cached_input_tokens,40);assert.equal(row.cache_usage_reported,1);assert.equal(row.cache_usage_unknown,2);
  assert.equal(row.usage_unknown,1);assert.equal(row.input_tokens,120);
});

test('TOK03 volatile NPC guidance leaves stable instruction prefix unchanged',()=>nativeFixture(async f=>{
  const ai=new FakeResponses([response(),response()]),gm=service(f,ai),build=gm.buildContext.bind(gm);
  for(const npc of ['local-1','local-2'])f.db.upsertNpcProfile(f.guild,{npcKey:npc,displayName:npc,portrayal:`Distinct ${npc}`});
  let revision=0;
  gm.buildContext=(...args)=>({...build(...args),npc_cognition:[{npc_key:`local-${++revision}`}]});
  for(let i=0;i<2;i++)await gm.runTurn({guildId:f.guild,actorUserId:f.pcs[0].owner_user_id,actorName:f.pcs[0].name,
    messageText:'What is visible?',scope:'party'});
  assert.equal(ai.requests[0].instructions,ai.requests[1].instructions);
  assert.notEqual(ai.requests[0].input,ai.requests[1].input);
  assert(!ai.requests[0].instructions.includes('local-1'));
}));

test('TOK04 complete long compound output survives retry without silently lowering its ceiling',()=>nativeFixture(async f=>{
  const capture=new FakeResponses([response()]),real=service(f,capture);
  await real.runTurn({guildId:f.guild,actorUserId:f.pcs[0].owner_user_id,actorName:f.pcs[0].name,messageText:'What remains?'});
  const format=capture.requests[0].text;
  const long={...response(),private_messages:Array.from({length:4},(_,i)=>({user_id:`owner-${i}`,content:'complete '.repeat(2000)}))};
  for(const key of format.format.schema.required)if(!Object.hasOwn(long,key)){
    const schema=format.format.schema.properties[key];
    long[key]=schema.type==='array'?[]:null;
  }
  const ai=new FakeResponses(['{malformed',long]),gm=new GMService({db:{},content:{},ai,config:{structuredRetryMaxTokens:6000}});
  const result=await gm.requestStructured({model:'offline',input:'four independent owner actions',max_output_tokens:16000,
    text:format},{guildId:'g'});
  assert.deepEqual(result,long);assert(ai.requests[1].max_output_tokens>=16000);
  assert.deepEqual(ai.requests[1].text,format,'repair preserves the actual required native/output schema');
  const uncapped=new FakeResponses(['{malformed',response()]);gm.ai=uncapped;
  await gm.requestStructured({model:'offline',input:'complete turn',
    text:format},{guildId:'g'});
  assert.equal(uncapped.requests[1].max_output_tokens,undefined,'an uncapped combined turn must not acquire a smaller repair cap');
}));

test('TOK01 real compacted turn retains all referenced detail and pending-native authority',()=>nativeFixture(async f=>{
  configureCityFlags(f.db,f.guild,{adaptive_context:true},'gm');
  const id=f.db.addFact(f.guild,{content:'An obscure clue, not permission or an outcome.',visibility:'party'});
  const ai=new FakeResponses([response()]),gm=service(f,ai),build=gm.buildContext.bind(gm);
  gm.buildContext=(...args)=>({...build(...args),reference_chunks:[{source:'optional',text:'x'.repeat(200000)}]});
  await gm.runTurn({guildId:f.guild,actorUserId:f.pcs[0].owner_user_id,actorName:f.pcs[0].name,messageText:'What remains?'});
  const input=ai.requests[0].input;
  assert(input.includes('CONTEXT BUDGET'));assert(input.includes(`"detail_ref":"fact:${id}"`));
  assert(input.includes('An obscure clue, not permission or an outcome.'));
  for(const label of ['PENDING NATIVE CONTINUATIONS','PENDING NATIVE ACTION REVIEWS','NATIVE SOURCE-SPAN LEDGER',
    'ORDINARY EFFECT CONTEXT','CURRENT COMBATANTS','SAVED GM RULINGS'])assert(input.includes(label),label);
}));

test('TOK02 expansion rechecks archived facts, visibility, guild and current character ownership',()=>nativeFixture(f=>{
  const pc=f.pcs[0],planner=new ContextPlanner(f.db),options={actorType:'character',scope:'character',
    userId:pc.owner_user_id,characterId:pc.id,query:'unrelated'};
  const id=f.db.addFact(f.guild,{content:'ENTITLED_PRIVATE_CLUE',visibility:'character',subjectCharacterId:pc.id});
  const sourceRefs=[`fact:${id}`];
  assert(JSON.stringify(planner.plan(f.guild,{...options,sourceRefs})).includes('ENTITLED_PRIVATE_CLUE'));
  f.db.archiveFact(f.guild,id);
  assert(!JSON.stringify(planner.plan(f.guild,{...options,sourceRefs})).includes('ENTITLED_PRIVATE_CLUE'));
  f.db.updateFact(f.guild,id,{archived:false,visibility:'gm'});
  assert(!JSON.stringify(planner.plan(f.guild,{...options,sourceRefs})).includes('ENTITLED_PRIVATE_CLUE'));
  assert.throws(()=>planner.plan(f.guild,{...options,userId:f.pcs[1].owner_user_id,sourceRefs}),/current owner/);
  assert.throws(()=>planner.plan(f.guild,{...options,actorType:'player',userId:f.pcs[1].owner_user_id,sourceRefs}),/current owner/);
  assert.throws(()=>planner.plan('other',{...options,sourceRefs}),/campaign/);
}));

test('TOK03 stable authority content invalidates on rule revision and private scope stays separate',()=>nativeFixture(async f=>{
  const ai=new FakeResponses([response(),response(),response()]),gm=service(f,ai);
  let version=1;const read=gm.content.read.bind(gm.content);
  gm.content.read=name=>read(name)+(name==='ENGINE/AI_GM_CONSTITUTION.md'?`\nRULE REVISION ${version}`:'');
  for(const scope of ['party','private','private']){
    await gm.runTurn({guildId:f.guild,actorUserId:f.pcs[0].owner_user_id,actorName:f.pcs[0].name,messageText:'What remains?',scope});
    if(scope==='private')version++;
  }
  assert.notEqual(ai.requests[0].instructions,ai.requests[1].instructions,'audience instructions differ');
  assert.notEqual(ai.requests[1].instructions,ai.requests[2].instructions,'changed authority content is not cached locally');
  assert(ai.requests[2].instructions.includes('RULE REVISION 2'));
  assert(ai.requests[0].input.includes('scope=party'));assert(ai.requests[1].input.includes('scope=private'));
}));

test('TOK02 NPC motives and conflicting knowledge remain explicit without text matching',()=>nativeFixture(f=>{
  f.db.upsertNpcProfile(f.guild,{npcKey:'witness',displayName:'Witness'});
  f.db.upsertNpcGoal(f.guild,{npcKey:'witness',goalKey:'protect',objective:'Protect the old testimony'});
  for(const [knowledgeKey,content,beliefState] of [['one','The lamp was lit.','known'],['two','The lamp was dark.','suspected']])
    f.db.upsertNpcKnowledge(f.guild,{npcKey:'witness',knowledgeKey,content,beliefState});
  const plan=new ContextPlanner(f.db).plan(f.guild,{actorType:'npc',actorKey:'witness',query:'unrelated',maxTokens:2000});
  for(const marker of ['Protect the old testimony','The lamp was lit.','The lamp was dark.','suspected'])assert(JSON.stringify(plan).includes(marker),marker);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0);
}));
