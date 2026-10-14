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
import {AUTHORITY_POLICY} from '../src/authority-policy.js';

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

test('BUDGET near-edge production-size mandatory payload fits without an invented 2000-character requirement',()=>{
  const sections=[{label:'A',value:'x'.repeat(63972),required:true}],before=structuredClone(sections);
  const packet=budget.budgetTurnPrompt(sections,{maxChars:65909,reserveChars:0});
  assert.equal(packet.input.length,63975);assert.equal(packet.metrics.compacted,false);assert.deepEqual(sections,before);
});

test('BUDGET near-edge optional omissions use exact serialized metadata and preserve all mandatory authority',()=>{
  const sections=[{label:'A',value:'x'.repeat(63972),required:true},
    {label:'OPTIONAL HISTORY',value:[{source:'historical',body:'z'.repeat(100000)}]}];
  const packet=budget.budgetTurnPrompt(sections,{maxChars:65909,reserveChars:0});
  assert(packet.input.startsWith(`A:\n${sections[0].value}`));assert(packet.input.length<=65909);
  assert(packet.metrics.compacted);assert.deepEqual(packet.metrics.omissions,[{section:'OPTIONAL HISTORY',records:1}]);
  assert(!packet.input.includes('z'.repeat(1000)));
});

test('BUDGET actual minimal compacted payload fits exactly; one character less fails closed with honest required size',()=>{
  const sections=[{label:'AUTHORITY',value:{consent:false,source:'native'},required:true},
    {label:'HISTORY',value:[{body:'x'.repeat(200000)}]}];
  const baseline=budget.budgetTurnPrompt(sections,{maxChars:120000,reserveChars:0}),exact=baseline.input.length;
  assert.equal(budget.budgetTurnPrompt(sections,{maxChars:exact,reserveChars:0}).input,baseline.input);
  assert.throws(()=>budget.budgetTurnPrompt(sections,{maxChars:exact-1,reserveChars:0}),
    error=>error.code==='CONTEXT_OVERFLOW'&&error.diagnostic.stage==='budget_metadata'&&error.diagnostic.required_chars===exact);
});

test('BUDGET exact selection preserves scalar sections and escaped JSON records at tight boundaries',()=>{
  const sections=[{label:'AUTHORITY',value:{source:'native',consent:false},required:true},
    {label:'HISTORY',value:[{id:1,text:'"\\\n'.repeat(120)},{id:2,text:'short sourced clue'}]},
    {label:'SCALAR',value:'Whole descriptive record.'},
    {label:'UNRELATED',value:[{id:3,text:'x'.repeat(10000)}]}];
  for(const maxChars of [800,1000,1500,2500]){
    const packet=budget.budgetTurnPrompt(sections,{maxChars,reserveChars:0});
    assert(packet.input.length<=maxChars);assert(packet.input.includes(JSON.stringify(sections[0].value)));
    for(const record of sections[1].value)if(packet.input.includes(`"id":${record.id}`))assert(packet.input.includes(JSON.stringify(record)));
    assert.equal(packet.metrics.input_chars,packet.input.length);
    assert.deepEqual(packet,budget.budgetTurnPrompt(sections,{maxChars,reserveChars:0}));
  }
});

for(const value of [null,[1,2]])test(`BUDGET keeping tiny optional ${Array.isArray(value)?'array':'scalar'} can cost less than its omission descriptor`,()=>{
  const sections=[{label:'AUTHORITY',value:{consent:false},required:true},{label:'TINY',value},
    {label:'LARGE',value:[{body:'x'.repeat(200000)}]}];
  const roomy=budget.budgetTurnPrompt(sections,{maxChars:5000,reserveChars:0});
  const exact=budget.budgetTurnPrompt(sections,{maxChars:roomy.input.length,reserveChars:0});
  assert.equal(exact.input,roomy.input);assert(exact.input.includes(`TINY:\n${JSON.stringify(value)}`));
  assert.deepEqual(exact.metrics.omissions,[{section:'LARGE',records:1}]);
});

