import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeKnowledgeWorld} from '../../src/application/composition/public.js';
initializeKnowledgeWorld();
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createPersonalContinuity} from '../../src/frameworks/knowledge/public.js';
import {cityObject,cityKey,cityInteger,cityAudit,indexWorldEvent,requireCitySource} from '../../src/frameworks/world/public.js';
import {handoutPlayerView} from '../../src/handout.js';
import {organizationInbox} from '../../src/owned-community.js';
import {evidenceView} from '../../src/evidence-custody.js';
import {evidenceType,activeEvidence} from '../../src/epistemic.js';
import {conversationPrincipal} from '../../src/conversation-principal.js';
import {ownerSemanticSource,assertSemanticCandidateProof} from '../../src/semantic-candidate-source.js';
import {stateRevision} from '../../src/kernel/state-revision.js';
import {motivationKey} from '../../src/frameworks/npc/public.js';
import * as original from '../../src/personal-continuity.js';

function diary(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-private-c13-')),file=join(folder,'diary.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('diary');db.setCityCalendar('diary',{flags:{personal_arcs:true,discovery:true}});for(const user of ['owner','other'])db.upsertPlayer('diary',user,user);const pc=db.createCharacter('diary','owner','Owner character'),other=db.createCharacter('diary','other','Other character'),session=db.startSession('diary','Private continuity');for(const [user,c] of [['owner',pc],['other',other]]){db.assignCharacter(session.id,user,c.id);db.setPresence(session.id,user,'present');}indexWorldEvent(db,'diary',{key:'opportunity',title:'An optional public opportunity',source_id:'gm:opportunity',visibility:'party'});const api=createPersonalContinuity({cityObject,cityKey,cityInteger,cityAudit,indexWorldEvent,requireCitySource,handoutPlayerView,organizationInbox,evidenceView,evidenceType,activeEvidence,conversationPrincipal,ownerSemanticSource,assertSemanticCandidateProof}),state=(patch={})=>api.personalArc(db,'diary','owner',{key:'desire',type:'desire',statement:'I want to understand the missing letter.',...patch}),beat=(patch={})=>api.proposeArcBeat(db,'diary',{key:'invitation',character_id:pc.id,arc_key:'desire',source_event:'opportunity',invitation:'A librarian can offer an attributed account if you wish.',...patch},'world-director');
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {api,get db(){return db;},pc,other,session,state,beat,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('only a current present owner assignment has personal continuity authority, never another controller',t=>{
 const f=diary(t);assert.equal(f.api.personalCharacter(f.db,'diary','owner').id,f.pc.id);assert.throws(()=>f.api.personalCharacter(f.db,'diary','other',f.pc.id),/active owned character/);f.db.setPresence(f.session.id,'owner','absent');assert.throws(()=>f.api.personalCharacter(f.db,'diary','owner'),/requires attendance/);assert.equal(f.db.listCityRecords('diary',{kind:'arc',includeGM:true}).length,0);
});

test('explicit owner statement is private, revisioned and source-bound without becoming world truth or PC resources',t=>{
 const f=diary(t),before=f.db.getCharacter(f.pc.id),row=f.state();assert.equal(row.visibility,'character');assert.equal(row.subject_key,f.pc.id);assert.equal(row.data.established_by,'owner');assert.equal(row.data.authority,'player_stated');const expected='arc:'+motivationKey([row.record_key,1,row.data.statement]);assert.equal(row.source_event,expected);assert.equal(f.db.getWorldEvent('diary',expected).kind,'player_statement');assert.deepEqual(f.db.getCharacter(f.pc.id),before);assert.equal(f.db.listCanon('diary',{includeGM:true}).length,0);assert.deepEqual(f.state(),row);const changed=f.state({statement:'I want to hear the librarian account first.'});assert.equal(changed.data.revision,2);assert.equal(changed.data.history[0].statement,row.data.statement);assert.equal(f.api.personalInbox(f.db,'diary','other').length,0);
});

test('optional invitation remains private nonbinding and an explicit decline carries no choice, movement or cost',t=>{
 const f=diary(t);f.state();const row=f.beat();assert.equal(row.status,'pending');assert.equal(row.visibility,'character');assert.equal(row.data.nonbinding,true);assert.deepEqual(row.data.costs,[]);assert.equal(row.data.authority,'GM_opportunity_not_PC_choice');const declined=f.api.personalArc(f.db,'diary','owner',{op:'respond',key:row.record_key,decision:'decline',expected_revision:stateRevision(row)});assert.equal(declined.status,'declined');assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);assert.equal(f.db.listSimulationRecords('diary',{kind:'action'}).length,0);assert.throws(()=>f.beat({key:'repeated'}),/cooldown/);
});

test('stale owner arc revision and changed native source hold response without silently rewriting the invitation',t=>{
 const f=diary(t);f.state();const row=f.beat();f.state({statement:'I want another route.'});assert.throws(()=>f.api.personalArc(f.db,'diary','owner',{op:'respond',key:row.record_key,decision:'accept',expected_revision:stateRevision(row)}),/expired or changed/);assert.equal(f.db.getCityRecord('diary','arc_beat',row.record_key).status,'pending');indexWorldEvent(f.db,'diary',{key:'opportunity',status:'retracted'});assert.throws(()=>f.beat({key:'other-source-check'}),/active source event/);
});

test('owner may explicitly confirm an old structured candidate while preserving its original receipt and terms',t=>{
 const f=diary(t),key=f.pc.id+':old-candidate',candidate=f.db.saveCityRecord('diary',{kind:'arc_candidate',key,status:'pending',visibility:'character',subject_key:f.pc.id,source_event:'opportunity',data:{type:'desire',statement:'I want to revisit the library.',created_by:'owner',expires_minute:1440}}),confirmed=f.api.personalArc(f.db,'diary','owner',{op:'confirm',key,expected_revision:stateRevision(candidate),arc_key:'library'});assert.equal(confirmed.status,'confirmed');assert.equal(f.db.getCityRecord('diary','arc',f.pc.id+':library').data.statement,candidate.data.statement);assert.equal(confirmed.source_event,candidate.source_event);assert.equal(f.db.listCanon('diary',{includeGM:true}).length,0);
});

test('new model-only candidate text has no native typed owner source and never enters personal state',t=>{
 const f=diary(t);assert.equal(f.api.captureArcCandidate(f.db,'diary','owner',f.pc.id,'message','I want a place in the city.'),null);assert.throws(()=>f.api.captureArcCandidate(f.db,'diary','owner',f.pc.id,'message','I want a place in the city.',{acceptedIntent:'invented-intent'}),/Current authenticated typed owner/);assert.equal(f.db.listCityRecords('diary',{kind:'arc_candidate',includeGM:true}).length,0);assert.equal(f.db.listCityRecords('diary',{kind:'arc',includeGM:true}).length,0);
});

test('discovery reads own and shared records, preserving uncertain claims and hiding GM and other PC secrets',t=>{
 const f=diary(t);for(const [key,visibility,subjectCharacterId] of [['shared','party',null],['mine','character',f.pc.id],['theirs','character',f.other.id],['hidden','gm',null]])f.db.addFact('diary',{key,content:'Letter knowledge '+key,visibility,subjectCharacterId,source:'ai_gm',confidence:100});const before=f.db.cityRecordCounts('diary'),result=f.api.discoverPersonal(f.db,'diary','owner',{query:'letter'});assert.deepEqual(result.facts.map(r=>r.key).sort(),['mine','shared']);assert.ok(result.facts.every(r=>r.epistemic.kind==='hypothesis'));assert.match(result.authority,/Unknown is not disproven/);assert.deepEqual(f.db.cityRecordCounts('diary'),before);assert.equal(f.api.discoverPersonal(f.db,'diary','owner',{query:'missing-zoological-item'}).unknown,true);
});

test('actual native PC proxy principal may read shared records but cannot obtain owner-private arcs or workflows',t=>{
 const f=diary(t);f.state();f.db.addFact('diary',{key:'mine',content:'Letter private owner detail',visibility:'character',subjectCharacterId:f.pc.id});f.db.addFact('diary',{key:'shared',content:'Letter shared detail',visibility:'party'});f.db.assignCharacter(f.session.id,'other',f.pc.id,{role:'proxy'});const principal=conversationPrincipal(f.db,'diary','other',f.pc.id);assert.equal(principal.kind,'pc_proxy');const result=f.api.discoverPersonal(f.db,'diary','other',{character_id:f.pc.id,query:'letter'});assert.deepEqual(result.facts.map(r=>r.key),['shared']);for(const mode of ['arcs','commitments','organizations','evidence','case'])assert.throws(()=>f.api.discoverPersonal(f.db,'diary','other',{character_id:f.pc.id,mode}),/Owner-only/);assert.throws(()=>f.api.personalCharacter(f.db,'diary','other',f.pc.id),/active owned/);
});

test('personal arc audit failure rolls private player source and continuity state back together',t=>{
 const f=diary(t),record=f.db.recordMutation,events=f.db.listWorldEvents('diary',{includeGM:true});f.db.recordMutation=function(g,row){if(row.mutationType==='arc_established')throw Error('C13 arc audit failure');return record.call(this,g,row);};assert.throws(()=>f.state(),/C13 arc/);f.db.recordMutation=record;assert.equal(f.db.listCityRecords('diary',{kind:'arc',includeGM:true}).length,0);assert.deepEqual(f.db.listWorldEvents('diary',{includeGM:true}),events);assert.equal(f.state().data.revision,1);
});

test('saved private arcs and invitations survive restart with current source revisions and original source exports',t=>{
 const f=diary(t),arc=f.state(),beat=f.beat();f.reopen();assert.deepEqual(f.state(),arc);assert.equal(original.personalCharacter(f.db,'diary','owner').id,f.pc.id);const inbox=original.personalInbox(f.db,'diary','owner');assert.equal(inbox.length,1);assert.equal(inbox[0].record_key,beat.record_key);assert.equal(inbox[0].expected_revision,stateRevision(beat));const found=original.discoverPersonal(f.db,'diary','owner',{mode:'arcs'});assert.equal(found.personal.some(r=>r.key===arc.record_key),true);assert.equal(original.personalInbox(f.db,'diary','other').length,0);
});
