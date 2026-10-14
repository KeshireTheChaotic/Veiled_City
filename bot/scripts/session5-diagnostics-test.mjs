/** RO-01/NAR-01: allowlisted snapshot diagnostics, no production fixture or live request. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {nativeFixture} from './v9-fixtures.mjs';
import {Session5Reader} from '../src/diagnostics/session5-reader.js';
import {disclosureFailureReason} from '../src/disclosure-authority.js';

test('RO01 WAL snapshots refuse before SQLite can create sidecars',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vc-readonly-')),file=path.join(dir,'fixture.sqlite');
  try{const db=new DatabaseSync(file);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE specimen(value INTEGER)');db.close();
    assert.throws(()=>new Session5Reader(file),/WAL|snapshot/);assert.equal(fs.existsSync(file+'-shm'),false);assert.equal(fs.existsSync(file+'-wal'),false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('RO01 allowlist excludes arbitrary SQL/DDL/checkpoint/ATTACH and reads preserve snapshot bytes',()=>nativeFixture(f=>{
  const file=f.db.db.location();f.db.db.exec('PRAGMA journal_mode=DELETE');const before=fs.readFileSync(file);
  const reader=new Session5Reader(file);try{
    assert.equal(reader.query,undefined);assert.equal(reader.db,undefined);assert.equal(reader.exec,undefined);
    for(const sql of ['INSERT','UPDATE','DELETE','CREATE TABLE','VACUUM','wal_checkpoint','ATTACH','journal_mode'])
      assert.throws(()=>reader.columns(sql),/allowlist/);
    const report=reader.incident({factId:'absent',characterId:f.pcs[0].id,sessionNumber:1});
    assert.equal(report.fact.present,false);assert.doesNotMatch(JSON.stringify(report),new RegExp(f.pcs[0].owner_user_id));
  }finally{reader.close();}assert.deepEqual(fs.readFileSync(file),before);
}));
test('NAR01 disclosure reasons distinguish absence/archive/exact mismatch/scope without sensitive text',()=>{
  const scope={mode:'party'},fact={content:'PRIVATE_FACT',visibility:'character',subject_character_id:'owner',archived:0};
  assert.equal(disclosureFailureReason(null,'PRIVATE_FACT',[scope]),'fact_missing');
  assert.equal(disclosureFailureReason({...fact,archived:1},'PRIVATE_FACT',[scope]),'fact_archived');
  assert.equal(disclosureFailureReason(fact,'other',[scope]),'content_mismatch');
  assert.equal(disclosureFailureReason(fact,'PRIVATE_FACT',[scope]),'audience_denied');
  assert.equal(disclosureFailureReason(fact,'PRIVATE_FACT',[{mode:'private',actorCharacterId:'owner'}]),null);
});
