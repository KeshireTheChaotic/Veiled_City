import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import * as knowledge from '../../src/frameworks/knowledge/public.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';

function archive(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-knowledge-leaf-')),file=join(dir,'records.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('library');indexWorldEvent(db,'library',{key:'basis',title:'Recorded source basis',source_id:'gm:basis'});
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('all eight moved leaf implementations retain original bytes and original exported function identities',async()=>{
 const record=JSON.parse(readFileSync(fileURLToPath(new URL('../../../docs/Implementation_Plans/Framework_Refactor/features/RF04-F03/C01-MOVE.json',import.meta.url)),'utf8'));
 for(const move of record.moves){const bytes=readFileSync(fileURLToPath(new URL('../../../'+move.to,import.meta.url)));assert.equal(createHash('sha256').update(bytes).digest('hex'),move.sha256);const leaf=await import('../../src/frameworks/knowledge/'+move.to.split('/').at(-1)),old=await import('../../src/'+move.from.split('/').at(-1)).catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return null;throw e;});for(const [key,value] of Object.entries(leaf)){if(old)assert.equal(old[key],value);assert.equal(knowledge[key],value);}}
});

test('disclosure predicate partitions public, owner-player, owner-character and GM facts',()=>{
 const party={mode:'party'},own={mode:'private',actorUserId:'u1',actorCharacterId:'c1'},other={mode:'private',actorUserId:'u2',actorCharacterId:'c2'};
 for(const visibility of ['public','party'])for(const scope of [party,own,other])assert.equal(knowledge.factVisibleTo({visibility},scope),true);
 for(const row of [{visibility:'player',subject_user_id:'u1'},{visibility:'character',subject_character_id:'c1'}]){assert.equal(knowledge.factVisibleTo(row,own),true);assert.equal(knowledge.factVisibleTo(row,party),false);assert.equal(knowledge.factVisibleTo(row,other),false);}assert.equal(knowledge.factVisibleTo({visibility:'gm'},own),false);
});

test('disclosure failure codes contain no private text and require every proposed audience to qualify',()=>{
 const secret={content:'Distinct private report',visibility:'character',subject_character_id:'c1'},own={mode:'private',actorCharacterId:'c1'};
 assert.equal(knowledge.disclosureFailureReason(null,'anything',[]),'fact_missing');assert.equal(knowledge.disclosureFailureReason({...secret,archived:1},secret.content,[own]),'fact_archived');assert.equal(knowledge.disclosureFailureReason(secret,'changed',[own]),'content_mismatch');assert.equal(knowledge.disclosureFailureReason(secret,secret.content,[own,{mode:'party'}]),'audience_denied');assert.equal(knowledge.disclosureFailureReason(secret,secret.content,[own]),null);
});

test('authority index retains source revision hash and full detail pages are independent copies',()=>{
 const rows=[{id:'one',visibility:'gm',source_id:'source-one',revision:4,content:'First complete record'},{id:'two',visibility:'party',content:'Second complete record'}],index=knowledge.projectAuthorityRecords('canon',rows,{pageSize:1});assert.equal(index.count,2);assert.equal(index.pages,2);assert.equal(index.records[0].revision,4);assert.equal(index.records[0].source,'source-one');assert.match(index.authority,/never replaces/);assert.equal(index.records[0].content,undefined);const first=knowledge.authorityRecordPage('canon',rows,{pageSize:1});first.records[0].content='Changed clone';assert.equal(rows[0].content,'First complete record');assert.equal(first.next_page,1);assert.equal(knowledge.authorityRecordPage('canon',rows,{page:1,pageSize:1}).records[0].id,'two');
});

test('public identity matcher respects complete Unicode word boundaries and grants no action interpretation',()=>{
 assert.equal(knowledge.mentionsPublicIdentity('The Café Lantern is open.','Café Lantern'),true);assert.equal(knowledge.mentionsPublicIdentity('The Café Lanternkeeper spoke.','Café Lantern'),false);assert.equal(knowledge.mentionsPublicIdentity('Old_Rook arrived.','Rook'),false);assert.equal(knowledge.mentionsPublicIdentity('Rook: a sign points left','Rook'),true);assert.equal(knowledge.mentionsPublicIdentity('A chair','A'),false);
});

