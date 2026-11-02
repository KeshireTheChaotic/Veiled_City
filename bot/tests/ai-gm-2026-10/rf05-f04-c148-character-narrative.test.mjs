import assert from 'node:assert/strict';
import test from 'node:test';
import * as legacy from '../../src/character-narrative.js';
import * as character from '../../src/frameworks/character/public.js';

test('Character public and compatibility exports keep the original narrative helpers',()=>{
  for(const name of ['createNarrativeExportPackage','getNarrativeMarkdown','narrativeContext']){
    assert.equal(typeof character[name],'function');
    assert.equal(legacy[name],character[name]);
  }
});

test('narrative export keeps player and GM-private paths and ZIP content',()=>{
  const reads=[];
  const db={getCharacterNarrative(_guild,id,scope){reads.push([id,scope]);return {markdown:`${scope} notes`};}};
  const result=character.createNarrativeExportPackage({db,guildId:'guild-1',character:{id:'pc-1',name:'Mira / Reed'},scope:'all'});
  assert.equal(result.name,'VEILED_CITY_NARRATIVE_Mira_Reed_ALL.zip');
  assert.deepEqual(result.files,['PLAYER/PLAYERS/Mira_Reed.md','GM_PRIVATE/PLAYERS/GM_PRIVATE_Mira_Reed.md']);
  assert.deepEqual(reads,[['pc-1','player'],['pc-1','gm_private']]);
  assert.equal(result.buffer.readUInt32LE(0),0x04034b50);
  assert.ok(result.buffer.includes(Buffer.from('player notes')));
  assert.ok(result.buffer.includes(Buffer.from('gm_private notes')));
});

test('narrative reader preserves scaffold, empty, and bounded context behavior',()=>{
  const db={
    getCharacterNarrative(_guild,_id,scope){return scope==='player'?null:{markdown:'existing private notes'};},
    listCharacterNarratives(_guild,options){
      assert.deepEqual(options,{characterIds:['pc-1'],includeGM:false});
      return [{character_id:'pc-1',scope:'player',markdown:'abcdef',source_filename:'Mira.md',updated_at:42}];
    },
    getCharacter(id){return id==='pc-1'?{name:'Mira'}:null;}
  };
  const characterRecord={id:'pc-1',name:'Mira'};
  assert.match(character.getNarrativeMarkdown(db,'guild-1',characterRecord,'player'),/^# Mira\n/);
  assert.equal(character.getNarrativeMarkdown(db,'guild-1',characterRecord,'player',{scaffoldIfMissing:false}),'');
  assert.equal(character.getNarrativeMarkdown(db,'guild-1',characterRecord,'gm_private'),'existing private notes');
  assert.deepEqual(character.narrativeContext(db,'guild-1',['',null,'pc-1'],{includeGM:false,maxChars:3}),[
    {character_id:'pc-1',character_name:'Mira',scope:'player',markdown:'abc\n...[narrative truncated]',source_filename:'Mira.md',updated_at:42}
  ]);
});
