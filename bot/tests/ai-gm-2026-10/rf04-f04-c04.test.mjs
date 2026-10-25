import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createOpeningAttendance,conversationPrincipal} from '../../src/frameworks/session/public.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';
import {initializeSessionWorldEvents} from '../../src/application/composition/public.js';
import * as original from '../../src/session-opening-attendance.js';
initializeSessionWorldEvents();
function foyer(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-attendance-c04-')),file=join(folder,'attend.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('gathering');for(const u of ['keeper','guest'])db.upsertPlayer('gathering',u,u);const pc=db.createCharacter('gathering','keeper','Rook'),alternate=db.createCharacter('gathering','keeper','Peregrine'),other=db.createCharacter('gathering','guest','Finch'),api=createOpeningAttendance({indexWorldEvent});
 const register=(id='registration-main',name='Rook')=>api.registerOpeningAttendance(db,'gathering','keeper',id,name),start=()=>db.startSession('gathering','A public opening'),entry=(s,id='check-in-main')=>{db.assignCharacter(s.id,'keeper',pc.id);db.setPresence(s.id,'keeper','present');return api.prepareOpeningEntryOpportunity(db,'gathering','keeper',pc.id,id);};
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {api,get db(){return db;},file,schema,pc,alternate,other,register,start,entry,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('pre-start registration creates a native mutation-backed GM receipt without role, scene, placement or consent',t=>{
 const f=foyer(t),before=JSON.stringify(f.db.getCharacter(f.pc.id)),r=f.register();assert.equal(r.duplicate,false);assert.equal(r.sessionNumber,1);const row=f.db.getCityRecord('gathering','opening_attendance_registration','1:keeper'),s=f.db.getWorldEvent('gathering',row.source_event),m=f.db.getMutation('gathering',s.source_id);assert.equal(row.visibility,'gm');assert.equal(row.subject_key,null);assert.equal(s.kind,'native_session_attendance');assert.equal(s.source_kind,'mutation');assert.equal(s.session_id,null);assert.equal(m.mutation_type,'session_attendance_register');assert.equal(m.actor_id,'keeper');assert.equal(JSON.stringify(f.db.getCharacter(f.pc.id)),before);assert.equal(f.db.hasCharacterPlacementHistory('gathering',f.pc.id),false);assert.equal(f.db.getActiveSession('gathering'),undefined);
});

test('duplicate registration after reopen preserves original receipt and switching owned character supersedes only that source',t=>{
 const f=foyer(t);f.register();const old=f.db.getCityRecord('gathering','opening_attendance_registration','1:keeper'),serialized=JSON.stringify(old),count=f.db.listMutationLedger('gathering',{limit:100}).length;f.reopen();assert.equal(f.register('another-interaction').duplicate,true);assert.equal(JSON.stringify(f.db.getCityRecord('gathering','opening_attendance_registration','1:keeper')),serialized);assert.equal(f.db.listMutationLedger('gathering',{limit:100}).length,count);assert.equal(f.register('switch','Peregrine').duplicate,false);const row=f.db.getCityRecord('gathering','opening_attendance_registration','1:keeper');assert.equal(row.actor_key,f.alternate.id);assert.equal(f.db.getWorldEvent('gathering',old.source_event).status,'superseded');assert.equal(f.db.getWorldEvent('gathering',old.source_event).details.superseded_by,row.source_event);
});

test('wrong owner retired character invalid interaction and active session cannot register',t=>{
 const f=foyer(t);assert.throws(()=>f.register('not-owned','Finch'),/you own/);assert.throws(()=>f.register(''),{code:'SESSION_OPENING_ATTENDANCE'});assert.throws(()=>f.register('x'.repeat(121)),{code:'SESSION_OPENING_ATTENDANCE'});f.db.setCharacterStatus(f.pc.id,'retired');assert.throws(()=>f.register(),/you own/);f.start();assert.throws(()=>f.register('now-active','Peregrine'),/already active/);assert.equal(f.db.openingAttendanceRegistrations('gathering').length,0);
});

test('carry establishes native attendance and owner role only; historical acknowledgement never reapplies control across a second connection',t=>{
 const f=foyer(t);f.register();const session=f.start(),result=f.api.carryOpeningAttendance(f.db,'gathering',session);assert.deepEqual(result,{carried:[f.pc.id],held:[]});assert.equal(f.db.activeAssignment(session.id,'keeper').character_id,f.pc.id);assert.equal(f.db.roster(session.id).find(r=>r.discord_user_id==='keeper').presence,'present');assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);assert.equal(f.db.hasCharacterPlacementHistory('gathering',f.pc.id),false);const carry=f.db.getCityRecord('gathering','opening_attendance_carry',session.id),saved=JSON.stringify(carry);f.db.assignCharacter(session.id,'keeper',f.alternate.id);const revision=conversationPrincipal(f.db,'gathering','keeper',f.alternate.id).revision,second=new VeiledDB(f.file,f.schema);try{assert.deepEqual(f.api.carryOpeningAttendance(second,'gathering',second.getSession(session.id)),result);}finally{second.close();}assert.equal(f.db.activeAssignment(session.id,'keeper').character_id,f.alternate.id);assert.equal(conversationPrincipal(f.db,'gathering','keeper',f.alternate.id).revision,revision);assert.equal(JSON.stringify(f.db.getCityRecord('gathering','opening_attendance_carry',session.id)),saved);
});

test('carry isolates retracted source and changed owner status as local holds while another valid registration succeeds',t=>{
 const f=foyer(t);f.register();f.api.registerOpeningAttendance(f.db,'gathering','guest','guest-registration','Finch');const row=f.db.getCityRecord('gathering','opening_attendance_registration','1:keeper'),event=f.db.getWorldEvent('gathering',row.source_event);f.db.saveWorldEvent('gathering',{...event,key:event.event_key,status:'retracted'});const session=f.start(),result=f.api.carryOpeningAttendance(f.db,'gathering',session);assert.deepEqual(result,{carried:[f.other.id],held:['1:keeper']});assert.equal(f.db.activeAssignment(session.id,'keeper'),null);assert.equal(f.db.activeAssignment(session.id,'guest').character_id,f.other.id);assert.equal(f.db.getCityRecord('gathering','opening_attendance_registration','1:keeper').status,'held');
});

test('forged binding or missing native mutation never becomes an assigned role',t=>{
 const f=foyer(t);f.register();const row=f.db.getCityRecord('gathering','opening_attendance_registration','1:keeper');f.db.saveCityRecord('gathering',{...row,key:row.record_key,data:{...row.data,binding:{...row.data.binding,character_id:f.alternate.id}}});const s=f.start();assert.deepEqual(f.api.carryOpeningAttendance(f.db,'gathering',s),{carried:[],held:['1:keeper']});assert.equal(f.db.activeAssignment(s.id,'keeper'),null);const g=foyer(t);g.register();g.db.setCharacterStatus(g.pc.id,'dead');assert.deepEqual(g.api.carryOpeningAttendance(g.db,'gathering',g.start()),{carried:[],held:['1:keeper']});
});

test('carry native audit failure rolls assigned attendance registration and source back then one retry succeeds',t=>{
 const f=foyer(t);f.register();const s=f.start(),record=f.db.recordMutation;f.db.recordMutation=function(g,row){if(row.mutationType==='session_attendance_carry')throw Error('C04 carry audit failure');return record.call(this,g,row);};assert.throws(()=>f.api.carryOpeningAttendance(f.db,'gathering',s),/carry audit failure/);f.db.recordMutation=record;assert.equal(f.db.activeAssignment(s.id,'keeper'),null);assert.equal(f.db.getCityRecord('gathering','opening_attendance_registration','1:keeper').status,'registered');assert.equal(f.db.getWorldEvent('gathering','attendance-carry:'+s.id),null);assert.deepEqual(f.api.carryOpeningAttendance(f.db,'gathering',s),{carried:[f.pc.id],held:[]});
});

test('entry opportunity needs owner attendance and its native receipt grants neither execution nor publication',t=>{
 const f=foyer(t),s=f.start();assert.throws(()=>f.api.prepareOpeningEntryOpportunity(f.db,'gathering','keeper',f.pc.id,'not-present'),/controlled role|attendance/);const row=f.entry(s);assert.equal(row.visibility,'gm');assert.equal(row.status,'pending');assert.equal(row.data.execution_authority,false);assert.equal(row.data.publication_authority,false);const e=f.db.getWorldEvent('gathering',row.source_event);assert.equal(e.kind,'native_opening_entry_opportunity');assert.equal(e.location_key,'');assert.equal(e.scene,'');assert.equal(e.source_kind,'mutation');assert.equal(f.db.getMutation('gathering',e.source_id).mutation_type,'session_entry_opportunity');assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);assert.equal(f.db.listCityRecords('gathering',{kind:'publication_outbox',includeGM:true}).length,0);const count=f.db.listWorldEvents('gathering',{includeGM:true}).length;assert.equal(f.api.prepareOpeningEntryOpportunity(f.db,'gathering','keeper',f.pc.id,'later-check-in').record_key,row.record_key);assert.equal(f.db.listWorldEvents('gathering',{includeGM:true}).length,count);
});