test('lexical authority inventory rejects general mechanical routing without executing any old workflow',()=>{
 const sources={index:'native dispatcher only',autonomous:'legacy_scene_entry_adapter',sceneEntry:'legacy_scene_entry_adapter',dialogue:'authored utterance',candidates:'nonbinding pending candidate'};assert.equal(knowledge.auditLegacyLanguageAuthority(sources).authoritative_general_lexical_routes,0);assert.throws(()=>knowledge.auditLegacyLanguageAuthority({...sources,index:'routeRollMessage(input)'}),/lexical mechanical/);assert.throws(()=>knowledge.auditLegacyLanguageAuthority({...sources,autonomous:'worldRequirements(input) legacy_scene_entry_adapter'}),/phrase classification/);assert.throws(()=>knowledge.auditLegacyLanguageAuthority({...sources,candidates:'committed effects'}),/nonbinding/);
});

test('directional relationships persist source perspective and milestones without assigning PC feelings',t=>{
 const f=archive(t),row={from_type:'npc',from_key:'npc:scribe',to_type:'character',to_key:'character:pc',relationship_type:'trust',score:4,source:'gm',epistemic:{kind:'testimony',perspective:'npc:scribe',source_refs:[]}},state=knowledge.updateRelationshipDimensions(f.db,'library',row),key=knowledge.relationshipPairKey(row);assert.equal(state.from,'npc:scribe');assert.equal(state.to,'character:pc');assert.equal(state.dimensions.trust,4);assert.equal(state.milestone,'trusted');assert.match(state.authority,/not PC feelings/);assert.equal(f.db.listSimulationRecords('library',{kind:'memory',entityKey:'relationship:'+key}).length,1);knowledge.updateRelationshipDimensions(f.db,'library',row);assert.equal(f.db.listSimulationRecords('library',{kind:'memory',entityKey:'relationship:'+key}).length,1);f.reopen();assert.deepEqual(f.db.getSimulationEntity('library','relationship',key).state,state);assert.equal(f.db.getSimulationEntity('library','relationship',JSON.stringify(['character','pc','npc','scribe'])),null);
});

test('model hypotheses cannot author PC feelings or debt while NPC-owned interpretation remains subjective',t=>{
 const f=archive(t),base={from_type:'character',from_key:'pc',to_type:'npc',to_key:'scribe',relationship_type:'affection',score:5,source:'ai_gm'};assert.equal(knowledge.updateRelationshipDimensions(f.db,'library',base),null);assert.equal(knowledge.updateRelationshipDimensions(f.db,'library',{...base,from_type:'npc',from_key:'scribe',to_type:'character',to_key:'pc',relationship_type:'debt'}),null);const npc=knowledge.updateRelationshipDimensions(f.db,'library',{...base,from_type:'npc',from_key:'scribe',to_type:'character',to_key:'pc',epistemic:{kind:'hypothesis',perspective:'npc:scribe',source_refs:[]}});assert.equal(npc.epistemic.kind,'hypothesis');assert.equal(knowledge.relationshipProjection(npc).authority,npc.authority);assert.equal(f.db.listCanon('library',{includeGM:true}).length,0);
});

test('actual database relationship writer reaches moved implementation and rolls directional state back atomically',t=>{
 const f=archive(t);const row=f.db.upsertRelationship('library',{fromType:'npc',fromKey:'scribe',toType:'npc',toKey:'courier',relationshipType:'authority',score:3,visibility:'gm',source:'gm'}),key=knowledge.relationshipPairKey(row);assert.equal(f.db.getSimulationEntity('library','relationship',key).state.dimensions.respect,3);assert.equal(f.db.listRelationships('library').length,0);const before=f.db.getSimulationEntity('library','relationship',key);assert.throws(()=>f.db.transaction(()=>{knowledge.updateRelationshipDimensions(f.db,'library',{...row,relationship_type:'fear',score:5});throw Error('C01 injected rollback');}),/C01 injected/);assert.deepEqual(f.db.getSimulationEntity('library','relationship',key),before);
});