test('BUDGET structured requests without the complete authority policy still receive the full native policy',()=>nativeFixture(async f=>{
  const ai=new FakeResponses([{ok:true}]),gm=service(f,ai),req={model:'offline',instructions:'Partial APPLICATION AUTHORITY POLICY v1 is not complete.',input:'native test'};
  const before=structuredClone(req);await gm.structuredResponse(req,{guildId:f.guild});
  assert.equal(ai.requests.length,1);assert(ai.requests[0].instructions.startsWith(`${AUTHORITY_POLICY}\n`));
  assert.deepEqual(req,before,'Deduplication does not mutate the caller request.');
}));

test('BUDGET session storage aliases only an identical separately retained assembly plan',()=>{
  const plan={public_opening:'Established opening',character_entries:[],delivery_state:{part:{status:'uncertain'}}};
  const session={id:'s',status:'active',assembly_phase:'assembly',assembly_plan_json:JSON.stringify(plan),director_state_json:'{"scene_number":2}'};
  const before=structuredClone(session),out=budget.referenceSessionContext(session,plan);
  assert.equal(out.assembly_plan_json,undefined);assert.equal(out.assembly_plan_detail.section,'ASSEMBLY PLAN (GM-PRIVATE; protect per-character hooks)');
  assert.equal(out.director_state_json,session.director_state_json);assert.equal(out.id,session.id);assert.deepEqual(session,before);
  for(const changed of [{...plan,public_opening:'Changed'},null])assert.deepEqual(budget.referenceSessionContext(session,changed),session);
  assert.deepEqual(budget.referenceSessionContext({...session,assembly_plan_json:'{malformed'},plan),{...session,assembly_plan_json:'{malformed'});
  assert.equal(budget.referenceSessionContext(null,plan),null);
});

test('BUDGET roster partition retains mechanics, unknown fields, control and hook permissions exactly',()=>{
  const roster=[{character_id:'pc',user_id:'owner',presence:'present',control_policy:'player_only',proxy_user_id:null,
    accessibility:{screen_reader:true},sheet:{traits:{Agility:2},resources:{hope:3},domain_cards:['Native feature'],
      inventory:[{name:'Armor',slots:3}],hook_permissions:{pursuit:false},unrecognized_native_field:{value:5},
      background:'BACKGROUND',notes:'NOTES',appearance:'DESCRIPTION'}}];
  const before=structuredClone(roster),out=budget.partitionRosterContext(roster);
  for(const field of ['traits','resources','domain_cards','inventory','hook_permissions','unrecognized_native_field'])
    assert.deepEqual(out.roster[0].sheet[field],roster[0].sheet[field],field);
  assert.equal(out.roster[0].sheet.notes,undefined);assert.equal(out.background.length,3);
  assert.equal(out.roster[0].control_policy,'player_only');assert.deepEqual(out.roster[0].accessibility,roster[0].accessibility);
  assert.deepEqual(out.background.map(row=>row.value),['BACKGROUND','NOTES','DESCRIPTION']);
  assert(out.background.every(row=>row.visibility==='gm'&&row.character_id==='pc'&&row.user_id==='owner'&&row.content_hash));
  assert.deepEqual(roster,before,'Prompt projection must not edit characters.');
});

test('BUDGET nontext sheet fields and unidentified character data are never silently deferred',()=>{
  const rows=[{character_id:'pc',sheet:{notes:{native_rule:'Do not spend Hope'},appearance:['structured contract']}},
    {user_id:'missing-character',sheet:{notes:'Keep this field mandatory without native identity'}}];
  const packet=budget.partitionRosterContext(rows);
  assert.deepEqual(packet.roster.map(row=>row.sheet),rows.map(row=>row.sheet));assert.equal(packet.background.length,0);
});

