import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';
import {ContentIndex,resolveContentRoot} from '../../src/frameworks/content/public.js';

function fixture(t){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'rf02-content-')),root=path.join(base,'content');
  const write=(name,body)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);};
  write('PUBLIC/market.md','# Market\nThe copper market opens at dawn with ordinary traders and painted street signs.');
  write('GM_PRIVATE/truth.md','# Private\nThe copper secret beneath the market belongs only to the GM and is never public.');
  write('PLAYER/PLAYERS/private.md','# Personal\nThe copper memory belongs only to the owner and must not appear in party searches.');
  write('PUBLIC/labelled.md','visibility: gm_private\n# Copper\nAn explicitly labelled private copper clue in a public directory.');
  write('PUBLIC/ignored.json','{"note":"not a Markdown catalog file"}');
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));return {base,root,write};
}
test('relocated constructor preserves relative asset identities, missing reads and Markdown-only indexing',t=>{
  const f=fixture(t),index=new ContentIndex(f.root);assert.equal(index.root,path.resolve(f.root));
  assert.equal(index.read('missing.md'),'');assert.match(index.read('PUBLIC/market.md'),/^# Market/);
  assert.ok(index.chunks.every(c=>!c.file.includes('\\')&&!c.file.endsWith('.json')));
  assert.ok(index.chunks.some(c=>c.id==='PUBLIC/market.md#0'));
});
test('party search excludes directory-private and contradictory labelled content; GM search retains it',t=>{
  const {root}=fixture(t),index=new ContentIndex(root),publicRows=index.search('copper',20,{gm:false});
  assert.deepEqual(publicRows.map(c=>c.file),['PUBLIC/market.md']);assert.equal(index.search('copper',20,{gm:true}).length,4);
});
test('immutable token caches stay instance/audience scoped and seeded tenant prose remains uncached',t=>{
  const {root}=fixture(t),a=new ContentIndex(root),b=new ContentIndex(root);
  a.search('copper',20,{gm:false});assert.equal(a.tokenCacheStats.misses,1);a.search('copper',20,{gm:false});assert.equal(a.tokenCacheStats.hits,1);
  assert.deepEqual(b.tokenCacheStats,{hits:0,misses:0});
  const documents=[{source_path:'PUBLIC/market.md',encoding:'utf8',visibility:'party',body:'# Replacement\nA silver stall replaces the packaged market description for this tenant only.'},
    {source_path:'tenant-secret.md',encoding:'utf8',visibility:'gm',body:'# Hidden\nA silver secret is available only to the GM with the correct tenant source.'}];
  const rows=a.search('silver',20,{gm:false,documents});assert.equal(rows.length,1);assert.match(rows[0].body,/silver stall/);
  assert.equal(b.search('silver',20,{gm:false}).length,0);
});
test('actual root resolver preserves default, empty, relative and absolute CONTENT_ROOT semantics',t=>{
  const {base,root}=fixture(t),cwd=path.join(base,'bot');fs.mkdirSync(cwd);
  assert.equal(resolveContentRoot({cwd,root:''}),root);assert.equal(resolveContentRoot({cwd,root:'../content'}),root);
  assert.equal(resolveContentRoot({cwd,root}),root);
  const url=new URL('../../src/frameworks/content/public.js',import.meta.url).href;
  const code=`const {ContentIndex,resolveContentRoot}=await import(${JSON.stringify(url)});const index=new ContentIndex(resolveContentRoot());console.log(JSON.stringify({root:index.root,files:index.search('copper',20,{gm:false}).map(c=>c.file)}));`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd,env:{...process.env,CONTENT_ROOT:'../content'},encoding:'utf8',timeout:5000,windowsHide:true});
  assert.ifError(result.error);assert.equal(result.status,0);assert.deepEqual(JSON.parse(result.stdout),{root,files:['PUBLIC/market.md']});
});
test('missing root remains an explicit filesystem error rather than a fabricated empty catalog',t=>{
  const {base}=fixture(t);assert.throws(()=>new ContentIndex(path.join(base,'absent')),e=>e.code==='ENOENT');
});
