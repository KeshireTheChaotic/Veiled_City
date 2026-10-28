import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createWorldOperationAuthority,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';
import * as original from '../../src/frameworks/world/public.js';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-world-authority-')),file=join(dir,'grants.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),ownerRevision='owner-v1',knowledge=true,calls=0;
 db.ensureCampaign('g');db.setCityCalendar('g',{flags:{narrative_authority:true,playable_narration:true}});
 for(const key of ['ai-policy:reviewed','known-event'])indexWorldEvent(db,'g',{key,title:key,source_id:'gm:test'});
 const policy={mode:'routine_delegated',revision:3,expires_minute:100,allow:['goal.propose','strategy.propose','strategy.run','consequence.subscribe'],private_allow:['goal.propose','strategy.propose','strategy.run']};
 db.saveCityRecord('g',{kind:'ai_delegation',key:'campaign',source_event:'ai-policy:reviewed',data:policy});
 const capabilities={actorSource(){calls++;if(!knowledge)throw Object.assign(Error('unknown NPC evidence'),{expected:true});},conversationPrincipal(){return {kind:'owner',revision:ownerRevision};},assertWorldActorControl(){throw Error('group path not configured in this fixture');}};
 const api=createWorldOperationAuthority(capabilities);
 const intent=(feature='goal',op='propose')=>({feature,policy_revision:3,target_key:'target',payload:{op,source_event:'known-event',actor_type:'npc',actor_key:'courier',goal_key:'deliver',information_key:'clue'}});
 const context=(scope={mode:'party'},receipt='receipt')=>({scope,nativeEffectKey:receipt});
 const setPolicy=patch=>db.saveCityRecord('g',{kind:'ai_delegation',key:'campaign',source_event:'ai-policy:reviewed',data:{...policy,...patch}});
 const accept=(proposal,grant,result,scope={mode:'party'},key='receipt')=>{const row=db.saveCityRecord('g',{kind:'ai_intent',key,status:'accepted',source_event:'known-event',data:{authority_origin:api.nativeWorldOperationOrigin(grant),intent:proposal,scope,result}});db.recordMutation('g',{actorType:'system',actorId:'ai_policy',sourceLayer:'city',mutationType:'ai_intent',entityKey:key,visibility:'gm',after:row});return row;};
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},api,capabilities,intent,context,setPolicy,accept,policy,calls:()=>calls,setKnowledge:v=>knowledge=v,setOwner:v=>ownerRevision=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}
function setupPlan(f,scope={mode:'party'}){
 const proposal=f.intent('strategy');proposal.target_key='';const grant=f.api.prepareNativeWorldOperation(f.db,'g',proposal,f.context(scope));const origin=f.api.nativeWorldOperationOrigin(grant);
 const data={actor_type:'npc',actor_key:'courier',goal_key:'deliver',information_key:'clue',source_event:'known-event',reviewed_by:'ai_policy',delegation_revision:3,revision:1,cost_ceiling:2,deadline_minute:80,steps:[{key:'look',status:'ready',requires:[],action:{type:'research',actor_type:'npc',actor_key:'courier',information_key:'clue',location_key:'harbor'}}]};
 const plan=f.db.saveCityRecord('g',{kind:'strategy',key:'route',source_event:'known-event',data:{...data,native_world_origin:origin}});f.accept(proposal,grant,{record_key:'route',data},scope);return plan;
}

test('configured readiness and operation catalog are read-only; pause and policy expiry remove readiness',t=>{
 const f=fixture(t);assert.equal(f.calls(),0);assert.equal(f.api.nativeWorldCoordinatorReady(f.db,'g','goal','propose'),true);const catalog=f.api.nativeWorldOperationCatalog(f.db,'g');assert.ok(catalog.some(r=>r.operation==='goal.propose'));assert.ok(catalog.every(r=>r.authority==='requires_exact_native_source_actor_scope_and_domain_validation'));assert.equal(f.calls(),0);
 f.db.setDirectorPaused('g',true);assert.equal(f.api.nativeWorldCoordinatorReady(f.db,'g','goal'),false);f.db.setDirectorPaused('g',false);f.setPolicy({expires_minute:0});assert.equal(f.api.nativeWorldCoordinatorReady(f.db,'g','goal'),false);
});

