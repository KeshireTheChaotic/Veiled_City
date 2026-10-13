/** SEM01–03: production routing adapters, exact source retention and no lexical response authority. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {FakeResponses} from './contract-fixtures.mjs';
import fs from 'node:fs';
import {captureWorldInput} from '../src/autonomous-world.js';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {routeGameplayIntake,routerFailureEngagement,semanticResponseObligation} from '../src/gameplay-intake.js';

test('SEM02 mixed recall, idiomatic action and speech retain one immutable full-message ledger',async()=>{
  const text='Remind me about the terminal and I make for the exit, saying "See you outside."';
  const ledger=await routeGameplayIntake(text);
  assert.equal(ledger.source,text);assert.equal(ledger.remaining_text,text);
  assert.deepEqual(ledger.handled_spans,[]);assert.deepEqual(ledger.native_receipts,[]);
  assert.deepEqual(ledger.unresolved_spans,[{id:`span:0:${text.length}`,start:0,end:text.length,text}]);
});

test('SEM01/03 one semantic router sees idioms, needs, conditional examples and chatter without native effects',()=>nativeFixture(async f=>{
  const cases=[['I make for the exit',true],['An escape route would be useful; I examine the hinges.',true],
    ['PantryQueue barely covers rent these days.',true],['Nice hat, fellow player.',false],
    ['If I said "I promise", would that be funny?',false],['How does Armor apply to this incoming attack?',true],
    ['I need work (quoting the meme, fellow player).',false]];
  const ai=new FakeResponses(cases.map(([,respond])=>({respond,reason:'Synthetic semantic addressee decision.'})));
  const gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,config:{routerModel:'offline'}});
  const pc=f.pcs[0],resources=f.pcs.map(p=>f.db.getCharacter(p.id).data.resources);
  for(const [content,expected] of cases)assert.equal(await gm.shouldRespond({guildId:f.guild,mode:'assisted',
    message:{content,author:{id:pc.owner_user_id,username:pc.name}},actorAssignment:f.db.controlledAssignment(f.session.id,pc.owner_user_id)}),expected);
  assert.equal(ai.requests.length,cases.length);
  assert.deepEqual(f.pcs.map(p=>f.db.getCharacter(p.id).data.resources),resources);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0);
}));

test('SEM01 response duty uses grounded immediate typed proposals, not familiar verbs or quoted examples',()=>{
  const source='I make for the exit';
  const immediate={source_span:source,type:'move',framing:'immediate',resolution:'auto'};
  assert.equal(semanticResponseObligation(source,[immediate],{authenticated:true}).needed,true);
  assert.equal(semanticResponseObligation(source,[{...immediate,source_span:'invented'}],{authenticated:true}).needed,false);
  assert.equal(semanticResponseObligation('I enter the diner',[],{authenticated:true}).needed,false);
  for(const framing of ['quoted','conditional','hypothetical','reported'])
    assert.equal(semanticResponseObligation(source,[{...immediate,framing}],{authenticated:true}).needed,false);
  assert.equal(semanticResponseObligation(source,[immediate],{authenticated:false}).needed,false);
});

test('SEM01 router failure preserves authenticated input without interpreting an action or overriding explicit silence',()=>{
  for(const text of ['I make for the exit','PantryQueue barely covers rent.','Nice hat'])
    assert.equal(routerFailureEngagement(text,{authenticated:true,mode:'assisted'}),true);
  for(const text of ['OOC hello','(( hello','// hello',''])
    assert.equal(routerFailureEngagement(text,{authenticated:true,mode:'assisted'}),false);
  assert.equal(routerFailureEngagement('I make for the exit',{authenticated:true,mode:'mention'}),false);
  assert.equal(routerFailureEngagement('hello',{authenticated:false}),false);
});

test('SEM02 actual combined turn retains mixed recall, action and speech in one provider request',()=>nativeFixture(async f=>{
  const text='Remind me about the terminal; I examine the visible hinges; I say "See you outside."';
  const spans=['Remind me about the terminal','I examine the visible hinges','I say "See you outside."'];
  const ledger=await routeGameplayIntake(text),pc=f.pcs[0],messageId='v96-mixed-intake';
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,text);
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,
    {decision:'no_change',reason:'No mutation proposed.',confidence:100}]));
  state_review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  const response={respond:true,narration:'You can review what you already know. The hinges are in view; your farewell is heard.',
    world_additions:[],scene_actions:[],world_conflicts:[],narrative_interpretation:null,
    player_intents:spans.map(source_span=>({type:'other',source_span,target_name:'',target_key:'',destination:'unspecified',
      operation:'conversational',utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'No native effect requested.'})),
    context_memories:[],authored_candidates:null,narrative_claims:[],gm_world_parts:[],private_messages:[],events:[],
    handouts:[],relationships:[],npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],
    ai_intents:[],decision_advisory:null,state_review};
  const ai=new FakeResponses([response]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',routineGmModel:'offline',maxRecentMessages:5,maxContentChunks:1,contextInputBudget:100000}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,
    actorAssignment:f.db.controlledAssignment(f.session.id,pc.owner_user_id),messageText:ledger.remaining_text,
    sourceText:ledger.source,nativeLedger:ledger,scope:'party',messageId});
  assert.deepEqual(result.player_intents.map(row=>row.source_span),spans);assert.equal(ai.requests.length,1);
  assert(ai.requests[0].input.includes(text));
  const entry=fs.readFileSync('src/index.js','utf8');
  assert(entry.includes('return routeGameplayIntake(text)'));assert(!entry.includes('routeDiscoveryMessage'));
}));

test('SEM01 three simultaneous authenticated owners independently reach the existing router',()=>nativeFixture(async f=>{
  const ai=new FakeResponses(f.pcs.slice(0,3).map(()=>({respond:true,reason:'Independent current owner input.'})));
  const gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,config:{routerModel:'offline'}});
  const decisions=await Promise.all(f.pcs.slice(0,3).map(pc=>gm.shouldRespond({guildId:f.guild,mode:'assisted',
    message:{content:`${pc.name}: an escape route would be useful.`,author:{id:pc.owner_user_id,username:pc.name}},
    actorAssignment:f.db.controlledAssignment(f.session.id,pc.owner_user_id)})));
  assert.deepEqual(decisions,[true,true,true]);assert.equal(ai.requests.length,3);
}));

test('SEM03 rules-desk scope routes indirect requests and rejects chatter without requiring a keyword',()=>nativeFixture(async f=>{
  const ai=new FakeResponses([{respond:true,reason:'Indirect rules request.'},{respond:false,reason:'Table chatter.'}]);
  const gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,config:{routerModel:'offline'}});
  const message={content:'Explain spending the last defensive slot during a hit.',author:{id:f.pcs[0].owner_user_id}};
  assert.equal(await gm.shouldRespond({guildId:f.guild,message,mode:'active',channelScope:'rules'}),true);
  assert.equal(await gm.shouldRespond({guildId:f.guild,message:{...message,content:'Great pizza tonight'},mode:'active',channelScope:'rules'}),false);
  assert.equal(ai.requests.length,2);assert(ai.requests.every(row=>row.input.includes('configured read-only RULES DESK')));
  assert.equal(await gm.shouldRespond({guildId:f.guild,message:{...message,content:'OOC hello'},mode:'active',channelScope:'rules'}),false);
  assert.equal(ai.requests.length,2);
}));
