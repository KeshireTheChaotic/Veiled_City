import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createPresentationEvidence} from '../../src/frameworks/knowledge/public.js';
import {typedEvidence,objectiveEvidence,activeEvidence} from '../../src/epistemic.js';
import {indexWorldEvent,cityAudit} from '../../src/frameworks/world/public.js';
import {stateRevision} from '../../src/kernel/state-revision.js';
import {stateRevision as intentRevision} from '../../src/ai-intents.js';
import * as original from '../../src/presentation-evidence.js';

function exhibit(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-presentation-c10-')),file=join(folder,'exhibit.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('exhibit');indexWorldEvent(db,'exhibit',{key:'review-source',title:'GM review evidence',source_id:'gm:review'});const handout=db.createHandout('exhibit',{title:'A disputed letter',content:'Original decorative letter text.',metadata:{authored:true}}),api=createPresentationEvidence({typedEvidence,objectiveEvidence,activeEvidence,indexWorldEvent,cityAudit}),input=(patch={})=>({op:'review-presentation',kind:'handout',key:handout.id,decision:'approve',expected_revision:stateRevision(db.getHandout(handout.id)),reason:'A sourced presentation interpretation.',source_refs:['review-source'],...patch});
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {api,get db(){return db;},handout,input,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('kernel row revision preserves original Intent function identity, reflected name, JSON bytes and absent sentinel',()=>{
 assert.equal(stateRevision,intentRevision);assert.equal(stateRevision.name,'stateRevision');for(const row of [null,undefined,false,0,'',{},[],{a:1,b:2},{b:2,a:1},{private:'fixture-only',revision:4}])assert.equal(stateRevision(row),row?createHash('sha256').update(JSON.stringify(row)).digest('hex'):'absent');assert.notEqual(stateRevision({a:1,b:2}),stateRevision({b:2,a:1}));assert.throws(()=>stateRevision({invalid:1n}),/BigInt/);
});

test('uncertain legacy and model relationships retain perspective and cannot become PC consent or debt',t=>{
 const f=exhibit(t);assert.equal(f.api.inferredSource('gm'),false);assert.equal(f.api.inferredSource('seed:source'),false);assert.equal(f.api.inferredSource('ai_gm'),true);assert.equal(f.api.relationshipEvidence({source:'ai_gm',from_type:'npc',from_key:'witness',provenance_json:'invalid'}).kind,'hypothesis');const old={note:'Original interpretation',score:2,source:'gm'},result=f.api.relationshipProvenance(f.db,'exhibit',{from_type:'npc',from_key:'witness',note:'An attributed hypothesis'}, {mode:'party'},old);assert.equal(result.epistemic.kind,'hypothesis');assert.equal(result.epistemic.perspective,'npc:witness');assert.match(result.epistemic.authority,/not consent or binding debt/);assert.equal(result.original.note,old.note);
});

test('artifact accepted facts require exact objective source text and the proposed audience before presentation',t=>{
 const f=exhibit(t),pc=f.db.createCharacter('exhibit','reader','Reader'),texts=['Public notice','Owner-only detail','Hidden GM cause'],refs=texts.map((content,i)=>f.db.addFact('exhibit',{key:'fact-'+i,content,visibility:['party','character','gm'][i],subjectCharacterId:i===1?pc.id:null,provenance:{epistemic:{kind:'observation',source_refs:[],perspective:'native recorded observation'}}})),draft={canonical_facts:[...texts,'Unsupported accusation'],epistemic:{kind:'testimony',source_refs:refs,perspective:'letter author'}};const party=f.api.artifactProvenance(f.db,'exhibit',draft,'party',null,{mode:'party'});assert.deepEqual(party.accepted,['Public notice']);assert.equal(party.metadata.unsupported_count,3);const own=f.api.artifactProvenance(f.db,'exhibit',draft,'character',pc.id,{mode:'private',actorCharacterId:pc.id});assert.deepEqual(own.accepted,['Public notice','Owner-only detail']);assert.equal(f.db.listCanon('exhibit',{includeGM:true}).length,0);
});

test('source-backed rumor or confident model assertion does not become an artifact canonical fact',t=>{
 const f=exhibit(t),id=f.db.addFact('exhibit',{key:'rumor',content:'An allegation',source:'ai_gm',confidence:100,provenance:{epistemic:{kind:'hypothesis',source_refs:[],perspective:'narrator'}}});const result=f.api.artifactProvenance(f.db,'exhibit',{canonical_facts:['An allegation'],epistemic:{kind:'hypothesis',source_refs:[id],perspective:'author'}},'party',null,{mode:'party'});assert.deepEqual(result.accepted,[]);assert.equal(result.metadata.epistemic.kind,'hypothesis');assert.equal(result.metadata.unsupported_count,1);
});

test('GM review adds private sourced metadata without rewriting original handout or canon and survives restart',t=>{
 const f=exhibit(t),row=f.api.reviewPresentation(f.db,'exhibit',f.input(),'gm-reviewer');assert.equal(row.visibility,'gm');assert.equal(row.data.reviewed_by,'gm-reviewer');assert.match(row.data.authority,/does not authorize PC feelings\/consent/);assert.deepEqual(f.db.getHandout(f.handout.id),f.handout);assert.equal(f.db.listCanon('exhibit',{includeGM:true}).length,0);f.reopen();const view=f.api.presentationView(f.db,'exhibit',{op:'presentations',kind:'handout',key:f.handout.id});assert.equal(view.read_only,true);assert.equal(view.targets[0].target.content,'Original decorative letter text.');assert.equal(view.reviews.length,1);assert.equal(view.reviews[0].evidence_active,true);
});

test('missing reviewer, stale target revision and closed-field violations fail before review metadata is committed',t=>{
 const f=exhibit(t);assert.throws(()=>f.api.reviewPresentation(f.db,'exhibit',f.input(),''),/Closed sourced GM/);assert.throws(()=>f.api.reviewPresentation(f.db,'exhibit',f.input({expected_revision:'stale'}),'gm'),/Current presentation target revision/);assert.throws(()=>f.api.reviewPresentation(f.db,'exhibit',{...f.input(),approved:true},'gm'),/Closed sourced GM/);assert.throws(()=>f.api.reviewPresentation(f.db,'exhibit',f.input({source_refs:['missing']}),'gm'),/Closed sourced GM/);assert.equal(f.db.listCityRecords('exhibit',{kind:'presentation_review',includeGM:true}).length,0);assert.deepEqual(f.db.getHandout(f.handout.id),f.handout);
});

test('review audit failure rolls native review event and annotation back without touching the original',t=>{
 const f=exhibit(t),events=f.db.listWorldEvents('exhibit',{includeGM:true}),record=f.db.recordMutation;f.db.recordMutation=function(g,row){if(row.mutationType==='presentation_review')throw Error('C10 review audit failed');return record.call(this,g,row);};assert.throws(()=>f.api.reviewPresentation(f.db,'exhibit',f.input(),'gm'),/C10 review/);f.db.recordMutation=record;assert.deepEqual(f.db.listWorldEvents('exhibit',{includeGM:true}),events);assert.equal(f.db.listCityRecords('exhibit',{kind:'presentation_review',includeGM:true}).length,0);assert.deepEqual(f.db.getHandout(f.handout.id),f.handout);
});

test('retracted review ancestry remains historical metadata with current evidence_active false',t=>{
 const f=exhibit(t),row=f.api.reviewPresentation(f.db,'exhibit',f.input(),'gm');indexWorldEvent(f.db,'exhibit',{key:'review-source',status:'retracted'});const context=f.api.presentationContext(f.db,'exhibit');assert.equal(context.reviews[0].record_key,row.record_key);assert.equal(context.reviews[0].evidence_active,false);assert.match(context.authority,/No PC emotions, consent, debt or automatic canon/);assert.deepEqual(f.db.getHandout(f.handout.id),f.handout);
});

test('presentation views retain exact campaign isolation and full-key access beyond recent summary',t=>{
 const f=exhibit(t);f.db.ensureCampaign('another');assert.throws(()=>f.api.presentationView(f.db,'another',{op:'presentations',kind:'handout',key:f.handout.id}),/not found/);assert.throws(()=>f.api.presentationView(f.db,'exhibit',{op:'presentations',kind:'handout',extra:true}),/Known presentation kind/);assert.equal(original.presentationView(f.db,'exhibit',{op:'presentations',kind:'handout',key:f.handout.id}).targets[0].target.id,f.handout.id);const row=original.reviewPresentation(f.db,'exhibit',f.input(),'gm');assert.equal(row.data.kind,'handout');assert.equal(original.inferredSource('human_gm'),false);
});
