import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {handleCanonStatusCommand,handleCanonConflictsCommand,assertCanonReadStore} from '../../src/frameworks/discord/public.js';
import {createCanonReadStore,VeiledDB} from '../../src/frameworks/persistence/public.js';
import {connectDiscordCanonReads} from '../../src/framework-to-framework/discord--persistence/public.js';
function fixture(rows=[],conflicts=[]){const events=[],replies=[],db={listCanon(...args){assert.equal(this,db);events.push(['canon',...args]);return rows;},listCanonConflicts(...args){assert.equal(this,db);events.push(['conflicts',...args]);return conflicts;}},interaction={guildId:'guild',async reply(payload){replies.push(payload);}},store=connectDiscordCanonReads(db);return {db,interaction,store,events,replies};}
test('fixed two-reader contract and original dynamic receiver/return/error behavior retained',()=>{
  for(const value of [null,{}, {listCanon(){}}]){assert.throws(()=>assertCanonReadStore(value),TypeError);assert.throws(()=>createCanonReadStore(value),TypeError);}
  const f=fixture(),result=[];f.db.listCanon=function(...args){assert.equal(this,f.db);assert.deepEqual(args,['g',{includeGM:true,limit:100}]);return result;};assert.equal(f.store.listCanon('g',{includeGM:true,limit:100}),result);assert.ok(Object.isFrozen(f.store));assert.deepEqual(Object.keys(f.store),['listCanon','listCanonConflicts']);const error=new Error('query');f.db.listCanonConflicts=()=>{throw error;};assert.throws(()=>f.store.listCanonConflicts(),e=>e===error);
});
test('status invokes original GM callback once and preserves query/options/empty private reply',async()=>{
  const f=fixture();let calls=0;assert.equal(await handleCanonStatusCommand(f.interaction,{store:f.store,isGm(){calls++;return false;}}),true);assert.equal(calls,1);assert.deepEqual(f.events,[['canon','guild',{includeGM:false,limit:100}]]);assert.deepEqual(f.replies,[{content:'No structured canon entries yet.',ephemeral:true}]);
});
test('exact status and pending-conflict text/GM badges remain private and unmodified',async()=>{
  const rows=[{canon_key:'a',value:'Known',visibility:'party'},{canon_key:'b',value:'Secret',visibility:'gm'}],conflicts=[{id:'1234567890',canon_key:'a',existing_value:'Known',proposed_value:'Proposed'}],before=structuredClone({rows,conflicts}),f=fixture(rows,conflicts);
  await handleCanonStatusCommand(f.interaction,{store:f.store,isGm:()=>true});await handleCanonConflictsCommand(f.interaction,{store:f.store});assert.deepEqual(f.replies,[{content:'**Campaign Canon**\n• `a` = Known\n• `b` = Secret *(GM)*',ephemeral:true},{content:'**Pending Canon Conflicts**\n• `12345678` **a**\n  existing: Known\n  proposed: Proposed',ephemeral:true}]);assert.deepEqual({rows,conflicts},before);
});
test('original1950limit/empty conflict message/read-GM-send errors propagate without retries',async()=>{
  const f=fixture([{canon_key:'long',value:'x'.repeat(2200)}]);await handleCanonStatusCommand(f.interaction,{store:f.store,isGm:()=>true});assert.equal(f.replies[0].content.length,1950);await handleCanonConflictsCommand(f.interaction,{store:f.store});assert.equal(f.replies[1].content,'No pending canon conflicts.');
  const error=new Error('predicate');await assert.rejects(handleCanonStatusCommand(f.interaction,{store:f.store,isGm(){throw error;}}),e=>e===error);let calls=0;f.interaction.reply=async()=>{calls++;throw error;};await assert.rejects(handleCanonConflictsCommand(f.interaction,{store:f.store}),e=>e===error);assert.equal(calls,1);
});
test('actual SQLite read retains original visibility/current/guild and pending-conflict filters without writes',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'veiled-rf06-r57-')),db=new VeiledDB(join(dir,'synthetic.sqlite'),fileURLToPath(new URL('../../sql/schema.sql',import.meta.url)));t.after(()=>{db.close();assert.equal(dirname(dir),resolve(tmpdir()));assert.ok(dir.startsWith(join(resolve(tmpdir()),'veiled-rf06-r57-')));rmSync(dir,{recursive:true,force:true});});for(const guild of ['guild','other'])db.ensureCampaign(guild);
  const insert=db.db.prepare('INSERT INTO canon_events(id,guild_id,canon_key,value,visibility,status) VALUES(?,?,?,?,?,?)');for(const [id,guild,visibility,status]of [['party','guild','party','current'],['secret','guild','gm','current'],['player','guild','player','current'],['old','guild','party','superseded'],['foreign','other','party','current']])insert.run(id,guild,id,id+' value',visibility,status);
  const conflict=db.db.prepare('INSERT INTO canon_conflicts(id,guild_id,canon_key,existing_event_id,proposed_value,status) VALUES(?,?,?,?,?,?)');conflict.run('pending-local','guild','party','party','Pending local','pending');conflict.run('done','guild','party','party','Resolved local','dismissed');conflict.run('foreign-pending','other','foreign','foreign','Foreign pending','pending');
  const before=db.db.prepare('SELECT total_changes() n').get().n,f=fixture(),store=connectDiscordCanonReads(db);await handleCanonStatusCommand(f.interaction,{store,isGm:()=>false});assert.equal(f.replies[0].content,'**Campaign Canon**\n• `party` = party value');await handleCanonStatusCommand(f.interaction,{store,isGm:()=>true});assert.ok(f.replies[1].content.includes('secret value *(GM)*'));assert.ok(f.replies[1].content.includes('player value'));assert.ok(!f.replies[1].content.includes('foreign value'));await handleCanonConflictsCommand(f.interaction,{store});assert.ok(f.replies[2].content.includes('Pending local'));assert.ok(!f.replies[2].content.includes('Resolved local'));assert.ok(!f.replies[2].content.includes('Foreign pending'));assert.equal(db.db.prepare('SELECT total_changes() n').get().n,before);
});
test('root retains conflicts GM guard and all canonical mutation/receipt authority',()=>{
  const s=readFileSync(new URL('../../src/commands.js',import.meta.url),'utf8');assert.match(s,/if\(group==="canon"&&sub==="conflicts"\)\{\s*if\(!isGM\(db,interaction\)\) throw new Error\("GM\/admin permission required\."\);\s*return await handleCanonConflictsCommand/);assert.ok(s.includes('isGm:()=>isGM(db,interaction)'));assert.ok(s.includes('db.proposeCanon('));assert.ok(s.includes('db.resolveCanonConflict('));assert.ok(s.includes('installReceiptCapture'));
});