test('narrative record locator explicitly pages real SQLite records above the native one-page limit',t=>{
 const f=archive(t);f.db.transaction(()=>{for(let i=0;i<207;i++)f.db.saveCityRecord('library',{kind:'continuity',key:'record-'+i,source_event:'basis',visibility:i%2?'character':'gm',subject_key:i%2?'c1':null,data:{sequence:i}});});const rows=knowledge.listNarrativeRecords(f.db,'library','continuity');assert.equal(rows.length,207);assert.equal(new Set(rows.map(r=>r.record_key)).size,207);assert.equal(knowledge.NARRATIVE_RECORD_LIMIT,5000);assert.equal(rows[0].data.sequence,206);assert.equal(f.db.listCityRecords('library',{kind:'continuity',includeGM:true,limit:1000}).length,100);
});

function alias(f){
 const pc=f.db.createCharacter('library','u1','Reader');indexWorldEvent(f.db,'library',{key:'owner-context',kind:'ai_gm_input',title:'Owner source',visibility:'character',subject_key:pc.id,source_id:'player:u1',details:{author:'u1',private_scene:true,principal:{context_id:pc.id}}},'u1');f.db.saveCityRecord('library',{kind:'narrative_context',key:'reader-alias',source_event:'owner-context',visibility:'character',subject_key:pc.id,data:{interpretation:{references:[{status:'resolved',phrase:'canal cafe',entity_key:'cafe-willow',entity_type:'location',source_refs:['owner-context']}]}}});return pc;
}

test('scoped query expansion uses only independently authorized own aliases and rejects changed audience or source',t=>{
 const f=archive(t),pc=alias(f),plan=knowledge.scopedQueryPlan(f.db,'library','u1',pc.id,'remember that cafe');assert.equal(plan.aliases.length,1);assert.equal(plan.aliases[0].entity_key,'cafe-willow');assert.ok(plan.terms.includes('coffee'));assert.match(plan.authority,/not established identity/);assert.equal(knowledge.scopedQueryPlan(f.db,'library','u2',pc.id,'cafe').aliases.length,0);indexWorldEvent(f.db,'library',{key:'owner-context',status:'retracted'});f.reopen();assert.equal(knowledge.scopedQueryPlan(f.db,'library','u1',pc.id,'cafe').aliases.length,0);
});

test('scoped fact search keeps party and own facts while excluding GM and unrelated private material',t=>{
 const f=archive(t),pc=f.db.createCharacter('library','u1','Reader'),other=f.db.createCharacter('library','u2','Other');for(const [key,visibility,subjectCharacterId] of [['shared','party',null],['own','character',pc.id],['other','character',other.id],['hidden','gm',null]])f.db.addFact('library',{key,content:'Canal record '+key,visibility,subjectCharacterId});const result=knowledge.queryScopedFacts(f.db,'library','u1',pc.id,knowledge.scopedQueryPlan(f.db,'library','u1',pc.id,'canal'));assert.deepEqual(result.rows.map(r=>r.fact_key).sort(),['own','shared']);assert.equal(result.omitted,0);
});

test('provenance explanation is read-only, explicitly uncertain, private and campaign-scoped',t=>{
 const f=archive(t);f.db.saveCityRecord('library',{kind:'case',key:'unexplained',source_event:'basis',data:{}});indexWorldEvent(f.db,'library',{key:'interpretation',title:'Attributed interpretation',source_id:'npc:scribe'});f.db.saveWorldLink('library',{from:'basis',to:'interpretation',relation:'caused_by',asserted_by:'npc:scribe'});const before=f.db.cityRecordCounts('library'),report=knowledge.explainWhy(f.db,'library',{kind:'case',key:'unexplained'});assert.equal(report.visibility,'gm');assert.match(report.entity.reason,/No specific reason recorded/);assert.match(report.causal_links[0].authority,/not proven cause/);assert.match(report.not_established,/PC consent/);assert.deepEqual(f.db.cityRecordCounts('library'),before);assert.throws(()=>knowledge.explainWhy(f.db,'another-campaign',{kind:'case',key:'unexplained'}),/not found/);
});

test('three actual Knowledge consumers import their own public API after the leaf move',()=>{
 for(const name of ['memory-lifecycle','narrative-memory','personal-continuity']){const source=readFileSync(fileURLToPath(new URL('../../src/'+name+'.js',import.meta.url)),'utf8');assert.match(source,/from '.\/frameworks\/knowledge\/public.js'/);assert.doesNotMatch(source,/from ['"].\/(?:narrative-records|scoped-query)\.js['"]/);}
});
