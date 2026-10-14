/** Offline administrative archival: no gameplay authority, original-row mutation or live I/O. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {dualityRoll} from '../src/dice.js';
import {nativeFixture} from './v9-fixtures.mjs';
import {buildActionPlan} from '../src/action-dependency.js';
import {quarantineGeneratedOutput,prepareAuthorizedTurnOutput,certifiedSessionRecap} from '../src/pvp-output.js';
import {queueTurnPublications,deliverTurnOutbox} from '../src/publication-outbox.js';
import {handleCommand} from '../src/commands.js';
import {buildCommands} from '../src/command-definitions.js';
import {validateCommandSchema} from '../src/command-schema.js';
import {previewHistoricalArchive,applyHistoricalArchive,listHistoricalArchive,historicalArchiveProjection} from '../src/historical-archive.js';

const auth={authorized:true,now:1000};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const changes=db=>db.db.prepare('SELECT total_changes() n').get().n;
function setup(f){
  const action=f.accepted(0,'I examine the terminal.', '',{type:'observe',operation:'observe'});
  buildActionPlan(f.db,f.guild,[action]);
  quarantineGeneratedOutput(f.db,f.guild,'synthetic-private',{narration:'SECRET_DRAFT'},f.session.id);
  f.db.endSession(f.guild);
  return action;
}
const preview=f=>previewHistoricalArchive(f.db,f.guild,'gm',f.session.session_number,auth);
const apply=(f,p,options={})=>applyHistoricalArchive(f.db,f.guild,'gm',{
  preview:p.preview,reason:'Close ended-session work without outcomes.',interactionId:'archive-apply',...options},auth);
const originalRows=f=>f.db.db.prepare("SELECT * FROM city_records WHERE kind NOT LIKE 'historical_%' ORDER BY rowid").all();

test('ARC01 preview/list are read-only, private metadata and real GM scope is required',()=>nativeFixture(f=>{
  setup(f);const n=changes(f.db),p=preview(f);
  assert.equal(p.eligible,2);assert.equal(p.already_archived,0);assert(p.preview);
  assert.doesNotMatch(JSON.stringify(p),/SECRET_DRAFT|I examine/);
  listHistoricalArchive(f.db,f.guild,'gm',f.session.session_number,auth);assert.equal(changes(f.db),n);
  assert.throws(()=>previewHistoricalArchive(f.db,f.guild,'player',1),/GM\/admin/);
  assert.throws(()=>previewHistoricalArchive(f.db,'other','gm',1,auth),/session/i);
}));

test('ARC02 append-only apply, complete logical backup, receipts and restart idempotency',()=>nativeFixture(f=>{
  setup(f);const before=originalRows(f),characters=f.db.db.prepare('SELECT * FROM characters').all(),p=preview(f);
  const done=apply(f,p);assert.equal(done.archived,2);assert(done.backup_id);
  assert.deepEqual(originalRows(f),before);assert.deepEqual(f.db.db.prepare('SELECT * FROM characters').all(),characters);
  const backup=f.db.getBackup(done.backup_id);assert(backup.state.tables.rolls);assert(backup.state.tables.mutation_ledger);
  assert(backup.state.tables.operation_receipts);assert.equal(backup.state.tables.city_records.length,before.length);
  const n=changes(f.db);assert.deepEqual(apply(f,p),done);assert.equal(changes(f.db),n);
  f.restart();assert.deepEqual(apply(f,p),done);assert.equal(preview(f).already_archived,2);
  assert.equal(historicalArchiveProjection(f.db,f.guild).archived,2);
}));

test('ARC03 active selected session is refused but independent new sessions stay usable',()=>nativeFixture(f=>{
  assert.throws(()=>preview(f),/ended session/i);setup(f);const next=f.db.startSession(f.guild,'Independent scene');
  f.db.assignCharacter(next.id,f.pcs[1].owner_user_id,f.pcs[1].id);f.db.setPresence(next.id,f.pcs[1].owner_user_id,'present');
  const p=preview(f);assert.equal(apply(f,p).archived,2);assert.equal(f.db.getActiveSession(f.guild).id,next.id);
  assert(f.accepted(1,'I examine another room.','',{type:'observe',operation:'observe'}));
}));

test('ARC04 expired, tampered, foreign-user and changed-source previews cannot write',()=>nativeFixture(f=>{
  const action=setup(f),p=preview(f),n=changes(f.db);
  for(const [token,user,opts] of [[p.preview,'other',auth],[p.preview+'x','gm',auth],[p.preview,'gm',{authorized:true,now:1000000}]])
    assert.throws(()=>applyHistoricalArchive(f.db,f.guild,user,{preview:token,reason:'close',interactionId:'bad'},opts));
  assert.equal(changes(f.db),n);
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,action.source_event);
  assert.throws(()=>apply(f,p),/changed|stale|source/i);assert.equal(preview(f).held,1);
}));

test('ARC05 native Fear and uncertain delivery in ended sessions are held, not forgiven',()=>nativeFixture(f=>{
  const action=setup(f);
  f.db.saveCityRecord(f.guild,{kind:'pvp_fear_trigger',key:'due',status:'needs_review',source_event:action.source_event,
    data:{session_id:f.session.id,action:action.record_key}});
  assert.equal(preview(f).eligible,0);assert.equal(preview(f).held,2);
  assert.throws(()=>apply(f,preview(f)),/eligible/i);
  f.db.db.prepare("DELETE FROM city_records WHERE kind='pvp_fear_trigger'").run();
  const turn=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:'delivery',actorPrincipal:'offline',audience:'party'});
  f.db.enqueuePublication(f.guild,{turnId:turn.turn_id,surface:'party',ordinal:0,visibility:'party',payload:'PRIVATE_UNSENT',payloadHash:'offline'});
  assert.equal(preview(f).held,2);assert.doesNotMatch(JSON.stringify(preview(f)),/PRIVATE_UNSENT/);
}));

test('ARC06 reverse references to a live compound action hold only dependent historical work',()=>nativeFixture(f=>{
  const action=setup(f),next=f.db.startSession(f.guild,'New scene');
  f.db.saveCityRecord(f.guild,{kind:'compound_action',key:'live-dependency',status:'pending',source_event:action.source_event,
    data:{session_id:next.id,dependencies:[action.record_key]}});
  const p=preview(f);assert.equal(p.held,1);assert.equal(p.eligible,1);assert.equal(apply(f,p).archived,1);
}));

test('ARC07 backup failure and annotation failure roll back the entire operation',()=>nativeFixture(f=>{
  setup(f);const p=preview(f),before=originalRows(f);
  const backup=f.db.createHistoricalArchiveBackup;f.db.createHistoricalArchiveBackup=()=>{throw new Error('backup failed');};
  assert.throws(()=>apply(f,p),/backup failed/);assert.deepEqual(originalRows(f),before);
  f.db.createHistoricalArchiveBackup=backup;
  f.db.db.exec("CREATE TRIGGER deny_archive BEFORE INSERT ON city_records WHEN NEW.kind='historical_record_archive' BEGIN SELECT RAISE(ABORT,'fixture refusal'); END;");
  assert.throws(()=>apply(f,p),/fixture refusal/);assert.equal(f.db.listBackups(f.guild).length,0);
  assert.equal(f.db.getOperationReceipt(f.guild,'archive-apply')==null,true);
}));

test('ARC08 original-row/source tampering and malformed annotations cannot hide active incidents',()=>nativeFixture(f=>{
  setup(f);apply(f,preview(f));
  assert.equal(f.db.operationalHealthData(f.guild).incidents.filter(x=>x.kind==='pvp_output_quarantine').length,0);
  f.db.db.prepare("UPDATE city_records SET data_json=json_set(data_json,'$.extra','changed') WHERE kind='pvp_output_quarantine'").run();
  const projection=historicalArchiveProjection(f.db,f.guild);assert.equal(projection.archived,1);assert.equal(projection.conflicts.length,1);
  assert.equal(f.db.operationalHealthData(f.guild).incidents.filter(x=>x.kind==='pvp_output_quarantine').length,1);
}));

test('ARC09 maintenance v1 annotations remain readable and archive filtering precedes pagination',()=>nativeFixture(f=>{
  setup(f);
  const rows=f.db.db.prepare("SELECT * FROM city_records WHERE kind='pvp_output_quarantine'").all();
  const r=rows[0],key=`historical-archive:${hash([f.guild,r.kind,r.record_key])}`;
  const related=[];const data={version:1,batch:'maintenance-batch',session_id:f.session.id,session_number:1,
    target_kind:r.kind,target_key:r.record_key,original_status:r.status,stored_row_hash:hash(r),
    original_row_hash:hash({...r,archive_session_id:f.session.id,session_number:1}),related,
    disposition:'administratively_closed_ended_session',canonical:false,authorizes_execution:false};
  f.db.saveCityRecord(f.guild,{kind:'historical_record_archive',key,status:'archived',source_event:r.source_event,data});
  assert.equal(historicalArchiveProjection(f.db,f.guild).archived,1);
  for(let i=0;i<25;i++){
    const q=quarantineGeneratedOutput(f.db,f.guild,`old-${i}`,{},f.session.id);
    const p=preview(f);applyHistoricalArchive(f.db,f.guild,'gm',{preview:p.preview,reason:'historical',interactionId:`batch-${i}`},auth);
    assert(q);
  }
  const live=f.db.startSession(f.guild,'Live');quarantineGeneratedOutput(f.db,f.guild,'LIVE',{},live.id);
  const incidents=f.db.operationalHealthData(f.guild).incidents.filter(x=>x.kind==='pvp_output_quarantine');
  assert.equal(incidents.length,1);assert.equal(f.db.operationalHealthData(f.guild).archival.archived,27);
}));

function interaction(f,operation,values={},allowed=true){
  const sent=[];const i={id:values.id||`interaction-${operation}`,guildId:f.guild,commandName:'vc-admin',user:{id:'gm'},
    memberPermissions:{has:()=>allowed},member:{roles:{cache:new Map()}},isChatInputCommand:()=>true,
    options:{getSubcommand:()=> 'archive-history',getString:k=>k==='operation'?operation:values[k]??null,
      getInteger:k=>k==='session'&&operation!=='apply'?values.session??1:null},sent,
    deferReply:async p=>{assert.equal(p.ephemeral,true);i.deferred=true;},
    editReply:async p=>{assert(i.deferred);assert(p.content.length<=2000);sent.push(p);},
  };return i;
}

test('ARC10 real Discord adapter denies unauthorized before writes and preview is entirely read-only',()=>nativeFixture(async f=>{
  setup(f);const n=changes(f.db),deps={db:f.db,gm:new Proxy({},{get(){throw new Error('No model or continuations');}})};
  await assert.rejects(handleCommand(interaction(f,'preview',{},false),deps),/GM\/admin/);assert.equal(changes(f.db),n);
  const i=interaction(f,'preview');await handleCommand(i,deps);assert.equal(changes(f.db),n);
  const p=JSON.parse(i.sent[0].files[0].attachment.toString());assert(p.preview);assert.doesNotMatch(JSON.stringify(p),/SECRET_DRAFT/);
  await handleCommand(interaction(f,'list'),deps);assert.equal(changes(f.db),n);
  const grouped=interaction(f,'list');grouped.commandName='vc';grouped.options.getSubcommandGroup=()=> 'admin';
  await handleCommand(grouped,deps);assert.equal(changes(f.db),n);
}));

test('ARC11 uncertain command acknowledgement cannot repeat administrative writes on redelivery',()=>nativeFixture(async f=>{
  setup(f);const p=previewHistoricalArchive(f.db,f.guild,'gm',1,{authorized:true});
  const deps={db:f.db,gm:{}},i=interaction(f,'apply',{preview:p.preview,reason:'ended session',id:'lost-reply'});
  i.editReply=async()=>{throw new Error('uncertain Discord delivery');};
  await assert.rejects(handleCommand(i,deps));assert.equal(historicalArchiveProjection(f.db,f.guild).archived,2);
  const n=changes(f.db);await handleCommand(interaction(f,'apply',{preview:p.preview,reason:'ended session',id:'lost-reply'}),deps);
  assert.equal(changes(f.db),n);
}));

test('ARC12 command schema includes bounded GM preview/apply/list options',()=>{
  const commands=buildCommands(),cmd=commands.find(r=>r.name==='vc-admin').options.find(r=>r.name==='archive-history');
  assert(cmd);assert.deepEqual(validateCommandSchema(commands),[]);
  assert.deepEqual(cmd.options.find(x=>x.name==='operation').choices.map(x=>x.value),['preview','apply','list']);
});

test('ARC13 certified publication history and native records survive archive and restart',()=>nativeFixture(async f=>{
  const result=prepareAuthorizedTurnOutput(f.db,f.guild,{narration:'Unverified output',private_messages:[]},{mode:'party'});
  const turn=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:'archive-transcript',actorPrincipal:'offline',audience:'party'});
  queueTurnPublications(f.db,{guild:{id:f.guild},session:f.session,scope:{mode:'party'},turnId:turn.turn_id,result});
  await deliverTurnOutbox(f.db,f.guild,turn.turn_id,async()=>({ok:true,messageId:'saved-message',channelId:'offline-channel'}));
  f.db.updateTurnAttempt(turn.turn_id,{stage:'delivered',committed:'yes'});
  const action=setup(f),text=certifiedSessionRecap(f.db,f.guild,f.session.id),events=f.db.db.prepare('SELECT * FROM world_events').all();
  assert(text);apply(f,preview(f));assert.deepEqual(f.db.db.prepare('SELECT * FROM world_events').all(),events);
  assert.equal(certifiedSessionRecap(f.db,f.guild,f.session.id),text);f.restart();
  assert.equal(certifiedSessionRecap(f.db,f.guild,f.session.id),text);
  assert.equal(f.db.getCityRecord(f.guild,'typed_intent',action.record_key).status,'accepted_for_adjudication');
}));

test('ARC14 changed owner, source ancestry and related records invalidate preview without effects',()=>nativeFixture(f=>{
  const action=setup(f),p=preview(f);
  f.db.db.prepare("UPDATE characters SET owner_user_id='new-owner' WHERE id=?").run(f.pcs[0].id);
  assert.throws(()=>apply(f,p),/changed|stale/);assert.equal(historicalArchiveProjection(f.db,f.guild).archived,0);
  f.db.db.prepare("UPDATE city_records SET data_json=json_set(data_json,'$.proposal_id','missing') WHERE kind='typed_intent' AND record_key=?")
    .run(action.record_key);
  assert.equal(preview(f).held,1);assert.equal(preview(f).eligible,1);
}));

test('ARC15 six imported character rows/resources, saved dice, private data and settings stay byte-identical',()=>nativeFixture(f=>{
  for(let i=4;i<6;i++){f.db.upsertPlayer(f.guild,`owner-${i}`,`Imported ${i}`);f.db.createCharacter(f.guild,`owner-${i}`,`Imported ${i}`,{resources:{hope:3}});}
  f.db.addRoll(f.guild,f.session.id,f.pcs[0].owner_user_id,f.pcs[0].id,'duality',dualityRoll());
  setup(f);const snapshot=f.db.historicalArchiveState(f.guild);apply(f,preview(f));
  const after=f.db.historicalArchiveState(f.guild);
  for(const table of Object.keys(snapshot.tables))if(!['city_records','mutation_ledger','operation_receipts'].includes(table))
    assert.deepEqual(after.tables[table],snapshot.tables[table],table);
  assert.deepEqual(after.campaign,snapshot.campaign);assert.equal(after.tables.characters.length,6);
  assert.equal(after.tables.rolls.length,1);
}));

test('ARC16 exact guild/actor/request receipts cannot be reused with altered arguments',()=>nativeFixture(f=>{
  setup(f);const p=preview(f);apply(f,p);const n=changes(f.db);
  assert.throws(()=>apply(f,p,{reason:'different reason'}),/receipt/);
  assert.throws(()=>applyHistoricalArchive(f.db,'other','gm',{preview:p.preview,reason:'close',interactionId:'other'},auth),/another|guild/);
  assert.throws(()=>applyHistoricalArchive(f.db,f.guild,'other',{preview:p.preview,reason:'close',interactionId:'archive-apply'},auth),/receipt/);
  assert.equal(changes(f.db),n);
}));

test('ARC17 orphaned pending owner/Armor native decisions cannot be administratively dismissed',()=>nativeFixture(f=>{
  const action=setup(f);
  f.db.saveCityRecord(f.guild,{kind:'pvp_defense_choice',key:'orphan-choice',status:'awaiting_owner',source_event:action.source_event,
    data:{session_id:f.session.id,action:action.record_key}});
  assert.equal(preview(f).held,2);assert.equal(preview(f).eligible,0);
}));

test('ARC18 reversal/malformed closure is visible for review and never changes source or outcome',()=>nativeFixture(f=>{
  const action=setup(f),done=apply(f,preview(f)),source=f.db.getWorldEvent(f.guild,action.source_event);
  f.db.saveCityRecord(f.guild,{kind:'historical_record_archive_reversal',key:'reviewed-reversal',status:'recorded',
    source_event:action.source_event,data:{batch:done.batch_id}});
  assert.equal(historicalArchiveProjection(f.db,f.guild).archived,0);assert.equal(historicalArchiveProjection(f.db,f.guild).conflicts.length,2);
  assert.deepEqual(f.db.getWorldEvent(f.guild,action.source_event),source);
  assert.equal(f.db.getCityRecord(f.guild,'typed_intent',action.record_key).status,'accepted_for_adjudication');
  assert.equal(f.db.operationalHealthData(f.guild).incidents.filter(x=>x.kind==='historical_archive_conflict').length,2);
}));

test('ARC19 bounded inventories reject overflow rather than silently selecting a partial archive',()=>nativeFixture(f=>{
  setup(f);f.db.transaction(()=>{for(let i=0;i<201;i++)quarantineGeneratedOutput(f.db,f.guild,`overflow-${i}`,{},f.session.id);});
  const before=changes(f.db);assert.throws(()=>preview(f),/200|bounded/);assert.equal(changes(f.db),before);
}));

test('ARC20 retracted sources and incompatible session lineage keep original items visible',()=>nativeFixture(f=>{
  const action=setup(f);apply(f,preview(f));
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE event_key=?").run(action.source_event);
  assert.equal(historicalArchiveProjection(f.db,f.guild).archived,1);
  assert.equal(f.db.listActiveAdministrativeRecords(f.guild,{kind:'compound_action'}).length,1);
  assert.equal(f.db.getCityRecord(f.guild,'typed_intent',action.record_key).status,'accepted_for_adjudication');
}));

test('ARC21 inventory limits fail closed for hiding, not for unrelated read-only retrieval',()=>nativeFixture(f=>{
  setup(f);apply(f,preview(f));const original=f.db.historicalArchiveState;
  f.db.historicalArchiveState=()=>{throw Object.assign(new Error('bounded inventory'),{code:'ARCHIVAL_INVENTORY_LIMIT'});};
  assert.equal(historicalArchiveProjection(f.db,f.guild).excluded.length,0);
  assert.equal(f.db.listActiveAdministrativeRecords(f.guild,{kind:'compound_action'}).length,1);
  assert.throws(()=>preview(f),/bounded inventory/);f.db.historicalArchiveState=original;
}));

test('ARC22 ambiguous session ancestry is reported held rather than silently omitted',()=>nativeFixture(f=>{
  setup(f);const other=f.db.startSession(f.guild,'Other');f.db.endSession(f.guild);
  f.db.db.prepare("UPDATE city_records SET data_json=json_set(data_json,'$.session_id',?) WHERE kind='pvp_output_quarantine'").run(other.id);
  assert.equal(preview(f).held,1);assert.equal(preview(f).eligible,1);
}));

test('ARC23 failed Fear is not a terminal consequence and must never be administratively forgiven',()=>nativeFixture(f=>{
  const action=setup(f);f.db.saveCityRecord(f.guild,{kind:'pvp_fear_trigger',key:'failed-fear',status:'failed',
    source_event:action.source_event,data:{session_id:f.session.id}});
  assert.equal(preview(f).held,2);assert.equal(preview(f).eligible,0);
}));
