import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createNpcStrategyRules} from '../../src/frameworks/npc/public.js';
import {cityObject,cityKey,cityInteger,cityAudit,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {actorSource} from '../../src/simulation-motivation.js';
import {ACTION_TYPES,ACTION_COSTS,actorState,submitNpcAction} from '../../src/simulation.js';
import {submitInstitutionAction,reviewInstitutionAction} from '../../src/city-core.js';
import {nativeWorldOperationAllows,nativeWorldOperationOrigin,nativeWorldStrategyAllowed,withNativeStrategyExecution} from '../../src/native-world-operations.js';
import * as original from '../../src/simulation-strategy.js';

function setup(t,overrides={}){
 const folder=mkdtempSync(join(tmpdir(),'rf04-plan-c03-')),file=join(folder,'plan.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);const delegated=[];
 db.ensureCampaign('table');db.setCityCalendar('table',{flags:{strategies:true}});
 indexWorldEvent(db,'table',{key:'notice',title:'Reported bridge inspection',source_id:'gm:notice',visibility:'gm'});
 db.upsertNpcProfile('table',{npcKey:'inspector',displayName:'Bridge Inspector'});
 db.setSimulationEntity('table','npc','inspector',{activity_tier:'supporting',location_key:'bridge',resources:{materials:4,information:2}});
 db.upsertNpcKnowledge('table',{npcKey:'inspector',knowledgeKey:'inspection-report',content:'An attributed report of bridge wear.',beliefState:'suspected',confidence:70,sourceType:'witnessed',sourceRef:'notice',isSecret:true});
 db.upsertNpcGoal('table',{npcKey:'inspector',goalKey:'inspect-bridge',objective:'Prepare an inspection of the reported wear',acceptableMethods:['prepare'],progress:0});
 const api=createNpcStrategyRules({cityObject,cityKey,cityInteger,cityAudit,submitInstitutionAction,reviewInstitutionAction,actorSource,ACTION_TYPES,ACTION_COSTS,actorState,submitNpcAction:(db,g,a,options)=>submitNpcAction(db,g,a,{...options,roll:options.roll||(()=>20)}),delegateStrategy:(...args)=>{delegated.push(args);return {status:'delegation_fixture'};},nativeWorldOperationAllows,nativeWorldOperationOrigin,nativeWorldStrategyAllowed,withNativeStrategyExecution,...overrides});
 const input=(patch={})=>({key:'inspection-plan',actor_type:'npc',actor_key:'inspector',goal_key:'inspect-bridge',information_key:'inspection-report',source_event:'notice',cost_ceiling:3,steps:[{key:'gather-tools',requires:[],action:{type:'prepare'}}],...patch});
 const manage=(patch={})=>api.manageStrategy(db,'table',input(patch),'human-gm');
 const activate=(patch={})=>{manage(patch);return api.manageStrategy(db,'table',{key:'inspection-plan',op:'approve'},'human-gm');};
 const step=(options={})=>api.executeStrategyStep(db,'table','inspection-plan',options);
 const resources=()=>db.getSimulationEntity('table','npc','inspector').state.resources;
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});
 return {api,get db(){return db;},input,manage,activate,step,resources,delegated,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('strategy proposal preserves a private subjective plan without resolving an action or spending resources',t=>{
 const f=setup(t),row=f.manage();assert.equal(row.status,'pending');assert.equal(row.visibility,'gm');assert.equal(row.data.authority,'subjective_plan_not_guaranteed_outcome');assert.equal(row.data.current_owner,'npc:inspector');assert.equal(row.data.revision,1);assert.equal(f.resources().materials,4);assert.equal(f.db.listSimulationRecords('table',{kind:'action'}).length,0);assert.deepEqual(f.manage(),row);assert.equal(f.db.listCanon('table',{includeGM:true}).length,0);
});

test('actual World action receipt determines cost and reconciliation once across SQLite restart',t=>{
 const f=setup(t);f.activate();const submitted=f.step(),id=submitted.data.steps[0].action_id,action=f.db.getSimulationRecord('table',id);assert.equal(submitted.data.steps[0].status,'submitted');assert.equal(submitted.data.spent,0);assert.equal(action.status,'completed');assert.equal(action.data.result.success,true);assert.deepEqual(action.data.result.resource_cost,{materials:1});assert.equal(f.resources().materials,3);f.reopen();const done=f.step();assert.equal(done.status,'completed');assert.equal(done.data.spent,1);assert.deepEqual(f.step(),done);assert.equal(f.resources().materials,3);assert.equal(f.db.listSimulationRecords('table',{kind:'action'}).length,1);assert.equal(f.db.listCanon('table',{includeGM:true}).length,0);
});

test('dependent steps submit and reconcile on separate opportunities without skipping native receipts',t=>{
 const f=setup(t);f.activate({steps:[{key:'tools',requires:[],action:{type:'prepare'}},{key:'checklist',requires:['tools'],action:{type:'prepare'}}]});let row=f.step();assert.equal(row.data.steps[1].status,'ready');row=f.step();assert.equal(row.data.steps[0].status,'completed');assert.equal(row.data.steps[1].status,'ready');assert.equal(f.resources().materials,3);row=f.step();assert.equal(row.data.steps[1].status,'submitted');assert.equal(row.data.spent,1);assert.equal(f.step().status,'completed');assert.equal(f.resources().materials,2);assert.equal(f.db.listSimulationRecords('table',{kind:'action'}).length,2);
});

test('delayed actual action is cancelled by pause with no resource payment or later automatic replay',t=>{
 const f=setup(t);f.activate({steps:[{key:'later-tools',requires:[],action:{type:'prepare',delay_minutes:10}}]});const submitted=f.step(),id=submitted.data.steps[0].action_id;assert.equal(f.db.getSimulationRecord('table',id).status,'scheduled');const paused=f.api.manageStrategy(f.db,'table',{key:'inspection-plan',op:'pause'},'human-gm');assert.equal(paused.status,'paused');assert.equal(paused.data.steps[0].status,'cancelled');assert.equal(f.db.getSimulationRecord('table',id).status,'rejected');assert.equal(f.resources().materials,4);assert.deepEqual(f.step(),paused);
});

test('pause after actual completion reconciles cost rather than cancelling or charging twice',t=>{
 const f=setup(t);f.activate();f.step();const row=f.api.manageStrategy(f.db,'table',{key:'inspection-plan',op:'pause'},'human-gm');assert.equal(row.data.spent,1);assert.equal(row.data.steps[0].status,'completed');assert.equal(f.resources().materials,3);f.api.manageStrategy(f.db,'table',{key:'inspection-plan',op:'resume'},'human-gm');assert.equal(f.step().status,'completed');assert.equal(f.resources().materials,3);
});

test('existing plan guards reject authority injection, PC targeting, cycles and disclosure substitution before saving',t=>{
 const f=setup(t);for(const action of [{type:'prepare',actor_key:'other'},{type:'prepare',approved:true},{type:'prepare',source_event:'notice'},{type:'attack',target_type:'character',target_key:'pc'},{type:'prepare',public_hook:'Publish this'},{type:'prepare',private_user_id:'another'}])assert.throws(()=>f.manage({steps:[{key:'invalid',requires:[],action}]}));assert.throws(()=>f.manage({steps:[{key:'cycle',requires:['cycle'],action:{type:'prepare'}}]}),/acyclic/);assert.equal(f.db.getCityRecord('table','strategy','inspection-plan'),null);assert.equal(f.resources().materials,4);
});

test('missing actor knowledge and native PC identity never become valid strategy ownership',t=>{
 const f=setup(t);assert.throws(()=>f.manage({information_key:'not-acquired'}),/legitimately acquired/);const pc=f.db.createCharacter('table','player','Player character');assert.throws(()=>f.manage({actor_key:pc.id}),/Player characters/);assert.equal(f.db.getCityRecord('table','strategy','inspection-plan'),null);
});

test('stale source blocks new execution durably without changing resources or prior receipt history',t=>{
 const f=setup(t);f.activate();indexWorldEvent(f.db,'table',{key:'notice',status:'retracted'});const held=f.step();assert.equal(held.status,'blocked');assert.match(held.data.error,/active source event/);assert.equal(f.resources().materials,4);assert.equal(f.db.listSimulationRecords('table',{kind:'action'}).length,0);f.reopen();assert.deepEqual(f.step(),held);
});

test('resource shortage and fictional deadline hold only the current plan without synthetic action outcomes',t=>{
 const f=setup(t);f.activate({deadline_minute:0});assert.match(f.step().data.error,/deadline/);assert.equal(f.resources().materials,4);f.db.saveCityRecord('table',{...f.db.getCityRecord('table','strategy','inspection-plan'),key:'inspection-plan',status:'active',data:{...f.input(),revision:1,spent:0,steps:[{key:'gather-tools',requires:[],status:'ready',action:{type:'prepare'}}]}});f.db.setSimulationEntity('table','npc','inspector',{activity_tier:'supporting',resources:{materials:0,information:2}});assert.match(f.step().data.error,/Resource shortage/);assert.equal(f.resources().materials,0);assert.equal(f.db.listSimulationRecords('table',{kind:'action'}).length,0);
});

test('audit failure rolls actual action, resource, goal progress and plan submission back before recording blocked state',t=>{
 const f=setup(t);f.activate();const record=f.db.recordMutation;f.db.recordMutation=function(guild,mutation){if(mutation.mutationType==='strategy_step')throw Error('C03 injected plan audit failure');return record.call(this,guild,mutation);};const held=f.step();f.db.recordMutation=record;assert.equal(held.status,'blocked');assert.match(held.data.error,/C03 injected/);assert.equal(held.data.steps[0].status,'ready');assert.equal(f.resources().materials,4);assert.equal(f.db.getNpcGoal('table','inspector','inspect-bridge').progress,0);assert.equal(f.db.listSimulationRecords('table',{kind:'action'}).length,0);
});

test('replan needs a new acquired source, immutable owner and objective, and never reuses executed step keys',t=>{
 const f=setup(t);f.activate();assert.throws(()=>f.manage({op:'replan'}),/material new/);f.step();indexWorldEvent(f.db,'table',{key:'followup',title:'New report',source_id:'gm:followup'});f.db.upsertNpcKnowledge('table',{npcKey:'inspector',knowledgeKey:'new-report',content:'Further attributed inspection information.',beliefState:'suspected',sourceType:'witnessed',sourceRef:'followup',isSecret:true});const patch={op:'replan',source_event:'followup',information_key:'new-report'};assert.throws(()=>f.manage(patch),/Reconcile the submitted/);f.api.manageStrategy(f.db,'table',{key:'inspection-plan',op:'pause'},'human-gm');f.api.manageStrategy(f.db,'table',{key:'inspection-plan',op:'resume'},'human-gm');assert.throws(()=>f.manage({...patch,actor_key:'other'}),/substitute its owner/);assert.throws(()=>f.manage(patch),/replay an already submitted/);const next=f.manage({...patch,steps:[{key:'new-check',requires:[],action:{type:'prepare'}}]});assert.equal(next.status,'pending');assert.equal(next.data.revision,2);assert.equal(next.data.history[0].steps[0].action_id!==undefined,true);assert.equal(next.data.spent,1);assert.equal(f.resources().materials,3);
});

test('Director pause and disabled strategies leave active plans and resources unchanged',t=>{
 const f=setup(t),row=f.activate();f.db.setDirectorPaused('table',true);assert.deepEqual(f.step(),row);assert.deepEqual(f.api.runStrategyOpportunity(f.db,'table',4),[]);f.db.setDirectorPaused('table',false);f.db.setCityCalendar('table',{flags:{}});assert.deepEqual(f.step(),row);assert.throws(()=>f.manage({key:'other-plan'}),/opt-in/);assert.equal(f.resources().materials,4);
});

test('serialized provenance cannot manufacture native execution or change the original accepted payload',t=>{
 const f=setup(t),row=f.manage({native_world_origin:{forged:true}});assert.equal(row.data.native_world_origin,undefined);assert.throws(()=>f.api.manageStrategy(f.db,'table',f.input(),'ai_policy',{nativeAuthority:{},nativePayload:{...f.input(),key:'other'}}),/saved plan key/);assert.throws(()=>f.api.manageStrategy(f.db,'table',f.input(),'ai_policy',{nativeAuthority:{},nativePayload:{...f.input(),op:'run'}}),/operation does not match/);assert.throws(()=>f.api.manageStrategy(f.db,'table',f.input(),'ai_policy',{nativeAuthority:{},nativePayload:{...f.input(),cost_ceiling:2}}),/definition differs/);assert.throws(()=>f.api.manageStrategy(f.db,'table',f.input(),'ai_policy',{nativeAuthority:{},nativePayload:f.input()}),/Exact current native/);assert.equal(f.resources().materials,4);
});

test('saved native-origin plan is held without its current receipt even while legacy strategies are enabled',t=>{
 const f=setup(t),active=f.activate();const saved=f.db.saveCityRecord('table',{...active,key:'inspection-plan',data:{...active.data,native_world_origin:{receipt_ref:'unsupported'}}});assert.deepEqual(f.step(),saved);assert.throws(()=>f.api.manageStrategy(f.db,'table',{key:'inspection-plan',op:'pause'},'ai_policy'),/exact current source/);assert.equal(f.resources().materials,4);
});

test('actor budget excludes duplicates and forwards only explicit delegated review to the mocked intent boundary',t=>{
 const f=setup(t),one=f.activate();f.db.saveCityRecord('table',{...one,key:'duplicate',data:{...one.data,key:'duplicate',reviewed_by:'ai_policy'}});assert.deepEqual(f.api.runStrategyOpportunity(f.db,'table',4,{excludedActors:new Set(['npc:inspector'])}),[]);const delegated=f.db.saveCityRecord('table',{...one,key:'inspection-plan',data:{...one.data,reviewed_by:'ai_policy'}});const budget={operations:2,cost:0};const rows=f.api.runStrategyOpportunity(f.db,'table',99,{delegationBudget:budget});assert.equal(rows.length,1);assert.equal(f.delegated.length,1);assert.ok(['duplicate',delegated.record_key].includes(f.delegated[0][2].record_key));assert.equal(f.delegated[0][2].data.reviewed_by,'ai_policy');assert.equal(f.delegated[0][3],budget);assert.equal(f.resources().materials,4);
});

test('original source exports reach the extracted proposal and lifecycle without a second policy implementation',t=>{
 const f=setup(t),pending=original.manageStrategy(f.db,'table',f.input(),'human-gm');assert.equal(pending.status,'pending');assert.equal(original.manageStrategy(f.db,'table',{key:'inspection-plan',op:'reject'},'human-gm').status,'rejected');assert.equal(original.executeStrategyStep(f.db,'table','inspection-plan').status,'rejected');assert.deepEqual(original.runStrategyOpportunity(f.db,'table',1),[]);const source=readFileSync(fileURLToPath(new URL('../../src/simulation-strategy.js',import.meta.url)),'utf8');assert.doesNotMatch(source,/function validatePlan/);
});
