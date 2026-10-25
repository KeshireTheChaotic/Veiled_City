import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createMemoryLifecycle} from '../../src/frameworks/knowledge/public.js';
import {BACKGROUND_WORLD_KINDS,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {jsonHash} from '../../src/kernel/json-hash.js';
import * as original from '../../src/memory-lifecycle.js';

function room(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-memory-life-c04-')),file=join(folder,'memory.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),origin=true,entitled=true;db.ensureCampaign('square');indexWorldEvent(db,'square',{key:'description',title:'Recorded ordinary description',source_id:'gm:description',visibility:'party'});const pc=db.createCharacter('square','reader','Reader');indexWorldEvent(db,'square',{key:'private-description',title:'Private ordinary description',source_id:'gm:private',visibility:'character',subject_key:pc.id});
 const api=createMemoryLifecycle({BACKGROUND_WORLD_KINDS,narrativeSourceVisible:()=>entitled,narrativeImportance:()=>null,worldIdentityOrigin:()=>origin});const input=(patch={})=>({kind:'object',name:'Silver Compass',parent_key:'location:square',aliases:[],source_event:'description',visibility:'party',epistemic:'observation',summary:'A silver compass rests on a stall.',...patch}),remember=(patch={})=>api.rememberEntity(db,'square',input(patch)),scope={mode:'private',actorUserId:'reader',actorCharacterId:pc.id};
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {api,get db(){return db;},pc,scope,input,remember,setOrigin:v=>origin=v,setEntitled:v=>entitled=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('parent and audience scoped identity does not grant possession, knowledge or equivalence across places',t=>{
 const f=room(t),shared=f.remember(),elsewhere=f.remember({parent_key:'location:market'}),privateOne=f.remember({source_event:'private-description',visibility:'character',subject_key:f.pc.id});assert.notEqual(shared.identity.record_key,elsewhere.identity.record_key);assert.notEqual(shared.identity.record_key,privateOne.identity.record_key);assert.match(shared.identity.data.authority,/parent- and audience-scoped/);assert.equal(f.db.listCanon('square',{includeGM:true}).length,0);assert.equal(f.db.listNpcProfiles('square').length,0);assert.equal(f.db.listSimulationRecords('square',{kind:'action'}).length,0);assert.equal(f.api.retrieveMemoryRevisions(f.db,'square',{mode:'party'}).length,2);assert.equal(f.api.retrieveMemoryRevisions(f.db,'square',f.scope).length,3);
});

test('rename preserves scoped aliases while attempted parent or audience substitution is rejected',t=>{
 const f=room(t),first=f.remember(),renamed=f.remember({identity_key:first.identity.record_key,name:'Moon Compass',summary:'The same compass has a local nickname.'});assert.equal(renamed.identity.record_key,first.identity.record_key);assert.ok(renamed.identity.data.aliases.includes('Silver Compass'));assert.throws(()=>f.remember({identity_key:first.identity.record_key,parent_key:'location:another'}),/cannot cross parent or audience/);assert.throws(()=>f.remember({identity_key:first.identity.record_key,visibility:'character',subject_key:f.pc.id}),/cannot cross parent or audience/);
});

test('memory revision replay retains the same evidence key without copying a second revision',t=>{
 const f=room(t),first=f.remember(),again=f.remember();assert.equal(again.revision.record_key,first.revision.record_key);assert.equal(f.db.listCityRecords('square',{kind:'memory_revision',includeGM:true}).length,1);assert.equal(again.identity.data.identity_revision,2);f.reopen();assert.equal(f.api.retrieveMemoryRevisions(f.db,'square',{mode:'party'})[0].summary,first.revision.data.summary);
});

test('correction and retraction preserve old assertion and source ancestry instead of overwriting history',t=>{
 const f=room(t),first=f.remember(),next=f.api.reviseMemory(f.db,'square',first.revision.record_key,{source_event:'description',summary:'A witness disputes the compass markings.',epistemic:'testimony'});assert.equal(f.db.getCityRecord('square','memory_revision',first.revision.record_key).status,'superseded');assert.equal(next.data.supersedes,first.revision.record_key);assert.equal(f.db.getCityRecord('square','memory_revision',first.revision.record_key).data.summary,first.revision.data.summary);const retracted=f.api.retractMemory(f.db,'square',next.record_key,{source_event:'description',reason:'Current witness withdrew the claim'});assert.equal(retracted.status,'retracted');assert.equal(f.api.retrieveMemoryRevisions(f.db,'square',{mode:'party'}).length,0);assert.equal(f.db.getCityRecord('square','memory_identity',first.identity.record_key).status,'active');
});

test('expiry uses fictional ticks and explicit pending reference protection rather than wall clock',t=>{
 const f=room(t),first=f.remember({expires_tick:0});assert.equal(f.api.retrieveMemoryRevisions(f.db,'square',{mode:'party'},{at_tick:0}).length,1);assert.equal(f.api.retrieveMemoryRevisions(f.db,'square',{mode:'party'},{at_tick:1}).length,0);assert.equal(f.api.retrieveMemoryRevisions(f.db,'square',{mode:'party'},{at_tick:999,pending_identity_refs:[first.identity.record_key]}).length,1);assert.throws(()=>f.remember({expires_tick:-1}),/fictional campaign tick/);
});

test('private source cannot establish a public memory and retracted source stops current retrieval without deletion',t=>{
 const f=room(t);assert.throws(()=>f.remember({source_event:'private-description'}),/audience-compatible/);const first=f.remember();indexWorldEvent(f.db,'square',{key:'description',status:'retracted'});assert.deepEqual(f.api.retrieveMemoryRevisions(f.db,'square',{mode:'party'}),[]);assert.equal(f.db.getCityRecord('square','memory_revision',first.revision.record_key).status,'active');assert.throws(()=>f.remember(),/audience-compatible/);
});

test('native_fact label requires the actual resolved receipt while subjective labels do not confer native effects',t=>{
 const f=room(t);assert.throws(()=>f.remember({epistemic:'native_fact'}),/committed receipt/);f.db.saveCityRecord('square',{kind:'native-effect',key:'resolved-effect',source_event:'description',status:'pending',data:{}});assert.throws(()=>f.remember({epistemic:'native_fact',receipt:{kind:'native-effect',key:'resolved-effect'}}),/committed receipt/);f.db.saveCityRecord('square',{kind:'native-effect',key:'resolved-effect',source_event:'description',status:'resolved',data:{}});assert.equal(f.remember({epistemic:'native_fact',receipt:{kind:'native-effect',key:'resolved-effect'}}).revision.data.epistemic,'native_fact');assert.equal(f.db.listSimulationRecords('square',{kind:'action'}).length,0);
});

test('caller transaction keeps failed identity and revision write atomic without changing primitive contract',t=>{
 const f=room(t),save=f.db.saveCityRecord;f.db.saveCityRecord=function(g,row){if(row.kind==='memory_revision')throw Error('C04 revision write failed');return save.call(this,g,row);};assert.throws(()=>f.db.transaction(()=>f.remember()),/C04 revision/);f.db.saveCityRecord=save;assert.equal(f.db.listCityRecords('square',{kind:'memory_identity',includeGM:true}).length,0);assert.equal(f.db.listCityRecords('square',{kind:'memory_revision',includeGM:true}).length,0);
});

function worldFixture(f){
 const identity=f.db.saveCityRecord('square',{kind:'autonomous_entity',key:'faction:brass-circle',source_event:'description',visibility:'party',data:{kind:'faction',name:'Brass Circle',aliases:[]}}),data={unit:{kind:'npc_speech',source_refs:['description']},binding:{scope:{mode:'party'}},text:'The Brass Circle offers an introduction.'};indexWorldEvent(f.db,'square',{key:'accepted-unit',kind:'native_narrative_unit',title:'Accepted unit fixture',source_id:'native:narrative-authority',details:{payload_hash:jsonHash(data)}});f.db.saveCityRecord('square',{kind:'narrative_unit',key:'unit-one',status:'accepted_established',source_event:'accepted-unit',data});indexWorldEvent(f.db,'square',{key:'retained-unit',kind:'native_narrative_memory',title:'Native retention fixture',source_id:'native:narrative-memory',details:{unit:'unit-one',input_source:'accepted-unit'}});return {identity,data,input:{version:2,kind:'faction',name:'Brass Circle',aliases:[],parent_key:'world:faction:brass-circle',world_identity_ref:identity.record_key,source_event:'retained-unit',visibility:'gm',epistemic:'testimony',summary:data.text}};
}

test('V2 World identity requires exact independently checked native unit projection and remains GM-private before delivery',t=>{
 const f=room(t),w=worldFixture(f);w.input.subject_key=null;const saved=f.api.rememberEntity(f.db,'square',w.input);assert.equal(saved.identity.data.version,2);assert.equal(saved.revision.visibility,'gm');assert.equal(saved.revision.data.world_identity_ref,w.identity.record_key);assert.equal(f.api.retrieveMemoryRevisions(f.db,'square',{mode:'party'}).length,0);assert.throws(()=>f.api.rememberEntity(f.db,'square',{...w.input,summary:'The PCs join the faction'}),/exact native identity/);f.setOrigin(false);assert.throws(()=>f.api.rememberEntity(f.db,'square',w.input),/exact native identity/);
});

test('World memory source visibility and immutable unit hash block altered or unsupported V2 projections',t=>{
 const f=room(t),w=worldFixture(f);w.input.subject_key=null;f.setEntitled(false);assert.throws(()=>f.api.rememberEntity(f.db,'square',w.input),/exact native identity/);f.setEntitled(true);f.db.saveCityRecord('square',{kind:'narrative_unit',key:'unit-one',status:'accepted_established',source_event:'accepted-unit',data:{...w.data,text:'Changed unit prose'}});assert.throws(()=>f.api.rememberEntity(f.db,'square',w.input),/exact native identity/);assert.equal(f.db.listCityRecords('square',{kind:'memory_revision',includeGM:true}).length,0);
});

test('a claimed native disclosure with no durable acknowledgments cannot become public World memory',t=>{
 const f=room(t),w=worldFixture(f);indexWorldEvent(f.db,'square',{key:'claim-disclosed',kind:'native_narrative_disclosure',title:'Unsupported disclosure fixture',source_id:'native:narrative-memory',visibility:'party',details:{unit:'unit-one',input_source:'accepted-unit',publications:[]}});assert.throws(()=>f.api.rememberEntity(f.db,'square',{...w.input,source_event:'claim-disclosed',visibility:'party'}),/bounded native disclosure receipts/);assert.equal(f.db.listCityRecords('square',{kind:'memory_revision',includeGM:true}).length,0);
});

test('original memory provider reaches extracted identity retrieval and preserves existing epistemic mapping',t=>{
 const f=room(t),row=original.rememberEntity(f.db,'square',f.input());assert.equal(original.retrieveMemoryRevisions(f.db,'square',{mode:'party'})[0].identity,row.identity.record_key);assert.equal(original.narrativeMemoryEpistemic({kind:'npc_speech'}),'testimony');assert.equal(original.narrativeMemoryEpistemic({kind:'npc_action_attempt'}),'attempt');assert.equal(original.narrativeMemoryEpistemic({kind:'scene',epistemic:'hypothesis'}),'inference');assert.equal(original.narrativeMemoryEpistemic({kind:'scene'}),'observation');
});
