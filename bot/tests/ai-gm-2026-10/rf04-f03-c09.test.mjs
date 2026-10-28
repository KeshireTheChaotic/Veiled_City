import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createHistoryReconciliation} from '../../src/frameworks/knowledge/public.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';
import {reconcileHistory as original} from '../../src/frameworks/knowledge/public.js';

function history(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-history-c09-')),file=join(folder,'history.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),occupants=[];db.ensureCampaign('history');db.setCityCalendar('history',{flags:{history_reconciliation:true}});indexWorldEvent(db,'history',{key:'basis',title:'Recorded basis',source_id:'gm:basis'});const api=createHistoryReconciliation({sceneView:()=>({occupants})}),record=(kind,key,data={},patch={})=>db.saveCityRecord('history',{kind,key,source_event:'basis',status:'active',data,...patch}),run=(options={})=>api.reconcileHistory(db,'history',options);
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {api,get db(){return db;},record,run,setOccupants:v=>occupants=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('disabled reconciliation returns no finding and does not inspect or change native state',t=>{
 const f=history(t);f.db.setCityCalendar('history',{flags:{}});assert.deepEqual(f.run(),{enabled:false,findings:[]});assert.deepEqual(original(f.db,'history'),{enabled:false,findings:[]});
});

test('conflicting unique-original custody produces only a private sourced review finding and retains both documents',t=>{
 const f=history(t),first=f.db.createHandout('history',{title:'Original ledger A',metadata:{evidence:{original:{key:'ledger-original',state:'held',holder:'npc:a'},history:[{source_event:'basis'}]}}}),second=f.db.createHandout('history',{title:'Original ledger B',metadata:{evidence:{original:{key:'ledger-original',state:'held',holder:'npc:b'},history:[{source_event:'basis'}]}}}),report=f.run();assert.equal(report.visibility,'gm');assert.equal(report.read_only,true);const finding=report.findings.find(r=>r.type==='incompatible_unique_original_custody');assert.deepEqual(new Set(finding.records),new Set([first.id,second.id]));assert.match(finding.requires,/Explicit human review/);assert.match(finding.impact,/original records and past consequences remain unchanged/);assert.deepEqual(f.db.getHandout(first.id),first);assert.deepEqual(f.db.getHandout(second.id),second);
});

test('institutional case report ownership mismatch is recorded without transferring knowledge or repairing the case',t=>{
 const f=history(t),report=f.record('report','misfiled',{content:'A subjective report'},{actor_key:'other-office'}),record=f.record('case','case-one',{institution:'watch-office',evidence_reports:['misfiled']});const result=f.run();assert.equal(result.findings.filter(r=>r.type==='case_report_authorization_mismatch').length,1);assert.deepEqual(f.db.getCityRecord('history','case','case-one'),record);assert.deepEqual(f.db.getCityRecord('history','report','misfiled'),report);assert.equal(f.db.listNpcKnowledge('history','unrelated').length,0);
});

test('stale plan source, ended objective and fictional deadline remain findings without executing, replanning or charging',t=>{
 const f=history(t);indexWorldEvent(f.db,'history',{key:'child',title:'Dependent source',source_kind:'event',source_id:'basis'});const row=f.record('strategy','old-plan',{actor_type:'npc',actor_key:'absent-actor',goal_key:'missing-goal',deadline_minute:0},{source_event:'child'});indexWorldEvent(f.db,'history',{key:'basis',status:'retracted'});const types=f.run({record_kind:'strategy',record_key:'old-plan'}).findings.map(r=>r.type);for(const expected of ['stale_source_authority','stale_plan_objective','stale_plan_deadline'])assert.ok(types.includes(expected));f.reopen();assert.deepEqual(f.db.getCityRecord('history','strategy','old-plan'),row);assert.equal(f.db.listSimulationRecords('history',{kind:'action'}).length,0);assert.equal(f.db.getSimulationEntity('history','npc','absent-actor'),null);
});

test('actual resource receipt arithmetic mismatch is reported without refund, charge or reroll',t=>{
 const f=history(t),pc=f.db.createCharacter('history','reader','Reader'),before=f.db.getCharacter(pc.id),receipt=f.record('roll_operation','cost-copy',{op:'help',resource_deltas:[{character:pc.id,hope:{before:2,after:2,delta:-1},stress:{before:0,after:0,delta:0}}]},{status:'resolved',subject_key:pc.id});const result=f.run({record_kind:'roll_operation',record_key:'cost-copy'});assert.ok(result.findings.some(r=>r.type==='inconsistent_actual_resource_receipt'));assert.deepEqual(f.db.getCharacter(pc.id),before);assert.deepEqual(f.db.getCityRecord('history','roll_operation','cost-copy'),receipt);assert.match(result.findings[0].repair_proposal,/never refund, charge or reroll/);
});

test('overlapping actual commitments are distinct from competing wishes and not cancelled automatically',t=>{
 const f=history(t),a=f.record('commitment','first',{start:0,end:10,participants:['npc:keeper']}),b=f.record('commitment','second',{start:5,end:15,participants:['npc:keeper']});f.record('commitment_offer','unaccepted',{start:0,end:10,participants:['npc:keeper']},{status:'pending'});const overlap=f.run().findings.filter(r=>r.type==='overlapping_actual_commitments');assert.equal(overlap.length,1);assert.deepEqual(new Set(overlap[0].records),new Set(['first','second']));assert.deepEqual(f.db.getCityRecord('history','commitment','first'),a);assert.deepEqual(f.db.getCityRecord('history','commitment','second'),b);
});

test('scene mismatch uses native actual position as evidence and excludes expected-only appearances',t=>{
 const f=history(t);f.db.startSession('history','Current session');f.db.setCityCalendar('history',{flags:{history_reconciliation:true,scene_continuity:true}});f.db.setSimulationEntity('history','npc','keeper',{location_key:'wharf'});f.setOccupants([{record_key:'presence-keeper',location_key:'gallery',source_event:'basis',data:{entity_type:'npc',entity_key:'keeper',state:'actually_present'}},{record_key:'expected-keeper',location_key:'gallery',source_event:'basis',data:{entity_type:'npc',entity_key:'keeper',state:'expected'}}]);const result=f.run();assert.equal(result.findings.filter(r=>r.type==='stale_actual_npc_position').length,1);assert.equal(f.db.getSimulationEntity('history','npc','keeper').state.location_key,'wharf');assert.match(result.findings[0].repair_proposal,/do not invent arrival/);
});

test('bounded finding coverage stays honest and original source provider remains read-only across restart',t=>{
 const f=history(t);f.db.transaction(()=>{for(let i=0;i<18;i++)f.record('strategy','plan-'+i,{actor_type:'npc',actor_key:'missing',goal_key:'ended',deadline_minute:0});});const findings=f.run();assert.equal(findings.findings.length,32);assert.equal(findings.coverage.possibly_truncated,true);assert.match(findings.limits,/No semantic truth adjudication/);assert.throws(()=>f.run({record_kind:'unsupported',record_key:'one'}),/Unsupported targeted/);const before=f.db.cityRecordCounts('history');f.reopen();const actual=original(f.db,'history',{record_kind:'strategy',record_key:'plan-0'});assert.equal(actual.coverage.targeted,true);assert.equal(actual.findings.length,2);assert.deepEqual(f.db.cityRecordCounts('history'),before);
});
