import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {verifiedBackup} from './production-backup.mjs';
test('N22 online WAL backup and disposable restore preserve committed receipts/outbox, not uncommitted rows',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'veiled-backup-test-'));let db;
  try{
    fs.mkdirSync(path.join(dir,'backups'));const source=path.join(dir,'source.sqlite'),dest=path.join(dir,'backups','safe.sqlite');
    db=new DatabaseSync(source);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE mutation_ledger(id PRIMARY KEY); CREATE TABLE publication_outbox(id PRIMARY KEY); INSERT INTO mutation_ledger VALUES(1); INSERT INTO publication_outbox VALUES(2);');
    db.exec('BEGIN; INSERT INTO mutation_ledger VALUES(3);');
    const report=await verifiedBackup(source,dest);assert.equal(report.backup.counts.mutation_ledger,1);assert.equal(report.restore.counts.publication_outbox,1);
    assert.equal(report.before.journal_mode,'wal');assert.equal(report.backup.integrity,'ok');assert.equal(report.sha256.length,64);
    db.exec('ROLLBACK');assert.equal(db.prepare('SELECT COUNT(*) n FROM mutation_ledger').get().n,1);
    await assert.rejects(()=>verifiedBackup(source,dest),/unused destination/);
  }finally{db?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('N22 invalid integrity/foreign keys prevent qualification and never overwrite source',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'veiled-backup-test-'));let db;
  try{
    fs.mkdirSync(path.join(dir,'backups'));const source=path.join(dir,'bad.sqlite'),dest=path.join(dir,'backups','blocked.sqlite');
    db=new DatabaseSync(source);db.exec('PRAGMA foreign_keys=OFF; CREATE TABLE parent(id PRIMARY KEY); CREATE TABLE child(id REFERENCES parent(id)); INSERT INTO child VALUES(9);');db.close();db=null;
    await assert.rejects(()=>verifiedBackup(source,dest),/foreign_key_failures=1/);assert(!fs.existsSync(dest));
  }finally{db?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
