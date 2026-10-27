import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeKnowledgeWorld} from '../../src/application/composition/public.js';
initializeKnowledgeWorld();
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createEvidenceCustody} from '../../src/frameworks/knowledge/public.js';
import {cityObject,cityKey,cityAudit,requireCitySource,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {personalCharacter} from '../../src/personal-continuity.js';
import {motivationKey} from '../../src/simulation-motivation.js';
import {stateRevision} from '../../src/kernel/state-revision.js';
import * as original from '../../src/evidence-custody.js';

function cabinet(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-custody-c11-')),file=join(folder,'custody.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),present=true;db.ensureCampaign('cabinet');db.setCityCalendar('cabinet',{flags:{evidence_custody:true}});for(const user of ['reader','recipient'])db.upsertPlayer('cabinet',user,user);const owner=db.createCharacter('cabinet','reader','Reader'),recipient=db.createCharacter('cabinet','recipient','Recipient'),session=db.startSession('cabinet','Evidence review');for(const [user,pc] of [['reader',owner],['recipient',recipient]]){db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,'present');}db.setSimulationEntity('cabinet','location','gallery',{name:'Evidence gallery'});db.upsertNpcProfile('cabinet',{npcKey:'curator',displayName:'Curator'});const handout=db.createHandout('cabinet',{title:'Unverified letter',content:'The original letter text.',visibility:'party'}),api=createEvidenceCustody({cityObject,cityKey,cityAudit,requireCitySource,personalCharacter,scenePresence:()=>present?{location_key:'gallery',data:{state:'actually_present'}}:null});
 const source=(key,evidence,patch={})=>indexWorldEvent(db,'cabinet',{key,kind:'evidence_transfer',title:'Grounded evidence source '+key,source_id:'gm:'+key,details:{evidence:{handout_id:handout.id,copy:'original',...evidence}},...patch});
 const expected=()=>stateRevision(db.getHandout(handout.id).metadata.evidence),input=(op,key,source_event,patch={})=>({op,key,id:handout.id,source_event,expected_revision:expected(),...patch}),run=(op,key,ref,patch={},user='reader',gm=false)=>api.manageEvidence(db,'cabinet',input(op,key,ref,patch),user,{gm});
 const register=()=>{source('registration',{from:null,to:'location:gallery'});return run('register','register','registration',{holder:'location:gallery'},'gm',true);};const collect=()=>{register();source('collection',{from:'location:gallery',to:'character:'+owner.id});return run('collect','collect','collection');};
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {api,get db(){return db;},owner,recipient,session,handout,source,input,run,expected,register,collect,setPresent:v=>present=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('registration needs explicit human GM grounded non-PC custody and preserves original content without canon',t=>{
 const f=cabinet(t);f.source('registration',{from:null,to:'location:gallery'});assert.throws(()=>f.run('register','not-gm','registration',{holder:'location:gallery'}),/GM registration/);const view=f.register();assert.equal(view.evidence.original.holder,'location:gallery');assert.equal(f.db.getHandout(f.handout.id).content,f.handout.content);assert.equal(f.db.listCanon('cabinet',{includeGM:true}).length,0);const key=motivationKey([f.handout.id,'registration','original','custody']);assert.equal(f.db.getCityRecord('cabinet','evidence_effect',key).data.operation,'register');
});

test('owner collection requires actual presence and existing native owner assignment/attendance',t=>{
 const f=cabinet(t);f.register();f.source('collection',{from:'location:gallery',to:'character:'+f.owner.id});f.setPresent(false);assert.throws(()=>f.run('collect','collect','collection'),/actual owner-established presence/);f.setPresent(true);f.db.setPresence(f.session.id,'reader','absent');assert.throws(()=>f.run('collect','collect','collection'),/requires attendance/);f.db.setPresence(f.session.id,'reader','present');const view=f.run('collect','collect','collection');assert.equal(f.db.getHandout(f.handout.id).metadata.evidence.original.holder,'character:'+f.owner.id);assert.equal(view.history.at(-1).state,'collected');assert.equal(f.db.getCharacter(f.owner.id).data.location,undefined);
});

test('transfer to another PC stays pending until that exact recipient explicitly accepts its source',t=>{
 const f=cabinet(t);f.collect();f.source('offer',{from:'character:'+f.owner.id,to:'character:'+f.recipient.id});f.run('transfer','offer-key','offer',{to:'character:'+f.recipient.id});let e=f.db.getHandout(f.handout.id).metadata.evidence;assert.equal(e.original.holder,'character:'+f.owner.id);assert.equal(e.pending.to,'character:'+f.recipient.id);assert.throws(()=>f.run('accept','wrong-controller','offer',{},'reader'),/actual recipient/);f.source('replacement',{from:'character:'+f.owner.id,to:'character:'+f.recipient.id});assert.throws(()=>f.run('accept','wrong-source','replacement',{},'recipient'),/exact grounded transfer source/);f.run('accept','accept-offer','offer',{},'recipient');e=f.db.getHandout(f.handout.id).metadata.evidence;assert.equal(e.original.holder,'character:'+f.recipient.id);assert.equal(e.pending,null);assert.equal(f.db.getCityRecord('cabinet','evidence_effect',motivationKey([f.handout.id,'offer','original','custody'])).data.operation,'accept');
});

test('recipient decline keeps original custodian and is not treated as consent or a physical transfer',t=>{
 const f=cabinet(t);f.collect();f.source('offer',{from:'character:'+f.owner.id,to:'character:'+f.recipient.id});f.run('transfer','offer','offer',{to:'character:'+f.recipient.id});f.run('decline','decline','offer',{},'recipient');const e=f.db.getHandout(f.handout.id).metadata.evidence;assert.equal(e.original.holder,'character:'+f.owner.id);assert.equal(e.pending,null);assert.equal(f.db.getCityRecord('cabinet','evidence_effect',motivationKey([f.handout.id,'offer','original','custody'])),null);
});

test('human GM cannot assent for a PC transfer or duplicate a PC-held original',t=>{
 const f=cabinet(t);f.collect();f.source('gm-take',{from:'character:'+f.owner.id,to:'npc:curator'});assert.throws(()=>f.run('transfer','gm-take','gm-take',{to:'npc:curator'},'gm',true),/no GM assent for PCs/);f.source('copy-source',{from:'character:'+f.owner.id,to:'character:'+f.owner.id,operation:'copy'});assert.throws(()=>f.run('copy','gm-copy','copy-source',{},'gm',true),/Controller-authorized sourced copy/);assert.equal(f.db.getHandout(f.handout.id).metadata.evidence.original.holder,'character:'+f.owner.id);
});

test('copy has its own label and old physical source cannot execute again under a new request key',t=>{
 const f=cabinet(t);f.collect();f.source('copy-source',{from:'character:'+f.owner.id,to:'character:'+f.owner.id,operation:'copy'});f.run('copy','copy-one','copy-source');const e=f.db.getHandout(f.handout.id).metadata.evidence;assert.equal(e.copies['copy-one'].holder,'character:'+f.owner.id);assert.equal(e.original.key,f.handout.id);assert.throws(()=>f.run('copy','copy-two','copy-source'),/already been resolved/);assert.equal(f.db.getHandout(f.handout.id).metadata.evidence.copies['copy-two'],undefined);
});

test('same-controller custody receipt replays across restart while a different controller cannot reuse it',t=>{
 const f=cabinet(t);const first=f.collect();f.reopen();const replay=f.run('collect','collect','collection');assert.deepEqual(replay,first);assert.throws(()=>f.run('collect','collect','collection',{},'recipient'),/another controller/);assert.equal(f.db.listCityRecords('cabinet',{kind:'evidence_effect',includeGM:true}).length,2);
});

test('stale revision, retracted source and caller-supplied authority fields fail before custody changes',t=>{
 const f=cabinet(t);f.register();f.source('collection',{from:'location:gallery',to:'character:'+f.owner.id});assert.throws(()=>f.run('collect','stale','collection',{expected_revision:'stale'}),/revision changed/);assert.throws(()=>f.run('collect','forged','collection',{gm:true}),/Closed evidence operation/);indexWorldEvent(f.db,'cabinet',{key:'collection',status:'retracted'});assert.throws(()=>f.run('collect','retracted','collection'),/active source event/);assert.equal(f.db.getHandout(f.handout.id).metadata.evidence.original.holder,'location:gallery');
});

test('custody audit failure rolls handout metadata, effect and receipt back together without editing original text',t=>{
 const f=cabinet(t);f.register();f.source('collection',{from:'location:gallery',to:'character:'+f.owner.id});const before=f.db.getHandout(f.handout.id),record=f.db.recordMutation;f.db.recordMutation=function(g,row){if(row.mutationType==='evidence_custody')throw Error('C11 custody audit failed');return record.call(this,g,row);};assert.throws(()=>f.run('collect','failed-collection','collection'),/C11 custody/);f.db.recordMutation=record;assert.deepEqual(f.db.getHandout(f.handout.id),before);assert.equal(f.db.getCityRecord('cabinet','evidence_receipt',f.handout.id+':failed-collection'),null);assert.equal(f.db.getCityRecord('cabinet','evidence_effect',motivationKey([f.handout.id,'collection','original','custody'])),null);assert.equal(f.run('collect','retry','collection').history.at(-1).state,'collected');
});

test('private custody history returns only current actor or independently visible source excerpts, never global hidden truth',t=>{
 const f=cabinet(t);f.register();indexWorldEvent(f.db,'cabinet',{key:'private-note',title:'GM-only custody interpretation',source_id:'gm:private'});const e=f.db.getHandout(f.handout.id).metadata.evidence;f.db.setHandoutEvidence('cabinet',f.handout.id,{...e,history:[...e.history,{key:'hidden',state:'held',copy:'original',character:null,source_event:'private-note',interpretation:'Distinct hidden cause'}]});const reader=f.api.evidenceView(f.db,'cabinet',f.handout.id,'reader');assert.doesNotMatch(JSON.stringify(reader),/Distinct hidden cause/);assert.equal(f.api.evidenceView(f.db,'cabinet',f.handout.id,'gm',{gm:true}).evidence.history.length,2);assert.equal(f.db.listCanon('cabinet',{includeGM:true}).length,0);
});

test('original evidence provider reaches extracted registration and private view using real native source proof',t=>{
 const f=cabinet(t);f.source('original-registration',{from:null,to:'location:gallery'});const result=original.manageEvidence(f.db,'cabinet',f.input('register','original-key','original-registration',{holder:'location:gallery'}),'gm',{gm:true});assert.equal(result.evidence.original.holder,'location:gallery');assert.equal(original.evidenceView(f.db,'cabinet',f.handout.id,'gm',{gm:true}).expected_revision,stateRevision(result.evidence));
});
