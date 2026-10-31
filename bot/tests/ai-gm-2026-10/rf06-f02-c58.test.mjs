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
function fixture(t,options){const dir=mkdtempSync(join(tmpdir(),'veiled-rf06-r58-')),file=join(dir,'synthetic.sqlite');let db=new VeiledDB(file,schema,options);for(const guild of ['guild','other'])db.ensureCampaign(guild);t.after(()=>{db.close();assert.equal(dirname(dir),resolve(tmpdir()));assert.ok(dir.startsWith(join(resolve(tmpdir()),'veiled-rf06-r58-')));rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},reopen(){db.close();db=new VeiledDB(file,schema,options);},event(id,{guild='guild',key=id,value=id+' value',visibility='party',status='current'}={}){db.db.prepare('INSERT INTO canon_events(id,guild_id,canon_key,value,visibility,status) VALUES(?,?,?,?,?,?)').run(id,guild,key,value,visibility,status);},conflict(id,{guild='guild',key=id,event=null,proposed='Proposed',status='pending',date='2026-01-01'}={}){db.db.prepare('INSERT INTO canon_conflicts(id,guild_id,canon_key,existing_event_id,proposed_value,status,created_at) VALUES(?,?,?,?,?,?,?)').run(id,guild,key,event,proposed,status,date);}};}
const changes=db=>db.db.prepare('SELECT total_changes() n').get().n;
test('canon original current/guild/public-party filters and raw full-GM metadata retained',t=>{
  const f=fixture(t);for(const [id,visibility,status]of [['party','party','current'],['public','public','current'],['gm','gm','current'],['player','player','current'],['character','character','current'],['old','party','superseded']])f.event(id,{visibility,status});f.event('foreign',{guild:'other'});const before=changes(f.db);assert.deepEqual(f.db.listCanon('guild').map(r=>r.id),['party','public']);const rows=f.db.listCanon('guild',{includeGM:true});assert.deepEqual(rows.map(r=>r.id),['character','gm','party','player','public']);assert.equal(Object.getPrototypeOf(rows[0]),null);assert.equal(rows[0].source_type,'gm');assert.deepEqual(f.db.listCanon('missing'),[]);assert.equal(changes(f.db),before);
});
test('canon original unnormalized truthiness and SQLite limit semantics retained',t=>{
  const f=fixture(t);for(let n=0;n<105;n++)f.event('event-'+String(n).padStart(3,'0'));f.event('secret',{visibility:'gm'});assert.equal(f.db.listCanon('guild').length,100);assert.equal(f.db.listCanon('guild',{limit:-1}).length,105);assert.deepEqual(f.db.listCanon('guild',{limit:0}),[]);assert.equal(f.db.listCanon('guild',{limit:2}).length,2);assert.equal(f.db.listCanon('guild',{includeGM:'false',limit:-1}).length,106);assert.throws(()=>f.db.listCanon('guild',{limit:1.5}));assert.throws(()=>f.db.listCanon('guild',null),TypeError);
});
test('pending conflict original guild/status/date ordering and optional left-join raw shape retained',t=>{
  const f=fixture(t);f.event('existing',{value:'Current value'});f.conflict('later',{event:'existing',date:'2099'});f.conflict('earlier',{event:'missing',date:'2000'});f.conflict('resolved',{event:'existing',status:'dismissed'});f.conflict('foreign',{guild:'other'});const before=changes(f.db),rows=f.db.listCanonConflicts('guild');assert.deepEqual(rows.map(r=>r.id),['earlier','later']);assert.equal(rows[0].existing_value,null);assert.equal(rows[1].existing_value,'Current value');assert.equal(rows[1].proposed_value,'Proposed');assert.equal(Object.getPrototypeOf(rows[1]),null);assert.deepEqual(f.db.listCanonConflicts('missing'),[]);assert.equal(changes(f.db),before);
});
test('original options getter order once and failing getter before SQL retained',t=>{
  const f=fixture(t,{sqlMetrics:true}),events=[],options={get includeGM(){events.push('includeGM');return false;},get limit(){events.push('limit');return 100;}};f.db.listCanon('guild',options);assert.deepEqual(events,['includeGM','limit']);const error=new Error('limit getter'),reads=[];withTurnTrace({sqlRead:ms=>reads.push(ms)},()=>assert.throws(()=>f.db.listCanon('guild',{get limit(){throw error;}}),e=>e===error));assert.deepEqual(reads,[]);
});
test('same caller canonical writes and nested/outer rollback remain visible without extra transaction',t=>{
  const f=fixture(t),db=f.db,connection=db.db,outer=new Error('outer'),inner=new Error('inner');f.event('original');assert.throws(()=>db.transaction(()=>{f.event('outer');f.conflict('outer',{event:'outer'});assert.equal(db.listCanon('guild').length,2);assert.equal(db.listCanonConflicts('guild').length,1);assert.throws(()=>db.transaction(()=>{f.event('inner');f.conflict('inner',{event:'inner'});assert.equal(db.listCanon('guild').length,3);throw inner;}),e=>e===inner);assert.equal(db.listCanonConflicts('guild').length,1);throw outer;}),e=>e===outer);assert.deepEqual(db.listCanon('guild').map(r=>r.id),['original']);assert.deepEqual(db.listCanonConflicts('guild'),[]);assert.equal(db.db,connection);assert.equal(db._transactionDepth,0);
});
test('same instrumented connection and reopened raw historical shapes/schema retained without writes',t=>{
  const f=fixture(t,{sqlMetrics:true});f.event('saved');f.conflict('saved',{event:'saved'});const rows=f.db.listCanon('guild'),conflicts=f.db.listCanonConflicts('guild'),connection=f.db.db,before=changes(f.db),reads=[];let time=0;withTurnTrace({clock:()=>++time,sqlRead:ms=>reads.push(ms)},()=>{assert.deepEqual(f.db.listCanon('guild'),rows);assert.deepEqual(f.db.listCanonConflicts('guild'),conflicts);});assert.deepEqual(reads,[1,1]);assert.equal(f.db.db,connection);assert.equal(changes(f.db),before);f.reopen();assert.deepEqual(f.db.listCanon('guild'),rows);assert.deepEqual(f.db.listCanonConflicts('guild'),conflicts);assert.equal(f.db.schemaVersion(),460);
});
