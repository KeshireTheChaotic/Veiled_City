import assert from 'node:assert/strict';
import test from 'node:test';
import {inventoryStorageSources} from '../../tooling/architecture/rf06-inventory.mjs';

const database='bot/src/frameworks/persistence/database.js';

test('inventory reports SELECT syntax, writes and self-transaction calls without qualifying methods',()=>{
  const result=inventoryStorageSources({[database]:`export class VeiledDB {
    read(id){this.ensureCampaign(id);return this.db.prepare(' SELECT * FROM example WHERE id=?').get(id);}
    write(id){return this.db.prepare('UPDATE example SET value=?').run(id);}
    controlled(fn){return this.transaction(fn);}
    transaction(fn){this.db.exec('BEGIN');return fn();}
  }`});
  assert.equal(result.scan_complete,true);assert.equal(result.qualifies_repository_migration,false);
  assert.equal(result.summary.class_members,4);assert.equal(result.summary.class_sql_sites,3);
  const read=result.methods.find(m=>m.name==='read');
  assert.equal(read.sql_sites[0].category,'select_syntax_only');assert.deepEqual(read.self_calls,['ensureCampaign']);
  assert.equal(result.methods.find(m=>m.name==='write').sql_sites[0].category,'write_or_schema');
  assert.equal(result.methods.find(m=>m.name==='controlled').transaction_call,true);
  assert.equal(result.methods.find(m=>m.name==='transaction').sql_sites[0].category,'transaction_control');
});

test('repository imports and syntactic callers are mapped while unrelated regex exec is excluded',()=>{
  const result=inventoryStorageSources({
    [database]:`import * as reads from './read-repository.js';import {save as persist} from './write-repository.js';
      export class VeiledDB {read(id){return reads.load(this.db,id);}write(value){return persist(this.db,value);}}`,
    'bot/src/frameworks/persistence/read-repository.js':`export function load(connection,id){return connection.prepare('SELECT * FROM example').all(id);}`,
    'bot/src/frameworks/persistence/write-repository.js':`export function save(connection,value){return connection.prepare('INSERT INTO example VALUES(?)').run(value);}`,
    'bot/src/caller.js':`db.read('a');unrelated.read('b');db.db.prepare('DELETE FROM example').run();/example/.exec('x');`
  });
  assert.equal(result.scan_complete,true);assert.equal(result.summary.class_sql_sites,0);assert.equal(result.summary.repository_sql_sites,2);
  assert.deepEqual(result.methods.find(m=>m.name==='read').delegated_repository_calls.map(c=>[c.path,c.function]),
    [['bot/src/frameworks/persistence/read-repository.js','load']]);
  assert.equal(result.methods.find(m=>m.name==='write').delegated_repository_calls[0].function,'save');
  assert.deepEqual(result.caller_candidates.map(c=>c.receiver),['db','unrelated']);
  assert.equal(result.outside_storage_sql_candidates.length,1);assert.equal(result.outside_storage_sql_candidates[0].category,'write_or_schema');
  assert.match(result.caveat,/syntactic candidates/);
});

test('dynamic SQL, WITH, PRAGMA, comments and computed driver calls remain explicit review items',()=>{
  const result=inventoryStorageSources({[database]:`export class VeiledDB {
    uncertain(sql,operation){this.db.prepare(sql);this.db.prepare(\`SELECT \${sql}\`);this.db.prepare('WITH rows AS (SELECT 1) SELECT * FROM rows');
      this.db.prepare('PRAGMA user_version');this.db.exec('-- comment\\nSELECT 1');this.db[operation]('SELECT 2');}
    field=this.db.prepare('SELECT 3');
    [chooseName()](){return this.db.prepare('SELECT 4');}
  }`});
  const uncertain=result.methods.find(m=>m.name==='uncertain');
  assert.deepEqual(uncertain.sql_sites.map(s=>s.category),['dynamic_review','dynamic_review','other_review','other_review','other_review']);
  assert.equal(uncertain.computed_connection_calls.length,1);
  assert.equal(result.methods.find(m=>m.name==='field').kind,'PropertyDefinition');
  assert.ok(result.methods.some(m=>m.name==='[computed]'&&m.computed_name_review));
  assert.equal(result.qualifies_repository_migration,false);
});

test('missing class/repository and parse failures cannot yield a complete scan',()=>{
  assert.equal(inventoryStorageSources({}).scan_complete,false);
  const missing=inventoryStorageSources({[database]:`import * as missing from './missing-repository.js';export class VeiledDB{read(){return missing.read(this.db);}}`});
  assert.equal(missing.scan_complete,false);assert.equal(missing.repositories[0].present,false);
  const broken=inventoryStorageSources({[database]:'export class VeiledDB{}','bot/src/broken.js':'export {'});
  assert.equal(broken.scan_complete,false);assert.equal(broken.parse_errors.length,1);assert.equal(broken.parse_errors[0].file,'bot/src/broken.js');
});

test('source inspection never evaluates constructor, import or top-level code',()=>{
  const marker='rf06_i03_source_executed';assert.equal(globalThis[marker],undefined);
  const result=inventoryStorageSources({[database]:`import './must-not-import.js';globalThis.${marker}=true;
    export class VeiledDB {constructor(){throw new Error('must not construct');}read(){return this.db.prepare('SELECT 1').get();}}`});
  assert.equal(result.scan_complete,true);assert.equal(globalThis[marker],undefined);assert.equal(result.summary.class_sql_sites,1);
});

test('arbitrary connection aliases are explicitly outside the scanner coverage',()=>{
  const result=inventoryStorageSources({[database]:`export class VeiledDB {alias(){const hidden=this.db;return hidden.prepare('DELETE FROM example').run();}}`});
  assert.equal(result.summary.class_sql_sites,0);
  assert.deepEqual(result.receiver_coverage,{recognized:['<receiver>.db','connection'],arbitrary_aliases_resolved:false});
  assert.equal(result.qualifies_repository_migration,false);
});
