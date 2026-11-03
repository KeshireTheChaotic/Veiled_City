import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {openLegacyReadOnlyRepository} from '../../src/v2/legacy-readonly-repository.js';
function legacy(t){
  const dir=mkdtempSync(join(tmpdir(),'vk3-legacy-')),file=join(dir,'legacy.sqlite'),db=new DatabaseSync(file);
  db.exec("CREATE TABLE campaigns(guild_id TEXT PRIMARY KEY,gm_role_id TEXT);CREATE TABLE characters(id TEXT PRIMARY KEY,guild_id TEXT,owner_user_id TEXT,name TEXT,status TEXT,character_json TEXT)");
  db.prepare('INSERT INTO campaigns VALUES(?,?)').run('c','gm-role');
  const add=db.prepare('INSERT INTO characters VALUES(?,?,?,?,?,?)');add.run('a','c','u','Zed','reserve','{"level":2}');add.run('b','c','u','Amy','active','{"level":3}');add.run('x','c','u','Old','retired','{}');add.run('o','c','other','Eve','active','{}');db.close();
  t.after(()=>{assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));rmSync(dir,{recursive:true,force:true});});return file;
}
test('read-only repository returns legacy row shapes and ordering without altering the file',t=>{
  const file=legacy(t),before=createHash('sha256').update(readFileSync(file)).digest('hex'),repo=openLegacyReadOnlyRepository(file);
  assert.equal(repo.getCampaign('c').gm_role_id,'gm-role');assert.equal(repo.getCampaign('none'),null);assert.deepEqual(repo.getCharacter('b').data,{level:3});assert.equal(repo.getCharacter('missing'),null);
  assert.deepEqual(repo.listCharacters('c','u',{includeClosed:false}).map(c=>c.id),['b','a']);assert.deepEqual(repo.listCharacters('c','u').map(c=>c.id),['b','a','x']);assert.deepEqual(repo.listCharacters('c','nobody'),[]);
  repo.close();assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),before);
});
test('read-only repository cannot create a database, write, or use memory',t=>{
  const file=legacy(t);assert.throws(()=>openLegacyReadOnlyRepository(`${file}.missing`));assert.equal(existsSync(`${file}.missing`),false);assert.throws(()=>openLegacyReadOnlyRepository(':memory:'),/Existing legacy database/);
  const repo=openLegacyReadOnlyRepository(file);assert.equal(Object.keys(repo).some(k=>/save|insert|update|delete|run|exec/i.test(k)),false);repo.close();
  const raw=new DatabaseSync(file,{readOnly:true});assert.throws(()=>raw.exec("INSERT INTO campaigns VALUES('z','r')"),/readonly/i);raw.close();
});
