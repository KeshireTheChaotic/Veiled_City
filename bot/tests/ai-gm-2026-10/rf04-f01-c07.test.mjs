import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createWorldSupply,supplyRevision,indexWorldEvent,createWorldAvailability} from '../../src/frameworks/world/public.js';
import {createActorControlRules} from '../../src/frameworks/daggerheart/public.js';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-world-supply-')),file=join(dir,'supply.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),proxy=false,knowledge=true,calls=0;
 const activeCityProxy=()=>proxy?{discord_user_id:'human'}:null;
 const native=createActorControlRules({capabilities:{activeCityProxy}}),availability=createWorldAvailability({nativeActorControl:native.nativeActorControl,activeCityProxy,delegationPolicy:()=>{throw Error('unexpected delegation read');},nativeWorldStrategyStepAllowed:()=>{throw Error('unexpected strategy read');}});
 const api=createWorldSupply({activeCityProxy,assertNpcAvailability:availability.assertNpcAvailability,actorSource(){calls++;if(!knowledge)throw Error('NPC source not known');}});
 db.ensureCampaign('g');db.setCityCalendar('g',{flags:{supply_dependencies:true}});
 for(const [key,materials] of [['sender',8],['receiver',2]]){db.upsertNpcProfile('g',{npcKey:key,displayName:key});db.setSimulationEntity('g','npc',key,{location_key:'harbor',resources:{materials,other:7}});}
 const event=(key,details={})=>indexWorldEvent(db,'g',{key,title:key,source_id:'gm:test',details});event('delivery',{resource_transfer:{from:'sender',to:'receiver',amount:3,resource:'materials',human_reviewed:true}});event('service-source');
 db.saveCityRecord('g',{kind:'infrastructure',key:'bridge',source_event:'service-source',data:{effective_condition:60}});
 const input=()=>({op:'transfer',source_event:'delivery',from:'sender',to:'receiver',amount:3,information_key:'delivery-known',from_revision:supplyRevision(db.getSimulationEntity('g','npc','sender')),to_revision:supplyRevision(db.getSimulationEntity('g','npc','receiver'))});
 const access=(patch={},id='access')=>db.saveCityRecord('g',{kind:'service_access',key:id,actor_key:'npc:receiver',source_event:'service-source',data:{consumer_type:'npc',consumer_key:'receiver',service_key:'bridge',actions:['repair'],threshold:50,access:true,...patch}});
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
 return {get db(){return db;},api,input,event,access,calls:()=>calls,setProxy:v=>proxy=v,setKnowledge:v=>knowledge=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('service validation accepts established world consumers and rejects PC, unknown service and untyped bounds',t=>{
 const f=fixture(t),data={consumer_type:'npc',consumer_key:'receiver',service_key:'bridge',actions:['repair'],threshold:50,access:true};
 assert.doesNotThrow(()=>f.api.validateServiceAccess(f.db,'g',data));
 for(const patch of [{consumer_type:'character'},{consumer_key:'unknown'},{service_key:'unknown'},{actions:[]},{actions:['spend_hope']},{threshold:101},{access:'yes'}])assert.throws(()=>f.api.validateServiceAccess(f.db,'g',{...data,...patch}));
});

test('service denial is opt-in and checks only relevant actions without changing resources',t=>{
 const f=fixture(t);f.access({access:false});const before=f.db.getSimulationEntity('g','npc','receiver');
 assert.throws(()=>f.api.assertServiceAccess(f.db,'g',{actor_type:'npc',actor_key:'receiver',type:'repair'}),/blocks this world action/);assert.doesNotThrow(()=>f.api.assertServiceAccess(f.db,'g',{actor_type:'npc',actor_key:'receiver',type:'travel'}));
 f.db.setCityCalendar('g',{flags:{supply_dependencies:false}});assert.doesNotThrow(()=>f.api.assertServiceAccess(f.db,'g',{actor_type:'npc',actor_key:'receiver',type:'repair'}));assert.deepEqual(f.db.getSimulationEntity('g','npc','receiver'),before);
});

test('effective service condition and both current sources revalidate before world action costs',t=>{
 const f=fixture(t);f.access({threshold:61});assert.throws(()=>f.api.assertServiceAccess(f.db,'g',{actor_type:'npc',actor_key:'receiver',type:'repair'}),/blocks/);f.access();assert.doesNotThrow(()=>f.api.assertServiceAccess(f.db,'g',{actor_type:'npc',actor_key:'receiver',type:'repair'}));
 indexWorldEvent(f.db,'g',{key:'service-source',status:'retracted'});assert.throws(()=>f.api.assertServiceAccess(f.db,'g',{actor_type:'npc',actor_key:'receiver',type:'repair'}),/active source/);
});

test('already adjudicated delivery changes only finite NPC materials with private immutable receipt and restart replay',t=>{
 const f=fixture(t),input=f.input();const result=f.api.transferSupply(f.db,'g',input,'gm-reviewer');
 assert.deepEqual(result.data.before,[8,2]);assert.deepEqual(result.data.after,[5,5]);assert.equal(result.visibility,'gm');assert.equal(result.data.reviewed_by,'gm-reviewer');assert.equal(f.calls(),1);assert.equal(f.db.getSimulationEntity('g','npc','sender').state.resources.other,7);
 const audits=f.db.mutationsForEntity('g',result.record_key);assert.equal(audits.length,1);assert.equal(audits[0].visibility,'gm');
 f.reopen();assert.deepEqual(f.api.transferSupply(f.db,'g',input,'someone-else'),result);assert.equal(f.calls(),1);assert.deepEqual(['sender','receiver'].map(k=>f.db.getSimulationEntity('g','npc',k).state.resources.materials),[5,5]);assert.equal(f.db.mutationsForEntity('g',result.record_key).length,1);
});

test('caller fields, amount and exact reviewed delivery evidence cannot forge a transfer',t=>{
 const f=fixture(t),input=f.input();for(const patch of [{authorized:true},{amount:4},{amount:0},{op:'grant'}])assert.throws(()=>f.api.transferSupply(f.db,'g',{...input,...patch},'gm'));
 f.event('unreviewed',{resource_transfer:{from:'sender',to:'receiver',amount:3,resource:'materials',human_reviewed:false}});assert.throws(()=>f.api.transferSupply(f.db,'g',{...input,source_event:'unreviewed'},'gm'),/Exact human-adjudicated/);
 assert.equal(f.db.getSimulationEntity('g','npc','sender').state.resources.materials,8);
});

test('NPC knowledge source failure, human proxy and native ownership hold without balance changes',t=>{
 const f=fixture(t),input=f.input();f.setKnowledge(false);assert.throws(()=>f.api.transferSupply(f.db,'g',input,'gm'),/not known/);f.setKnowledge(true);f.setProxy(true);assert.throws(()=>f.api.transferSupply(f.db,'g',input,'gm'),/non-proxied/);f.setProxy(false);
 const receiver=f.db.getSimulationEntity('g','npc','receiver');f.db.setSimulationEntity('g','npc','receiver',{...receiver.state,owner_control_type:'admin'});assert.throws(()=>f.api.transferSupply(f.db,'g',f.input(),'gm'),/rightful principal/);assert.equal(f.db.getSimulationEntity('g','npc','sender').state.resources.materials,8);
});

test('co-location must be actual and saved balance revisions cannot be reused after a source change',t=>{
 const f=fixture(t),input=f.input();f.db.setSimulationEntity('g','npc','receiver',{location_key:'market',resources:{materials:2}});assert.throws(()=>f.api.transferSupply(f.db,'g',f.input(),'gm'),/co-located/);
 f.db.setSimulationEntity('g','npc','receiver',{location_key:'harbor',resources:{materials:4}});assert.throws(()=>f.api.transferSupply(f.db,'g',input,'gm'),/balances changed/);assert.equal(f.db.getSimulationEntity('g','npc','sender').state.resources.materials,8);
});

test('finite balances reject insolvency, overflow and fractional resources before any write',t=>{
 const f=fixture(t);for(const [sender,receiver] of [[2,2],[8,99],[8,2.5]]){f.db.setSimulationEntity('g','npc','sender',{location_key:'harbor',resources:{materials:sender}});f.db.setSimulationEntity('g','npc','receiver',{location_key:'harbor',resources:{materials:receiver}});assert.throws(()=>f.api.transferSupply(f.db,'g',f.input(),'gm'),/Finite material balances/);assert.equal(f.db.getSimulationEntity('g','npc','sender').state.resources.materials,sender);}
});

test('audit failure rolls back both actual SQL balances and receipt; later retry succeeds once',t=>{
 const f=fixture(t),input=f.input(),original=f.db.recordMutation;f.db.recordMutation=()=>{throw Error('injected audit failure');};
 assert.throws(()=>f.api.transferSupply(f.db,'g',input,'gm'),/injected audit failure/);assert.deepEqual(['sender','receiver'].map(k=>f.db.getSimulationEntity('g','npc',k).state.resources.materials),[8,2]);assert.equal(f.db.getCityRecord('g','supply_transfer',supplyRevision(['delivery'])),null);
 f.db.recordMutation=original;assert.equal(f.api.transferSupply(f.db,'g',input,'gm').data.amount,3);assert.equal(f.db.getSimulationEntity('g','npc','sender').state.resources.materials,5);
});

test('original World source reader reaches moved validation and stable revision identity',async t=>{
 const f=fixture(t),source=await import('../../src/supply-dependencies.js');assert.equal(source.supplyRevision,supplyRevision);assert.throws(()=>source.validateServiceAccess(f.db,'g',{consumer_type:'character'}),/cannot be PCs/);f.access({access:false});assert.throws(()=>source.assertServiceAccess(f.db,'g',{actor_type:'npc',actor_key:'receiver',type:'repair'}),/blocks this world action/);
});