test('BUDGET real oversized four-owner turn keeps one assembly detail and all native authority while omitting whole background fields',()=>nativeFixture(async f=>{
  for(const pc of f.pcs)f.db.updateCharacterData(pc.id,data=>{
    data.notes=`BACKGROUND-${pc.name}: `+'unrelated background '.repeat(2200);
    data.background='An old account. '.repeat(1200);data.hook_permissions={may_disclose:false};
    data.unknown_mechanical_contract={version:9,allowed:false};
  });
  f.db.setAssemblyPlan(f.session.id,{public_opening:'SAVED-ASSEMBLY-FULL '+ 'saved opening '.repeat(700),character_entries:[],gm_notes:'Keep private.'});
  const ai=new FakeResponses([response()]),gm=service(f,ai),source='I examine the terminal.',ledger={handled_spans:[],native_receipts:[],unresolved_spans:[{id:'span:0:23',text:source}]};
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data);
  await gm.runTurn({guildId:f.guild,actorUserId:f.pcs[0].owner_user_id,actorName:f.pcs[0].name,messageText:source,sourceText:source,nativeLedger:ledger});
  assert.equal(ai.requests.length,1);const req=ai.requests[0],parts=req.input.split('\n\n---\n\n');
  assert(req.input.length+req.instructions.length<120000);assert.match(req.input,/CONTEXT BUDGET/);
  assert.equal(req.input.split('SAVED-ASSEMBLY-FULL').length-1,1);
  const roster=JSON.parse(parts.find(part=>part.startsWith('ROSTER/PRESENCE:\n')).slice('ROSTER/PRESENCE:\n'.length));
  assert.equal(roster.length,4);
  for(const row of roster){assert(row.character_id);assert.equal(row.sheet.hook_permissions.may_disclose,false);
    assert.equal(row.sheet.unknown_mechanical_contract.allowed,false);assert(row.sheet.resources);assert(row.sheet.traits);}
  for(const label of ['NATIVE SOURCE-SPAN LEDGER','CURRENT COMBATANTS','SAVED GM RULINGS','PENDING NATIVE CONTINUATIONS',
    'PENDING NATIVE ACTION REVIEWS','AUTHENTICATED RAW PLAYER SOURCE'])assert(req.input.includes(label),label);
  assert(req.input.includes(JSON.stringify(ledger)));assert(req.input.includes(source));
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data),before);
}));

test('BUDGET unknown oversized mechanical fields still fail closed before the provider',()=>nativeFixture(async f=>{
  f.db.updateCharacterData(f.pcs[0].id,data=>{data.unrecognized_native_contract='x'.repeat(130000);});
  const ai=new FakeResponses([]),gm=service(f,ai);
  await assert.rejects(()=>gm.runTurn({guildId:f.guild,actorUserId:f.pcs[0].owner_user_id,actorName:f.pcs[0].name,
    messageText:'What now?'}),error=>error.code==='CONTEXT_OVERFLOW');
  assert.equal(ai.requests.length,0);
}));

test('BUDGET ordinary party/private turns retain complete background when it fits, without another request',()=>nativeFixture(async f=>{
  const pc=f.pcs[0];f.db.updateCharacterData(pc.id,data=>{data.notes='A patient mechanic who remembers the copper button.';});
  const ai=new FakeResponses([response(),response()]),gm=service(f,ai);
  for(const scope of ['party','private'])await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,
    messageText:'What do I remember about the copper button?',scope});
  assert.equal(ai.requests.length,2);
  for(const request of ai.requests){
    assert.equal(request.instructions.split(AUTHORITY_POLICY).length-1,1,'One complete policy, not duplicate fixed guidance.');
    assert(request.input.includes('A patient mechanic who remembers the copper button.'));
    assert(request.input.includes('CHARACTER BACKGROUND REFERENCE (GM-private; not mechanical authority)'));
    assert(request.input.includes(`character:${pc.id}:field:notes`));
  }
}));

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

