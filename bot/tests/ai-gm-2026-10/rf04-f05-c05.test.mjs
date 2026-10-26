import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import * as legacy from '../../src/epistemic.js';
import {activeEvidence,objectiveEvidence,evidenceType,typedEvidence,establishFact,createKnowledgeWorldEventConsumer,knowledgeWorldEvents} from '../../src/frameworks/knowledge/public.js';
import {indexWorldEvent,cityAudit} from '../../src/frameworks/world/public.js';
import {connectKnowledgeWorld} from '../../src/framework-to-framework/knowledge--world/public.js';
import {initializeKnowledgeWorld} from '../../src/application/composition/public.js';

const root=fileURLToPath(new URL('../../../',import.meta.url));
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vc-rf04-knowledge-world-')),filename=path.join(dir,'offline.sqlite'),schema=path.join(root,'bot/sql/schema.sql');
  let db=new VeiledDB(filename,schema);const guild='knowledge-audit';
  db.ensureCampaign(guild);db.upsertPlayer(guild,'owner-a','Owner A');db.upsertPlayer(guild,'owner-b','Owner B');
  const pc=db.createCharacter(guild,'owner-a','Lena Vale'),other=db.createCharacter(guild,'owner-b','Oren Moss');
  const fact=db.addFact(guild,{key:'paper-trail',content:'An unsigned timetable needs verification.',category:'hypothesis',source:'ai_gm',
    visibility:'character',subjectCharacterId:pc.id,provenance:{epistemic:{kind:'hypothesis',source_refs:[],perspective:'unverified'}}});
  t.after(()=>{db.db.close();fs.rmSync(dir,{force:true,recursive:true});});
  return {guild,pc,other,fact,get db(){return db;},reopen(){db.db.close();db=new VeiledDB(filename,schema);},
    snapshot(){return JSON.stringify({fact:db.getFact(guild,fact),events:db.listWorldEvents(guild,{includeGM:true,limit:100}),mutations:db.db.prepare('SELECT * FROM mutation_ledger').all()});}};
}

test('original and public evidence functions are identical; pure saved-source reads work before composition',t=>{
  const f=fixture(t),before=f.snapshot();
  for(const [name,fn] of Object.entries({activeEvidence,objectiveEvidence,evidenceType,typedEvidence,establishFact}))assert.equal(legacy[name],fn);
  assert.equal(evidenceType(f.db.getFact(f.guild,f.fact)).kind,'hypothesis');
  assert.equal(activeEvidence(f.db,f.guild,f.fact),true);
  assert.equal(objectiveEvidence(f.db,f.guild,f.db.getFact(f.guild,f.fact)),false);
  assert.equal(activeEvidence(f.db,'different-campaign',f.fact),false);
  assert.equal(f.snapshot(),before);
});

test('a native write before World binding fails closed and rolls back without blocking historical reads',t=>{
  const f=fixture(t),before=f.snapshot();
  assert.throws(()=>establishFact(f.db,f.guild,f.fact,'native-human-gm'),{code:'KNOWLEDGE_WORLD_COMPOSITION'});
  assert.equal(f.snapshot(),before);assert.equal(activeEvidence(f.db,f.guild,f.fact),true);
});

test('fixed pair binds exact native functions, rejects replacement and preserves forwarded error identity',()=>{
  const consumer=createKnowledgeWorldEventConsumer();
  assert.throws(()=>consumer.cityAudit(),{code:'KNOWLEDGE_WORLD_COMPOSITION'});
  assert.throws(()=>consumer.bind({}),TypeError);
  assert.equal(connectKnowledgeWorld({consumer}),consumer);
  assert.equal(connectKnowledgeWorld({consumer}),consumer);
  assert.throws(()=>consumer.bind({indexWorldEvent:()=>null,cityAudit}),/replacement forbidden/);
  const isolated=createKnowledgeWorldEventConsumer(),failure=new Error('original native failure'),args=[];
  isolated.bind({indexWorldEvent(...input){args.push(input);throw failure;},cityAudit});
  assert.throws(()=>isolated.indexWorldEvent('db','guild',{source:'unaltered'}),error=>error===failure);
  assert.deepEqual(args,[['db','guild',{source:'unaltered'}]]);
  assert.equal(initializeKnowledgeWorld(),knowledgeWorldEvents);assert.equal(initializeKnowledgeWorld(),knowledgeWorldEvents);
});

