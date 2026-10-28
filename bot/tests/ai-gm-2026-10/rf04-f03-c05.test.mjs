import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {VeiledDB} from '../../src/db.js';
import {previewHistoricalArchive,listHistoricalArchive,applyHistoricalArchive,historicalArchiveProjection} from '../../src/frameworks/knowledge/public.js';
import * as original from '../../src/frameworks/knowledge/historical-archive.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';

function shelf(t,{end=true}={}){
 const dir=mkdtempSync(join(tmpdir(),'rf04-archive-c05-')),file=join(dir,'archive.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('archive');const session=db.startSession('archive','A concluded session');indexWorldEvent(db,'archive',{key:'unfinished-source',kind:'authored_turn',title:'Historical source',source_id:'player:fixture',session_id:session.id,details:{session_id:session.id}});const row=db.saveCityRecord('archive',{kind:'semantic_intent_proposal',key:'unfinished',status:'awaiting_referent',source_event:'unfinished-source',visibility:'gm',data:{session_id:session.id,nonbinding:true}});if(end)db.endSession('archive','A recorded ending.');const options={authorized:true,now:1000000},preview=()=>previewHistoricalArchive(db,'archive','gm',session.session_number,options),apply=(p,patch={})=>applyHistoricalArchive(db,'archive','gm',{preview:p.preview,interactionId:'archive-click',reason:'Close abandoned historical administration',...patch},options);
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},file,schema,session,row,options,preview,apply,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('archive move preserves one signer and original exported identities, changing only the kernel import',()=>{
 assert.equal(original.previewHistoricalArchive,previewHistoricalArchive);assert.equal(original.applyHistoricalArchive,applyHistoricalArchive);const moved=readFileSync(fileURLToPath(new URL('../../src/frameworks/knowledge/historical-archive.js',import.meta.url)),'utf8');assert.match(moved,/from '\.\.\/\.\.\/kernel\/errors.js'/);assert.doesNotMatch(moved,/from ['"]\.\.\/\.\.\/(?:db|scene|simulation)/);
});

test('preview requires explicit administrative permission and a genuinely ended campaign session',t=>{
 const f=shelf(t,{end:false});assert.throws(()=>previewHistoricalArchive(f.db,'archive','gm',1),/permission/);assert.throws(()=>f.preview(),/ended session/);f.db.endSession('archive');const preview=f.preview();assert.equal(preview.visibility,'gm');assert.equal(preview.eligible,1);assert.equal(preview.held,0);assert.equal(preview.items[0].original_status,'awaiting_referent');assert.match(preview.authority,/no consent, withdrawal, outcome, publication or replay authority/);
});

test('verified backup, archive annotation and receipt are atomic while original source and unfinished row stay immutable',t=>{
 const f=shelf(t),before=f.db.getCityRecord('archive','semantic_intent_proposal','unfinished'),source=f.db.getWorldEvent('archive','unfinished-source'),result=f.apply(f.preview());assert.equal(result.archived,1);assert.ok(f.db.getBackup(result.backup_id));assert.deepEqual(f.db.getCityRecord('archive','semantic_intent_proposal','unfinished'),before);assert.deepEqual(f.db.getWorldEvent('archive','unfinished-source'),source);assert.equal(f.db.getOperationReceipt('archive','archive-click').command_key,'admin:archive-history');const projection=historicalArchiveProjection(f.db,'archive');assert.equal(projection.archived,1);assert.deepEqual(projection.excluded,[{kind:'semantic_intent_proposal',key:'unfinished'}]);assert.equal(f.db.listActiveAdministrativeRecords('archive',{kind:'semantic_intent_proposal'}).length,0);assert.equal(f.db.getCityRecord('archive','semantic_intent_proposal','unfinished').status,'awaiting_referent');
});

test('stale or tampered preview fails before backup, original mutation or archive annotation',t=>{
 const f=shelf(t),p=f.preview();assert.throws(()=>f.apply({...p,preview:p.preview+'tampered'}),/preview/);f.db.saveCityRecord('archive',{kind:'unrelated-note',key:'changed-after-preview',source_event:'unfinished-source',data:{recorded:true}});assert.throws(()=>f.apply(p),/stale/);assert.equal(f.db.getOperationReceipt('archive','archive-click'),undefined);assert.equal(f.db.hasHistoricalArchives('archive'),false);assert.equal(f.db.getCityRecord('archive','semantic_intent_proposal','unfinished').status,'awaiting_referent');
});

test('preview token cannot cross GM, guild or expiry boundary',t=>{
 const f=shelf(t),p=f.preview(),input={preview:p.preview,interactionId:'other-click',reason:'Administrative closeout'};assert.throws(()=>applyHistoricalArchive(f.db,'archive','another-gm',input,f.options),/another GM\/guild/);assert.throws(()=>applyHistoricalArchive(f.db,'archive','gm',input,{authorized:true,now:1600000}),/expired/);f.db.ensureCampaign('elsewhere');assert.throws(()=>applyHistoricalArchive(f.db,'elsewhere','gm',input,f.options),/another GM\/guild/);assert.equal(f.db.hasHistoricalArchives('archive'),false);
});

test('live native response obligation holds archive locally without manufacturing an answer or erasing history',t=>{
 const f=shelf(t);f.db.saveCityRecord('archive',{kind:'roll_request',key:'pending-roll',status:'pending',source_event:'unfinished-source',data:{session_id:f.session.id}});const preview=f.preview();assert.equal(preview.eligible,0);assert.equal(preview.held,1);assert.equal(preview.items[0].reason_code,'unresolved_native_dependency');assert.throws(()=>f.apply(preview),/No eligible/);assert.equal(f.db.getCityRecord('archive','roll_request','pending-roll').status,'pending');
});

test('uncertain outbox publication holds administrative archive and preserves exact durable delivery truth',t=>{
 const f=shelf(t),turn=f.db.beginTurnAttempt({guildId:'archive',messageId:'fixture-message',actorPrincipal:'fixture-owner',sessionId:f.session.id,audience:'party'});f.db.updateTurnAttempt(turn.turn_id,{stage:'delivered',committed:'yes'});const publication=f.db.enqueuePublication('archive',{turnId:turn.turn_id,surface:'party',ordinal:0,payload:'Fixture public opening',payloadHash:'fixture-hash',channelId:'mock-channel'});f.db.updatePublication(publication.id,{status:'uncertain',lastFailure:'mock transport acknowledgment unavailable'});const before=f.db.getPublication('archive',publication.id),preview=f.preview();assert.equal(preview.held,1);assert.equal(preview.items[0].reason_code,'unresolved_publication');assert.equal(f.db.getPublication('archive',publication.id).discord_message_id,null);assert.deepEqual(f.db.getPublication('archive',publication.id),before);assert.equal(f.db.hasHistoricalArchives('archive'),false);
});

test('archive audit failure rolls annotations, backup and receipt back while original unfinished records remain',t=>{
 const f=shelf(t),p=f.preview(),record=f.db.recordMutation;let backup=null;const makeBackup=f.db.createHistoricalArchiveBackup;f.db.createHistoricalArchiveBackup=function(...args){backup=makeBackup.apply(this,args);return backup;};f.db.recordMutation=function(g,row){if(row.mutationType==='historical_records_archived')throw Error('C05 archive audit failure');return record.call(this,g,row);};assert.throws(()=>f.apply(p),/C05 archive/);f.db.recordMutation=record;f.db.createHistoricalArchiveBackup=makeBackup;assert.ok(backup);assert.equal(f.db.getBackup(backup.id),null);assert.equal(f.db.hasHistoricalArchives('archive'),false);assert.equal(f.db.getOperationReceipt('archive','archive-click'),undefined);assert.deepEqual(f.db.getCityRecord('archive','semantic_intent_proposal','unfinished'),f.row);
});

test('operation receipt replay remains exact after SQLite restart and in a fresh process with a different signer secret',t=>{
 const f=shelf(t),p=f.preview(),result=f.apply(p);f.reopen();assert.deepEqual(f.apply(p),result);assert.throws(()=>f.apply(p,{reason:'A different reason'}),/does not match/);const input={preview:p.preview,interactionId:'archive-click',reason:'Close abandoned historical administration'},code='import '+JSON.stringify(new URL('./compose-startup.mjs',import.meta.url).href)+'; import {VeiledDB} from '+JSON.stringify(new URL('../../src/db.js',import.meta.url).href)+'; import {applyHistoricalArchive} from '+JSON.stringify(new URL('../../src/frameworks/knowledge/public.js',import.meta.url).href)+'; const db=new VeiledDB(process.argv[1],process.argv[2]);try{process.stdout.write(JSON.stringify(applyHistoricalArchive(db,"archive","gm",JSON.parse(process.argv[3]),{authorized:true,now:999999999})));}finally{db.close();}';const output=execFileSync(process.execPath,['--input-type=module','-e',code,f.file,f.schema,JSON.stringify(input)],{encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']});assert.deepEqual(JSON.parse(output),result);assert.equal(historicalArchiveProjection(f.db,'archive').archived,1);assert.equal(listHistoricalArchive(f.db,'archive','gm',1,f.options).already_archived,1);
});
