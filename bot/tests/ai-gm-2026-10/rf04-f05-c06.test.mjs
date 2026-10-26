import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createWorldKnowledgeConsumer,worldKnowledgeSources,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {factVisibleTo,listNarrativeRecords} from '../../src/frameworks/knowledge/public.js';
import {connectWorldKnowledge} from '../../src/framework-to-framework/knowledge--world/public.js';
import {initializeKnowledgeWorld,initializeNarrativeWorld} from '../../src/application/composition/public.js';
import {worldIdentityOrigin} from '../../src/world-authorship.js';
import '../../src/audience-native-v9.js';

const root=fileURLToPath(new URL('../../../',import.meta.url));
initializeKnowledgeWorld();initializeNarrativeWorld();
function fixture(t){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'vc-world-knowledge-')),filename=path.join(folder,'offline.sqlite'),schema=path.join(root,'bot/sql/schema.sql');
  let db=new VeiledDB(filename,schema);const guild='world-read-guild';
  db.ensureCampaign(guild);db.upsertPlayer(guild,'one','One');db.upsertPlayer(guild,'two','Two');
  const pc=db.createCharacter(guild,'one','Sera Pike'),other=db.createCharacter(guild,'two','Thom Reed');
  const source=indexWorldEvent(db,guild,{key:'old-origin-source',kind:'observation',title:'Saved scene ancestry',source_id:'human_gm',visibility:'party'});
  t.after(()=>{db.db.close();fs.rmSync(folder,{recursive:true,force:true});});
  return {guild,pc,other,source,get db(){return db;},reopen(){db.db.close();db=new VeiledDB(filename,schema);}};
}
function savedOrigin(f,key,{visibility='party',subject=null}={}){
  // New synthetic v0 data exercises the retained saved reader, not new authoring authority.
  const event=indexWorldEvent(f.db,f.guild,{key:`old-origin:${key}`,kind:'native_narrative_entity',title:'Synthetic legacy identity receipt',
    source_id:'native:narrative-authority',visibility,subject_key:subject,details:{entity_type:'location',entity_key:key,input_source:f.source.event_key}});
  return f.db.saveCityRecord(f.guild,{kind:'autonomous_entity',key:`location:${key}`,status:'active',source_event:event.event_key,
    visibility,subject_key:subject,data:{kind:'location',key,name:`Saved ${key}`,narrative_origin:f.source.event_key}});
}

test('World consumer rejects missing or replaced sources and forwards original values/errors exactly',()=>{
  const consumer=createWorldKnowledgeConsumer(),failure=new Error('native Knowledge failure'),calls=[],rows=Object.freeze([{native:true}]);
  assert.throws(()=>consumer.factVisibleTo({},{}),{code:'WORLD_KNOWLEDGE_COMPOSITION'});
  assert.throws(()=>consumer.bind({}),TypeError);
  const visible=(...args)=>{calls.push(args);throw failure;},records=(...args)=>{calls.push(args);return rows;};
  consumer.bind({factVisibleTo:visible,listNarrativeRecords:records});
  assert.throws(()=>consumer.factVisibleTo('row','scope'),error=>error===failure);
  assert.equal(consumer.listNarrativeRecords('db','guild','kind'),rows);
  assert.deepEqual(calls,[['row','scope'],['db','guild','kind']]);
  assert.throws(()=>consumer.bind({factVisibleTo:()=>true,listNarrativeRecords:records}),/replacement forbidden/);
});

test('the actual pair supplies exactly the existing Knowledge functions and retains initializer identity',()=>{
  let supplied;
  const consumer={bind(source){supplied=source;return this;}};
  assert.equal(connectWorldKnowledge({consumer}),consumer);
  assert.equal(supplied.factVisibleTo,factVisibleTo);assert.equal(supplied.listNarrativeRecords,listNarrativeRecords);
  const once=initializeKnowledgeWorld();assert.equal(initializeKnowledgeWorld(),once);
});

