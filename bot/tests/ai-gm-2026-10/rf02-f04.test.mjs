import test from 'node:test';import assert from 'node:assert/strict';
import {safeText,safeStem,normalizeNarrativeMarkdown,narrativeRelativePath} from '../../src/frameworks/character/public.js';
import {zipStore} from '../../src/kernel/zip-store.js';
import {createPlayerExportFiles} from '../../src/character-export.js';
import {createNarrativeExportPackage} from '../../src/character-narrative.js';
function entries(bytes){
  const result=[];let offset=0;
  while(bytes.readUInt32LE(offset)===0x04034b50){
    assert.equal(bytes.readUInt16LE(offset+6),0x0800);assert.equal(bytes.readUInt16LE(offset+8),0);
    const length=bytes.readUInt32LE(offset+18),names=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28),start=offset+30+names+extra;
    result.push({name:bytes.subarray(offset+30,offset+30+names).toString('utf8'),body:bytes.subarray(start,start+length)});offset=start+length;
  }
  assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);assert.equal(bytes.readUInt16LE(bytes.length-12),result.length);
  assert.equal(bytes.readUInt32LE(bytes.length-6),offset);return result;
}
test('character filenames preserve Unicode normalization, empty fallback and scoped path identities',()=>{
  assert.equal(safeStem('Élan / North'),'E_lan_North');assert.equal(safeStem('雨'),'Character');assert.equal(safeText(null),'');assert.equal(safeText(0),'0');
  assert.equal(narrativeRelativePath('Élan / North','player'),'PLAYER/PLAYERS/E_lan_North.md');
  assert.equal(narrativeRelativePath('Élan / North','gm_private'),'GM_PRIVATE/PLAYERS/GM_PRIVATE_E_lan_North.md');
  assert.throws(()=>narrativeRelativePath('A','public'),/Narrative scope must be player or gm_private/);
});
test('Markdown normalization preserves text while enforcing the original byte contract',()=>{
  assert.equal(normalizeNarrativeMarkdown('\uFEFF# Entry\r\nA line\r\n  '),'# Entry\nA line\n');
  assert.throws(()=>normalizeNarrativeMarkdown('  \r\n'),/cannot be empty/);
  assert.equal(Buffer.byteLength(normalizeNarrativeMarkdown('x'.repeat(128*1024-1))),128*1024);
  assert.throws(()=>normalizeNarrativeMarkdown('x'.repeat(128*1024)),/128 KiB/);
  assert.throws(()=>normalizeNarrativeMarkdown('雨'.repeat(50000)),/128 KiB/);
});
test('generic ZIP preserves binary and UTF-8 names, stored method, directory offsets and empty archives',()=>{
  const data=Buffer.from([0,1,255,17]),rows=entries(zipStore([['notes/雨.md','new text'],['binary.bin',data]]));
  assert.deepEqual(rows.map(e=>e.name),['notes/雨.md','binary.bin']);assert.equal(rows[0].body.toString(),'new text');assert.deepEqual(rows[1].body,data);
  const empty=zipStore([]);assert.equal(empty.length,22);assert.equal(empty.readUInt16LE(10),0);
});
test('real modified player export calls relocated filename/archive helpers without private field leakage',()=>{
  const calls=[],db={playerFactsFor(...args){calls.push(args);return [];},listRelationships(){return [];}};
  const character={id:'pc-one',name:'Élan North',owner_user_id:'owner-one',status:'active',data:{level:1,background:'Player-authored background',gm_hooks:[{secret:'DO-NOT-EXPORT'}],nested:{visibility:'gm_private',secret:'HIDDEN'}}};
  const before=structuredClone(character),files=createPlayerExportFiles({db,guildId:'guild-one',character,format:'all'});
  assert.deepEqual(files.map(f=>f.name),['CHARACTER_E_lan_North.json','CHARACTER_E_lan_North.md','CHARACTER_E_lan_North.docx']);
  for(const file of files)assert.equal(file.buffer.includes(Buffer.from('DO-NOT-EXPORT')),false);
  const payload=JSON.parse(files[0].buffer);assert.equal(payload.export_meta.schema,'veiled-city-character-export-v3.3.3');assert.equal(payload.gm_hooks,undefined);assert.equal(payload.nested,undefined);
  assert.ok(entries(files[2].buffer).some(e=>e.name==='word/document.xml'));
  assert.deepEqual(character,before);assert.deepEqual(calls,[['guild-one','owner-one',{characterId:'pc-one',limit:200}]]);
});
test('real modified narrative exporter keeps explicit public/private file names and injected reader arguments',()=>{
  const reads=[],character={id:'pc-two',name:'Aster Vale'},db={getCharacterNarrative(guild,id,scope){reads.push([guild,id,scope]);return {markdown:scope==='player'?'Player text':'GM text'};}};
  const result=createNarrativeExportPackage({db,guildId:'guild-two',character,scope:'all'}),rows=entries(result.buffer);
  assert.deepEqual(result.files,['PLAYER/PLAYERS/Aster_Vale.md','GM_PRIVATE/PLAYERS/GM_PRIVATE_Aster_Vale.md']);
  assert.deepEqual(rows.map(r=>r.body.toString()),['Player text','GM text']);assert.deepEqual(reads,[['guild-two','pc-two','player'],['guild-two','pc-two','gm_private']]);
});