test('entry replay after database reopen proves original native source and stale control revokes only that opportunity',t=>{
 const f=foyer(t),s=f.start(),row=f.entry(s);f.reopen();assert.deepEqual(f.api.inspectOpeningEntryOpportunity(f.db,'gathering',row.record_key),row);f.db.assignCharacter(s.id,'keeper',f.pc.id);assert.throws(()=>f.api.inspectOpeningEntryOpportunity(f.db,'gathering',row.record_key),{code:'SESSION_OPENING_ATTENDANCE'});const fresh=f.api.prepareOpeningEntryOpportunity(f.db,'gathering','keeper',f.pc.id,'fresh-control');assert.notEqual(fresh.record_key,row.record_key);assert.equal(f.db.getCityRecord('gathering','opening_entry_opportunity',row.record_key).source_event,row.source_event);
});

test('entry opportunity rejects a retracted source, edited authority bit or wrong owner without choosing a fictional outcome',t=>{
 const f=foyer(t),row=f.entry(f.start());assert.throws(()=>f.api.prepareOpeningEntryOpportunity(f.db,'gathering','guest',f.pc.id,'wrong-owner'),{code:'SESSION_OPENING_ATTENDANCE'});f.db.saveCityRecord('gathering',{...row,key:row.record_key,data:{...row.data,publication_authority:true}});assert.throws(()=>f.api.inspectOpeningEntryOpportunity(f.db,'gathering',row.record_key),{code:'SESSION_OPENING_ATTENDANCE'});f.db.saveCityRecord('gathering',{...row,key:row.record_key});const event=f.db.getWorldEvent('gathering',row.source_event);f.db.saveWorldEvent('gathering',{...event,key:event.event_key,status:'retracted'});assert.throws(()=>f.api.inspectOpeningEntryOpportunity(f.db,'gathering',row.record_key),{code:'SESSION_OPENING_ATTENDANCE'});assert.equal(f.db.hasCharacterPlacementHistory('gathering',f.pc.id),false);
});