test('live native grant binds exact source, payload, operation and target; JSON clone is no capability',t=>{
 const f=fixture(t),intent=f.intent(),grant=f.api.prepareNativeWorldOperation(f.db,'g',intent,f.context());assert.ok(grant);assert.equal(f.api.nativeWorldOperationOrigin(grant).proposal_hash,hash(intent));assert.equal(f.calls(),1);assert.equal(f.api.nativeWorldOperationAllows(f.db,'g',grant,'goal','propose',{...intent.payload,key:'target'}),true);
 assert.equal(f.api.nativeWorldOperationAllows(f.db,'g',JSON.parse(JSON.stringify(grant)),'goal','propose',intent.payload),false);assert.equal(f.api.nativeWorldOperationOrigin({...grant}),null);
 for(const [feature,op,input] of [['goal','pause',intent.payload],['strategy','propose',intent.payload],['goal','propose',{...intent.payload,key:'other'}],['goal','propose',{...intent.payload,actor_key:'other'}]])assert.equal(f.api.nativeWorldOperationAllows(f.db,'g',grant,feature,op,input),false);
});

test('unavailable source, expired policy and denied operation cannot mint a grant',t=>{
 const f=fixture(t),intent=f.intent();assert.equal(f.api.prepareNativeWorldOperation(f.db,'g',{...intent,payload:{...intent.payload,source_event:'missing'}},f.context()),null);assert.equal(f.api.prepareNativeWorldOperation(f.db,'g',{...intent,policy_revision:4},f.context()),null);f.setPolicy({allow:[]});assert.equal(f.api.prepareNativeWorldOperation(f.db,'g',intent,f.context()),null);f.setPolicy({expires_minute:0});assert.equal(f.api.prepareNativeWorldOperation(f.db,'g',intent,f.context()),null);assert.equal(f.calls(),0);
});

test('unknown actor evidence is not rescued by model authority labels',t=>{
 const f=fixture(t);f.setKnowledge(false);assert.throws(()=>f.api.prepareNativeWorldOperation(f.db,'g',{...f.intent(),native:true,authorized:true},f.context()),/unknown NPC evidence/);assert.equal(f.calls(),1);
});

test('source, policy and Director changes invalidate already minted grant without state mutation',t=>{
 const f=fixture(t),intent=f.intent(),grant=f.api.prepareNativeWorldOperation(f.db,'g',intent,f.context());f.db.setDirectorPaused('g',true);assert.equal(f.api.nativeWorldOperationAllows(f.db,'g',grant,'goal','propose',intent.payload),false);f.db.setDirectorPaused('g',false);f.setPolicy({revision:4});assert.equal(f.api.nativeWorldOperationAllows(f.db,'g',grant,'goal','propose',intent.payload),false);f.setPolicy({});indexWorldEvent(f.db,'g',{key:'known-event',status:'retracted'});assert.equal(f.api.nativeWorldOperationAllows(f.db,'g',grant,'goal','propose',intent.payload),false);assert.equal(f.db.getCityRecord('g','goal_state','target'),null);
});

test('private grant requires explicit permission and revalidates current owner-principal revision',t=>{
 const f=fixture(t),intent=f.intent(),scope={mode:'private',actorUserId:'owner',actorCharacterId:'pc'};f.setPolicy({private_allow:[]});assert.equal(f.api.prepareNativeWorldOperation(f.db,'g',intent,f.context(scope)),null);f.setPolicy({});const grant=f.api.prepareNativeWorldOperation(f.db,'g',intent,f.context(scope));assert.ok(grant);f.setOwner('new-owner-control');assert.equal(f.api.nativeWorldOperationAllows(f.db,'g',grant,'goal','propose',intent.payload),false);
});

test('native service subscribe grant requires independently established bounded service evidence',t=>{
 const f=fixture(t),intent={feature:'consequence',target_key:'watch',policy_revision:3,payload:{op:'subscribe',handler:'service',entity_key:'bridge',source_event:'known-event',location_key:'harbor',delta:-5,event_kinds:['infrastructure_damage']}};
 assert.equal(f.api.prepareNativeWorldOperation(f.db,'g',intent,f.context()),null);f.db.saveCityRecord('g',{kind:'infrastructure',key:'bridge',source_event:'known-event',data:{locations:['harbor']}});assert.ok(f.api.prepareNativeWorldOperation(f.db,'g',intent,f.context()));assert.equal(f.api.prepareNativeWorldOperation(f.db,'g',{...intent,payload:{...intent.payload,event_kinds:['arbitrary']}},f.context()),null);assert.equal(f.calls(),0);
});

