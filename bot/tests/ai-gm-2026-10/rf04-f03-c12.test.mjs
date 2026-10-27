import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeKnowledgeWorld} from '../../src/application/composition/public.js';
initializeKnowledgeWorld();
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createOwnedCommunity} from '../../src/frameworks/knowledge/public.js';
import {cityObject,cityKey,cityAudit,indexWorldEvent,requireCitySource,requireCityRecord} from '../../src/frameworks/world/public.js';
import {personalCharacter} from '../../src/personal-continuity.js';
import {updateCityCivic} from '../../src/city-civic.js';
import {manageLongProject} from '../../src/long-projects.js';
import {actorSource,motivationKey} from '../../src/simulation-motivation.js';
import {stateRevision} from '../../src/kernel/state-revision.js';
import * as original from '../../src/owned-community.js';

function charter(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-owner-org-c12-')),file=join(folder,'charter.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('charter');db.setCityCalendar('charter',{flags:{player_organizations:true}});for(const user of ['founder','visitor'])db.upsertPlayer('charter',user,user);const pc=db.createCharacter('charter','founder','Founder'),other=db.createCharacter('charter','visitor','Visitor'),session=db.startSession('charter','An initiative');for(const [user,c] of [['founder',pc],['visitor',other]]){db.assignCharacter(session.id,user,c.id);db.setPresence(session.id,user,'present');}indexWorldEvent(db,'charter',{key:'proposal-source',title:'Established public opportunity',source_id:'gm:proposal',visibility:'party'});
 const api=createOwnedCommunity({cityObject,cityKey,cityAudit,indexWorldEvent,personalCharacter,requireCitySource,requireCityRecord,updateCityCivic,manageLongProject,actorSource}),input=(patch={})=>({op:'propose',key:'initiative',character_id:pc.id,source_event:'proposal-source',request:'found',title:'Canal Readers',terms:'Share voluntary research notes.',target_key:'',community_key:'',commitment_key:'',information_key:'',duration_minutes:0,...patch}),propose=(patch={})=>api.organizationRequest(db,'charter','founder',input(patch)),respond=(row,op='confirm',user='founder')=>api.organizationRequest(db,'charter',user,{op,key:row.record_key,expected_revision:stateRevision(row)}),review=(row,op='approve')=>api.reviewOrganization(db,'charter',{kind:'organization_request',key:row.record_key,op,expected_revision:stateRevision(row)},'gm');
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {api,get db(){return db;},pc,other,session,input,propose,respond,review,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('invitation remains private nonbinding proposal with no decision, membership, resources or community created',t=>{
 const f=charter(t),row=f.api.inviteOrganization(f.db,'charter',f.input(),'world-director');assert.equal(row.status,'pending');assert.equal(row.visibility,'character');assert.equal(row.subject_key,f.pc.id);assert.match(row.data.authority,/no PC decision, spending, membership/);assert.equal(f.db.listCityRecords('charter',{kind:'community',includeGM:true}).length,0);assert.equal(f.db.listCityRecords('charter',{kind:'community_membership',includeGM:true}).length,0);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);assert.deepEqual(f.api.organizationInbox(f.db,'charter','visitor').requests,[]);
});

test('world effects require current owner confirmation followed by reviewed native civic service and exact membership source',t=>{
 const f=charter(t),proposed=f.propose(),before=f.db.getCharacter(f.pc.id);assert.throws(()=>f.review(proposed),/explicit confirmation/);const consented=f.respond(proposed);assert.equal(consented.status,'consented');assert.equal(f.db.listCityRecords('charter',{kind:'community',includeGM:true}).length,0);const approved=f.review(consented);assert.equal(approved.status,'approved');const key='owner-world:'+motivationKey(proposed.record_key),community=f.db.getCityRecord('charter','community',key),member=f.db.getCityRecord('charter','community_membership',f.pc.id+':'+key);assert.equal(community.data.name,'Canal Readers');assert.equal(community.data.capacity,0);assert.deepEqual(community.data.members,[]);assert.equal(member.visibility,'character');assert.equal(member.subject_key,f.pc.id);assert.equal(member.data.role,'founder');assert.deepEqual(f.db.getCharacter(f.pc.id),before);assert.equal(f.db.listCanon('charter',{includeGM:true}).length,0);
});

test('another owner, absent proposer or caller-supplied acceptance cannot authorize organization effects',t=>{
 const f=charter(t),row=f.propose();assert.throws(()=>f.respond(row,'confirm','visitor'),/Current owned proposal/);assert.throws(()=>f.api.organizationRequest(f.db,'charter','founder',{...f.input({key:'forged'}),confirmed_by:'founder'}),/no supplied acceptance/);f.db.setPresence(f.session.id,'founder','absent');assert.throws(()=>f.respond(row),/requires attendance/);assert.equal(f.db.getCityRecord('charter','organization_request',row.record_key).status,'pending');
});

test('stale source or expired request holds confirmation but owner may still decline without manufactured assent',t=>{
 const f=charter(t),row=f.propose();indexWorldEvent(f.db,'charter',{key:'proposal-source',status:'retracted'});assert.throws(()=>f.respond(row),/active source event/);const declined=f.respond(row,'decline');assert.equal(declined.status,'declined');assert.equal(declined.data.confirmed_by,null);assert.equal(f.db.listCityRecords('charter',{kind:'community_membership',includeGM:true}).length,0);
});

test('request expiry is fictional-time based and native review rejects stale confirmed terms',t=>{
 const f=charter(t),pending=f.propose(),confirmed=f.respond(pending);f.db.advanceSimulationClock('charter',{minutes:1440});assert.throws(()=>f.review(confirmed),/expired/);assert.equal(f.db.getCityRecord('charter','organization_request',pending.record_key).status,'consented');assert.equal(f.db.listCityRecords('charter',{kind:'community',includeGM:true}).length,0);
});

test('review cannot alter confirmed terms, substitute target revision or create membership on rejection',t=>{
 const f=charter(t),row=f.respond(f.propose());assert.throws(()=>f.api.reviewOrganization(f.db,'charter',{kind:'organization_request',key:row.record_key,op:'approve',expected_revision:stateRevision(row),terms:'Different terms'},'gm'),/terms cannot change/);assert.throws(()=>f.api.reviewOrganization(f.db,'charter',{kind:'organization_request',key:row.record_key,op:'approve',expected_revision:'stale'},'gm'),/Current request revision/);const rejected=f.review(row,'reject');assert.equal(rejected.status,'rejected');assert.equal(f.db.listCityRecords('charter',{kind:'community_membership',includeGM:true}).length,0);
});

test('repeated autonomous invitation respects decline and current owner proposal remains separately authorized',t=>{
 const f=charter(t),first=f.api.inviteOrganization(f.db,'charter',f.input(),'world-director');f.respond(first,'decline');assert.throws(()=>f.api.inviteOrganization(f.db,'charter',f.input({key:'repeat'}),'world-director'),/cooldown/);assert.equal(f.propose({key:'owner-new'}).status,'pending');
});

test('staffing invitation does not manufacture membership, an NPC agreement or autonomous actor evidence',t=>{
 const f=charter(t),row=f.respond(f.propose({request:'staff',target_key:'unagreed-npc',community_key:'unjoined-group'}));assert.throws(()=>f.review(row),/Explicit established membership/);assert.equal(f.db.getNpcProfile('charter','unagreed-npc'),null);assert.equal(f.db.getCityRecord('charter','organization_request',row.record_key).status,'consented');assert.equal(f.db.listCityRecords('charter',{kind:'community_membership',includeGM:true}).length,0);
});

test('review audit failure rolls source, native community, private membership and approval back together',t=>{
 const f=charter(t),row=f.respond(f.propose()),events=f.db.listWorldEvents('charter',{includeGM:true}),record=f.db.recordMutation;f.db.recordMutation=function(g,mutation){if(mutation.mutationType==='organization_review')throw Error('C12 organization audit failure');return record.call(this,g,mutation);};assert.throws(()=>f.review(row),/C12 organization/);f.db.recordMutation=record;assert.equal(f.db.listCityRecords('charter',{kind:'community',includeGM:true}).length,0);assert.equal(f.db.listCityRecords('charter',{kind:'community_membership',includeGM:true}).length,0);assert.deepEqual(f.db.getCityRecord('charter','organization_request',row.record_key),row);assert.deepEqual(f.db.listWorldEvents('charter',{includeGM:true}),events);assert.equal(f.review(row).status,'approved');
});

test('saved owner proposal replays across restart and original source inbox retains exact current revisions',t=>{
 const f=charter(t),row=f.propose();f.reopen();assert.deepEqual(f.propose(),row);const inbox=original.organizationInbox(f.db,'charter','founder');assert.equal(inbox.requests.length,1);assert.equal(inbox.requests[0].expected_revision,stateRevision(row));assert.deepEqual(original.organizationRequest(f.db,'charter','founder',f.input()),row);assert.equal(original.inviteOrganization(f.db,'charter',f.input(),'founder').record_key,row.record_key);
});
