import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/frameworks/persistence/database.js';
import {connectPersistenceOperations} from '../../src/framework-to-framework/operations--persistence/public.js';
import {withTurnTrace} from '../../src/frameworks/operations/public.js';
connectPersistenceOperations();
const schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));
function fixture(t,options){
  const dir=mkdtempSync(join(tmpdir(),'veiled-rf06-r25-')),file=join(dir,'synthetic.sqlite');let db=new VeiledDB(file,schema,options);db.ensureCampaign('guild');db.ensureCampaign('other');
  t.after(()=>{db.close();assert.equal(dirname(dir),resolve(tmpdir()));assert.ok(dir.startsWith(join(resolve(tmpdir()),'veiled-rf06-r25-')));rmSync(dir,{recursive:true,force:true});});
  return {get db(){return db;},reopen(){db.close();db=new VeiledDB(file,schema,options);}};
}
test('campaign lookup preserves every SQLite column, legacy JSON text, row prototype and absent/binding behavior without writes',t=>{
  const {db}=fixture(t);db.db.prepare('UPDATE campaigns SET name=?,party_state_json=?,director_paused=? WHERE guild_id=?').run('Historical name','old non-JSON text',1,'guild');const before=db.db.prepare('SELECT total_changes() n').get().n;
  const actual=db.getCampaign('guild'),original=db.db.prepare('SELECT * FROM campaigns WHERE guild_id=?').get('guild');assert.deepEqual(actual,original);assert.equal(Object.getPrototypeOf(actual),null);assert.equal(actual.party_state_json,'old non-JSON text');assert.equal(actual.director_paused,1);assert.equal(db.getCampaign('other').name,'Veiled City');assert.equal(db.getCampaign('absent'),undefined);assert.equal(db.getCampaign(null),undefined);assert.throws(()=>db.getCampaign(undefined));assert.equal(db.db.prepare('SELECT total_changes() n').get().n,before);
});
test('unchanged configure/channel callers return original campaign rows and retain channel conflict checks',t=>{
  const {db}=fixture(t);const configured=db.configureCampaign('guild',{playChannelId:'play',gmRoleId:'gm',responseMode:'mention'});assert.equal(configured.play_channel_id,'play');assert.equal(configured.gm_role_id,'gm');assert.equal(configured.response_mode,'mention');const channels=db.configureChannels('guild',{rulesChannelId:'rules'});assert.equal(channels.rules_channel_id,'rules');assert.throws(()=>db.configureChannels('guild',{gmLogChannelId:'play'}),/Channel routing conflict/);assert.equal(db.getCampaign('guild').gm_log_channel_id,null);
});
test('unchanged callers still use current getCampaign override with receiver/arguments and result identity',t=>{
  const {db}=fixture(t),calls=[],value={director_paused:1};db.getCampaign=function(...args){assert.equal(this,db);calls.push(args);return value;};assert.equal(db.ensureCampaign('guild'),value);assert.equal(db.isDirectorPaused('guild'),true);assert.deepEqual(calls,[['guild'],['guild']]);value.director_paused=0;assert.equal(db.isDirectorPaused('guild'),false);
});
test('same connection getter sees caller writes across savepoints and rolls back with original transaction coordinator',t=>{
  const {db}=fixture(t),connection=db.db,original=db.getCampaign('guild'),outer=new Error('outer caller rollback'),inner=new Error('nested caller rollback');
  assert.throws(()=>db.transaction(()=>{db.configureCampaign('guild',{playChannelId:'temporary',gmRoleId:'role',responseMode:'mention'});assert.equal(db.getCampaign('guild').play_channel_id,'temporary');assert.throws(()=>db.transaction(()=>{assert.equal(db.changeVeilExposure('guild',2),2);assert.equal(db.getCampaign('guild').veil_exposure,2);throw inner;}),e=>e===inner);assert.equal(db.getCampaign('guild').veil_exposure,original.veil_exposure);assert.equal(db.getCampaign('guild').play_channel_id,'temporary');throw outer;}),e=>e===outer);
  assert.deepEqual(db.getCampaign('guild'),original);assert.equal(db.db,connection);assert.equal(db._transactionDepth,0);
});
test('instrumented original connection remains visible to operational SQL read metrics',t=>{
  const {db}=fixture(t,{sqlMetrics:true}),connection=db.db,reads=[];let time=0;const trace={clock:()=>++time,sqlRead:value=>reads.push(value)};const row=withTurnTrace(trace,()=>db.getCampaign('guild'));assert.equal(row.guild_id,'guild');assert.deepEqual(reads,[1]);assert.equal(db.db,connection);
});
test('campaign reader reopens persisted original row and schema without adding writes',t=>{
  const f=fixture(t);f.db.configureCampaign('guild',{playChannelId:'persisted',gmRoleId:'gm',responseMode:'mention'});const before=f.db.getCampaign('guild');f.reopen();const changes=f.db.db.prepare('SELECT total_changes() n').get().n;assert.deepEqual(f.db.getCampaign('guild'),before);assert.equal(f.db.schemaVersion(),460);assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,changes);
});