test('failed native entry event audit leaves no partial opportunity or source and original source reader reaches extracted receipts',t=>{
 const f=foyer(t),s=f.start();f.db.assignCharacter(s.id,'keeper',f.pc.id);f.db.setPresence(s.id,'keeper','present');const record=f.db.recordMutation;f.db.recordMutation=function(g,row){if(row.mutationType==='world_event_index')throw Error('C04 entry source audit failure');return record.call(this,g,row);};assert.throws(()=>f.api.prepareOpeningEntryOpportunity(f.db,'gathering','keeper',f.pc.id,'entry-retry'),/entry source audit failure/);f.db.recordMutation=record;assert.equal(f.db.listCityRecords('gathering',{kind:'opening_entry_opportunity',includeGM:true}).length,0);assert.equal(f.db.getWorldEvent('gathering','opening-entry-source:entry-retry'),null);const row=original.prepareOpeningEntryOpportunity(f.db,'gathering','keeper',f.pc.id,'entry-retry');assert.equal(original.inspectOpeningEntryOpportunity(f.db,'gathering',row.record_key).record_key,row.record_key);
});

test('prior session carry cannot be invoked for a later session and empty session carry does not manufacture attendees',t=>{
 const f=foyer(t),s=f.start();assert.deepEqual(f.api.carryOpeningAttendance(f.db,'gathering',s),{carried:[],held:[]});assert.equal(f.db.roster(s.id).length,0);f.db.endSession('gathering');const next=f.start();assert.throws(()=>f.api.carryOpeningAttendance(f.db,'gathering',s),/Current new session/);assert.deepEqual(f.api.carryOpeningAttendance(f.db,'gathering',next),{carried:[],held:[]});
});
