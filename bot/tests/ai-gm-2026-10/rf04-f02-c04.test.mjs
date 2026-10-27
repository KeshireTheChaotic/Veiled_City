import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createNpcCognition} from '../../src/frameworks/npc/public.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';
import {recordImportedNpcKnowledge} from '../../src/npc-cognition-projection.js';
import * as source from '../../src/npc-cognition.js';

function table(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-cognition-c04-')),file=join(dir,'recall.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('archive');let eligible=true;const calls=[];
 const api=createNpcCognition({narrativeContextEligible:(...args)=>{calls.push(['retirement',args]);return eligible;},clusterContext:(...args)=>{calls.push(['clusters',args]);return [{kind:'subjective-cluster',source_ref:'witness'}];},sceneView:(...args)=>{calls.push(['scene',args]);return {occupants:Array.from({length:20},(_,i)=>({key:'occupant-'+i})),observations:['an attributed scene observation']};},npcEvidenceActive:(db,g,npc,ref)=>{calls.push(['evidence',npc,ref]);return db.getWorldEvent(g,ref)?.status==='active';},recordImportedNpcKnowledge});
 const profile=(key,name=key,patch={})=>db.upsertNpcProfile('archive',{npcKey:key,displayName:name,activityTier:'supporting',...patch});
 const content=(dossiers)=>({read:path=>{assert.equal(path,'GM_PRIVATE/NPCS/npcs.json');return JSON.stringify(dossiers);}});
 const retrieve=(options={})=>api.retrieveNpcCognition(db,'archive',{npcKey:'archivist',query:'bridge',recordRecall:false,...options});
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
 return {api,get db(){return db;},profile,content,retrieve,calls,setEligible:v=>eligible=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('explicit dossier traits preserve defaults and reject inferred or malformed personality mechanics',t=>{
 const f=table(t),defaults=f.api.dossierDecisionProfile();assert.equal(defaults.violence_threshold,50);assert.equal(defaults.veil_awareness,'limited');assert.equal(f.api.dossierDecisionProfile({loyalty:71,veil_awareness:'aware'}).loyalty,71);for(const bad of [{brave:true},{loyalty:1.5},{loyalty:101},{veil_awareness:'omniscient'},{supernatural_ethics:'x'.repeat(161)},null,[]])assert.throws(()=>f.api.dossierDecisionProfile(bad));assert.deepEqual(source.dossierDecisionProfile(),defaults);
});

test('trusted dossier import creates actor beliefs, secrets and goals but no global fact, player knowledge or resource grant',t=>{
 const f=table(t),counts=f.api.seedNpcCognition({db:f.db,guildId:'archive',content:f.content([{name:'Archivist',want:'Compare the bridge reports',public:'A city archivist',knows:['A delivery was reported late'],does_not:['The hidden cause'],secret:'Maintains a private index',decision_profile:{honesty:65}}])});assert.deepEqual(counts,{profiles:1,memories:1,knowledge:3,goals:1,references:0,relationships:0});assert.equal(f.db.getNpcProfile('archive','archivist').decision_profile.honesty,65);assert.equal(f.db.getNpcGoal('archive','archivist','seed.primary').objective,'Compare the bridge reports');const known=f.db.getNpcKnowledge('archive','archivist','seed.known.1'),event=f.db.getWorldEvent('archive',known.source_ref);assert.equal(event.kind,'native_npc_knowledge_import');assert.equal(event.visibility,'gm');assert.equal(known.is_secret,0);assert.equal(f.db.getNpcKnowledge('archive','archivist','seed.unknown.1').belief_state,'unknown');assert.equal(f.db.getNpcKnowledge('archive','archivist','seed.self_secret').is_secret,1);assert.equal(f.db.getSimulationEntity('archive','npc','archivist'),null);assert.equal(f.db.listCanon('archive',{includeGM:true}).length,0);
});

test('seed receipts survive reopen and incremental import never overwrites an authored actor or duplicates memories',t=>{
 const f=table(t),content=f.content([{name:'Archivist',secret:'Original secret',want:'Original goal'}]);f.api.seedNpcCognition({db:f.db,guildId:'archive',content});f.reopen();assert.throws(()=>f.api.seedNpcCognition({db:f.db,guildId:'archive',content}),/already completed/);const counts=f.api.seedNpcCognition({db:f.db,guildId:'archive',content:f.content([{name:'Archivist',secret:'Replacement secret',want:'Replacement goal'},{name:'Courier',want:'Find a route'}]),incremental:true});assert.equal(counts.profiles,1);assert.equal(f.db.getNpcGoal('archive','archivist','seed.primary').objective,'Original goal');assert.equal(f.db.listNpcMemories('archive','archivist').length,1);assert.equal(f.db.getNpcKnowledge('archive','archivist','seed.self_secret').content,'Original secret');assert.equal(f.db.getNpcProfile('archive','courier').display_name,'Courier');
});

test('failed seed audit rolls back profiles, imported evidence, memories, goals and completion receipt',t=>{
 const f=table(t),record=f.db.recordMutation;f.db.recordMutation=()=>{throw Error('C04 seed audit failure');};assert.throws(()=>f.api.seedNpcCognition({db:f.db,guildId:'archive',content:f.content([{name:'Archivist',knows:['Ordinary report'],secret:'Private record',want:'Check it'}])}),/C04 seed/);f.db.recordMutation=record;assert.equal(f.db.getNpcProfile('archive','archivist'),null);assert.equal(f.db.getSeedRun('archive','npc_cognition_v1'),null);assert.equal(f.db.listNpcMemories('archive','archivist').length,0);assert.equal(f.db.listWorldEvents('archive',{limit:50}).length,0);
});

test('unrelated global canon does not seed an NPC awareness or inferred decision score',t=>{
 const f=table(t);f.profile('archivist','Archivist',{portrayal:'Fearless, omniscient-sounding prose'});f.api.seedNpcCognition({db:f.db,guildId:'archive',content:f.content([])});assert.equal(f.db.listNpcKnowledge('archive','archivist').length,0);assert.deepEqual(f.db.getNpcProfile('archive','archivist').decision_profile,{});assert.equal(f.db.listNpcGoals('archive','archivist').length,0);
});

test('retrieval preserves rumor, secret knowledge, historical source status and explicit non-canon authority in GM packet',t=>{
 const f=table(t);f.profile('archivist','Archivist');indexWorldEvent(f.db,'archive',{key:'witness',title:'Witness report',source_id:'gm:witness'});const memory=f.db.addNpcMemory('archive',{npcKey:'archivist',content:'Bridge witness report',importance:90,sourceRef:'witness',tags:['bridge']});f.db.upsertNpcKnowledge('archive',{npcKey:'archivist',knowledgeKey:'bridge-rumor',content:'A privately heard bridge rumor',beliefState:'rumor',confidence:40,sourceRef:'witness',isSecret:true});const packet=f.retrieve()[0];assert.equal(packet.knowledge[0].belief_state,'rumor');assert.equal(packet.knowledge[0].is_secret,1);assert.equal(packet.memories[0].id,memory.id);assert.equal(packet.memories[0].source_status,'active');assert.equal(packet.memories[0].evidence_active,true);assert.match(packet.continuity_authority,/not canon\/consent/);assert.equal(f.db.listCanon('archive',{includeGM:true}).length,0);indexWorldEvent(f.db,'archive',{key:'witness',status:'retracted'});f.reopen();const history=f.retrieve()[0];assert.equal(history.memories[0].content,'Bridge witness report');assert.equal(history.memories[0].source_status,'retracted');assert.equal(history.memories[0].evidence_active,false);
});

test('recordRecall false is read-only while true reinforces only actually returned memory records',t=>{
 const f=table(t);f.profile('archivist','Archivist');const first=f.db.addNpcMemory('archive',{npcKey:'archivist',content:'Bridge structural report',importance:99}),second=f.db.addNpcMemory('archive',{npcKey:'archivist',content:'Unrelated tea order',importance:1});f.retrieve({memoriesPerNpc:1});assert.equal(f.db.listNpcMemories('archive','archivist').find(m=>m.id===first.id).recall_count,0);const packet=f.retrieve({memoriesPerNpc:1,recordRecall:true})[0];assert.equal(packet.memories.length,1);assert.equal(packet.memories[0].id,first.id);assert.equal(f.db.listNpcMemories('archive','archivist').find(m=>m.id===first.id).recall_count,1);assert.equal(f.db.listNpcMemories('archive','archivist').find(m=>m.id===second.id).recall_count,0);
});

test('context retirement hides a packet reversibly without deleting goals, beliefs or memory receipts',t=>{
 const f=table(t);f.profile('archivist','Archivist');const memory=f.db.addNpcMemory('archive',{npcKey:'archivist',content:'Bridge memory'});f.db.upsertNpcGoal('archive',{npcKey:'archivist',goalKey:'review',objective:'Review bridge records'});f.setEligible(false);assert.deepEqual(f.retrieve({recordRecall:true}),[]);assert.equal(f.db.listNpcMemories('archive','archivist')[0].id,memory.id);assert.equal(f.db.listNpcMemories('archive','archivist')[0].recall_count,0);assert.equal(f.db.getNpcGoal('archive','archivist','review').status,'active');f.setEligible(true);assert.equal(f.retrieve().length,1);assert.equal(f.calls.find(c=>c[0]==='retirement')[1][3].mode,'party');
});

test('query relevance selects an actor from memories without treating all world actors as current scene occupants',t=>{
 const f=table(t);f.profile('archivist','Archivist');f.profile('baker','Baker');f.db.addNpcMemory('archive',{npcKey:'archivist',content:'Bridge foundations inspected',importance:80});const relevant=f.retrieve({npcKey:'',maxNpcs:1})[0];assert.equal(relevant.npc_key,'archivist');assert.equal(relevant.scene_observations,null);assert.equal(f.db.getSimulationEntity('archive','npc','archivist'),null);assert.deepEqual(f.api.retrieveNpcCognition(f.db,'archive',{npcKey:'unregistered',query:'unrelated-zoology',recordRecall:false}),[]);
});

test('world Director retrieval and proxy ranking remain distinct from actor ownership or world placement',t=>{
 const f=table(t);f.profile('archivist','Archivist');f.profile('courier','Courier');const proxy=f.api.retrieveNpcCognition(f.db,'archive',{actorAssignment:{npc_proxy:true,npc_name:'Courier'},maxNpcs:1,recordRecall:false});assert.equal(proxy[0].npc_key,'courier');const world=f.api.retrieveNpcCognition(f.db,'archive',{worldDirector:true,recordRecall:false});assert.equal(world.length,2);assert.equal(f.db.getSimulationEntity('archive','npc','courier'),null);
});

test('original source provider reaches extracted retrieval and trusted bootstrap using actual source dependencies',t=>{
 const f=table(t),counts=source.seedNpcCognition({db:f.db,guildId:'archive',content:f.content([{name:'Archivist',public:'Bridge archivist',knows:['The bridge report was filed']}])});assert.equal(counts.profiles,1);const packet=source.retrieveNpcCognition(f.db,'archive',{npcKey:'archivist',query:'bridge',recordRecall:false})[0];assert.equal(packet.npc_key,'archivist');assert.equal(packet.knowledge[0].belief_state,'known');assert.equal(packet.scene_observations,null);assert.equal(f.db.listCanon('archive',{includeGM:true}).length,0);
});
