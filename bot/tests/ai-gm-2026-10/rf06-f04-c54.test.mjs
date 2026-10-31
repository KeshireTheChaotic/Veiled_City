import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {handleCharacterListCommand,assertCharacterListStore} from '../../src/frameworks/discord/public.js';
import {createCharacterListStore,VeiledDB} from '../../src/frameworks/persistence/public.js';
import {connectDiscordCharacterList} from '../../src/framework-to-framework/discord--persistence/public.js';
function fixture(rows=[]){const events=[],replies=[],db={listCharacters(...args){assert.equal(this,db);events.push(args);return rows;}},interaction={guildId:'guild',user:{id:'owner'},async reply(payload){replies.push(payload);}};return {db,interaction,events,replies,store:connectDiscordCharacterList(db)};}
test('one-method contract rejects incomplete sources and retains dynamic original receiver/results/errors',()=>{
  for(const value of [null,{}, {listCharacters:1}]){assert.throws(()=>createCharacterListStore(value),TypeError);assert.throws(()=>assertCharacterListStore(value),TypeError);}
  const f=fixture(),sentinel=[];f.db.listCharacters=function(...args){assert.equal(this,f.db);assert.deepEqual(args,['g','u',{includeClosed:true}]);return sentinel;};assert.equal(f.store.listCharacters('g','u',{includeClosed:true}),sentinel);assert.ok(Object.isFrozen(f.store));assert.deepEqual(Object.keys(f.store),['listCharacters']);
  const error=new Error('reader');f.db.listCharacters=()=>{throw error;};assert.throws(()=>f.store.listCharacters(),e=>e===error);
});
test('original guild/user/includeClosed query and exact empty private reply retained',async()=>{
  const f=fixture();assert.equal(await handleCharacterListCommand(f.interaction,{store:f.store}),true);assert.deepEqual(f.events,[['guild','owner',{includeClosed:true}]]);assert.deepEqual(f.replies,[{content:'You have no characters yet.',ephemeral:true}]);
});
test('original order/status/guest/raw markdown output remains private and unmodified',async()=>{
  const rows=[{name:'Mara',status:'active',is_guest:0},{name:'**Guest**',status:'guest',is_guest:1},{name:'Retired',status:'retired'}],before=structuredClone(rows),f=fixture(rows);
  await handleCharacterListCommand(f.interaction,{store:f.store});assert.deepEqual(f.replies,[{content:'• **Mara** — active\n• ****Guest**** — guest / guest\n• **Retired** — retired',ephemeral:true}]);assert.deepEqual(rows,before);
});
test('original read and async reply errors propagate unchanged with no retry',async()=>{
  const f=fixture(),error=new Error('read');f.db.listCharacters=()=>{throw error;};await assert.rejects(handleCharacterListCommand(f.interaction,{store:f.store}),e=>e===error);assert.deepEqual(f.replies,[]);
  let calls=0;f.db.listCharacters=()=>[];f.interaction.reply=async()=>{calls++;throw error;};await assert.rejects(handleCharacterListCommand(f.interaction,{store:f.store}),e=>e===error);assert.equal(calls,1);
});
test('actual SQLite command includes own closed characters and excludes other owner/guild without writes',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'veiled-rf06-r54-')),db=new VeiledDB(join(dir,'synthetic.sqlite'),fileURLToPath(new URL('../../sql/schema.sql',import.meta.url)));
  t.after(()=>{db.close();assert.equal(dirname(dir),resolve(tmpdir()));assert.ok(dir.startsWith(join(resolve(tmpdir()),'veiled-rf06-r54-')));rmSync(dir,{recursive:true,force:true});});
  for(const guild of ['guild','other']){db.ensureCampaign(guild);db.upsertPlayer(guild,'owner','Owner');db.upsertPlayer(guild,'other-owner','Other');}
  db.createCharacter('guild','owner','Own active');const retired=db.createCharacter('guild','owner','Own closed');db.db.prepare('UPDATE characters SET status=? WHERE id=?').run('retired',retired.id);db.createCharacter('guild','other-owner','Foreign owner');db.createCharacter('other','owner','Foreign guild');
  const before=db.db.prepare('SELECT total_changes() n').get().n,f=fixture();await handleCharacterListCommand(f.interaction,{store:connectDiscordCharacterList(db)});assert.ok(f.replies[0].content.includes('Own active'));assert.ok(f.replies[0].content.includes('Own closed'));assert.ok(!f.replies[0].content.includes('Foreign'));assert.equal(f.replies[0].ephemeral,true);assert.equal(db.db.prepare('SELECT total_changes() n').get().n,before);
});
test('root route still composes the view inside unchanged command receipt workflow',()=>{
  const s=readFileSync(new URL('../../src/commands.js',import.meta.url),'utf8');assert.ok(s.includes('handleCharacterListCommand(interaction,{store:connectDiscordCharacterList(db)})'));assert.ok(s.includes('replayReceiptIfPresent'));assert.ok(s.includes('installReceiptCapture'));assert.ok(s.includes('await ensurePlayer(db,interaction)'));
});
