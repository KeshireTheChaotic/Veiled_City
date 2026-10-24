import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWorldAvailability} from '../../src/frameworks/world/public.js';
import {StateConflictError} from '../../src/kernel/errors.js';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-world-availability-')),file=join(dir,'actors.sqlite');let sql;
 const open=()=>{sql=new DatabaseSync(file);sql.exec('CREATE TABLE IF NOT EXISTS sources(g TEXT,k TEXT,id TEXT,body TEXT,PRIMARY KEY(g,k,id))');};open();
 const put=(k,id,body,g='g')=>sql.prepare('INSERT OR REPLACE INTO sources VALUES(?,?,?,?)').run(g,k,id,JSON.stringify(body));
 const get=(k,id,g='g')=>{const r=sql.prepare('SELECT body FROM sources WHERE g=? AND k=? AND id=?').get(g,k,id);return r?JSON.parse(r.body):null;};
 const all=(k,g='g')=>sql.prepare('SELECT body FROM sources WHERE g=? AND k=? ORDER BY rowid').all(g,k).map(r=>JSON.parse(r.body));
 let calls=0;const db={getActiveSession:()=>null,listNpcProxies:()=>[],getCharacter:key=>get('pc',key),getSimulationEntity:(g,type,key)=>get(type,key,g),getSimulationClock:g=>get('clock','current',g),overlappingCommitment:(g,key)=>get('commitment',key,g),cityEdges:(g,k)=>all('edge:'+k,g),listCityRecords:(g,o)=>all(o.kind,g).filter(r=>r.actor_key===o.actor).slice(0,o.limit),getCityRecord:(g,k,id)=>get(k,id,g),getCityCalendar:g=>get('calendar','current',g),queuedActorActions:(g,key)=>all('queue',g).filter(r=>r.entity_key===key),getWorldEvent:(g,key)=>get('event',key,g)};
 const capabilities={nativeActorControl(gdb,g,type,key){calls++;return get('control',type+':'+key,g)||{owner_control_type:'ai_world'};},activeCityProxy(gdb,g,key){calls++;return get('proxy',key,g);},delegationPolicy(gdb,g){calls++;return get('delegation','current',g);},nativeWorldStrategyStepAllowed(gdb,g,plan,action){calls++;return get('native-strategy',plan.record_key,g)?.allowed===true;}};
 const api=createWorldAvailability(capabilities);put('clock','current',{minute:40});put('calendar','current',{flags:{conflict_mediation:true,strategies:true}});put('npc','porter',{state:{location_key:'harbor'}});
 t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
 return {db,api,put,get,calls:()=>calls,reopen(){sql.close();open();},snapshot:()=>sql.prepare('SELECT * FROM sources ORDER BY g,k,id').all()};
}
const action={id:'mine',entity_key:'npc:porter',data:{type:'travel',location_key:'square'}};
function plan(f,changes={}){f.put('strategy','route',{record_key:'route',status:'active',source_event:'event:route',data:{revision:3,...changes}});f.put('event','event:route',{status:'active'});return {...action,data:{...action.data,strategy_key:'route',strategy_revision:3}};}

test('factory is inert and eligible autonomous availability does not mutate world or PC state',t=>{
 const f=fixture(t);assert.equal(f.calls(),0);const before=f.snapshot();assert.equal(f.api.assertWorldActorControl(f.db,'g','npc','porter'),'ai_world');assert.equal(f.api.assertNpcAvailability(f.db,'g','porter',{type:'research',location_key:'harbor'}),undefined);assert.deepEqual(f.snapshot(),before);
});

test('current native ownership and PC identity prevent autonomous takeover',t=>{
 const f=fixture(t);for(const control of ['human_proxy','player','human_gm']){f.put('control','npc:porter',{owner_control_type:control});assert.throws(()=>f.api.assertNpcAvailability(f.db,'g','porter',{}),StateConflictError);}
 f.put('pc','porter',{guild_id:'g',owner_id:'owner'});assert.throws(()=>f.api.assertWorldActorControl(f.db,'g','npc','porter'),/Player characters/);
});

test('human proxy, removed lifecycle and incompatible commitment remain current blockers',t=>{
 const f=fixture(t);f.put('proxy','porter',{discord_user_id:'human'});assert.throws(()=>f.api.assertNpcAvailability(f.db,'g','porter',{}),/human NPC proxy/);f.put('proxy','porter',null);
 for(const state of [{removed:true},{status:'dead'},{status:'removed'}]){f.put('npc','porter',{state});assert.throws(()=>f.api.assertNpcAvailability(f.db,'g','porter',{}),/Dead or removed/);}
 f.put('npc','porter',{state:{location_key:'harbor'}});f.put('commitment','npc:porter',{record_key:'appointment',location_key:'harbor'});
 assert.throws(()=>f.api.assertNpcAvailability(f.db,'g','porter',{location_key:'square'}),/incompatible/);assert.doesNotThrow(()=>f.api.assertNpcAvailability(f.db,'g','porter',{location_key:'harbor'}));
});

