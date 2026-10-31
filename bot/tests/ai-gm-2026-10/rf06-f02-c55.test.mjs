import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/frameworks/persistence/public.js';
import {connectPersistenceOperations} from '../../src/framework-to-framework/operations--persistence/public.js';
import {withTurnTrace} from '../../src/frameworks/operations/public.js';
connectPersistenceOperations();
const schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));
function fixture(t,options){const dir=mkdtempSync(join(tmpdir(),'veiled-rf06-r55-')),file=join(dir,'synthetic.sqlite');let db=new VeiledDB(file,schema,options);for(const guild of ['guild','other'])db.ensureCampaign(guild);t.after(()=>{db.close();assert.equal(dirname(dir),resolve(tmpdir()));assert.ok(dir.startsWith(join(resolve(tmpdir()),'veiled-rf06-r55-')));rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},reopen(){db.close();db=new VeiledDB(file,schema,options);},character(name,{guild='guild',owner='owner',status='active',data={}}={}){const row=db.createCharacter(guild,owner,name,data);db.db.prepare('UPDATE characters SET status=? WHERE id=?').run(status,row.id);return row;}};}
const changes=db=>db.db.prepare('SELECT total_changes() n').get().n;
test('original guild/owner/status/name order and full closed rows retained without writes',t=>{
  const f=fixture(t);for(const [name,status] of [['Zulu','active'],['Alpha','active'],['Reserve','reserve'],['Guest','guest'],['Dead','dead'],['Retired','retired']])f.character(name,{status});f.character('Foreign guild',{guild:'other'});f.character('Foreign owner',{owner:'other'});const before=changes(f.db),rows=f.db.listCharacters('guild','owner');assert.deepEqual(rows.map(r=>r.name),['Alpha','Zulu','Reserve','Guest','Dead','Retired']);assert.deepEqual(f.db.listCharacters('guild','owner',{includeClosed:false}).map(r=>r.name),['Alpha','Zulu','Reserve','Guest']);assert.deepEqual(f.db.listCharacters('missing','owner'),[]);assert.equal(changes(f.db),before);
});
test('original includeClosed default/truthiness/getter-once/null-option behavior retained',t=>{
  const f=fixture(t);f.character('Closed',{status:'retired'});for(const value of [false,0,'',null])assert.deepEqual(f.db.listCharacters('guild','owner',{includeClosed:value}),[]);for(const value of [true,'false',{},undefined])assert.equal(f.db.listCharacters('guild','owner',{includeClosed:value}).length,1);let calls=0;assert.equal(f.db.listCharacters('guild','owner',{get includeClosed(){calls++;return true;}}).length,1);assert.equal(calls,1);assert.throws(()=>f.db.listCharacters('guild','owner',null),TypeError);
});
test('raw JSON and parsed object/null/primitive values/errors retain original row shape',t=>{
  const f=fixture(t),c=f.character('Archive',{data:{notes:'Original'}}),update=f.db.db.prepare('UPDATE characters SET character_json=? WHERE id=?');let row=f.db.listCharacters('guild','owner')[0];assert.equal(Object.getPrototypeOf(row),Object.prototype);assert.equal(row.data.notes,'Original');assert.equal(JSON.parse(row.character_json).notes,'Original');for(const [raw,value]of [['null',null],['7',7],['[]',[]]]){update.run(raw,c.id);assert.deepEqual(f.db.listCharacters('guild','owner')[0].data,value);}update.run('malformed',c.id);const before=changes(f.db);assert.throws(()=>f.db.listCharacters('guild','owner'),SyntaxError);assert.equal(changes(f.db),before);
});
test('same caller character creation and nested/outer rollback preserve visibility and connection',t=>{
  const f=fixture(t),db=f.db,connection=db.db,outer=new Error('outer'),inner=new Error('inner');f.character('Original');assert.throws(()=>db.transaction(()=>{f.character('Outer');assert.equal(db.listCharacters('guild','owner').length,2);assert.throws(()=>db.transaction(()=>{f.character('Inner');assert.equal(db.listCharacters('guild','owner').length,3);throw inner;}),e=>e===inner);assert.equal(db.listCharacters('guild','owner').length,2);throw outer;}),e=>e===outer);assert.deepEqual(db.listCharacters('guild','owner').map(r=>r.name),['Original']);assert.equal(db.db,connection);assert.equal(db._transactionDepth,0);
});
test('original instrumented read and reopened saved rows/schema stable without display writes',t=>{
  const f=fixture(t,{sqlMetrics:true});f.character('Saved',{data:{notes:'Historical'}});const rows=f.db.listCharacters('guild','owner'),connection=f.db.db,before=changes(f.db),reads=[];let time=0;withTurnTrace({clock:()=>++time,sqlRead:ms=>reads.push(ms)},()=>assert.deepEqual(f.db.listCharacters('guild','owner'),rows));assert.deepEqual(reads,[1]);assert.equal(f.db.db,connection);assert.equal(changes(f.db),before);f.reopen();assert.deepEqual(f.db.listCharacters('guild','owner'),rows);assert.equal(f.db.schemaVersion(),460);
});
