/** W3 construction only: real native producer and durable strategies, disposable SQLite, no providers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {configureDelegation,dispatchAiIntents,delegateStrategy} from '../src/ai-intents.js';
import {configureSimulationEntity,executeNpcAction} from '../src/simulation.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';
import {manageStrategy,executeStrategyStep,runStrategyOpportunity} from '../src/simulation-strategy.js';
import {nativeWorldStrategyAllowed,prepareNativeWorldOperation,nativeWorldStrategyStepAllowed} from '../src/native-world-operations.js';

function setup(f,{delay=0}={}){
  const {db,guild}=f;
  db.setCityCalendar(guild,{flags:{...db.getCityCalendar(guild).flags,narrative_authority:true,playable_narration:true,strategies:false}});
  const source=indexWorldEvent(db,guild,{key:'strategy-source',kind:'observation',title:'Known courier assignment',source_id:'fixture',visibility:'gm'},'fixture');
  for(const place of ['terminal','east'])configureSimulationEntity(db,guild,'location',place,{});
  db.upsertNpcProfile(guild,{npcKey:'courier',displayName:'Courier'});
  configureSimulationEntity(db,guild,'npc','courier',{location_key:'terminal',resources:{materials:2}});
  db.upsertNpcKnowledge(guild,{npcKey:'courier',knowledgeKey:'assignment',content:'A sourced delivery is needed.',
    beliefState:'known',sourceRef:source.event_key,confidence:90});
  db.upsertNpcGoal(guild,{npcKey:'courier',goalKey:'deliver',objective:'Deliver the parcel',acceptableMethods:['travel','prepare']});
  const policy=configureDelegation(db,guild,{mode:'routine_delegated',allow:['strategy.propose','strategy.run','strategy.pause',
    'strategy.resume','strategy.replan','strategy.abandon'],max_operations:4,max_cost:10,expires_minute:100},'fixture');
  const payload={actor_type:'npc',actor_key:'courier',information_key:'assignment',source_event:source.event_key,op:'propose',
    goal_key:'deliver',cost_ceiling:2,deadline_minute:90,steps:[{key:'deliver',requires:[],action:{type:'travel',
      target_type:'location',target_key:'east',location_key:'east',information_key:'assignment',reason:'Deliver the sourced parcel.',
      ...(delay?{delay_minutes:delay,delay_ticks:0}:{})}}],
    alternatives:[],assumptions:[]};
  const intent={version:1,feature:'strategy',target_key:'',expected_revision:'absent',policy_revision:policy.data.revision,
    source_prerequisites:[],payload},context={origin:'native-strategy-fixture',scope:{mode:'party'},sessionId:f.session.id};
  return {source,policy,intent,context};
}
function propose(f,x){
  const receipt=dispatchAiIntents(f.db,f.guild,[x.intent],x.context)[0];assert.equal(receipt.status,'accepted');
  const plans=f.db.listCityRecords(f.guild,{kind:'strategy',includeGM:true});assert.equal(plans.length,1);
  assert.equal(plans[0].status,'active');assert.equal(plans[0].data.reviewed_by,'ai_policy');
  assert.ok(plans[0].data.native_world_origin.receipt_ref);return {receipt,plan:plans[0]};
}
function lifecycle(f,x,plan,op){
  const intent={...x.intent,target_key:plan.record_key,expected_revision:hash(plan),payload:{...x.intent.payload,op}};
  return dispatchAiIntents(f.db,f.guild,[intent],{...x.context,origin:`native-strategy-${op}`})[0];
}

test('native producer activates flag-off plan, actual action spends once, restart replay never rerolls',()=>nativeFixture(f=>{
  const x=setup(f),pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),{receipt,plan}=propose(f,x);
  assert.equal(nativeWorldStrategyAllowed(f.db,f.guild,plan),true);
  assert.equal(delegateStrategy(f.db,f.guild,plan).status,'accepted');
  const submitted=f.db.getCityRecord(f.guild,'strategy',plan.record_key),actionId=submitted.data.steps[0].action_id;
  assert.ok(actionId);const action=f.db.getSimulationRecord(f.guild,actionId),resources=f.db.getSimulationEntity(f.guild,'npc','courier').state.resources;
  assert.equal(action.status,'completed');assert.equal(resources.materials,1);
  f.restart();assert.deepEqual(dispatchAiIntents(f.db,f.guild,[x.intent],x.context)[0],receipt);
  assert.deepEqual(executeNpcAction(f.db,f.guild,action,{roll:()=>{throw new Error('Historical action rerolled');}}),action);
  const settled=executeStrategyStep(f.db,f.guild,plan.record_key);
  assert.ok(['completed','blocked'].includes(settled.status));
  assert.equal(f.db.getSimulationEntity(f.guild,'npc','courier').state.resources.materials,1);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
  assert.equal(f.db.getCityCalendar(f.guild).flags.strategies,false);
}));

test('pause cancels actual delayed native action and forbids late resolver spending',()=>nativeFixture(f=>{
  const x=setup(f,{delay:10}),{plan}=propose(f,x);assert.equal(delegateStrategy(f.db,f.guild,plan).status,'accepted');
  const queued=f.db.getCityRecord(f.guild,'strategy',plan.record_key),id=queued.data.steps[0].action_id;
  assert.equal(f.db.getSimulationRecord(f.guild,id).status,'scheduled');
  assert.equal(lifecycle(f,x,queued,'pause').status,'accepted');
  assert.equal(f.db.getSimulationRecord(f.guild,id).status,'rejected');
  f.db.advanceSimulationClock(f.guild,{minutes:10});f.restart();
  assert.equal(executeNpcAction(f.db,f.guild,f.db.getSimulationRecord(f.guild,id)).status,'rejected');
  assert.equal(f.db.getSimulationEntity(f.guild,'npc','courier').state.resources.materials,2);
}));

for(const change of ['source','policy-expiry','manual','director-pause','player-control','missing-root'])
test(`native saved opportunity and queued action retain ${change} guard`,()=>nativeFixture(f=>{
  const x=setup(f,{delay:10}),{plan}=propose(f,x);assert.equal(delegateStrategy(f.db,f.guild,plan).status,'accepted');
  const current=f.db.getCityRecord(f.guild,'strategy',plan.record_key),id=current.data.steps[0].action_id;
  if(change==='source')indexWorldEvent(f.db,f.guild,{key:x.source.event_key,status:'retracted'},'fixture');
  if(change==='policy-expiry')f.db.advanceSimulationClock(f.guild,{minutes:100});
  if(change==='manual')f.db.saveCityRecord(f.guild,{kind:'gm_authority',key:'campaign',source_event:x.source.event_key,data:{gm_authority_mode:'manual'}});
  if(change==='director-pause')f.db.setDirectorPaused(f.guild,true);
  if(change==='player-control')configureSimulationEntity(f.db,f.guild,'npc','courier',{owner_control_type:'player'});
  if(change==='missing-root')f.db.db.prepare("UPDATE city_records SET status='rejected' WHERE guild_id=? AND record_key=?")
    .run(f.guild,current.data.native_world_origin.receipt_ref);
  assert.equal(nativeWorldStrategyAllowed(f.db,f.guild,f.db.getCityRecord(f.guild,'strategy',plan.record_key)),false);
  assert.deepEqual(runStrategyOpportunity(f.db,f.guild,1),[]);
  f.db.advanceSimulationClock(f.guild,{minutes:10});
  assert.throws(()=>executeNpcAction(f.db,f.guild,f.db.getSimulationRecord(f.guild,id),{roll:()=>20}));
  assert.equal(f.db.getSimulationEntity(f.guild,'npc','courier').state.resources.materials,2);
}));

test('flags and model origin JSON do not create opaque execution authority',()=>nativeFixture(f=>{
  const x=setup(f),payload={...x.intent.payload,key:'forged',native_world_origin:{kind:'native_ai_gm',receipt_ref:'made-up'}};
  for(const nativeAuthority of [null,{gm:true},{operation:'world.operation'}])assert.throws(()=>
    manageStrategy(f.db,f.guild,payload,'ai_policy',{nativeAuthority,nativePayload:x.intent.payload}));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'strategy',includeGM:true}).length,0);
}));

test('exact current native grant cannot substitute target key or plan owner',()=>nativeFixture(f=>{
  const x=setup(f),{plan}=propose(f,x),intent={...x.intent,target_key:plan.record_key,expected_revision:hash(plan),
    payload:{...x.intent.payload,op:'replan'}},grant=prepareNativeWorldOperation(f.db,f.guild,intent,x.context);
  assert.throws(()=>manageStrategy(f.db,f.guild,{...intent.payload,key:'another-plan'},'ai_policy',
    {nativeAuthority:grant,nativePayload:{...intent.payload,key:plan.record_key}}));
  assert.throws(()=>manageStrategy(f.db,f.guild,{...intent.payload,key:plan.record_key,actor_key:'different-owner'},'ai_policy',
    {nativeAuthority:grant,nativePayload:intent.payload}));
}));

test('private native strategy retains original owner scope through queued producer and restart',()=>nativeFixture(f=>{
  const x=setup(f,{delay:10}),pc=f.pcs[0];
  const policy=configureDelegation(f.db,f.guild,{mode:'routine_delegated',allow:x.policy.data.allow,
    private_allow:['strategy.propose','strategy.run'],max_operations:4,max_cost:10,expires_minute:100},'fixture');
  x.intent.policy_revision=policy.data.revision;
  x.context.scope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const {plan}=propose(f,x),attempt={...x.intent,target_key:plan.record_key,expected_revision:hash(plan),
    payload:{...x.intent.payload,op:'run'}};
  const rejected=dispatchAiIntents(f.db,f.guild,[attempt],{...x.context,origin:'cross-scope-plan-run',scope:{mode:'party'}})[0];
  assert.notEqual(rejected.status,'accepted');
  assert.equal(f.db.getCityRecord(f.guild,'strategy',plan.record_key).data.steps[0].action_id,undefined);
  const accepted=delegateStrategy(f.db,f.guild,plan);assert.equal(accepted.status,'accepted');
  assert.deepEqual(accepted.data.scope,x.context.scope);
  const queued=f.db.getCityRecord(f.guild,'strategy',plan.record_key),action=f.db.getSimulationRecord(f.guild,queued.data.steps[0].action_id);
  assert.equal(action.status,'scheduled');f.restart();
  assert.equal(nativeWorldStrategyAllowed(f.db,f.guild,f.db.getCityRecord(f.guild,'strategy',plan.record_key)),true);
  f.db.assignCharacter(f.session.id,pc.owner_user_id,pc.id,{controlPolicy:'player_only'});
  assert.equal(nativeWorldStrategyAllowed(f.db,f.guild,f.db.getCityRecord(f.guild,'strategy',plan.record_key)),false);
  assert.equal(delegateStrategy(f.db,f.guild,f.db.getCityRecord(f.guild,'strategy',plan.record_key)).status,'held');
  assert.equal(f.db.getSimulationRecord(f.guild,action.id).status,'scheduled');
  assert.equal(f.db.getSimulationEntity(f.guild,'npc','courier').state.resources.materials,2);
}));

test('queued consumer cannot borrow a native plan revision for a different actor, target or effect',()=>nativeFixture(f=>{
  const x=setup(f,{delay:10}),{plan}=propose(f,x);assert.equal(delegateStrategy(f.db,f.guild,plan).status,'accepted');
  const queued=f.db.getCityRecord(f.guild,'strategy',plan.record_key),action=f.db.getSimulationRecord(f.guild,queued.data.steps[0].action_id);
  assert.equal(nativeWorldStrategyStepAllowed(f.db,f.guild,queued,action.data),true);
  for(const patch of [{actor_key:'someone-else'},{target_key:'terminal'},{type:'attack'},{information_key:'another-source'}])
    assert.equal(nativeWorldStrategyStepAllowed(f.db,f.guild,queued,{...action.data,...patch}),false);
  assert.equal(f.db.getSimulationEntity(f.guild,'npc','courier').state.resources.materials,2);
  assert.equal(f.db.getSimulationRecord(f.guild,action.id).status,'scheduled');
}));
