import test from 'node:test';import assert from 'node:assert/strict';
import {PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {DatabaseSync} from 'node:sqlite';import {join} from 'node:path';
import {createGmCharacterExport} from '../../src/v2/gm-character-export.js';
import {gmCharacterExportFixture} from './helpers/gm-character-export-fixture.mjs';
import {openInteractionReceipts} from '../../src/v2/interaction-receipts.js';
const attachments=f=>f.replies.filter(r=>r.files).flatMap(r=>r.files);
test('observed configured GM receives three private legacy-schema JSON exports without effects or inference',async t=>{
 const f=gmCharacterExportFixture(t);await f.dispatch(f.event('gm-export'));const files=attachments(f);assert.deepEqual(files.map(x=>x.name),['GM_HOOKS_Mira.json','GM_PRIVATE_Mira.json','GM_CANON_Mira.json']);
 const [hooks,priv,canon]=files.map(x=>JSON.parse(x.attachment.toString()));assert.ok(files.every(x=>x.attachment.toString().endsWith('\n')));
 assert.equal(hooks.export_meta.schema,'veiled-city-gm-hooks-v3.3.3');assert.equal(hooks.imported_gm_hooks[0].premise,'GM imported hook');assert.equal(hooks.imported_gm_hooks[0].status,'resolved');
 assert.equal(priv.export_meta.visibility,'gm_private');assert.ok(priv.private_facts.some(x=>x.content==='GM-FACT-CANARY'));assert.equal(priv.private_clocks[0].value,2);assert.equal(priv.private_threads[0].notes,'GM thread');assert.equal(priv.private_references[0].summary,'GM reference');assert.ok(priv.relationships.some(x=>x.id==='GM-RELATIONSHIP-CANARY'));
 assert.deepEqual(canon.canon.map(x=>x.key),['mira.secret']);assert.equal(canon.pending_conflicts[0].existing_value,'Stored canon');assert.equal(canon.canon_proposals[0].status,'pending');assert.equal(f.gmReads,2);
 assert.equal(f.replies[0].defer.flags,64);assert.deepEqual(f.replies.find(r=>r.files).allowedMentions,{parse:[]});assert.equal(f.inferenceCalls,0);assert.equal(f.root.actionStore.readHope('c','pc').hope,3);
 assert.equal(f.db.prepare("SELECT status FROM canon_proposals WHERE id='proposal'").get().status,'pending');assert.equal(f.client.listenerCount('interactionCreate'),10);
 assert.deepEqual(f.root.recallStore.readCauses('c'),[]);assert.deepEqual(f.root.knowledgeStore.candidateRefs('c','scene'),[]);
});
test('cached administrator permissions do not replace configured current GM membership',async t=>{
 const f=gmCharacterExportFixture(t);f.member.roles.cache.clear();f.member.permissions=new PermissionsBitField(P.Administrator);await f.dispatch(f.event('not-gm',{member:{permissions:new PermissionsBitField(P.Administrator)}}));assert.equal(attachments(f).length,0);assert.ok(f.errors.some(e=>/Configured current/.test(e.message)));
 const journal=openInteractionReceipts(join(f.directory,'interactions.sqlite'));try{const receipt=journal.read('not-gm');assert.equal(receipt.processing,'held');assert.equal(receipt.hold,'source');assert.equal(receipt.reply,'delivered');}finally{journal.close();}assert.ok(f.replies.some(r=>r.id==='not-gm'&&r.content?.includes('could not be confirmed')));
});
test('fresh role loss, foreign member and nonprivate acknowledgement suppress GM files',async t=>{
 const f=gmCharacterExportFixture(t);f.gmHook(n=>{if(n===2)f.member.roles.cache.clear();});await f.dispatch(f.event('revoked'));assert.equal(attachments(f).length,0);
 f.gmHook(null);f.member.roles.cache.set('gm-role',{});f.member.guild.id='foreign';await f.dispatch(f.event('foreign'));assert.equal(attachments(f).length,0);
 f.member.guild.id='c';await f.dispatch(f.event('public-defer',{privateDefer:false}));assert.equal(attachments(f).length,0);
});
test('input changes during refreshed GM membership suppress an already prepared package',async t=>{
 const f=gmCharacterExportFixture(t);f.gmHook(n=>{if(n===2)f.db.exec("UPDATE facts SET content='changed' WHERE id='GM-FACT-CANARY'");});await f.dispatch(f.event('source-race'));assert.equal(attachments(f).length,0);assert.ok(f.errors.some(e=>/source changed/.test(e.message)));
});
test('lost GM upload response has one attempt across process restart and replay',async t=>{
 const f=gmCharacterExportFixture(t);await f.dispatch(f.event('uncertain',{failReply:true}));assert.equal(attachments(f).length,3);f.restart();await f.dispatch(f.event('uncertain'));assert.equal(attachments(f).length,3);
});
test('unmaterialized legacy canon suggestions hold without backfill, acceptance or lost source',async t=>{
 const f=gmCharacterExportFixture(t);f.db.exec(`INSERT INTO character_gm_hooks(id,guild_id,character_id,hook_key,hook_type,premise,payload_json) VALUES('suggestion','c','pc','canon.mira.secret','canon_suggestion','Stored canon','{}')`);
 const before=f.db.prepare('SELECT count(*) n FROM canon_proposals').get().n;await f.dispatch(f.event('needs-migration'));assert.equal(attachments(f).length,0);assert.equal(f.db.prepare('SELECT count(*) n FROM canon_proposals').get().n,before);assert.equal(f.db.prepare("SELECT status FROM character_gm_hooks WHERE id='suggestion'").get().status,'active');
 f.db.exec("INSERT INTO canon_proposals(id,guild_id,character_id,canon_key,proposed_value,status) VALUES('materialized','c','pc','mira.secret','Stored canon','pending')");await f.dispatch(f.event('reviewed-existing-row'));const canon=JSON.parse(attachments(f)[2].attachment);assert.equal(canon.canon_proposals.find(x=>x.id==='materialized').status,'pending');
});
test('exact campaign character selection refuses ambiguous names while preserving explicit IDs',async t=>{
 const f=gmCharacterExportFixture(t);
 f.character('same','someone','Mira');await f.dispatch(f.event('ambiguous',{query:'Mira'}));assert.equal(attachments(f).length,0);await f.dispatch(f.event('id',{query:'pc'}));assert.equal(attachments(f).length,3);
});
test('private readers reject foreign canon ancestry, duplicate current canon and corrupt hook payload',t=>{
 const f=gmCharacterExportFixture(t),read=()=>f.repository.readGmCharacterExportFacets('c','pc');assert.throws(()=>f.repository.readGmCharacterExportFacets('foreign','pc'),/Campaign/);
 f.db.exec("UPDATE canon_events SET guild_id='foreign' WHERE id='canon'");assert.throws(read,/source campaign/);f.db.exec("UPDATE canon_events SET guild_id='c' WHERE id='canon';UPDATE canon_events SET canon_key='mira.secret' WHERE id='unrelated'");assert.throws(read,/Ambiguous/);
 f.db.exec("UPDATE canon_events SET canon_key='other.secret' WHERE id='unrelated';UPDATE character_gm_hooks SET payload_json='null' WHERE id='hook'");assert.throws(read,/Explicit/);
});
test('prepared GM exports recheck authority, character inputs and package bounds',t=>{
 const f=gmCharacterExportFixture(t);let authorized=true;const service=createGmCharacterExport({repository:f.repository}),check=()=>{if(!authorized)throw new Error('revoked');};const doc=service.prepare({campaignId:'c',characterId:'pc'},{check});authorized=false;assert.throws(doc.check,/revoked/);authorized=true;
 f.db.exec("UPDATE characters SET character_json=json_set(character_json,'$.background','Changed background') WHERE id='pc'");assert.throws(doc.check,/source changed/);
 f.db.exec("UPDATE characters SET character_json=json_set(character_json,'$.background',printf('%2100000s','x')) WHERE id='pc'");assert.throws(()=>service.prepare({campaignId:'c',characterId:'pc'},{check}),/Bounded/);
});
test('GM facets share a coherent WAL validation snapshot and never select unowned account-wide rows',t=>{
 const f=gmCharacterExportFixture(t),other=new DatabaseSync(join(f.directory,'legacy.sqlite'));try{
 f.repository.withValidationSnapshot(()=>{assert.equal(f.repository.readGmCharacterExportFacets('c','pc').clocks[0].value,2);other.exec("UPDATE clocks SET value=3 WHERE guild_id='c'");assert.equal(f.repository.readGmCharacterExportFacets('c','pc').clocks[0].value,2);});
 assert.equal(f.repository.readGmCharacterExportFacets('c','pc').clocks[0].value,3);
 f.db.exec("UPDATE characters SET owner_user_id=NULL WHERE id='pc';INSERT INTO facts VALUES('unbound','c','fact','unbound','Unbound account private','gm','',NULL,NULL,'gm','2026-11-13',0)");assert.equal(f.repository.readGmCharacterExportFacets('c','pc').facts.some(x=>x.id==='unbound'),false);
 }finally{other.close();}
});
test('missing private source tables hold without silently creating schema',t=>{
 const f=gmCharacterExportFixture(t);f.db.exec('DROP TABLE reference_entries');assert.throws(()=>f.repository.readGmCharacterExportFacets('c','pc'),/no such table/);assert.equal(f.db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='reference_entries'").get().n,0);
});
test('GM source window overflow holds instead of truncating private records',t=>{
 const f=gmCharacterExportFixture(t);for(let i=0;i<100;i++)f.db.prepare("INSERT INTO canon_proposals(id,guild_id,character_id,canon_key,proposed_value) VALUES(?,'c','pc',?,'value')").run('more-'+i,'key-'+i);assert.throws(()=>f.repository.readGmCharacterExportFacets('c','pc'),/Complete/);
});
