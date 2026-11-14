import test from 'node:test';import assert from 'node:assert/strict';
import {MessageFlags} from 'discord.js';
import {characterExportFixture} from './helpers/character-export-fixture.mjs';
import {createOwnerCharacterExport} from '../../src/v2/owner-character-export.js';
import {createDiscordCharacterExports} from '../../src/v2/discord-character-exports.js';
import {openInteractionReceipts} from '../../src/v2/interaction-receipts.js';
import {createCanonicalActorReaders} from '../../src/v2/canonical-actor-readers.js';
const files=f=>f.replies.filter(r=>r.files);
test('composed JSON export uses current native resources, private delivery and the actual owner-safe SQL scope',async t=>{
 const f=characterExportFixture(t);assert.equal(f.client.listenerCount('interactionCreate'),10);await f.dispatch(f.event('export'));
 assert.equal(files(f).length,1,JSON.stringify(f.errors));const sent=files(f)[0],payload=JSON.parse(sent.files[0].attachment.toString('utf8'));
 assert.equal(f.replies[0].defer.flags,MessageFlags.Ephemeral);assert.deepEqual(sent.allowedMentions,{parse:[]});assert.equal(sent.files[0].name,'CHARACTER_Mira.json');assert.ok(sent.files[0].attachment.toString('utf8').endsWith('\n'));
 assert.equal(payload.export_meta.schema,'veiled-city-character-export-v3.3.3');assert.equal(payload.resources.hope,3);assert.deepEqual(payload.resources.hp,{current:2,max:6});assert.deepEqual(payload.resources.stress,{current:1,max:6});assert.equal(payload.resources.armor.current,1);
 assert.deepEqual(payload.campaign_knowledge.map(r=>r.key).sort(),['own-character','own-player','party','public']);assert.deepEqual(payload.relationships.map(r=>r.id).sort(),['own-character-link','own-player-link','public-link']);
 assert.equal(JSON.stringify(payload).includes('CANARY'),false);assert.equal(f.inferenceCalls,0);assert.equal(f.root.actionStore.readHope('c','pc').hope,3);assert.equal(f.membershipReads,2);
 assert.deepEqual(f.root.recallStore.readCauses('c'),[]);assert.deepEqual(f.root.knowledgeStore.candidateRefs('c','scene'),[]);
});
test('a lost upload response and cold replay cannot attempt another export',async t=>{
 const f=characterExportFixture(t);await f.dispatch(f.event('export',{failReply:true}));assert.equal(files(f).length,1);f.restart();await f.dispatch(f.event('export'));
 assert.equal(files(f).length,1);assert.equal(f.replies.filter(r=>r.defer).length,1);assert.equal(f.inferenceCalls,0);
});
test('ownership or package input changes during the final membership refresh withhold the attachment',async t=>{
 for(const mutation of ["UPDATE characters SET owner_user_id='v' WHERE id='pc'","UPDATE facts SET content='changed' WHERE id='public'"]){
  const f=characterExportFixture(t);f.memberHook(n=>{if(n===2)f.db.exec(mutation);});await f.dispatch(f.event('export'));assert.equal(files(f).length,0);assert.ok(f.replies.some(r=>r.content?.includes('could not be confirmed')));
 }
});
test('membership revocation, foreign membership and non-private defer never disclose an attachment',async t=>{
 for(const mode of ['revoked','foreign','public']){
  const f=characterExportFixture(t);if(mode==='revoked')f.guild.members.fetch=async()=>{throw new Error('Removed member');};if(mode==='foreign')f.guild.members.fetch=async()=>({id:'u',user:{bot:false},guild:{id:'other'}});
  await f.dispatch(f.event('export',{privateDefer:mode!=='public'}));assert.equal(files(f).length,0);assert.equal(f.inferenceCalls,0);
 }
});
test('ambiguous selection, wrong owner and spoofed transport cannot export; formats and GM scope remain on their own paths',async t=>{
 const f=characterExportFixture(t);f.character('second');
 await f.dispatch(f.event('ambiguous',{query:''}));await f.dispatch(f.event('wrong-owner',{query:'other'}));await f.dispatch(f.event('spoofed',{client:{}}));
 assert.equal(files(f).length,0);
 await f.dispatch(f.event('docx',{format:'docx'}));await f.dispatch(f.event('gm',{sub:'export-gm'}));assert.deepEqual(f.fallback,['docx']);assert.equal(files(f).length,0);
 await f.dispatch(f.event('exact',{query:'pc'}));assert.equal(files(f).length,1);
});
test('prepared exports reject changed inputs and unknown/unowned characters without a healthy fallback',t=>{
 const f=characterExportFixture(t),service=createOwnerCharacterExport({repository:f.repository}),document=service.prepare({campaignId:'c',ownerUserId:'u',characterId:'pc'},{check(){}});
 f.db.exec("UPDATE relationships SET note='changed' WHERE id='public-link'");assert.throws(document.check,/changed/);
 assert.throws(()=>service.prepare({campaignId:'c',ownerUserId:'u',characterId:'other'},{check(){}}),/owner/);
 assert.throws(()=>service.prepare({campaignId:'foreign',ownerUserId:'u',characterId:'pc'},{check(){}}),/owner/);
});
test('unobserved direct calls cannot mint an owner export command',async t=>{
 const f=characterExportFixture(t);f.root.close();const receipts=openInteractionReceipts();t.after(()=>receipts.close());const controller=createDiscordCharacterExports({client:f.client,repository:f.repository,interactionReceipts:receipts,wasObserved:()=>false});t.after(()=>controller.close());
 await assert.rejects(controller.handle(f.event('unobserved')),/Observed/);assert.equal(files(f).length,0);
});
test('reserve, guest and retired exports preserve their status without reviving live actor authority',async t=>{
 const f=characterExportFixture(t),canonical=createCanonicalActorReaders({sceneStore:f.root.sceneStore,actionStore:f.root.actionStore,characterRepository:f.repository});
 for(const status of ['reserve','guest','retired']){
  f.db.prepare('UPDATE characters SET status=? WHERE id=?').run(status,'pc');await f.dispatch(f.event('export-'+status));
  const payload=JSON.parse(files(f).at(-1).files[0].attachment.toString('utf8'));assert.equal(payload.export_meta.status,status);assert.equal(payload.resources.hope,3);
 }
 assert.throws(()=>canonical.readActorSnapshot('c','pc'),/migration or identity/);
});
test('oversize packages and relationship windows hold instead of sending partial or truncated exports',t=>{
 const f=characterExportFixture(t),service=createOwnerCharacterExport({repository:f.repository});
 const character=f.repository.getCharacter('pc');character.data.background='x'.repeat(2_000_001);f.db.prepare('UPDATE characters SET character_json=? WHERE id=?').run(JSON.stringify(character.data),'pc');
 assert.throws(()=>service.prepare({campaignId:'c',ownerUserId:'u',characterId:'pc'},{check(){}}),/Bounded/);
 delete character.data.background;f.db.prepare('UPDATE characters SET character_json=? WHERE id=?').run(JSON.stringify(character.data),'pc');
 f.db.exec('BEGIN');for(let i=0;i<10001;i++)f.relationship('bulk-'+i);f.db.exec('COMMIT');
 assert.throws(()=>service.prepare({campaignId:'c',ownerUserId:'u',characterId:'pc'},{check(){}}),/Complete relationship/);assert.equal(files(f).length,0);
});
test('an ambiguous private relationship recipient holds instead of granting access from a mere mention',async t=>{
 const f=characterExportFixture(t);f.relationship('ambiguous','character');f.db.exec("UPDATE relationships SET source_character_id=NULL,from_type='npc',from_key='clerk',to_type='character',to_key='pc' WHERE id='ambiguous'");
 await f.dispatch(f.event('export'));assert.equal(files(f).length,0);assert.ok(f.replies.some(r=>r.content?.includes('could not be confirmed')));
});
test('another PC on the same account does not donate its private facts or relationship notes to this export',async t=>{
 const f=characterExportFixture(t);f.character('same-account','u','Other owned PC');f.fact('OTHER-OWNED-FACT-CANARY','character',null,'same-account');f.relationship('other-owned','character','OTHER-OWNED-RELATIONSHIP-CANARY');f.db.exec("UPDATE relationships SET source_character_id='same-account' WHERE id='other-owned'");
 await f.dispatch(f.event('export'));assert.equal(files(f).length,1);assert.equal(files(f)[0].files[0].attachment.toString('utf8').includes('CANARY'),false);
});
