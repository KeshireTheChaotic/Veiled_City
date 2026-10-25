import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createEvidenceRules,epistemicSchema} from '../../src/frameworks/knowledge/public.js';
import {indexWorldEvent,cityAudit} from '../../src/frameworks/world/public.js';
import * as original from '../../src/epistemic.js';

function recordRoom(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-evidence-c03-')),file=join(folder,'evidence.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('records');const api=createEvidenceRules({indexWorldEvent,cityAudit}),party={mode:'party'},own={mode:'private',actorUserId:'reader',actorCharacterId:'pc-reader'};
 const event=(key,patch={})=>indexWorldEvent(db,'records',{key,kind:'observation',title:'Recorded observation '+key,source_id:'gm:'+key,visibility:'party',details:{observation:'A yellow notice is posted'},...patch});const fact=(key,patch={})=>db.addFact('records',{key,content:'A yellow notice is posted',visibility:'party',...patch});
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {get db(){return db;},api,party,own,event,fact,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('evidence schema and legacy type defaults preserve model uncertainty and old record readers',()=>{
 const api=createEvidenceRules({indexWorldEvent,cityAudit});assert.equal(original.epistemicSchema,epistemicSchema);assert.equal(epistemicSchema.anyOf[1].additionalProperties,false);assert.equal(api.evidenceType({source:'ai_gm',category:'fact'}).kind,'hypothesis');assert.equal(api.evidenceType({source:'gm',category:'rumor'}).kind,'testimony');assert.equal(api.evidenceType({source:'gm',category:'fact',provenance_json:'broken'}).kind,'established');const type={kind:'observation',source_refs:['event:source'],perspective:'witness'};assert.deepEqual(api.evidenceType({provenance_json:JSON.stringify({epistemic:type})}),type);
});

test('active ancestry follows fact sources and rejects missing, archived, retracted and cyclic references',t=>{
 const f=recordRoom(t);f.event('sign');const id=f.fact('sign-report',{provenance:{epistemic:{kind:'testimony',source_refs:['event:sign'],perspective:'witness'}}});assert.equal(f.api.activeEvidence(f.db,'records',id),true);assert.equal(f.api.activeEvidence(f.db,'records','missing'),false);const cycle=f.fact('cycle',{provenance:{epistemic:{kind:'hypothesis',source_refs:[],perspective:'narrator'}}});f.db.updateFactProvenance('records',cycle,{epistemic:{kind:'hypothesis',source_refs:[cycle],perspective:'narrator'}});assert.equal(f.api.activeEvidence(f.db,'records',cycle),false);indexWorldEvent(f.db,'records',{key:'sign',status:'retracted'});assert.equal(f.api.activeEvidence(f.db,'records',id),false);f.reopen();assert.equal(f.api.activeEvidence(f.db,'records',id),false);assert.equal(f.db.getFact('records',id).content,'A yellow notice is posted');
});

test('objective evidence excludes confident testimony and hypotheses while retaining committed observations',t=>{
 const f=recordRoom(t);for(const [kind,expected] of [['hypothesis',false],['testimony',false],['observation',true],['established',true]]){const id=f.fact(kind,{confidence:100,provenance:{epistemic:{kind,source_refs:[],perspective:'recorded'}}});assert.equal(f.api.objectiveEvidence(f.db,'records',f.db.getFact('records',id)),expected);}assert.equal(f.api.objectiveEvidence(f.db,'records',{archived:1}),false);assert.equal(f.api.objectiveEvidence(f.db,'records',null),false);
});

test('untyped draft defaults to a hypothesis and caller cannot mutate the returned source-ref copy',t=>{
 const f=recordRoom(t),fallback=f.api.typedEvidence(f.db,'records',{value:'A possible lead'},f.own);assert.deepEqual(fallback,{kind:'hypothesis',source_refs:[],perspective:'character:pc-reader'});f.event('sign');const source_refs=['sign'],typed=f.api.typedEvidence(f.db,'records',{value:'A witness claim',epistemic:{kind:'testimony',source_refs,perspective:'witness'}},f.party);typed.source_refs.push('other');assert.deepEqual(source_refs,['sign']);assert.equal(f.db.listCanon('records',{includeGM:true}).length,0);
});

test('typed ancestry rejects unknown fields, missing sources, unsupported truth promotion and unsourced testimony',t=>{
 const f=recordRoom(t);const draft=epistemic=>({value:'A proposed assertion',epistemic});for(const epistemic of [{kind:'hypothesis',source_refs:[],perspective:'narrator',extra:true},{kind:'testimony',source_refs:['missing'],perspective:'witness'},{kind:'hypothesis',source_refs:[],perspective:'x'.repeat(181)}])assert.throws(()=>f.api.typedEvidence(f.db,'records',draft(epistemic),f.party),/bounded source ancestry/);assert.throws(()=>f.api.typedEvidence(f.db,'records',draft({kind:'established',source_refs:[],perspective:'narrator'}),f.party),/cannot promote truth/);assert.throws(()=>f.api.typedEvidence(f.db,'records',draft({kind:'testimony',source_refs:[],perspective:'witness'}),f.party),/requires its authored/);
});

test('character and player source ancestry qualifies only its acting audience and GM-only source never leaks',t=>{
 const f=recordRoom(t),pc=f.db.createCharacter('records','reader','Reader'),other=f.db.createCharacter('records','other-reader','Other reader'),scope={...f.own,actorCharacterId:pc.id};f.db.upsertPlayer('records','reader','Reader');for(const [key,visibility,subject_key] of [['own-character','character',pc.id],['own-player','player','reader'],['other','character',other.id],['hidden','gm',null]])f.event(key,{visibility,subject_key});const draft=key=>({value:'Attributed observation',epistemic:{kind:'testimony',source_refs:[key],perspective:'witness'}});for(const key of ['own-character','own-player']){assert.equal(f.api.typedEvidence(f.db,'records',draft(key),scope).kind,'testimony');assert.throws(()=>f.api.typedEvidence(f.db,'records',draft(key),f.party),/outside the acting audience/);}for(const key of ['other','hidden'])assert.throws(()=>f.api.typedEvidence(f.db,'records',draft(key),scope),/outside the acting audience/);
});

test('observation draft must exactly repeat committed observation and never infer an outcome',t=>{
 const f=recordRoom(t);f.event('notice');const draft=value=>({value,epistemic:{kind:'observation',source_refs:['notice'],perspective:'witness'}});assert.equal(f.api.typedEvidence(f.db,'records',draft('A yellow notice is posted'),f.party).kind,'observation');assert.throws(()=>f.api.typedEvidence(f.db,'records',draft('The player accepted the notice quest'),f.party),/repeat a committed observation/);assert.throws(()=>f.api.typedEvidence(f.db,'records',{value:'Something',epistemic:{kind:'observation',source_refs:[],perspective:'witness'}},f.party),/repeat a committed observation/);assert.equal(f.db.listSimulationRecords('records',{kind:'action'}).length,0);
});

test('explicit GM establishment keeps prior uncertain ancestry, private audience and durable ruling audit after restart',t=>{
 const f=recordRoom(t),pc=f.db.createCharacter('records','reader','Reader'),id=f.fact('private-report',{visibility:'character',subjectCharacterId:pc.id,category:'rumor',source:'ai_gm',provenance:{epistemic:{kind:'hypothesis',source_refs:[],perspective:'narrator'}}});assert.throws(()=>f.api.establishFact(f.db,'records',id,''),/Authenticated GM/);const established=f.api.establishFact(f.db,'records',id,'gm-reviewer'),epistemic=JSON.parse(established.provenance_json).epistemic;assert.equal(epistemic.kind,'established');assert.equal(epistemic.prior.kind,'hypothesis');assert.equal(established.visibility,'character');assert.equal(established.subject_character_id,pc.id);const ruling=f.db.getWorldEvent('records',epistemic.source_refs[0]);assert.equal(ruling.kind,'gm_fact_ruling');assert.equal(ruling.visibility,'character');assert.equal(ruling.subject_key,pc.id);assert.equal(ruling.details.reviewed_by,'gm-reviewer');f.reopen();assert.equal(f.api.objectiveEvidence(f.db,'records',f.db.getFact('records',id)),true);assert.equal(f.db.mutationsForEntity('records',id).filter(m=>m.mutation_type==='fact_establish').length,1);
});

test('failed establishment audit rolls fact provenance and ruling event back together',t=>{
 const f=recordRoom(t),id=f.fact('unreviewed',{source:'ai_gm'}),before=f.db.getFact('records',id),events=f.db.listWorldEvents('records',{includeGM:true}),record=f.db.recordMutation;f.db.recordMutation=function(g,mutation){if(mutation.mutationType==='fact_establish')throw Error('C03 establishment audit failure');return record.call(this,g,mutation);};assert.throws(()=>f.api.establishFact(f.db,'records',id,'gm-reviewer'),/C03 establishment/);f.db.recordMutation=record;assert.deepEqual(f.db.getFact('records',id),before);assert.deepEqual(f.db.listWorldEvents('records',{includeGM:true}),events);assert.equal(f.api.evidenceType(before).kind,'hypothesis');
});

test('original evidence provider reaches isolated rules and preserves historical fact ancestry without cross-campaign grant',t=>{
 const f=recordRoom(t);f.event('notice');const id=f.fact('report',{provenance:{epistemic:{kind:'observation',source_refs:['notice'],perspective:'witness'}}});assert.equal(original.activeEvidence(f.db,'records',id),true);assert.equal(original.objectiveEvidence(f.db,'records',f.db.getFact('records',id)),true);assert.equal(original.activeEvidence(f.db,'other',id),false);const row=original.establishFact(f.db,'records',id,'human-gm');assert.equal(original.evidenceType(row).kind,'established');
});
