import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {VeiledDB} from '../../src/frameworks/persistence/database.js';
import {listVisibleActiveThreads} from '../../src/frameworks/persistence/caseboard-repository.js';

test('visible thread reader preserves guild, exact player visibility, active status, ordering and raw rows',()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r80',other='r80-other';
  try{
    db.ensureCampaign(guild);db.ensureCampaign(other);
    const fixtures=[
      {id:'public',label:'Public',visibility:'public',notes:'Raw **notes**\nSecond line'},
      {id:'party',label:'Party',visibility:'party'},
      {id:'a',label:'Owner A',visibility:'player',subjectUserId:'owner-a'},
      {id:'b',label:'Owner B',visibility:'player',subjectUserId:'owner-b'},
      {id:'character',label:'Character',visibility:'character',subjectUserId:'owner-a',subjectCharacterId:'pc-a'},
      {id:'gm',label:'GM',visibility:'gm'},
      {id:'resolved',label:'Resolved',status:'resolved'},
      {id:'failed',label:'Failed',status:'failed'},
      {id:'dormant',label:'Dormant',status:'dormant'}
    ];
    for(const [index,row] of fixtures.entries()){
      db.upsertThread(guild,row);
      db.db.prepare('UPDATE threads SET updated_at=? WHERE guild_id=? AND id=?')
        .run(new Date(Date.UTC(2026,0,1)+index*60000).toISOString(),guild,row.id);
    }
    db.upsertThread(other,{id:'other',label:'Other guild',visibility:'public'});
    const before=db.db.prepare('SELECT total_changes() n').get().n;
    const rows=db.listVisibleActiveThreads(guild,'owner-a',{includeGM:true});
    assert.deepEqual(rows.map(r=>r.id),['a','party','public']);
    for(const row of rows)assert.deepEqual(row,db.getThread(guild,row.id));
    assert.equal(rows.at(-1).notes,'Raw **notes**\nSecond line');
    assert.deepEqual(db.listVisibleActiveThreads(guild,'owner-b').map(r=>r.id),['b','party','public']);
    assert.deepEqual(db.listVisibleActiveThreads(guild,null).map(r=>r.id),['party','public']);
    assert.deepEqual(db.listVisibleActiveThreads(other,'owner-a').map(r=>r.id),['other']);
    assert.equal(db.db.prepare('SELECT total_changes() n').get().n,before);
  }finally{db.close();}
});

test('caseboard read retains its original unbounded row set and updated-at order',()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r80-unbounded';
  try{
    db.ensureCampaign(guild);
    for(let i=0;i<225;i++){
      db.upsertThread(guild,{id:`visible-${i}`,label:`Visible ${i}`,visibility:'party'});
      db.db.prepare('UPDATE threads SET updated_at=? WHERE guild_id=? AND id=?')
        .run(new Date(Date.UTC(2026,0,1)+i*60000).toISOString(),guild,`visible-${i}`);
    }
    db.upsertThread(guild,{id:'new-hidden',label:'New private lead',visibility:'player',subjectUserId:'another-owner'});
    const rows=db.listVisibleActiveThreads(guild,'owner');
    assert.equal(rows.length,225);assert.equal(rows[0].id,'visible-224');assert.equal(rows.at(-1).id,'visible-0');
  }finally{db.close();}
});

test('visible thread reader observes caller transaction state and preserves saved rows after rollback/reopen',()=>{
  const folder=mkdtempSync(join(tmpdir(),'veiled-r80-')),file=join(folder,'threads.sqlite'),guild='r80-reopen';
  let db;
  try{
    db=new VeiledDB(file,'sql/schema.sql');db.ensureCampaign(guild);
    const saved=db.upsertThread(guild,{id:'saved',label:'Saved lead',visibility:'player',subjectUserId:'owner',notes:'Saved notes'});
    const failure=new Error('rollback');
    assert.throws(()=>db.transaction(()=>{
      db.upsertThread(guild,{id:'pending',label:'Uncommitted lead',visibility:'party'});
      assert.ok(db.listVisibleActiveThreads(guild,'owner').some(r=>r.id==='pending'));
      const before=db.db.prepare('SELECT total_changes() n').get().n;
      assert.ok(listVisibleActiveThreads(db.db,guild,'owner').some(r=>r.id==='pending'));
      assert.equal(db.db.prepare('SELECT total_changes() n').get().n,before);
      throw failure;
    }),error=>error===failure);
    assert.deepEqual(db.listVisibleActiveThreads(guild,'owner'),[saved]);
    db.close();db=null;db=new VeiledDB(file,'sql/schema.sql');
    assert.deepEqual(db.listVisibleActiveThreads(guild,'owner'),[saved]);
    assert.deepEqual(db.listVisibleActiveThreads(guild,'another-owner'),[]);
  }finally{
    db?.close();const target=resolve(folder);
    assert.equal(dirname(target),resolve(tmpdir()));assert.ok(basename(target).startsWith('veiled-r80-'));
    rmSync(target,{recursive:true,force:true});
  }
});

test('repository preserves driver receivers, raw result and prepare/all errors',()=>{
  const rows=[{id:'raw'}],calls=[],failure=new Error('driver failure');
  const statement={all(...args){assert.equal(this,statement);calls.push(args);return rows;}};
  const connection={prepare(){assert.equal(this,connection);return statement;}};
  assert.equal(listVisibleActiveThreads(connection,'guild','owner'),rows);assert.deepEqual(calls,[['guild','owner']]);
  statement.all=()=>{throw failure;};assert.throws(()=>listVisibleActiveThreads(connection,'guild','owner'),error=>error===failure);
  connection.prepare=()=>{throw failure;};assert.throws(()=>listVisibleActiveThreads(connection,'guild','owner'),error=>error===failure);
});
