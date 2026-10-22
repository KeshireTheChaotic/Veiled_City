import test from 'node:test';
import assert from 'node:assert/strict';
import {assemblyHookSources} from '../../src/assembly-context.js';

test('owner hook projection excludes GM fields and nested private source objects',()=>{
  const pc={id:'pc-1',guild_id:'g',data:{
    entry_hooks:['The rain keeps time against the glass.',
      {text:'OWNER_PRIVATE_CANARY',visibility:'gm_private'},
      {text:'HIDDEN_CANARY',hidden:true}],
    gm_hooks:['GM_FIELD_CANARY'],
    goals:['Find the missing key.'],
    background:[{text:'GM_AUDIENCE_CANARY',audience:'gm'}],
    obligation:[{text:'A promise to return.',visibility:'party',private_note:'not projected'}],
  }};
  const db={getCharacter:id=>id==='pc-1'?pc:null,
    getCharacterNarrative:()=>({id:'n1',scope:'player',markdown:'A public-facing player narrative.'})};
  const sources=assemblyHookSources(db,'g','pc-1');
  const text=sources.map(source=>source.text).join('\n');
  assert.match(text,/The rain keeps time/);
  assert.match(text,/Find the missing key/);
  assert.match(text,/A promise to return/);
  assert.match(text,/player narrative/);
  for(const canary of ['OWNER_PRIVATE_CANARY','HIDDEN_CANARY','GM_FIELD_CANARY','GM_AUDIENCE_CANARY'])
    assert.ok(!text.includes(canary),`unexpected owner projection: ${canary}`);
  assert.ok(sources.every(source=>source.kind==='owner_character_material'||source.kind==='player_narrative'));
});
