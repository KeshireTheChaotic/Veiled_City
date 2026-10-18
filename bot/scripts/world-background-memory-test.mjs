/** Versioned background continuity follows native publication/disclosure, never owner-asserted world facts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,run,unit} from './narrative-fixtures.mjs';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {rememberEntity,reviseMemory,retrieveMemoryRevisions} from '../src/memory-lifecycle.js';
const definition=kind=>({kind,key:`copper-sparrow-${kind}`,name:'Copper Sparrow',summary:'An ordinary community identity.',
  aliases:['Sparrow Fellowship'],role:'local community',location_key:'',parent_location_key:''});
async function disclosed(f,kind='faction',{epistemic='observation',text='A Copper Sparrow pennant flutters above the sorting counter.'}={}){
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_memory:true}});
  const first=setup(f,{privateScene:true,messageId:'group-memory-origin'});
  await run(f,first,{fiction_delta:[definition(kind)],narrative_units:[unit('origin','scene','Rain beads on the window.',{visibility:'character'})]});
  const identity=f.db.getCityRecord(f.guild,'autonomous_entity',`${kind}:copper-sparrow-${kind}`),
    x=setup(f,{privateScene:true,messageId:'group-memory-disclosure'}),out=await run(f,x,{fiction_delta:[],
      narrative_units:[unit('group','scene',text,{visibility:'character',source_refs:[identity.source_event],epistemic})]});
  return {x,identity,out};
}
for(const kind of ['faction','organization','district'])test(`W2 v2 ${kind} memory requires actual delivery and remains private after restart`,()=>nativeFixture(async f=>{
  const {x,identity,out}=await disclosed(f,kind);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'memory_revision',includeGM:true}).filter(row=>row.visibility==='gm'&&row.data.world_identity_ref===identity.record_key).length,1);
  assert.equal(retrieveMemoryRevisions(f.db,f.guild,x.scope).filter(row=>row.world_identity_ref===identity.record_key).length,0);
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async row=>({messageId:`memory-${row.id}`,channelId:'offline-private'}));
  f.restart();const records=retrieveMemoryRevisions(f.db,f.guild,x.scope).filter(row=>row.world_identity_ref===identity.record_key);
  assert.equal(records.length,1);assert.equal(records[0].version,2);assert.equal(records[0].epistemic,'observation');
  assert.equal(records[0].name,'Copper Sparrow');assert.deepEqual(records[0].aliases,['Sparrow Fellowship']);
  assert.equal(retrieveMemoryRevisions(f.db,f.guild,{mode:'party'}).length,0);
  assert.equal(retrieveMemoryRevisions(f.db,f.guild,{mode:'private',actorCharacterId:f.pcs[1].id,actorUserId:f.pcs[1].owner_user_id}).length,0);
}));
test('W2 uncertainty stays inference in group and ordinary narrative memory, never an observed fact',()=>nativeFixture(async f=>{
  const {x,identity,out}=await disclosed(f,'faction',{epistemic:'hypothesis',text:'The meaning of the Copper Sparrow pennant remains uncertain.'});
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async row=>({messageId:`uncertainty-${row.id}`,channelId:'offline'}));
  assert.equal(retrieveMemoryRevisions(f.db,f.guild,x.scope).find(row=>row.world_identity_ref===identity.record_key).epistemic,'inference');
  const next=setup(f,{privateScene:true,messageId:'ordinary-uncertainty'}),ordinary=await run(f,next,{fiction_delta:[],
    narrative_units:[unit('uncertain','scene','The source of a distant scraping sound remains uncertain.',{visibility:'character',epistemic:'hypothesis'})]});
  await deliverTurnOutbox(f.db,f.guild,ordinary.attempt.turn_id,async row=>({messageId:`ordinary-${row.id}`,channelId:'offline'}));
  const projected=retrieveMemoryRevisions(f.db,f.guild,next.scope).find(row=>row.summary.includes('scraping'));
  assert.equal(projected.epistemic,'inference');assert.equal(projected.version,undefined,'Historical generic reader shape stays unchanged');
}));
test('W2 group-memory projection cannot be minted from owner text, forged summaries or owner corrections',()=>nativeFixture(async f=>{
  const {x,identity,out}=await disclosed(f);
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async row=>({messageId:`proof-${row.id}`,channelId:'offline'}));
  const memory=retrieveMemoryRevisions(f.db,f.guild,x.scope).find(row=>row.world_identity_ref===identity.record_key);
  assert(memory,'A real native publication must establish the positive contrast first');
  const input={version:2,world_identity_ref:identity.record_key,kind:'faction',name:identity.data.name,aliases:identity.data.aliases,
    parent_key:`world:${identity.record_key}`,source_event:x.sourceRef,visibility:'character',subject_key:x.pc.id,
    summary:memory.summary,epistemic:'observation'};
  assert.throws(()=>rememberEntity(f.db,f.guild,input),/native|receipt|disclosure|projection/i);
  assert.throws(()=>rememberEntity(f.db,f.guild,{...input,source_event:memory.source_event,summary:'A PC obeys the faction.'}),/native|receipt|disclosure|projection/i);
  const revision=f.db.listCityRecords(f.guild,{kind:'memory_revision',includeGM:true}).find(row=>row.data.identity===memory.identity&&row.visibility==='character');
  assert.throws(()=>reviseMemory(f.db,f.guild,revision.record_key,{source_event:x.sourceRef,summary:'The faction owns all PCs.',epistemic:'native_fact'}),
    /native|receipt|disclosure|projection/i);
}));
test('W2 tampering or retracting a group memory source holds recall without erasing resources or native identity',()=>nativeFixture(async f=>{
  const {x,identity,out}=await disclosed(f);await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async row=>({messageId:`retain-${row.id}`,channelId:'offline'}));
  const memory=retrieveMemoryRevisions(f.db,f.guild,x.scope).find(row=>row.world_identity_ref===identity.record_key);assert(memory);
  const revision=f.db.listCityRecords(f.guild,{kind:'memory_revision',includeGM:true}).find(row=>row.data.identity===memory.identity&&row.visibility==='character');
  f.db.saveCityRecord(f.guild,{...revision,key:revision.record_key,data:{...revision.data,summary:'Unverified replaced prose.'}});
  assert(!retrieveMemoryRevisions(f.db,f.guild,x.scope).some(row=>row.world_identity_ref===identity.record_key));
  f.db.saveCityRecord(f.guild,{...revision,key:revision.record_key});
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,identity.source_event);
  assert(!retrieveMemoryRevisions(f.db,f.guild,x.scope).some(row=>row.world_identity_ref===identity.record_key));
  assert(f.db.getCityRecord(f.guild,'autonomous_entity',identity.record_key));
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));
test('W2 unentitled memory retrieval filters audience before loading private native prose',()=>nativeFixture(async f=>{
  const {out}=await disclosed(f);await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async row=>({messageId:`audience-${row.id}`,channelId:'offline'}));
  const get=f.db.getCityRecord.bind(f.db);
  f.db.getCityRecord=(guild,kind,key)=>{if(kind==='narrative_unit')assert.fail('Unentitled lookup must not load private native prose');return get(guild,kind,key);};
  try{assert.deepEqual(retrieveMemoryRevisions(f.db,f.guild,{mode:'party'}),[]);}
  finally{f.db.getCityRecord=get;}
}));
