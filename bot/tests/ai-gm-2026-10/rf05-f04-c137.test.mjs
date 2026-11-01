import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewInbox} from '../../src/frameworks/operations/public.js';
import {operationsIntentContext} from '../../src/frameworks/operations/public.js';
import {connectOperationsIntentPolicy,connectOperationsIntentContext} from '../../src/framework-to-framework/intent--operations/public.js';
import {intentContext,intentWorldOperations,intentNativeEncounter,intentKnowledgeMaintenance} from '../../src/frameworks/intent/public.js';

function bind(port,overrides={},extras={}){
 const source={};for(const [name,d] of Object.entries(Object.getOwnPropertyDescriptors(port)))if(name!=='bind'&&typeof d.value==='function')source[name]=()=>[];
 port.bind({...source,...overrides,...extras});
}
bind(intentWorldOperations,{nativeWorldOperationCatalog:()=>[]});
bind(intentNativeEncounter,{encounterProposalContext:()=>[]},{EncounterLibrary:class{}});
bind(intentKnowledgeMaintenance,{reconcileHistory:()=>({status:'original'})});

test('Operations review uses the current public Intent context with GM-only queries and no widened capabilities',()=>{
 assert.throws(()=>operationsIntentContext.intentContext({},'g'),{code:'OPERATIONS_INTENT_CONTEXT_COMPOSITION'});
 connectOperationsIntentPolicy();assert.equal(connectOperationsIntentContext(),operationsIntentContext);connectOperationsIntentContext();
 const reads=[],flags={dialogue_enabled:true};let policy={mode:'manual',revision:1,allow:['dialogue.interpret'],expires_minute:null};
 let row={record_key:'private-intent',kind:'ai_intent',status:'pending',data:{diagnostic:'GM private source'}};
 const db={getCityRecord(guild,kind,key){assert.equal(this,db);assert.deepEqual([guild,kind,key],['g','ai_delegation','campaign']);return {data:policy};},
  listCityRecords(guild,options){assert.equal(this,db);assert.equal(guild,'g');reads.push(options);return options.kind==='ai_intent'?[row]:[];},
  getCityCalendar:()=>({flags}),getActiveSession:()=>null,listNpcProfiles:()=>[],isDirectorPaused:()=>false,getSimulationClock:()=>({minute:4})};
 const result=reviewInbox(db,'g',{}, {dialogue:'dialogue_enabled'});
 assert.equal(result.visibility,'gm');assert.equal(result.items[0].data.diagnostic,'GM private source');
 assert.equal(result.eligibility[0].enabled,true);assert.equal(result.eligibility[0].delegation,'manual');
 assert.deepEqual(result.operator_context,intentContext(db,'g'));
 assert.equal(result.operator_context.policy,policy);
 assert.deepEqual(reads[0],{kind:'ai_intent',status:'',includeGM:true,limit:21,offset:0});
 assert.ok(reads.every(options=>options.includeGM===true));
 policy={...policy,revision:2,mode:'suggest_only'};row={...row,data:{diagnostic:'new current source'}};
 const refreshed=reviewInbox(db,'g',{}, {dialogue:'dialogue_enabled'});
 assert.equal(refreshed.operator_context.policy.revision,2);assert.equal(refreshed.items[0].data.diagnostic,'new current source');
 const failure=new Error('current read unavailable');
 assert.throws(()=>operationsIntentContext.intentContext({...db,getActiveSession(){throw failure;}},'g'),error=>error===failure);
 assert.throws(()=>operationsIntentContext.bind({intentContext(){}}),/replacement forbidden/);
 assert.deepEqual(Object.keys(operationsIntentContext).sort(),['bind','intentContext']);
});