test('real World historical origin reader preserves private/campaign/retraction boundaries across SQLite reopen without new grants',t=>{
  const f=fixture(t),publicRow=savedOrigin(f,'old-court'),privateRow=savedOrigin(f,'old-alcove',{visibility:'character',subject:f.pc.id});
  const scope={mode:'private',actorUserId:'one',actorCharacterId:f.pc.id},other={mode:'private',actorUserId:'two',actorCharacterId:f.other.id};
  const before=JSON.stringify([publicRow,privateRow,f.db.getCharacter(f.pc.id)]);
  const publicProof=worldIdentityOrigin(f.db,f.guild,publicRow,{mode:'party'}),privateProof=worldIdentityOrigin(f.db,f.guild,privateRow,scope);
  assert.deepEqual(publicProof,{version:0,kind:'native_ai_gm',receipt:publicRow.source_event,execution_authority:false});
  assert.equal(privateProof.execution_authority,false);assert.equal(privateProof.grant,undefined);
  assert.equal(worldIdentityOrigin(f.db,f.guild,privateRow,other),null);
  assert.equal(worldIdentityOrigin(f.db,f.guild,privateRow,{mode:'party'}),null);
  assert.equal(worldIdentityOrigin(f.db,'unrelated-campaign',publicRow,{mode:'party'}),null);
  f.reopen();assert.deepEqual(worldIdentityOrigin(f.db,f.guild,f.db.getCityRecord(f.guild,'autonomous_entity',publicRow.record_key),{mode:'party'}),publicProof);
  assert.equal(JSON.stringify([f.db.getCityRecord(f.guild,'autonomous_entity',publicRow.record_key),f.db.getCityRecord(f.guild,'autonomous_entity',privateRow.record_key),f.db.getCharacter(f.pc.id)]),before);
  indexWorldEvent(f.db,f.guild,{key:f.source.event_key,status:'retracted'});
  assert.equal(worldIdentityOrigin(f.db,f.guild,publicRow,{mode:'party'}),null);
  assert.equal(JSON.stringify(f.db.getCityRecord(f.guild,'autonomous_entity',privateRow.record_key)),JSON.stringify(privateRow));
});

test('real Knowledge paging remains native GM retrieval, same kind/campaign/order and no writes',t=>{
  const f=fixture(t);
  for(let n=0;n<103;n++)f.db.saveCityRecord(f.guild,{kind:'world_authoring_seed',key:`seed-${n}`,source_event:f.source.event_key,
    visibility:'gm',data:{index:n,private_marker:'native-only'}});
  f.db.saveCityRecord(f.guild,{kind:'different-kind',key:'excluded',source_event:f.source.event_key,visibility:'gm',data:{}});
  const before=f.db.db.prepare('SELECT COUNT(*) n FROM mutation_ledger').get().n;
  const actual=worldKnowledgeSources.listNarrativeRecords(f.db,f.guild,'world_authoring_seed'),expected=listNarrativeRecords(f.db,f.guild,'world_authoring_seed');
  assert.equal(actual.length,103);assert.deepEqual(actual,expected);assert.ok(actual.every(row=>row.visibility==='gm'));
  assert.deepEqual(worldKnowledgeSources.listNarrativeRecords(f.db,'unrelated-campaign','world_authoring_seed'),[]);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM mutation_ledger').get().n,before);
});

test('actual World composition has no Knowledge deep imports and existing pair has only its two public owners',()=>{
  const world=fs.readFileSync(path.join(root,'bot/src/world-authorship.js'),'utf8');
  assert.equal(world.includes("from './disclosure-authority.js'"),false);
  assert.equal(world.includes("from './narrative-records.js'"),false);
  assert.ok(world.includes('worldKnowledgeSources'));
  const pair=fs.readFileSync(path.join(root,'bot/src/framework-to-framework/knowledge--world/public.js'),'utf8');
  assert.deepEqual([...pair.matchAll(/from ['"]([^'"]+)['"]/g)].map(m=>m[1]).sort(),
    ['../../frameworks/knowledge/public.js','../../frameworks/world/public.js']);
});
