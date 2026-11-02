import assert from 'node:assert/strict';
import test from 'node:test';
import * as legacy from '../../src/character-export.js';
import * as character from '../../src/frameworks/character/public.js';

const exportsToPreserve=['buildGmCanonExport','buildGmHooksExport','buildGmPrivateExport','buildPlayerExport',
  'createGmExportFiles','createPlayerExportFiles','gmCanonMarkdown','gmHooksMarkdown','gmPrivateMarkdown',
  'markdownToDocx','playerCharacterProjection','playerMarkdown'];

test('Character public and compatibility exports retain the existing serializer API',()=>{
  for(const name of exportsToPreserve){
    assert.equal(typeof character[name],'function');
    assert.equal(legacy[name],character[name]);
  }
});

test('player export files exclude private source fields while GM hooks keep their private audience',()=>{
  const reads=[];
  const db={
    playerFactsFor(...args){reads.push(['facts',...args]);return [];},
    listRelationships(...args){reads.push(['relationships',...args]);return [];},
    listCharacterGmHooks(...args){reads.push(['hooks',...args]);return [{hook_key:'hk-1',title:'Hidden motive'}];}
  };
  const pc={id:'pc-1',name:'Neri',owner_user_id:'owner-1',status:'active',data:{background:'Player-authored harbor story',
    gm_hooks:['Secret GM-only hook'],nested:{visibility:'gm_private',content:'Secret private source'},resources:{hope:3}}};
  const before=structuredClone(pc);
  const files=character.createPlayerExportFiles({db,guildId:'guild-1',character:pc,format:'all'});
  assert.deepEqual(files.map(file=>file.name),['CHARACTER_Neri.json','CHARACTER_Neri.md','CHARACTER_Neri.docx']);
  const json=JSON.parse(files[0].buffer.toString('utf8'));
  assert.equal(json.resources.hope,3);
  assert.equal(json.background,'Player-authored harbor story');
  assert.equal(json.gm_hooks,undefined);
  assert.equal(json.nested,undefined);
  for(const file of files)assert.equal(file.buffer.includes(Buffer.from('Secret')),false);
  assert.match(files[1].buffer.toString('utf8'),/Player-authored harbor story/);
  assert.ok(files[2].buffer.includes(Buffer.from('word/document.xml')));
  assert.deepEqual(pc,before);
  assert.deepEqual(reads,[
    ['facts','guild-1','owner-1',{characterId:'pc-1',limit:200}],
    ['relationships','guild-1',{includeGM:false,characterId:'pc-1',userId:'owner-1'}]
  ]);
  assert.deepEqual(character.buildGmHooksExport(pc,db,'guild-1').gm_hooks,['Secret GM-only hook']);
});
