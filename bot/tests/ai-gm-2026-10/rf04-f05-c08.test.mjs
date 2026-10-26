import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {nativeActorControl,createNativeWorldProxyConsumer} from '../../src/frameworks/daggerheart/public.js';
import {activeCityProxy,worldNativeActorControl,createWorldActorControlConsumer} from '../../src/frameworks/world/public.js';
import {initializeWorldActorControl} from '../../src/application/composition/public.js';
import {nativeActorControl as historicalControl} from '../../src/native-actor-control.js';
import {activeCityProxy as historicalProxy,assertWorldActorControl,assertNpcAvailability} from '../../src/city-constraints.js';
const schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vc-c08-')),file=path.join(dir,'control.sqlite');let db=new VeiledDB(file,schema);t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},reopen(){db.close();db=new VeiledDB(file,schema);}};}
function npc(db,key='lamplighter',state={}){db.ensureCampaign('city');db.setSimulationEntity('city','npc',key,{location_key:'quay',...state});db.upsertNpcProfile('city',{npcKey:key,displayName:'Lamplighter'});return key;}
initializeWorldActorControl();
test('fixed consumers require native functions and reject replacement without changing result/error identity',()=>{
 for(const [consumer,key] of [[createWorldActorControlConsumer(),'nativeActorControl'],[createNativeWorldProxyConsumer(),'activeCityProxy']]){
  assert.throws(()=>consumer[key](),e=>e.code?.endsWith('COMPOSITION'));assert.throws(()=>consumer.bind({}),TypeError);
  const value={},error=new Error('native check'),fn=x=>{if(x==='reject')throw error;return value;};
  assert.equal(consumer.bind(fn),consumer);assert.equal(consumer.bind(fn),consumer);assert.equal(consumer[key](),value);assert.throws(()=>consumer[key]('reject'),e=>e===error);assert.throws(()=>consumer.bind(()=>value),/replacement forbidden/);
 }
 assert.equal(initializeWorldActorControl(),worldNativeActorControl);assert.equal(historicalControl,nativeActorControl);assert.equal(historicalProxy,activeCityProxy);
});
test('actual native player classification cannot be relabeled as autonomous NPC or cross-campaign authority',t=>{
 const {db}=fixture(t);db.ensureCampaign('city');const pc=db.createCharacter('city','owner','Ash',{resources:{hope:3}}),before=db.getCharacter(pc.id),changes=db.db.prepare('SELECT total_changes() n').get().n;
 for(const type of ['npc','faction','character']){const c=nativeActorControl(db,'city',type,pc.id);assert.equal(c.owner_control_type,'player');assert.equal(c.execution_authority,false);assert.equal(Object.isFrozen(c),true);}
 assert.equal(nativeActorControl(db,'other','npc',pc.id).owner_control_type,'admin');assert.throws(()=>assertWorldActorControl(db,'city','npc',pc.id),/Player characters/);assert.deepEqual(db.getCharacter(pc.id),before);assert.equal(db.db.prepare('SELECT total_changes() n').get().n,changes);
});
test('current active proxy overrides autonomy and cannot leak between sessions or campaigns',t=>{
 const {db}=fixture(t),key=npc(db),session=db.startSession('city','Lantern crossing');const initial=nativeActorControl(db,'city','npc',key);assert.equal(initial.owner_control_type,'ai_world');assert.equal(assertWorldActorControl(db,'city','npc',key),'ai_world');
 const offered=db.upsertNpcProxy('city',session.id,{npcName:key,userId:'visitor'});assert.equal(activeCityProxy(db,'city',key),undefined);assert.equal(nativeActorControl(db,'city','npc',key).owner_control_type,'ai_world');
 db.activateNpcProxy(offered.id,'visitor');assert.equal(activeCityProxy(db,'city',key).id,offered.id);assert.equal(nativeActorControl(db,'city','npc',key).owner_control_type,'proxy');assert.throws(()=>assertNpcAvailability(db,'city',key,{type:'watch'}),/rightful principal/);assert.equal(activeCityProxy(db,'other',key),null);
 db.releaseNpcProxy(offered.id);assert.equal(nativeActorControl(db,'city','npc',key).owner_control_type,'ai_world');db.endSession('city');assert.equal(activeCityProxy(db,'city',key),null);assert.equal(nativeActorControl(db,'city','npc',key).revision,initial.revision);
});
test('native explicit ownership, unsupported identities and dead NPC rules are unchanged',t=>{
 const {db}=fixture(t);npc(db);assert.equal(nativeActorControl(db,'city','npc','unknown').owner_control_type,'admin');assert.equal(nativeActorControl(db,'city','spell','lamplighter').owner_control_type,'admin');
 for(const state of [{owner_user_id:'human'},{player_controlled:true},{owner_control_type:'player'},{owner_control_type:'proxy'},{owner_control_type:'admin'},{owner_control_type:'unexpected'}]){
  npc(db,'lamplighter',state);assert.notEqual(nativeActorControl(db,'city','npc','lamplighter').owner_control_type,'ai_world');assert.throws(()=>assertWorldActorControl(db,'city','npc','lamplighter'),/rightful principal/);
 }
 npc(db,'lamplighter',{status:'dead'});assert.throws(()=>assertNpcAvailability(db,'city','lamplighter',{type:'watch'}),/Dead or removed/);
});
test('real rollback restores proxy eligibility and native revisions; successful assignment survives reopen',t=>{
 const f=fixture(t),key=npc(f.db),s=f.db.startSession('city','Night ferry'),original=nativeActorControl(f.db,'city','npc',key),fail=new Error('abort');
 assert.throws(()=>f.db.transaction(()=>{f.db.upsertNpcProxy('city',s.id,{npcName:key,userId:'human',status:'active'});assert.equal(nativeActorControl(f.db,'city','npc',key).owner_control_type,'proxy');throw fail;}),e=>e===fail);assert.deepEqual(nativeActorControl(f.db,'city','npc',key),original);
 f.db.upsertNpcProxy('city',s.id,{npcName:key,userId:'human',status:'active'});const assigned=nativeActorControl(f.db,'city','npc',key);f.reopen();assert.deepEqual(nativeActorControl(f.db,'city','npc',key),assigned);assert.throws(()=>assertWorldActorControl(f.db,'city','npc',key),/rightful principal/);
});
test('native and historical readers share classification identity without reads creating receipts or state',t=>{
 const {db}=fixture(t),key=npc(db),snapshot=db.db.serialize();for(let i=0;i<4;i++){assert.deepEqual(historicalControl(db,'city','npc',key),worldNativeActorControl.nativeActorControl(db,'city','npc',key));assert.equal(historicalProxy(db,'city',key),null);}assert.deepEqual(db.db.serialize(),snapshot);
});
test('actual bootstrap binds control before services and pair imports exactly its two public frameworks',()=>{
 const source=fs.readFileSync(new URL('../../src/index.js',import.meta.url),'utf8');assert.ok(source.indexOf('initializeWorldActorControl();')<source.indexOf('const config'));
 const pair=fs.readFileSync(new URL('../../src/framework-to-framework/daggerheart--world/public.js',import.meta.url),'utf8');const owners=[...pair.matchAll(/from ['"]([^'"]+)['"]/g)].map(m=>m[1]);assert.ok(owners.every(p=>/^..\/..\/frameworks\/(daggerheart|world)\/public.js$/.test(p)));
});


