import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {VeiledDB} from '../../src/frameworks/persistence/database.js';
import {heldNativeNotices,listPendingPublications} from '../../src/frameworks/persistence/publication-diagnostic-repository.js';

test('diagnostic readers preserve the caller connection, projections, order, guild and cap',()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r85-main',other='r85-other';
  try{
    db.ensureCampaign(guild);db.ensureCampaign(other);
    const session=db.startSession(guild,'Fixture','already_together');
    for(let i=0;i<4;i++){
      const turn=db.beginTurnAttempt({guildId:guild,messageId:`message-${i}`,actorPrincipal:'gm:test',sessionId:session.id,audience:'party'});
      const row=db.enqueuePublication(guild,{turnId:turn.turn_id,surface:'play',ordinal:i,payload:`private-${i}`,payloadHash:`hash-${i}`});
      db.db.prepare('UPDATE publication_outbox SET created_at=?,status=? WHERE id=?')
        .run(new Date(Date.UTC(2026,0,1)+i*60000).toISOString(),i===3?'delivered':'uncertain',row.id);
    }
    const otherSession=db.startSession(other,'Fixture','already_together');
    const otherTurn=db.beginTurnAttempt({guildId:other,messageId:'other-message',actorPrincipal:'gm:test',sessionId:otherSession.id,audience:'party'});
    const g=db.enqueuePublication(other,{turnId:otherTurn.turn_id,surface:'play',ordinal:0,payload:'other',payloadHash:'other'});
    for(const [owner,key] of [[guild,'held'],[guild,'delivered'],[other,'other']])
      db.saveWorldEvent(owner,{key:`source-${key}`,kind:'fixture',title:'Fixture',status:'active',truth_status:'asserted',visibility:'gm',source_kind:'fixture',source_id:key,tick:0,minute:0,details:{}});
    db.saveCityRecord(guild,{kind:'roll_publication',key:'held',status:'needs_review',visibility:'gm',source_event:'source-held',data:{turn_id:null}});
    db.saveCityRecord(guild,{kind:'roll_publication',key:'delivered',status:'delivered',visibility:'gm',source_event:'source-delivered',data:{turn_id:null}});
    db.saveCityRecord(other,{kind:'roll_publication',key:'other',status:'needs_review',visibility:'gm',source_event:'source-other',data:{turn_id:null}});
    const pending=db.listPendingPublications(guild,{limit:2});
    assert.deepEqual(pending.map(r=>r.ordinal),[0,1]);assert.equal(pending[0].payload_hash,'hash-0');
    assert.equal(pending[0].payload,undefined);assert.equal(db.listPendingPublications(other)[0].id,g.id);
    assert.deepEqual(db.heldNativeNotices(guild).map(r=>r.record_key),['held']);
  }finally{db.close();}
});

test('extracted readers observe caller transaction state and roll back without writes',()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r85-transaction';
  try{
    db.ensureCampaign(guild);const before=db.db.prepare('SELECT total_changes() n').get().n;
    const failure=new Error('rollback');
    assert.throws(()=>db.transaction(()=>{
      const session=db.startSession(guild,'Fixture','already_together');
      const turn=db.beginTurnAttempt({guildId:guild,messageId:'pending-message',actorPrincipal:'gm:test',sessionId:session.id,audience:'party'});
      const row=db.enqueuePublication(guild,{turnId:turn.turn_id,surface:'play',ordinal:4,payload:'pending',payloadHash:'pending'});
      db.saveWorldEvent(guild,{key:'pending-source',kind:'fixture',title:'Fixture',status:'active',truth_status:'asserted',visibility:'gm',source_kind:'fixture',source_id:'pending',tick:0,minute:0,details:{}});
      db.saveCityRecord(guild,{kind:'roll_publication',key:'pending',status:'needs_review',visibility:'gm',source_event:'pending-source',data:{}});
      assert.equal(listPendingPublications(db.db,guild)[0].id,row.id);
      assert.equal(heldNativeNotices(db.db,guild)[0].record_key,'pending');
      const writes=db.db.prepare('SELECT total_changes() n').get().n;
      assert.ok(writes>before);throw failure;
    }),error=>error===failure);
    assert.deepEqual(db.listPendingPublications(guild),[]);assert.deepEqual(db.heldNativeNotices(guild),[]);
  }finally{db.close();}
});

test('diagnostic rows remain readable after reopening saved SQLite state',()=>{
  const folder=mkdtempSync(join(tmpdir(),'veiled-r85-')),file=join(folder,'diagnostics.sqlite'),guild='r85-reopen';let db;
  try{
    db=new VeiledDB(file,'sql/schema.sql');db.ensureCampaign(guild);
    const session=db.startSession(guild,'Fixture','already_together');
    const turn=db.beginTurnAttempt({guildId:guild,messageId:'saved-message',actorPrincipal:'gm:test',sessionId:session.id,audience:'party'});
    const outbox=db.enqueuePublication(guild,{turnId:turn.turn_id,surface:'play',ordinal:2,payload:'secret',payloadHash:'saved'});
    db.saveWorldEvent(guild,{key:'saved-source',kind:'fixture',title:'Fixture',status:'active',truth_status:'asserted',visibility:'gm',source_kind:'fixture',source_id:'saved',tick:0,minute:0,details:{}});
    db.saveCityRecord(guild,{kind:'pvp_status_publication',key:'saved-held',status:'needs_review',visibility:'gm',source_event:'saved-source',data:{}});
    db.close();db=new VeiledDB(file,'sql/schema.sql');
    assert.equal(db.listPendingPublications(guild)[0].id,outbox.id);
    assert.equal(db.heldNativeNotices(guild)[0].record_key,'saved-held');
  }finally{db?.close();const target=resolve(folder);assert.equal(dirname(target),resolve(tmpdir()));assert.ok(basename(target).startsWith('veiled-r85-'));rmSync(target,{recursive:true,force:true});}
});

test('repository forwards raw rows and preserves prepare/all receivers and errors',()=>{
  const rows=[{id:'raw'}],failure=new Error('driver failure');let args;
  const statement={all(...values){assert.equal(this,statement);args=values;return rows;}};
  const connection={prepare(sql){assert.equal(this,connection);assert.match(sql,/publication_outbox|city_records/);return statement;}};
  assert.equal(listPendingPublications(connection,'guild',{limit:5}),rows);assert.deepEqual(args,['guild',5]);
  statement.all=()=>{throw failure;};assert.throws(()=>heldNativeNotices(connection,'guild'),error=>error===failure);
  connection.prepare=()=>{throw failure;};assert.throws(()=>listPendingPublications(connection,'guild'),error=>error===failure);
});
