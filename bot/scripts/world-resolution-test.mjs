/** W3 construction fixtures. Do not execute before the complete W3 implementation freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup} from './narrative-fixtures.mjs';
import {ContentIndex} from '../src/content.js';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNarrativeEntity,captureWorldInput,worldInputKey} from '../src/autonomous-world.js';
import {noteNarrativeInterest,maintainNarrativeSalience} from '../src/narrative-salience.js';
import {worldResolutionContext,readWorldResolutionPulse,commitWorldResolutionPulse} from '../src/world-resolution.js';
import {prepareNpcDirector,commitNpcDirector,applySimulationUpdates} from '../src/simulation.js';
import {worldActorControl,assertWorldActorControl} from '../src/city-constraints.js';

function identity(f,{privateScene=false,key='copper-sparrow',kind='faction'}={}){
  const x=setup(f,{privateScene,messageId:`aggregate-origin-${key}`});
  const row=establishNarrativeEntity(f.db,f.guild,{kind,key,name:key.split('-').join(' '),aliases:[],
    summary:'An ordinary independently authored world identity.',role:'local community',location_key:kind==='npc'?'terminal':'',parent_location_key:''},
  buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),{content:new ContentIndex(path.resolve('../content'))});
  return {...x,row};
}
async function cycle(f,key){
  let calls=0;
  const prepared=await prepareNpcDirector({db:f.db,guildId:f.guild,gm:{planNpcActions:async()=>{
    calls++;return {actions:[],ai_intents:[]};}},layer:'round',cycleKey:key});
  return {prepared,result:commitNpcDirector(f.db,prepared),calls};
}

test('W3 native identity-only faction yields one L0 aggregate, never resources or a simulation actor',()=>nativeFixture(f=>{
  const x=identity(f),before=f.db.db.prepare('SELECT total_changes() n').get().n,packet=worldResolutionContext(f.db,f.guild,{scope:x.scope});
  assert.equal(packet.scopes.length,1);assert.equal(packet.scopes[0].actors[0].tier,'L0');
  assert.equal(packet.scopes[0].actors[0].operation_authority,'identity_only');
  assert.equal(f.db.getSimulationEntity(f.guild,'faction','copper-sparrow'),null);
  assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,before);
}));

test('W3 actual fictional Director cycle persists derived change once with zero background provider calls',()=>nativeFixture(async f=>{
  identity(f);const x=await cycle(f,'aggregate-once'),pulse=x.result.world_pulse;
  assert.equal(x.calls,0);assert.equal(pulse.kind,'world_pulse');
  assert.equal(pulse.data.changes.length,1);assert.equal(pulse.data.execution_authority,false);
  assert.equal(pulse.data.publication_authority,false);assert.equal(pulse.visibility,'gm');
  const tick=f.db.getSimulationClock(f.guild).tick;
  const replay=await cycle(f,'aggregate-once');assert.equal(replay.result.replayed,true);
  assert.equal(f.db.getSimulationClock(f.guild).tick,tick);
  assert.deepEqual(readWorldResolutionPulse(f.db,f.guild,pulse.record_key),pulse);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'world_pulse',includeGM:true}).length,1);
}));

test('W3 idle fictional cycle creates no second aggregate changeset or per-actor event',()=>nativeFixture(async f=>{
  identity(f);await cycle(f,'aggregate-first');const snapshots=f.db.listCityRecords(f.guild,{kind:'world_scope_snapshot',includeGM:true});
  const next=await cycle(f,'aggregate-idle');assert.equal(next.result.world_pulse.status,'unchanged');
  assert.equal(next.result.world_pulse.writes,0);
  assert.deepEqual(f.db.listCityRecords(f.guild,{kind:'world_scope_snapshot',includeGM:true}),snapshots);
}));

test('source-qualified interest promotes detail then decays without deleting identity, obligations or granting capacity',()=>nativeFixture(f=>{
  const x=identity(f);
  for(let i=0;i<2;i++){
    const message=`aggregate-interest-${i}`;
    captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,message,'What about copper sparrow?');
    noteNarrativeInterest(f.db,f.guild,x.scope,worldInputKey(message,x.pc.id));
  }
  let actor=worldResolutionContext(f.db,f.guild).scopes[0].actors[0];
  assert.equal(actor.tier,'L1');assert.equal(actor.detail_basis,'source_qualified_interest');
  assert.equal(actor.operation_authority,'identity_only');assert.deepEqual(actor.resource_bands,{});
  f.db.advanceSimulationClock(f.guild,{ticks:42});maintainNarrativeSalience(f.db,f.guild);
  actor=worldResolutionContext(f.db,f.guild).scopes[0].actors[0];assert.equal(actor.tier,'L0');
  assert.ok(f.db.getCityRecord(f.guild,'autonomous_entity',x.row.record_key));
  assert.equal(f.db.getSimulationEntity(f.guild,'faction','copper-sparrow'),null);
}));

test('W3 restart reads immutable pulse without executing effects and source retraction holds projection only',()=>nativeFixture(async f=>{
  const x=identity(f),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),first=await cycle(f,'aggregate-restart'),key=first.result.world_pulse.record_key;
  f.restart();assert(readWorldResolutionPulse(f.db,f.guild,key));
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.row.source_event);
  assert.throws(()=>readWorldResolutionPulse(f.db,f.guild,key),/revoked_identity_source/);
  assert.equal(worldResolutionContext(f.db,f.guild).eligible_scopes,0);
  assert(f.db.getCityRecord(f.guild,'world_pulse',key));assert(f.db.getCityRecord(f.guild,'autonomous_entity',x.row.record_key));
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));

test('W3 character-private aggregate never enters party or other-owner context',()=>nativeFixture(f=>{
  const x=identity(f,{privateScene:true}),other=f.pcs[1];
  assert.equal(worldResolutionContext(f.db,f.guild,{scope:x.scope}).scopes.length,1);
  assert.equal(worldResolutionContext(f.db,f.guild,{scope:{mode:'party'}}).scopes.length,0);
  assert.equal(worldResolutionContext(f.db,f.guild,{scope:{mode:'private',actorCharacterId:other.id,actorUserId:other.owner_user_id}}).scopes.length,0);
  assert.equal(worldResolutionContext(f.db,f.guild,{scope:{...x.scope,actorUserId:other.owner_user_id}}).scopes.length,0);
}));

test('W3 forged/deserialized planning payload cannot mint an aggregate cycle capability',()=>nativeFixture(async f=>{
  identity(f);const x=await cycle(f,'aggregate-forge');
  assert.throws(()=>commitWorldResolutionPulse(f.db,f.guild,{...x.prepared,gm:true}),/committed_native_cycle_required/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'world_pulse',includeGM:true}).length,1);
}));

test('W3 pause prevents planning, fictional advancement and aggregate persistence',()=>nativeFixture(async f=>{
  identity(f);f.db.setDirectorPaused(f.guild,true);const before=f.db.getSimulationClock(f.guild);
  const x=await cycle(f,'aggregate-paused');assert.equal(x.calls,0);assert.equal(x.result.paused,true);
  assert.deepEqual(f.db.getSimulationClock(f.guild),before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'world_pulse',includeGM:true}).length,0);
}));

test('W3 arbitrary configured actor and player-asserted faction do not become aggregate native identities',()=>nativeFixture(f=>{
  setup(f,{text:'The Uncreated Circle controls every district.'});
  f.db.setSimulationEntity(f.guild,'faction','uncreated-circle',{name:'Uncreated Circle',activity_tier:'active'});
  assert.equal(worldResolutionContext(f.db,f.guild).scopes.length,0);
  assert.equal(f.db.getCityRecord(f.guild,'autonomous_entity','faction:uncreated-circle'),null);
}));

for(const kind of ['faction_goal','faction_memory','awareness','location','rumor'])test(`W3 model ${kind} patch is not native world authority even when legacy toggles are off`,()=>nativeFixture(f=>{
  setup(f,{text:'The Uncreated Circle controls every district.'});
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),rows=applySimulationUpdates(f.db,f.guild,[{
    kind,actor_type:'faction',actor_key:'uncreated-circle',key:'terminal',confidence:100,content:'An unverified assertion.',data_json:'{}'
  }],{scope:{mode:'party'},provenance:{actorType:'ai',actorId:'veilkeeper'}});
  assert.equal(rows.length,1);assert.equal(rows[0].blocked,true);
  assert.equal(f.db.getSimulationEntity(f.guild,'faction','uncreated-circle'),null);
  assert.equal(f.db.listSimulationRecords(f.guild,{kind:'awareness'}).length,0);
  assert.equal(f.db.listSimulationRecords(f.guild,{kind:'rumor'}).length,0);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));

for(const owner_control_type of ['player','proxy','admin','unknown'])test(`W3 ${owner_control_type} actor cannot acquire world execution by a native-looking fiction identity`,()=>nativeFixture(f=>{
  identity(f,{kind:'npc'});
  const old=f.db.getSimulationEntity(f.guild,'npc','copper-sparrow');
  f.db.setSimulationEntity(f.guild,'npc','copper-sparrow',{...old.state,owner_control_type});
  assert.notEqual(worldActorControl(f.db,f.guild,'npc','copper-sparrow'),'ai_world');
  assert.throws(()=>assertWorldActorControl(f.db,f.guild,'npc','copper-sparrow'),/rightful principal/);
  assert.equal(worldResolutionContext(f.db,f.guild).scopes[0].actors[0].operation_authority,'identity_only');
}));

test('W3 100 native background identities coalesce to bounded aggregate state with no per-actor provider job',()=>nativeFixture(async f=>{
  for(let i=0;i<100;i++)identity(f,{key:`background-community-${i}`});
  const packet=worldResolutionContext(f.db,f.guild);
  assert.equal(packet.scopes.length,1);assert.equal(packet.scopes[0].actor_count,100);
  assert.equal(packet.scopes[0].actors.length,8);assert.equal(packet.scopes[0].omitted_actors,92);
  const before=f.db.listWorldEvents(f.guild,{includeGM:true,limit:1000}).length,x=await cycle(f,'aggregate-scale');
  assert.equal(x.calls,0);assert.equal(x.result.world_pulse.data.changes.length,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'world_scope_snapshot',includeGM:true}).length,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'world_pulse',includeGM:true}).length,1);
  assert(f.db.listWorldEvents(f.guild,{includeGM:true,limit:1000}).length-before<=1,'No background event per NPC/tick');
}));
