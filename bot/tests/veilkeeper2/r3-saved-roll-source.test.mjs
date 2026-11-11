import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {openLegacyReadOnlyRepository} from '../../src/v2/legacy-readonly-repository.js';
function fixture(t,{rolls=true}={}){
  const dir=mkdtempSync(join(tmpdir(),'vk2-saved-roll-source-')),file=join(dir,'legacy.sqlite'),db=new DatabaseSync(file);
  db.exec('CREATE TABLE characters(id TEXT,guild_id TEXT,owner_user_id TEXT,character_json TEXT);CREATE TABLE campaigns(guild_id TEXT);');
  if(rolls)db.exec('CREATE TABLE rolls(guild_id TEXT,id INTEGER,owner_user_id TEXT,roll_type TEXT,payload_json TEXT);');
  const repo=openLegacyReadOnlyRepository(file);t.after(()=>{repo.close();db.close();rmSync(dir,{recursive:true,force:true});});return {repo,db,file};
}
test('saved roll source retains raw native row and original payload under exact guild/id addressing',t=>{
  const f=fixture(t),payload={id:'result-uuid',family:'duality',hope:12,fear:7,total:21,duality:'Hope',private_note:'native-only'};
  f.db.prepare('INSERT INTO rolls VALUES(?,?,?,?,?)').run('g',17,'historical-owner','reaction',JSON.stringify(payload));
  f.db.prepare('INSERT INTO rolls VALUES(?,?,?,?,?)').run('other',17,'other-owner','attack','{"different":true}');
  const sha=()=>createHash('sha256').update(readFileSync(f.file)).digest('hex'),before=sha();
  const result=f.repo.withValidationSnapshot(()=>f.repo.getSavedRoll('g',17));assert.deepEqual(result.payload,payload);assert.equal(result.payload_json,JSON.stringify(payload));assert.equal(result.owner_user_id,'historical-owner');assert.equal(result.roll_type,'reaction');assert.deepEqual(f.repo.getSavedRoll('g','17'),result);
  assert.equal(f.repo.getSavedRoll('missing',17),null);assert.equal(f.repo.getSavedRoll('g','result-uuid'),null);assert.equal(f.repo.getSavedRoll('other',17).payload.different,true);assert.equal(sha(),before);
});
test('malformed saved roll JSON and absent source schema hold instead of manufacturing a result',t=>{
  const malformed=fixture(t);malformed.db.prepare('INSERT INTO rolls VALUES(?,?,?,?,?)').run('g',1,'owner','reaction','{invalid');assert.throws(()=>malformed.repo.withValidationSnapshot(()=>malformed.repo.getSavedRoll('g',1)));
  const missing=fixture(t,{rolls:false});assert.throws(()=>missing.repo.getSavedRoll('g',1),/no such table/);
  for(const key of ['',null,{},[],1.5])assert.throws(()=>malformed.repo.getSavedRoll('g',key),/identity/);
  assert.throws(()=>malformed.repo.getSavedRoll('',1),/identity/);
});
