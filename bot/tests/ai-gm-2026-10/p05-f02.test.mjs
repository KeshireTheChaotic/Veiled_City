import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {ContentIndex} from '../../src/frameworks/content/content.js';
test('packaged index warms, invalidates by bytes/audience, and never caches tenant documents',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'veiled-cache-'));
 try{fs.writeFileSync(path.join(root,'public.md'),'# Tram\nThe midnight tram passes the station every evening and rings a brass bell.');fs.mkdirSync(path.join(root,'GM_PRIVATE'));fs.writeFileSync(path.join(root,'GM_PRIVATE','secret.md'),'# Secret\nThe midnight tram conceals the smuggler ledger beneath the conductor seat.');
 const index=new ContentIndex(root);index.search('tram',8,{gm:false});assert.deepEqual(index.tokenCacheStats,{hits:0,misses:1});
 index.search('tram',8,{gm:false});assert.deepEqual(index.tokenCacheStats,{hits:1,misses:1});
 index.chunks.find(c=>c.file==='public.md').body+=' A new timetable is posted.';index.search('tram',8,{gm:false});assert.equal(index.tokenCacheStats.misses,2);
 index.search('tram',8,{gm:true});assert.equal(index.tokenCacheStats.misses,4);
 const privateDoc={source_path:'tenant.md',encoding:'utf8',visibility:'gm',body:'# Secret\nA tenant alone knows the midnight tram meeting and its secret password.'};
 index.search('password',8,{gm:true,documents:[privateDoc]});
 const publicResult=index.search('password',8,{gm:false,documents:[]});assert.equal(publicResult.some(r=>r.body.includes('password')),false);
 assert.equal(index.search('smuggler',8,{gm:false}).length,0);
 }finally{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(root,{recursive:true,force:true});}
});