test('route duration uses actual source position and does not move the actor',t=>{
 const f=fixture(t);f.put('edge:route','road',{from_key:'harbor',to_key:'square',duration_minutes:12});
 assert.throws(()=>f.api.assertNpcAvailability(f.db,'g','porter',{type:'travel',location_key:'square',delay_minutes:11}),/shorter/);assert.doesNotThrow(()=>f.api.assertNpcAvailability(f.db,'g','porter',{type:'travel',location_key:'square',delay_minutes:12}));assert.equal(f.get('npc','porter').state.location_key,'harbor');
});

test('routine suggestions remain private preferences distinct from actual position after restart',t=>{
 const f=fixture(t);f.put('routine','shift',{actor_key:'porter',data:{intervals:[{start:40,end:50,location_key:'square'},{start:0,end:40,location_key:'elsewhere'}]}});f.put('commitment','npc:porter',{record_key:'appointment',location_key:'harbor'});f.reopen();const result=f.api.npcAvailability(f.db,'g','porter');
 assert.equal(result.location_key,'harbor');assert.equal(result.preferences.length,1);assert.equal(result.preferences[0].location_key,'square');assert.equal(result.current_commitment,'appointment');assert.equal(result.authority,'routine_preferences_are_not_actual_position');assert.equal(f.get('npc','porter').state.location_key,'harbor');
});

test('personnel delegation requires active matching role, capacity and absence of dissent or human proxy',t=>{
 const f=fixture(t),institution={record_key:'watch',data:{personnel:['officer']}},input={key:'order',type:'patrol',personnel_key:'officer',location_key:'harbor'},role={status:'active',data:{institution:'watch',npc:'porter',actions:['patrol'],capacity:1}};
 assert.throws(()=>f.api.assertInstitutionDelegation(f.db,'g',institution,input),/No established personnel/);
 f.put('personnel','officer',role);assert.doesNotThrow(()=>f.api.assertInstitutionDelegation(f.db,'g',institution,input));
 for(const patch of [{capacity:0},{dissent_actions:['patrol']},{institution:'other'},{actions:['repair']}]){f.put('personnel','officer',{...role,data:{...role.data,...patch}});assert.throws(()=>f.api.assertInstitutionDelegation(f.db,'g',institution,input));}
 f.put('personnel','officer',role);f.put('proxy','porter',{discord_user_id:'human'});assert.throws(()=>f.api.assertInstitutionDelegation(f.db,'g',institution,input),/human proxy/);
});

test('queue compatibility honors only earlier actions and never reserves or spends resources',t=>{
 const f=fixture(t);f.put('queue','earlier',{id:'earlier',entity_key:action.entity_key,data:{type:'travel',location_key:'market'}});f.put('queue','mine',action);const before=f.snapshot();assert.throws(()=>f.api.assertQueuedCompatibility(f.db,'g',action),/Earlier queued action earlier/);assert.deepEqual(f.snapshot(),before);
 f.put('queue','earlier',{id:'earlier',entity_key:action.entity_key,data:{type:'research',location_key:'square'}});f.put('queue','later',{id:'later',entity_key:action.entity_key,data:{type:'travel',location_key:'elsewhere'}});assert.doesNotThrow(()=>f.api.assertQueuedCompatibility(f.db,'g',action));
});

test('source retraction and strategy revision fail before queued execution even with mediation off',t=>{
 const f=fixture(t),a=plan(f);f.put('calendar','current',{flags:{conflict_mediation:false}});assert.doesNotThrow(()=>f.api.assertQueuedCompatibility(f.db,'g',a));
 f.put('event','event:route',{status:'retracted'});assert.throws(()=>f.api.assertQueuedCompatibility(f.db,'g',a),/source retracted/);f.put('event','event:route',{status:'active'});assert.throws(()=>f.api.assertQueuedCompatibility(f.db,'g',{...a,data:{...a.data,strategy_revision:4}}),/no longer authorizes/);
});

test('AI strategy delegation revalidates exact revision, expiry, permission and native source capability',t=>{
 const f=fixture(t),a=plan(f,{reviewed_by:'ai_policy',delegation_revision:7,native_world_origin:true}),policy={mode:'routine_delegated',allow:['strategy.run'],revision:7,expires_minute:41};f.put('delegation','current',policy);f.put('native-strategy','route',{allowed:true});assert.doesNotThrow(()=>f.api.assertQueuedCompatibility(f.db,'g',a));
 for(const patch of [{mode:'off'},{allow:[]},{revision:8},{expires_minute:null},{expires_minute:40}]){f.put('delegation','current',{...policy,...patch});assert.throws(()=>f.api.assertQueuedCompatibility(f.db,'g',a),/no longer has execution delegation/);}
 f.put('delegation','current',policy);f.put('native-strategy','route',{allowed:false});assert.throws(()=>f.api.assertQueuedCompatibility(f.db,'g',a),/no longer has execution delegation/);
});

test('actual original source reader delegates unchanged guard and preserves shared error class',async t=>{
 const f=fixture(t),source=await import('../../src/city-constraints.js');f.put('pc','porter',{guild_id:'g'});assert.throws(()=>source.assertWorldActorControl(f.db,'g','npc','porter'),/Player characters/);
 assert.deepEqual(source.npcAvailability(f.db,'g','unplaced'),{location_key:'',proxy_controlled:false,current_commitment:null,preferences:[],authority:'routine_preferences_are_not_actual_position'});
});
