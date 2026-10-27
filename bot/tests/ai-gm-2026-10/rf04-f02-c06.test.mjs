import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createNpcConversations} from '../../src/frameworks/npc/public.js';
import {cityObject,cityKey,cityAudit,requireCitySource,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {assertNpcAvailability} from '../../src/city-constraints.js';
import {actorState,submitNpcAction} from '../../src/simulation.js';
import {ContextPlanner} from '../../src/context-planner.js';
import {resolveNpcConversation as original} from '../../src/npc-conversations.js';

function meeting(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-npc-contact-c06-')),file=join(dir,'contact.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),proxy='',sound=true;db.ensureCampaign('canal');db.setCityCalendar('canal',{flags:{conversations:true}});indexWorldEvent(db,'canal',{key:'invitation',title:'An established contact opportunity',source_id:'gm:invitation'});
 for(const [key,name] of [['lockkeeper','Lockkeeper'],['courier','Courier']]){db.upsertNpcProfile('canal',{npcKey:key,displayName:name,portrayal:name+' attends to ordinary work.'});db.setSimulationEntity('canal','npc',key,{activity_tier:'supporting',location_key:'canal-side',resources:{influence:4,information:2}});db.upsertNpcGoal('canal',{npcKey:key,goalKey:'exchange',objective:'Exchange delivery information',acceptableMethods:['contact'],progress:0});}
 db.saveCityEdge('canal',{kind:'channel',from:'npc:lockkeeper',to:'npc:courier',source_event:'invitation',data:{mode:'telephone'}});
 db.upsertNpcKnowledge('canal',{npcKey:'lockkeeper',knowledgeKey:'barge-report',content:'A barge was reportedly delayed',beliefState:'rumor',confidence:50,sourceType:'witnessed',sourceRef:'invitation',isSecret:true});db.upsertNpcKnowledge('canal',{npcKey:'courier',knowledgeKey:'courier-secret',content:'Distinct courier-only knowledge',beliefState:'known',confidence:90,sourceType:'witnessed',sourceRef:'invitation',isSecret:true});
 const api=createNpcConversations({cityObject,cityKey,cityAudit,requireCitySource,activeCityProxy:(_db,_g,n)=>proxy===n?{user:'controller'}:null,assertNpcAvailability,actorState,submitNpcAction,ContextPlanner,sceneAccess:()=>sound});
 const input=(patch={})=>({key:'canal-contact',opportunity:'manual',from:'lockkeeper',to:'courier',from_goal:'exchange',to_goal:'exchange',source_event:'invitation',mode:'remote',...patch});const resolve=(patch={},roll=()=>20)=>api.resolveNpcConversation(db,'canal',input(patch),'human-gm',{roll});const influence=key=>db.getSimulationEntity('canal','npc',key).state.resources.influence;
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {api,get db(){return db;},input,resolve,influence,setProxy:v=>proxy=v,setSound:v=>sound=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('actual native contact spends its actor resource once and preserves private nonbinding receipt across restart',t=>{
 const f=meeting(t),result=f.resolve();assert.equal(result.visibility,'gm');assert.equal(result.data.outcome,'contacted');assert.equal(result.data.binding_agreement,false);assert.deepEqual(result.data.commitments_proposed,[]);assert.equal(f.influence('lockkeeper'),3);assert.equal(f.influence('courier'),4);assert.equal(f.db.getSimulationRecord('canal',result.data.action_id).data.result.success,true);f.reopen();assert.deepEqual(f.resolve(),result);assert.equal(f.influence('lockkeeper'),3);assert.equal(f.db.listSimulationRecords('canal',{kind:'action'}).length,1);assert.equal(f.db.listCanon('canal',{includeGM:true}).length,0);
});

test('real context planner keeps distinct subjective actor packets rather than pooling private knowledge',t=>{
 const f=meeting(t),result=f.resolve(),[left,right]=result.data.actor_packets;assert.equal(left.actor.key,'lockkeeper');assert.equal(right.actor.key,'courier');assert.match(JSON.stringify(left),/barge-report/);assert.doesNotMatch(JSON.stringify(left),/Distinct courier-only/);assert.match(JSON.stringify(right),/courier-secret/);assert.doesNotMatch(JSON.stringify(right),/reportedly delayed/);assert.match(left.authority,/subjective knowledge, not canon/);assert.equal(f.db.listWorldEvents('canal').length,0);
});

test('established autonomous refusal retains agency without rolling, spending or creating an agreement',t=>{
 const f=meeting(t);f.db.upsertNpcProfile('canal',{npcKey:'courier',displayName:'Courier',decisionProfile:{conversation_policy:'refuse'}});const row=f.resolve({},()=>{throw Error('refusal must not roll');});assert.equal(row.data.outcome,'refused');assert.equal(row.data.action_id,null);assert.equal(row.data.binding_agreement,false);assert.equal(f.influence('lockkeeper'),4);assert.equal(f.db.listSimulationRecords('canal',{kind:'action'}).length,0);
});

test('existing tick budget rejects a second conversation but never changes a saved first receipt on replay',t=>{
 const f=meeting(t),first=f.resolve();assert.throws(()=>f.resolve({key:'another-contact'}),/one per fictional tick/);assert.deepEqual(f.resolve(),first);assert.equal(f.influence('lockkeeper'),3);
});

test('in-person contact needs mutual current sound access before either actor can spend',t=>{
 const f=meeting(t);f.setSound(false);assert.throws(()=>f.resolve({mode:'in_person'}),/actual scene presence/);assert.equal(f.influence('lockkeeper'),4);f.setSound(true);assert.equal(f.resolve({mode:'in_person'}).data.outcome,'contacted');assert.equal(f.influence('lockkeeper'),3);
});

test('remote contact still needs its directed channel and established communication mode',t=>{
 const f=meeting(t);assert.throws(()=>f.resolve({from:'courier',to:'lockkeeper'}),/directed contact channel/);f.db.setCityCalendar('canal',{flags:{conversations:true,scene_continuity:true}});f.db.saveCityEdge('canal',{kind:'channel',from:'npc:lockkeeper',to:'npc:courier',source_event:'invitation',data:{mode:'unspecified'}});assert.throws(()=>f.resolve(),/Established remote communication mode/);assert.equal(f.influence('lockkeeper'),4);
});

test('current human proxy, dormant actor and incompatible goals independently hold contact without forced cooperation',t=>{
 const f=meeting(t);f.setProxy('courier');assert.throws(()=>f.resolve(),/non-proxied/);f.setProxy('');f.db.setSimulationEntity('canal','npc','courier',{activity_tier:'dormant',resources:{influence:4}});assert.throws(()=>f.resolve(),/unavailable/);f.db.setSimulationEntity('canal','npc','courier',{activity_tier:'supporting',resources:{influence:4}});f.db.upsertNpcGoal('canal',{npcKey:'courier',goalKey:'exchange',objective:'Work in silence',acceptableMethods:['prepare']});assert.throws(()=>f.resolve(),/contact-compatible/);assert.equal(f.influence('lockkeeper'),4);
});

test('unacquired information, retracted invitation, invalid opportunity and self-contact never manufacture a conversation',t=>{
 const f=meeting(t);assert.throws(()=>f.resolve({information_key:'courier-secret'}),/unknown to its speaker/);assert.throws(()=>f.resolve({opportunity:'wall-clock-timer'}),/Explicit fictional opportunity/);assert.throws(()=>f.resolve({to:'lockkeeper'}),/Two different/);indexWorldEvent(f.db,'canal',{key:'invitation',status:'retracted'});assert.throws(()=>f.resolve(),/active source event/);assert.equal(f.db.getCityRecord('canal','conversation','canal-contact'),null);assert.equal(f.influence('lockkeeper'),4);
});

test('unverified subjective lie is recorded as speech without asserting truth or creating a binding commitment',t=>{
 const f=meeting(t),row=f.resolve({lie:'I heard the route is clear',information_key:'barge-report'});assert.equal(row.data.unverified_speech,'I heard the route is clear');assert.equal(row.data.binding_agreement,false);assert.equal(f.db.getSimulationRecord('canal',row.data.action_id).data.information_key,'');assert.equal(f.db.listCanon('canal',{includeGM:true}).length,0);assert.equal(f.db.getNpcKnowledge('canal','courier','barge-report'),undefined);
});

test('failed actual opposed NPC action remains failed contact, not forced cooperation, while native cost is retained',t=>{
 const f=meeting(t);let call=0;const row=f.resolve({},()=>++call===1?1:20);assert.equal(row.data.outcome,'contact_failed');assert.equal(f.influence('lockkeeper'),3);assert.equal(row.data.binding_agreement,false);assert.equal(f.db.getSimulationRecord('canal',row.data.action_id).data.result.success,false);
});

test('conversation audit failure rolls actual action, relationship, memory, cost and receipt back together',t=>{
 const f=meeting(t),record=f.db.recordMutation;f.db.recordMutation=function(g,mutation){if(mutation.mutationType==='npc_conversation')throw Error('C06 contact audit failure');return record.call(this,g,mutation);};assert.throws(()=>f.resolve(),/C06 contact/);f.db.recordMutation=record;assert.equal(f.influence('lockkeeper'),4);assert.equal(f.db.listSimulationRecords('canal',{kind:'action'}).length,0);assert.equal(f.db.getCityRecord('canal','conversation','canal-contact'),null);assert.equal(f.db.listNpcMemories('canal','lockkeeper').length,0);assert.equal(f.db.listRelationships('canal',{includeGM:true}).length,0);assert.equal(f.resolve().data.outcome,'contacted');
});

test('actual original provider reaches moved contact policy and exact private receipt without provider or Discord use',t=>{
 const f=meeting(t),row=original(f.db,'canal',f.input(),'human-gm',{roll:()=>20});assert.equal(row.data.outcome,'contacted');assert.equal(row.visibility,'gm');assert.equal(f.influence('lockkeeper'),3);assert.equal(row.data.binding_agreement,false);
});