test('real native fact ruling preserves recipient scope and source ancestry; model drafts cannot promote it',t=>{
  const f=fixture(t);initializeKnowledgeWorld();
  assert.throws(()=>establishFact(f.db,f.guild,f.fact,''),/Authenticated GM required/);
  const after=establishFact(f.db,f.guild,f.fact,'native-human-gm'),type=evidenceType(after),event=f.db.getWorldEvent(f.guild,type.source_refs[0]);
  assert.equal(type.kind,'established');assert.equal(type.prior.kind,'hypothesis');
  assert.equal(event.kind,'gm_fact_ruling');assert.equal(event.visibility,'character');assert.equal(event.subject_key,f.pc.id);
  assert.equal(objectiveEvidence(f.db,f.guild,after),true);
  assert.throws(()=>typedEvidence(f.db,f.guild,{epistemic:{kind:'testimony',source_refs:[event.event_key],perspective:'source'}},{mode:'party'}),/outside the acting audience/);
  assert.throws(()=>typedEvidence(f.db,f.guild,{epistemic:{kind:'testimony',source_refs:[event.event_key],perspective:'source'}},
    {mode:'private',actorUserId:'owner-b',actorCharacterId:f.other.id}),/outside the acting audience/);
  assert.throws(()=>typedEvidence(f.db,f.guild,{epistemic:{kind:'established',source_refs:[event.event_key],perspective:'source'}},
    {mode:'private',actorUserId:'owner-a',actorCharacterId:f.pc.id}),/AI drafts cannot promote truth/);
  assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
  assert.equal(f.db.db.prepare("SELECT COUNT(*) n FROM mutation_ledger WHERE mutation_type='fact_establish'").get().n,1);
});

test('failure after event issuance rolls native fact and event back before one successful retry',t=>{
  const f=fixture(t);initializeKnowledgeWorld();const before=f.snapshot(),original=f.db.recordMutation;
  f.db.recordMutation=function(guild,value){if(value.mutationType==='fact_establish')throw new Error('audit commit failed');return original.call(this,guild,value);};
  assert.throws(()=>establishFact(f.db,f.guild,f.fact,'native-human-gm'),/audit commit failed/);
  assert.equal(f.snapshot(),before);
  f.db.recordMutation=original;
  const after=establishFact(f.db,f.guild,f.fact,'native-human-gm');
  assert.equal(evidenceType(after).kind,'established');
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.kind==='gm_fact_ruling').length,1);
});

test('saved evidence remains readable after SQLite reopen and source retraction invalidates it without rewriting the fact',t=>{
  const f=fixture(t);initializeKnowledgeWorld();const after=establishFact(f.db,f.guild,f.fact,'native-human-gm'),stored=JSON.stringify(after),ref=evidenceType(after).source_refs[0];
  f.reopen();assert.equal(JSON.stringify(f.db.getFact(f.guild,f.fact)),stored);
  assert.equal(legacy.objectiveEvidence(f.db,f.guild,f.db.getFact(f.guild,f.fact)),true);
  indexWorldEvent(f.db,f.guild,{key:ref,status:'retracted'});
  assert.equal(activeEvidence(f.db,f.guild,f.fact),false);
  assert.equal(objectiveEvidence(f.db,f.guild,f.db.getFact(f.guild,f.fact)),false);
  assert.equal(JSON.stringify(f.db.getFact(f.guild,f.fact)),stored);
});

test('real startup binds Knowledge before Narrative and services; adapter has exactly its two public owners',()=>{
  const index=fs.readFileSync(path.join(root,'bot/src/index.js'),'utf8');
  assert.ok(index.indexOf('initializeKnowledgeWorld();')>0);
  assert.ok(index.indexOf('initializeKnowledgeWorld();')<index.indexOf('initializeNarrativeWorld();'));
  assert.ok(index.indexOf('initializeKnowledgeWorld();')<index.indexOf('const config=loadConfig()'));
  const pair=fs.readFileSync(path.join(root,'bot/src/framework-to-framework/knowledge--world/public.js'),'utf8');
  assert.deepEqual([...pair.matchAll(/from ['"]([^'"]+)['"]/g)].map(m=>m[1]).sort(),
    ['../../frameworks/knowledge/public.js','../../frameworks/world/public.js']);
  assert.equal(fs.readFileSync(path.join(root,'bot/src/epistemic.js'),'utf8').includes("from './city-calendar.js'"),false);
});