test('historical accepted receipt remains readable after current policy expiry and database reopen',t=>{
 const f=fixture(t),intent=f.intent(),grant=f.api.prepareNativeWorldOperation(f.db,'g',intent,f.context()),row=f.accept(intent,grant,{kind:'goal_state'});assert.equal(f.api.inspectNativeWorldOperationReceipt(f.db,'g',row),row);f.setPolicy({expires_minute:0});f.reopen();const saved=f.db.getCityRecord('g','ai_intent','receipt');assert.deepEqual(f.api.inspectNativeWorldOperationReceipt(f.db,'g',saved),saved);assert.equal(f.api.nativeWorldOperationAllows(f.db,'g',grant,'goal','propose',intent.payload),false);assert.equal(original.inspectNativeWorldOperationReceipt(f.db,'g',saved),saved);
});

test('tampered receipt ancestry and duplicate system audit are rejected; older reader route preserved',t=>{
 const f=fixture(t),intent=f.intent(),grant=f.api.prepareNativeWorldOperation(f.db,'g',intent,f.context()),row=f.accept(intent,grant,{});assert.throws(()=>f.api.inspectNativeWorldOperationReceipt(f.db,'g',{...row,data:{...row.data,intent:{...intent,policy_revision:99}}}),/ancestry changed/);
 f.db.recordMutation('g',{actorType:'system',actorId:'ai_policy',sourceLayer:'city',mutationType:'ai_intent',entityKey:'receipt',visibility:'gm',after:row});assert.throws(()=>f.api.inspectNativeWorldOperationReceipt(f.db,'g',row),/ancestry changed/);const historical={data:{older:true}};assert.equal(f.api.inspectNativeWorldOperationReceipt(f.db,'g',historical),historical);
});

test('saved strategy requires exact native receipt, blueprint and current private-owner evidence',t=>{
 const f=fixture(t),scope={mode:'private',actorUserId:'owner',actorCharacterId:'pc'},plan=setupPlan(f,scope);assert.equal(f.api.nativeWorldStrategyAllowed(f.db,'g',plan),true);assert.deepEqual(f.api.nativeWorldStrategyScope(f.db,'g',plan),scope);
 assert.equal(f.api.nativeWorldStrategyAllowed(f.db,'g',{...plan,data:{...plan.data,cost_ceiling:3}}),false);f.setOwner('new-owner');assert.equal(f.api.nativeWorldStrategyAllowed(f.db,'g',plan),false);assert.equal(f.api.nativeWorldStrategyScope(f.db,'g',plan),null);
});

test('execution frame authorizes only exact ready step and restores its previous frame after error or async result',t=>{
 const f=fixture(t),plan=setupPlan(f),action={...plan.data.steps[0].action,strategy_key:'route',strategy_revision:1};assert.equal(f.api.nativeWorldStrategyStepAllowed(f.db,'g',plan,action),false);
 const run=()=>{assert.equal(f.api.nativeWorldStrategyStepAllowed(f.db,'g',plan,action),true);assert.equal(f.api.nativeWorldStrategyStepAllowed(f.db,'g',plan,{...action,actor_key:'other'}),false);return 'done';};assert.equal(f.api.withNativeStrategyExecution(f.db,'g',null,plan,run),'done');assert.equal(f.api.nativeWorldStrategyStepAllowed(f.db,'g',plan,action),false);
 assert.throws(()=>f.api.withNativeStrategyExecution(f.db,'g',null,plan,()=>{throw Error('failed execution');}),/failed execution/);assert.equal(f.api.nativeWorldStrategyStepAllowed(f.db,'g',plan,action),false);assert.throws(()=>f.api.withNativeStrategyExecution(f.db,'g',null,plan,()=>Promise.resolve('uncommitted')),/must be synchronous/);assert.equal(f.api.nativeWorldStrategyStepAllowed(f.db,'g',plan,action),false);
});

test('source provider exposes same readiness/catalog and cannot treat independent service metadata as a live grant',t=>{
 const f=fixture(t);assert.equal(original.nativeWorldCoordinatorReady(f.db,'g','goal','propose'),true);assert.deepEqual(original.nativeWorldOperationCatalog(f.db,'g'),f.api.nativeWorldOperationCatalog(f.db,'g'));const grant=f.api.prepareNativeWorldOperation(f.db,'g',f.intent(),f.context());assert.equal(original.nativeWorldOperationOrigin(grant),null);assert.equal(f.api.nativeWorldOperationOrigin(grant).execution_authority,undefined);assert.equal(f.api.nativeWorldOperationOrigin(grant).feature,'goal');
});
