import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GMService} from '../../src/gm.js';
import {cityContext as publicCityContext} from '../../src/frameworks/world/public.js';
import {cityContext as compatibilityCityContext} from '../../src/city-core.js';

test('GM uses the World public city context without changing its GM-only projection',()=>{
  assert.equal(typeof GMService,'function');
  const source=readFileSync(new URL('../../src/gm.js',import.meta.url),'utf8');
  assert.match(source,/import\s*\{\s*cityContext\s*\}\s*from\s*["']\.\/frameworks\/world\/public\.js["']/);
  assert.doesNotMatch(source,/import\s*\{\s*cityContext\s*\}\s*from\s*["']\.\/city-core\.js["']/);

  const rows=[
    {kind:'district_report',record_key:'civic:1',status:'active',visibility:'gm',data:{note:'established'}},
    {kind:'pvp_private_offer',record_key:'private:1',status:'active',visibility:'gm',data:{note:'excluded'}},
    {kind:'gm_action_ruling',record_key:'action:1',status:'active',visibility:'gm',data:{note:'excluded'}}
  ];
  const calls=[];
  const db={listCityRecords(guild,options){calls.push({guild,options});return rows;}};
  const current=publicCityContext(db,'guild-1','district report');
  const previous=compatibilityCityContext(db,'guild-1','district report');
  assert.deepEqual(current,previous);
  assert.deepEqual(current.records.map(row=>row.record_key),['civic:1']);
  assert.equal(current.authority,'GM_PRIVATE_REFERENCE_NOT_ACTOR_KNOWLEDGE');
  assert.equal(calls.length,4);
  assert.ok(calls.every(call=>call.guild==='guild-1'&&call.options.includeGM===true));
});