test('STORAGE exact canonical native duplicates become local references without changing source/control/effect fields',()=>{
  const data={actor:'owner',visibility:'character',status:'pending',resources:{hp:{current:0,max:6}},consent:false};
  const original=[{label:'AI MANAGEMENT (GM-private proposals, policy, revisions and receipts; never actor knowledge)',required:true,
    value:{row:{source_event:'native-source',expected_revision:'current-revision',data,data_json:JSON.stringify(data)}}},
    {label:'AUTHENTICATED RAW PLAYER SOURCE (immutable; native-consumed spans are context only)',required:true,value:JSON.stringify(data)},
    {label:'NATIVE SOURCE-SPAN LEDGER (receipts prevent re-execution)',required:true,value:{data,data_json:JSON.stringify(data)}}];
  const before=structuredClone(original),out=budget.referenceTurnStorage(original,{guildId:'g'});
  assert.deepEqual(out[0].value.row.data,data);assert.deepEqual(out[0].value.row.data_json,{$json:'data'});
  assert.equal(out[0].value.row.source_event,'native-source');assert.equal(out[0].value.row.expected_revision,'current-revision');
  assert.deepEqual(out[1],original[1]);assert.deepEqual(out[2],original[2]);assert.deepEqual(original,before);
  assert(out.at(-1).required&&out.at(-1).label.startsWith('PROMPT STORAGE REFERENCES'));
});

test('STORAGE differently serialized, mismatched and unknown native fields are retained verbatim',()=>{
  const data={long:'x'.repeat(400)},value={data,data_json:JSON.stringify(data,null,2),details:data,details_json:JSON.stringify({long:'different'}),
    custom:data,custom_json:JSON.stringify(data)};
  const sections=[{label:'AI MANAGEMENT (GM-private proposals, policy, revisions and receipts; never actor knowledge)',value,required:true}];
  assert.deepEqual(budget.referenceTurnStorage(sections,{guildId:'g'}),sections);
});

test('STORAGE targeted facts reference only identical current same-guild mandatory details, never optional or conflicting material',()=>{
  const detail={id:'native-fact',guild_id:'g',visibility:'character',subject_character_id:'owner',archived:0,evidence_active:true,
    content:'Scoped evidence '.repeat(40),provenance_json:'{"source_refs":["native-source"]}'};
  const targeted={source_ref:detail.id,content:detail.content,provenance:detail.provenance_json};
  const sections=[{label:'GM-PRIVATE + ALL KNOWN FACTS (OBJECTIVE CAMPAIGN CONTEXT; DO NOT ASSUME NPCS KNOW THESE)',value:[detail],required:true},
    {label:'SCOPED INTERPRETATION (not authority)',value:{principal:{revision:'owner-revision'},targeted_sources:[targeted]},required:true}];
  const before=structuredClone(sections),scope={mode:'private',actorCharacterId:'owner',actorUserId:'u'},out=budget.referenceTurnStorage(sections,{guildId:'g',scope});
  assert.deepEqual(out[0],sections[0]);assert.equal(out[1].value.targeted_sources[0].source_ref,detail.id);
  assert.equal(out[1].value.targeted_sources[0].detail_ref.fact,detail.id);assert.deepEqual(out[1].value.principal,sections[1].value.principal);
  for(const field of ['guild_id','content','provenance_json','archived','evidence_active']){
    const changed=structuredClone(sections);changed[0].value[0][field]=field==='archived'?1:field==='evidence_active'?false:'different';
    assert.deepEqual(budget.referenceTurnStorage(changed,{guildId:'g',scope})[1].value.targeted_sources,[targeted]);
  }
  const optional=structuredClone(sections);optional[0].required=false;
  assert.deepEqual(budget.referenceTurnStorage(optional,{guildId:'g',scope})[1].value.targeted_sources,[targeted]);
  assert.deepEqual(budget.referenceTurnStorage(sections,{guildId:'g',scope:{mode:'party'}})[1].value.targeted_sources,[targeted]);
  assert.deepEqual(budget.referenceTurnStorage(sections,{guildId:'g',scope:{...scope,actorCharacterId:'other'}})[1].value.targeted_sources,[targeted]);
  assert.deepEqual(sections,before);
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
