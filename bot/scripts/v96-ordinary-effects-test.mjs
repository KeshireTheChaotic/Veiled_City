/** EFX01–04: real native prerequisites and adapters, private review, current proof and exactly-once publication. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {captureWorldInput} from '../src/autonomous-world.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {applyAuthoritativeMutation} from '../src/state.js';
import {actionFixture} from './v96-action-fixture.mjs';
import {establishWorldDescription} from '../src/world-observation.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision} from '../src/roll-requests.js';
import {configureDelegation,stateRevision,reviewAiIntent} from '../src/ai-intents.js';
import {ordinaryEffectProjection} from '../src/ordinary-effect-proof.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene} from '../src/scene-continuity.js';
import {actionReviewInbox,actionReviewOperation} from '../src/gm-action-review.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {ordinaryEffectContext} from '../src/ordinary-effects.js';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {FakeResponses} from './contract-fixtures.mjs';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {windowOperation} from '../src/window-coordinator.js';
import path from 'node:path';

function npcFollow(f,{fear=false,unresolved=false}={}){
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});
  const x=actionFixture(f);x.run();
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,emergent_goals:true}});
  f.db.upsertNpcProfile(f.guild,{npcKey:'attendant',displayName:'Attendant'});
  f.db.setSimulationEntity(f.guild,'npc','attendant',{location_key:'terminal',resources:{information:2}});
  f.db.upsertNpcKnowledge(f.guild,{npcKey:'attendant',knowledgeKey:'cart',content:'The file cart is within reach.',sourceRef:x.evidence.event_key,beliefState:'known',confidence:90});
  const goal=f.db.upsertNpcGoal(f.guild,{npcKey:'attendant',goalKey:'inspect-cart',title:'Inspect cart',objective:'Inspect the file cart.',priority:20,status:'active',acceptableMethods:['observe']});
  const policy=configureDelegation(f.db,f.guild,{mode:'routine_delegated',allow:['goal.reprioritize'],private_allow:['goal.reprioritize'],
    max_operations:2,max_cost:0,expires_minute:f.db.getSimulationClock(f.guild).minute+60},'fixture-gm');
  const q=f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true})[0];
  if(!unresolved){let values=fear?[1,2]:[12,12];contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:q.record_key,
    expected_revision:rollRevision(q),key:'actual-native-action'},{rng:()=>values.shift()});}
  const a=f.db.getCityRecord(f.guild,'typed_intent',q.data.input.accepted_intent);
  const intent={version:1,feature:'goal',target_key:'inspect-cart',expected_revision:stateRevision(goal),policy_revision:policy.data.revision,
    source_prerequisites:[x.evidence.event_key],payload:{source_event:x.evidence.event_key,op:'reprioritize',actor_type:'npc',actor_key:'attendant',
      information_key:'cart',goal_key:'inspect-cart',new_goal_key:'',objective:'',reason:'A current cart observation matters to the attendant.',
      priority:80,confidence:90,horizon:'immediate',dependencies:[],acceptable_methods:['observe'],conflicts:[]}};
  const proposal={version:1,accepted_intent_ref:a.record_key,effect_class:'npc_intent',adapter:'delegated',prerequisite_ref:a.data.outcome_receipt||'',
    payload_json:JSON.stringify({when:fear?'failure_fear':'success',intent})};
  return {x,a,proposal,q};
}

function observed(f){
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal',visibility:'party'});
  const x=actionFixture(f,'I examine the weather outside.');
  Object.assign(x.ruling,{disposition:'narrative_no_roll',effect_class:'observation',trait:null,difficulty:null,risk:'none',stakes:'none'});
  Object.assign(x.intent,{type:'observe',resolution:'auto'});x.run();
  const a=f.db.listCityRecords(f.guild,{kind:'typed_intent',includeGM:true})[0];
  const fact=establishWorldDescription(f.db,f.guild,'fixture-gm',{entity_type:'location',entity_key:'terminal',location_key:'terminal',
    visibility:'party',facts:{weather:'rain'}},{gm:true,interactionId:'weather'});
  const proposal={version:1,accepted_intent_ref:a.record_key,effect_class:'observation',adapter:'observation',prerequisite_ref:a.data.outcome_receipt,
    payload_json:JSON.stringify({when:'no_roll',query:{target_type:'location',target:'terminal',operation:'appearance'}})};
  return {x,a,fact,proposal};
}
function follow(f,x,proposals){
  return applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,scope:x.scope,provenance:{messageId:x.messageId},
    narrative:{player_intents:[],narrative_claims:[],ordinary_effect_proposals:proposals}});
}

test('EFX native no-roll observation commits a separate exact effect receipt and safe projection once',()=>nativeFixture(f=>{
  const {x,a,proposal}=observed(f),before=f.db.getCharacter(x.pc.id).data;
  const result=follow(f,x,[proposal]);
  assert.equal(result.ordinaryEffects?.[0]?.status,'applied');
  const receipt=f.db.listCityRecords(f.guild,{kind:'ordinary_effect_receipt',includeGM:true})[0];
  assert.equal(receipt.data.action,a.record_key);assert.equal(receipt.data.prerequisite,a.data.outcome_receipt);
  assert.match(receipt.data.text,/rain/);assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);
  f.restart();follow(f,x,[proposal]);assert.equal(f.db.listCityRecords(f.guild,{kind:'ordinary_effect_receipt',includeGM:true}).length,1);
}));

for(const fear of [false,true])test(`EFX saved ${fear?'failure-Fear':'Critical success'} advances one native NPC intention, not PC reactions or dice`,()=>nativeFixture(f=>{
  const {x,a,proposal,q}=npcFollow(f,{fear}),before=f.db.getCharacter(x.pc.id).data.resources,
    saved=f.db.getCityRecord(f.guild,'roll_request',q.record_key),original=f.db.getCityRecord(f.guild,'action_outcome_receipt',a.data.outcome_receipt);
  const result=follow(f,x,[proposal]);assert.equal(result.ordinaryEffects[0].status,'applied');
  assert.equal(f.db.getNpcGoal(f.guild,'attendant','inspect-cart').priority,80);
  assert.equal(result.ordinaryEffects[0].visibility,'gm','Native NPC motivation is not player knowledge.');
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.deepEqual(f.db.getCityRecord(f.guild,'roll_request',q.record_key),saved);
  assert.deepEqual(f.db.getCityRecord(f.guild,'action_outcome_receipt',a.data.outcome_receipt),original);
  f.restart();follow(f,x,[proposal]);assert.equal(f.db.listCityRecords(f.guild,{kind:'ordinary_effect_receipt',includeGM:true}).length,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'ai_intent',includeGM:true}).length,1);
}));

test('EFX completed-action review remains inspectable; GM cannot convert unsupported power into authority',()=>nativeFixture(f=>{
  const {x,a,proposal}=observed(f);proposal.adapter='unsupported';proposal.effect_class='special';
  follow(f,x,[proposal]);const item=actionReviewInbox(f.db,f.guild,x.pc.owner_user_id)[0];
  assert.equal(item.current_source,true);assert.equal(item.status,'needs_review');
  const before=f.db.getCharacter(x.pc.id).data;
  const reviewed=windowOperation(f.db,f.guild,'fixture-gm',{op:'action-review-effect-retry',review:item.review,revision:item.revision},{gm:true});
  assert.equal(reviewed.status,'needs_review');assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);
  assert.equal(f.db.getCityRecord(f.guild,'typed_intent',a.record_key).status,'resolved');
}));

test('EFX mismatched stored terms cannot borrow another exact native effect receipt',()=>nativeFixture(f=>{
  const {x,proposal}=npcFollow(f),receipt=follow(f,x,[proposal]).ordinaryEffects[0];
  const data=structuredClone(receipt.data);data.payload.intent.payload.priority=99;
  f.db.saveCityRecord(f.guild,{...receipt,key:receipt.record_key,data});
  assert.throws(()=>ordinaryEffectProjection(f.db,f.guild,receipt.record_key,{...x.scope,mode:'private'}),/effect|terms|payload/i);
}));

test('EFX private native result cannot be widened by relabeling the saved effect audience',()=>nativeFixture(f=>{
  const {x,proposal}=observed(f),privateX={...x,scope:{...x.scope,mode:'private'}},receipt=follow(f,privateX,[proposal]).ordinaryEffects[0];
  assert.equal(receipt.visibility,'character');
  f.db.saveCityRecord(f.guild,{...receipt,key:receipt.record_key,visibility:'party',subject_key:null});
  assert.throws(()=>ordinaryEffectProjection(f.db,f.guild,receipt.record_key,x.scope),/effect|audience/i);
}));

for(const change of ['source','world-source','scene','owner','fact'])test(`EFX ${change} invalidation holds projection after restart without reversing the legitimate effect`,()=>nativeFixture(f=>{
  const {x,a,fact,proposal}=observed(f),receipt=follow(f,x,[proposal]).ordinaryEffects[0],before=f.db.getCharacter(x.pc.id).data;
  if(change==='source')indexWorldEvent(f.db,f.guild,{key:a.source_event,status:'retracted'},'fixture-gm');
  if(change==='world-source')indexWorldEvent(f.db,f.guild,{key:a.data.world_source_event,status:'retracted'},'fixture-gm');
  if(change==='fact')indexWorldEvent(f.db,f.guild,{key:fact.source_event,status:'retracted'},'fixture-gm');
  if(change==='scene')f.db.setDirectorState(f.session.id,{scene_number:2});
  if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,x.pc.id);
  f.restart();assert.throws(()=>ordinaryEffectProjection(f.db,f.guild,receipt.record_key,x.scope));
  assert.equal(f.db.getCityRecord(f.guild,'ordinary_effect_receipt',receipt.record_key).status,'applied');
  if(change!=='owner')assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);
}));

test('EFX unsupported sibling stays in review while independent evidence-backed observation completes',()=>nativeFixture(f=>{
  const {x,proposal}=observed(f),bad={...proposal,adapter:'unsupported',effect_class:'special'};
  const rows=follow(f,x,[bad,proposal]).ordinaryEffects;assert.deepEqual(rows.map(r=>r.status),['needs_review','applied']);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'ordinary_effect_receipt',includeGM:true}).length,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'unsupported_action',includeGM:true}).length,1);
}));

test('EFX pending real roll resumes exact follow-through once, without choosing optional spends',()=>nativeFixture(f=>{
  const {x,proposal,q}=npcFollow(f,{unresolved:true}),before=f.db.getCharacter(x.pc.id).data.resources;
  const held=follow(f,x,[proposal]).ordinaryEffects[0];assert.equal(held.status,'needs_review');
  assert.equal(f.db.getNpcGoal(f.guild,'attendant','inspect-cart').priority,20);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
  contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:'owner-native-roll'},{rng:()=>12});
  const saved=f.db.getCityRecord(f.guild,'roll_request',q.record_key),resources=f.db.getCharacter(x.pc.id).data.resources;
  f.restart();assert.equal(follow(f,x,[proposal]).ordinaryEffects[0].status,'applied');
  assert.equal(f.db.getCityRecord(f.guild,'unsupported_action',held.record_key).status,'resolved');
  follow(f,x,[proposal]);assert.deepEqual(f.db.getCityRecord(f.guild,'roll_request',q.record_key),saved);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
}));

test('EFX GM retry and owner withdrawal remain nonauthorizing through real native review controls',()=>nativeFixture(f=>{
  const {x,proposal}=observed(f);proposal.adapter='unsupported';proposal.effect_class='special';follow(f,x,[proposal]);
  let item=actionReviewInbox(f.db,f.guild,x.pc.owner_user_id)[0];
  assert.throws(()=>windowOperation(f.db,f.guild,x.pc.owner_user_id,{op:'action-review-effect-retry',review:item.review,revision:item.revision,gm:true}),/closed/i);
  assert.throws(()=>actionReviewOperation(f.db,f.guild,x.pc.owner_user_id,{op:'action-review-effect-retry',review:item.review,revision:item.revision}),/GM/);
  assert.throws(()=>actionReviewOperation(f.db,f.guild,f.pcs[1].owner_user_id,{op:'action-review-effect-withdraw',review:item.review,revision:item.revision}));
  assert.throws(()=>actionReviewOperation(f.db,f.guild,x.pc.owner_user_id,{op:'action-review-withdraw',review:item.review,revision:item.revision}),/scoped effect/);
  const a=f.db.getCityRecord(f.guild,'typed_intent',proposal.accepted_intent_ref);
  const terminal=windowOperation(f.db,f.guild,x.pc.owner_user_id,{op:'action-review-effect-withdraw',review:item.review,revision:item.revision});
  assert.equal(terminal.status,'withdrawn');assert.deepEqual(f.db.getCityRecord(f.guild,'typed_intent',a.record_key),a);
  assert.throws(()=>actionReviewOperation(f.db,f.guild,x.pc.owner_user_id,{op:'action-review-effect-withdraw',review:item.review,revision:item.revision}),/terminal/);
}));

test('EFX native observation uses actual commit/outbox, holds revoked delivery and preserves independently committed receipts',()=>nativeFixture(async f=>{
  const {x,proposal,fact}=observed(f),id='effect-publication',pc=x.pc;
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,'What did I find?');
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:id,actorPrincipal:pc.owner_user_id,audience:'party'});
  const result={respond:true,narration:'Choso surrenders and is injured.',narrative_claims:[],player_intents:[],ordinary_effect_proposals:[proposal]};
  const mutation=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:pc.name,label:'EFX fixture',
    meta:{messageId:id,turnId:attempt.turn_id,channelId:'offline-play'}});
  assert.equal(mutation.ordinaryEffects[0].status,'applied');
  const rows=f.db.listTurnPublications(f.guild,attempt.turn_id);assert(rows.some(r=>r.payload.includes('rain')));
  assert(rows.every(r=>!r.payload.includes('surrenders')&&!r.payload.includes('injured')));
  indexWorldEvent(f.db,f.guild,{key:fact.source_event,status:'retracted'},'fixture-gm');f.restart();let sends=0;
  await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,async()=>{sends++;return {messageId:'never',channelId:'offline-play'};});
  assert.equal(sends,0);assert.equal(f.db.getCityRecord(f.guild,'ordinary_effect_receipt',mutation.ordinaryEffects[0].record_key).status,'applied');
}));

test('EFX combined GM context locates the current owner party action without including another character source',()=>nativeFixture(f=>{
  const {x,a}=npcFollow(f);f.accepted(1,'I quietly examine my own private clue.',null);
  const ctx=ordinaryEffectContext(f.db,f.guild,x.scope);
  assert(ctx.some(v=>v.action===a.record_key));assert(ctx.every(v=>!(v.source_excerpt||v.source_span||'').includes('private clue')));
}));

test('EFX real combined GM preview rolls back follow-through; commit publishes only the entitled private observation once',()=>nativeFixture(async f=>{
  const {x,proposal}=npcFollow(f),id='combined-follow-through',text='I wait to see what follows.';
  establishWorldDescription(f.db,f.guild,'fixture-gm',{entity_type:'location',entity_key:'terminal',location_key:'terminal',visibility:'party',facts:{weather:'rain'}},{gm:true,interactionId:'roll-visible-weather'});
  proposal.adapter='observation';proposal.effect_class='observation';proposal.payload_json=JSON.stringify({when:'success',query:{target_type:'location',target:'terminal',operation:'appearance'}});
  captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,id,text);
  const review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(c=>[c,{decision:'no_change',reason:'Native effect has its separate receipt.',confidence:100}]));
  review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  const raw={respond:true,narration:'Choso apologizes for losing.',player_intents:[{type:'other',source_span:text,target_name:'',target_key:'',
    destination:'unspecified',operation:'wait',utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Context only.'}],
    narrative_claims:[],ordinary_effect_proposals:[proposal],narrative_interpretation:null,authored_candidates:null,decision_advisory:null,state_review:review};
  for(const field of ['gm_world_parts','world_additions','scene_actions','world_conflicts','context_memories','private_messages','events','handouts',
    'relationships','npc_memories','npc_knowledge','npc_goals','canon_proposals','simulation_updates','ai_intents'])raw[field]=[];
  const ai=new FakeResponses([raw]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',routineGmModel:'offline',maxRecentMessages:2,maxContentChunks:1,contextInputBudget:100000}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,messageId:id,messageText:text,
    actorAssignment:f.db.controlledAssignment(f.session.id,x.pc.owner_user_id)});
  assert.equal(ai.requests.length,1);assert.equal(f.db.getNpcGoal(f.guild,'attendant','inspect-cart').priority,20);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'ordinary_effect_receipt',includeGM:true}).length,0);
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:id,actorPrincipal:x.pc.owner_user_id,audience:'party'});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:x.pc.name,label:'EFX combined',
    meta:{messageId:id,turnId:attempt.turn_id,channelId:'offline-play'}});
  assert.equal(f.db.getNpcGoal(f.guild,'attendant','inspect-cart').priority,20);
  const rows=f.db.listTurnPublications(f.guild,attempt.turn_id);
  assert(rows.some(r=>r.visibility==='character'&&r.target_user_id===x.pc.owner_user_id&&r.payload.includes('rain')));
  assert(rows.filter(r=>r.visibility==='party').every(r=>!r.payload.includes('rain')&&!r.payload.includes('apologizes')));
  f.restart();let sends=0;const send=async()=>{sends++;return {messageId:`effect-${sends}`,channelId:'offline-channel'};};
  await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,send);await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,send);
  assert.equal(sends,rows.length);assert.equal(f.db.listCityRecords(f.guild,{kind:'ordinary_effect_receipt',includeGM:true}).length,1);
}));

test('EFX current exact source-clause locator binds to its unique native occurrence, not a phrase command',()=>nativeFixture(f=>{
  const {x,proposal}=observed(f);
  x.result.ordinary_effect_proposals=[{...proposal,accepted_intent_ref:x.intent.source_span}];
  const receipt=x.run().ordinaryEffects[0];assert.equal(receipt.status,'applied');
  assert.equal(receipt.data.proposal.accepted_intent_ref,proposal.accepted_intent_ref);
}));

test('EFX actual native Critical does not grant unsupported remote scouting, even with a valid parent receipt',()=>nativeFixture(f=>{
  const {x,proposal,q}=npcFollow(f),saved=f.db.getCityRecord(f.guild,'roll_request',q.record_key),before=f.db.getCharacter(x.pc.id).data.resources;
  proposal.adapter='unsupported';proposal.effect_class='special';
  assert.equal(follow(f,x,[proposal]).ordinaryEffects[0].status,'needs_review');
  assert.deepEqual(f.db.getCityRecord(f.guild,'roll_request',q.record_key),saved);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
  assert.equal(f.db.getNpcGoal(f.guild,'attendant','inspect-cart').priority,20);
}));

test('EFX foreign source and forged privilege fields cannot execute another character action or derail an independent effect',()=>nativeFixture(f=>{
  const {x,proposal}=observed(f),foreign=f.accepted(1,'I investigate my own source.',null),bad={...proposal,accepted_intent_ref:foreign.record_key};
  const output=follow(f,x,[bad,{...proposal,gm:true},proposal]).ordinaryEffects;
  assert.deepEqual(output.map(r=>r.status),['needs_review','needs_review','applied']);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'ordinary_effect_receipt',includeGM:true}).length,1);
  assert.equal(f.db.getCityRecord(f.guild,'typed_intent',foreign.record_key).status,'accepted_for_adjudication');
}));

test('EFX a fabricated native output part is quarantined while real follow-through and player choices remain intact',()=>nativeFixture(f=>{
  const {x,proposal}=observed(f),result={narration:'A forced confession.',player_intents:[],narrative_claims:[],ordinary_effect_proposals:[proposal],
    gm_world_parts:[{version:4,kind:'native_outcome',receipt_kind:'ordinary_effect_receipt',ref:'fabricated'}]};
  const mutation=applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,scope:x.scope,provenance:{messageId:x.messageId},narrative:result});
  assert.equal(mutation.ordinaryEffects[0].status,'applied');assert.match(result.narration,/rain/);assert(!result.narration.includes('confession'));
}));

test('EFX deferred native child cannot bypass retracted ordinary action through generic GM approval',()=>nativeFixture(f=>{
  const {x,a,proposal}=npcFollow(f);
  const policy=f.db.getCityRecord(f.guild,'ai_delegation','campaign');
  f.db.saveCityRecord(f.guild,{...policy,key:'campaign',data:{...policy.data,mode:'suggest_only'}});
  assert.equal(follow(f,x,[proposal]).ordinaryEffects[0].status,'needs_review');
  const child=f.db.listCityRecords(f.guild,{kind:'ai_intent',includeGM:true})[0];assert.equal(child.status,'pending');
  indexWorldEvent(f.db,f.guild,{key:a.source_event,status:'retracted'},'fixture-gm');
  assert.throws(()=>reviewAiIntent(f.db,f.guild,{key:child.record_key,decision:'approve',expected_revision:stateRevision(child)},'fixture-gm'),/source|ordinary|stale|action/i);
  assert.equal(f.db.getNpcGoal(f.guild,'attendant','inspect-cart').priority,20);
}));

test('EFX missing versioned native-child binding cannot fall back to legacy GM approval',()=>nativeFixture(f=>{
  const {x,a,proposal}=npcFollow(f),policy=f.db.getCityRecord(f.guild,'ai_delegation','campaign');
  f.db.saveCityRecord(f.guild,{...policy,key:'campaign',data:{...policy.data,mode:'suggest_only'}});follow(f,x,[proposal]);
  const child=f.db.listCityRecords(f.guild,{kind:'ai_intent',includeGM:true})[0],data={...child.data};delete data.ordinary_effect;
  const changed=f.db.saveCityRecord(f.guild,{...child,key:child.record_key,data});
  indexWorldEvent(f.db,f.guild,{key:a.source_event,status:'retracted'},'fixture-gm');
  assert.throws(()=>reviewAiIntent(f.db,f.guild,{key:changed.record_key,decision:'approve',expected_revision:stateRevision(changed)},'fixture-gm'),/ordinary|binding|source|action/i);
  assert.equal(f.db.getNpcGoal(f.guild,'attendant','inspect-cart').priority,20);
}));

test('EFX internal NPC motivation remains GM-only; causing an effect does not reveal its hidden plan',()=>nativeFixture(f=>{
  const {x,proposal}=npcFollow(f),receipt=follow(f,x,[proposal]).ordinaryEffects[0];
  assert.equal(receipt.visibility,'gm');
  assert.throws(()=>ordinaryEffectProjection(f.db,f.guild,receipt.record_key,{...x.scope,mode:'private'}),/audience|effect/);
}));

test('EFX matched native failure-Fear service consequence advances once without new dice or resource banking',()=>nativeFixture(f=>{
  const {x,a}=npcFollow(f,{fear:true}),s=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,consequences:true}});
  const source=indexWorldEvent(f.db,f.guild,{key:'actual-cable-damage',kind:'infrastructure_damage',source_id:'fixture-gm',
    title:'Established local cable damage',truth_status:'observed',visibility:'party',location_key:'terminal',session_id:s.session_id,scene:s.key},'fixture-gm');
  f.db.saveCityRecord(f.guild,{kind:'infrastructure',key:'power',source_event:source.event_key,data:{service:'power',locations:['terminal'],
    native_condition:100,condition:100,capacity:10,load:0,repair_requirements:[]}});
  const c=f.db.saveCityRecord(f.guild,{kind:'consequence',key:'power-damage',source_event:source.event_key,status:'pending',
    data:{handler:'service',entity_key:'power',payload:{delta:-1},causal_path:[]}});
  const policy=configureDelegation(f.db,f.guild,{mode:'routine_delegated',allow:['consequence.apply'],private_allow:['consequence.apply'],
    max_operations:2,max_cost:2,expires_minute:f.db.getSimulationClock(f.guild).minute+60},'fixture-gm');
  const intent={version:1,feature:'consequence',target_key:c.record_key,expected_revision:stateRevision(c),policy_revision:policy.data.revision,
    source_prerequisites:[source.event_key],payload:{source_event:source.event_key,op:'apply',handler:'service',entity_key:'power',
      event_kinds:['infrastructure_damage'],location_key:'terminal',delta:-1}};
  const p={version:1,accepted_intent_ref:a.record_key,effect_class:'environment',adapter:'delegated',prerequisite_ref:a.data.outcome_receipt,
    payload_json:JSON.stringify({when:'failure_fear',intent})},before=f.db.getCharacter(x.pc.id).data.resources,campaign=f.db.getCampaign(f.guild);
  const mismatched=structuredClone(p),wrong=JSON.parse(mismatched.payload_json);wrong.intent.payload.delta=-3;mismatched.payload_json=JSON.stringify(wrong);
  assert.equal(follow(f,x,[mismatched]).ordinaryEffects[0].status,'needs_review','Proposed delta must match the actual native consequence.');
  assert.equal(f.db.getCityRecord(f.guild,'infrastructure','power').data.native_condition,100);
  const receipt=follow(f,x,[p]).ordinaryEffects[0];assert.equal(receipt.status,'applied');
  assert.equal(f.db.getCityRecord(f.guild,'infrastructure','power').data.native_condition,99);
  f.restart();follow(f,x,[p]);assert.equal(f.db.getCityRecord(f.guild,'infrastructure','power').data.native_condition,99);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.deepEqual(f.db.getCampaign(f.guild),campaign);
}));

test('EFX native scene record materializes only exact independently established fields, without moving a PC',()=>nativeFixture(f=>{
  const {x,a}=observed(f),s=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scene_continuity:true}});
  const material={entity_type:'barrier',entity_key:'shutter',location_key:'terminal',zone:'platform',to_zone:'concourse',range:'Very Close',
    state:'actually_present',hidden:false,known_to:[],visibility:'party',subject_key:'',blocks:['sight']};
  const source=indexWorldEvent(f.db,f.guild,{key:'observed-shutter',kind:'observation',source_id:'fixture-gm',title:'Current physical shutter',
    truth_status:'observed',visibility:'party',location_key:'terminal',session_id:s.session_id,scene:s.key,
    details:{entity_key:'shutter',scene_effect:material}},'fixture-gm');
  const policy=configureDelegation(f.db,f.guild,{mode:'routine_delegated',allow:['scene.record'],max_operations:2,max_cost:0,
    expires_minute:f.db.getSimulationClock(f.guild).minute+60},'fixture-gm');
  const intent={version:1,feature:'scene',target_key:'shutter',expected_revision:'absent',policy_revision:policy.data.revision,
    source_prerequisites:[source.event_key],payload:{source_event:source.event_key,op:'record',...material}};
  const p={version:1,accepted_intent_ref:a.record_key,effect_class:'access',adapter:'delegated',prerequisite_ref:a.data.outcome_receipt,
    payload_json:JSON.stringify({when:'no_roll',intent})},before=f.db.getCharacter(x.pc.id).data;
  const bad=structuredClone(p),terms=JSON.parse(bad.payload_json);terms.intent.payload.blocks=['sound'];bad.payload_json=JSON.stringify(terms);
  assert.equal(follow(f,x,[bad]).ordinaryEffects[0].status,'needs_review');
  const receipt=follow(f,x,[p]).ordinaryEffects[0];assert.equal(receipt.status,'applied');
  assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'ordinary_effect_receipt',includeGM:true}).length,1);
}));

test('EFX replayed mutable intent metadata cannot move a saved roll causal origin to a different location',()=>nativeFixture(f=>{
  const {x,a,proposal}=npcFollow(f),s=currentScene(f.db,f.guild);
  f.db.setSimulationEntity(f.guild,'location','elsewhere',{name:'Elsewhere'});
  f.db.updateCharacterData(x.pc.id,d=>{d.location='elsewhere';});
  persistPlayerIntents(f.db,f.guild,[x.intent],x.scope,{messageId:x.messageId});
  f.db.setSimulationEntity(f.guild,'npc','attendant',{location_key:'elsewhere',resources:{information:2}});
  const current=indexWorldEvent(f.db,f.guild,{key:'elsewhere-cart',kind:'observation',source_id:'fixture-gm',title:'Another cart',
    truth_status:'observed',visibility:'party',location_key:'elsewhere',session_id:s.session_id,scene:s.key},'fixture-gm');
  f.db.upsertNpcKnowledge(f.guild,{npcKey:'attendant',knowledgeKey:'elsewhere',content:'A different cart is here.',sourceRef:current.event_key,beliefState:'known'});
  const payload=JSON.parse(proposal.payload_json);payload.intent.payload.source_event=current.event_key;
  payload.intent.payload.information_key='elsewhere';payload.intent.source_prerequisites=[current.event_key];proposal.payload_json=JSON.stringify(payload);
  assert.equal(follow(f,x,[proposal]).ordinaryEffects[0].status,'needs_review');
  assert.equal(f.db.getNpcGoal(f.guild,'attendant','inspect-cart').priority,20);
  assert.equal(f.db.getCityRecord(f.guild,'typed_intent',a.record_key).status,'resolved');
}));

test('EFX malformed source locator is a scoped diagnostic, never a storage exception or independent-action deadlock',()=>nativeFixture(f=>{
  const {x,proposal}=observed(f);
  const result=follow(f,x,[{...proposal,accepted_intent_ref:{model_owned:true}},{...proposal,accepted_intent_ref:'nonexistent-native-action'},proposal]);
  assert.deepEqual(result.ordinaryEffects.map(r=>r.status),['needs_review','needs_review','applied']);
}));

test('EFX missing exact source offsets cannot authorize follow-through by implicit slice coercion',()=>nativeFixture(f=>{
  const {x,a,proposal}=observed(f),data={...a.data};delete data.start;
  f.db.saveCityRecord(f.guild,{...a,key:a.record_key,data});
  assert.equal(follow(f,x,[proposal]).ordinaryEffects[0].status,'needs_review');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'ordinary_effect_receipt',includeGM:true}).length,0);
}));

test('EFX unsupported follow-through is durably held, not silently dropped or authorized by claimed Critical',()=>nativeFixture(f=>{
  const pc=f.pcs[0],text='I improvise a diversion with the file cart.',messageId='ordinary-effect-review';
  const scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,text);
  const intent={type:'interact',source_span:text,target_name:'',target_key:'',destination:'unspecified',
    operation:'improvise_diversion',utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Attempt, not an outcome.'};
  const [accepted]=persistPlayerIntents(f.db,f.guild,[intent],scope,{messageId});
  const before=structuredClone(f.db.getCharacter(pc.id).data);
  applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,scope,provenance:{messageId},
    narrative:{player_intents:[intent],narrative_claims:[],ordinary_effect_proposals:[{
      version:1,accepted_intent_ref:accepted.record_key,effect_class:'special',adapter:'unsupported',
      prerequisite_ref:'model-claimed-critical',payload_json:JSON.stringify({ability:'remote shadow scouting',hope:12,fear:12})
    }]}});
  assert.deepEqual(f.db.getCharacter(pc.id).data,before,'No model claim changes PC state.');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0,'No invented result or extra roll.');
  const held=f.db.listCityRecords(f.guild,{kind:'unsupported_action',includeGM:true})
    .filter(row=>row.data.effect_proposal?.accepted_intent_ref===accepted.record_key);
  assert.equal(held.length,1,'Unsupported follow-through needs one source-bound durable review, not silent omission.');
  assert.equal(held[0].status,'needs_review');assert.equal(held[0].visibility,'gm');
  assert.equal(held[0].source_event,accepted.source_event);
}));
