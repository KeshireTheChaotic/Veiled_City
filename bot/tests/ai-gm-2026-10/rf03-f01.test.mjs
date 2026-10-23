import test from 'node:test';
import assert from 'node:assert/strict';
import {dualityRoll,diceSpec,parseDice,gmD20Roll,gmAttackDamage,OnlineSrd,discoverSrdPdf} from '../../src/frameworks/daggerheart/public.js';
const faces=(values)=>{let n=0;return sides=>{assert.ok(n<values.length);const value=values[n++];assert.ok(value<=sides);return value;};};
test('native natural dice remain separate from modifiers and compare natural faces',()=>{
 const r=dualityRoll({modifier:-4,experience:2,advantage:2,disadvantage:1},faces([4,11,5]));
 assert.deepEqual([r.hope,r.fear,r.total,r.duality,r.adv_net],[4,11,18,'Fear',5]);assert.match(r.id,/^[a-f0-9-]{36}$/);
 const critical=dualityRoll({modifier:-9},faces([2,2]));assert.equal(critical.duality,'Critical');assert.equal(critical.total,-5);
 assert.equal(dualityRoll({},faces([10,1])).duality,'Hope');
});
test('cancellation and helper choice preserve existing source arithmetic',()=>{
 const a=dualityRoll({advantage:3,disadvantage:3},faces([7,3]));assert.deepEqual(a.adv_dice,[]);assert.equal(a.total,10);
 const b=dualityRoll({advantage:1,helperDice:[2,6]},faces([9,8,4]));assert.equal(b.adv_net,6);assert.equal(b.total,23);
 assert.throws(()=>dualityRoll({disadvantage:1,helperDice:[6]},()=>{throw Error('must not roll');}),/saved GM ruling/);
});
test('invalid mechanics fail without accepting fabricated faces',()=>{
 assert.throws(()=>dualityRoll({modifier:1.5}),/integer/);assert.throws(()=>dualityRoll({},()=>13),/out of range/);
 assert.deepEqual(diceSpec('2d8-1'),{count:2,sides:8,mod:-1});assert.deepEqual(parseDice('2d8-1',faces([2,7])),{expression:'2d8-1',dice:[2,7],modifier:-1,total:8});
 assert.throws(()=>diceSpec('0d6'));assert.throws(()=>parseDice('1d4',()=>0));
});
test('GM attack/reaction critical and damage remain distinct from action checks',()=>{
 const attack=gmD20Roll({kind:'attack',difficulty:99,modifier:-2},faces([20]));assert.equal(attack.success,true);
 assert.equal(gmD20Roll({kind:'action',difficulty:99},faces([20])).success,false);
 const damage=gmAttackDamage(attack,'2d6+1',faces([3,4]));assert.equal(damage.critical_bonus,12);assert.equal(damage.total,20);
 const miss=gmD20Roll({kind:'attack',difficulty:20,disadvantage:true},faces([19,2]));assert.equal(gmAttackDamage(miss,'2d6',()=>{throw Error('miss must not roll damage')}),null);
 assert.throws(()=>gmD20Roll({difficulty:1,advantage:true,disadvantage:true}));
});
test('SRD reference cache coalesces fetches and never fetches on import/construction',async()=>{
 let calls=0,time=1000,extracts=0;const fetcher=async url=>{calls++;return new Response(url.endsWith('/srd/')?'<a href="/new-srd.pdf">Download SRD</a>':'%PDF-offline-only',{headers:{'content-type':url.endsWith('/srd/')?'text/html':'application/pdf'}});};
 const srd=new OnlineSrd({fetcher,now:()=>time,ttlMs:100,extract:async()=>{extracts++;return [{page:7,text:'Hope and armor rules reference.'}]}});assert.equal(calls,0);
 const [a,b]=await Promise.all([srd.lookup('armor'),srd.lookup('hope')]);assert.equal(calls,2);assert.equal(extracts,1);assert.equal(a.status,'current');assert.equal(b.excerpts[0].page,7);
 assert.equal((await srd.lookup('armor')).status,'cached');assert.equal(calls,2);
 time+=101;srd.fetcher=async()=>{calls++;throw Error('private fake failure')};const stale=await srd.lookup('armor');assert.equal(stale.status,'stale');assert.ok(!JSON.stringify(stale).includes('private fake failure'));const count=calls;await srd.lookup('armor');assert.equal(calls,count);
});
test('SRD retrieval rejects foreign sources and has truthful unavailable result',async()=>{
 assert.throws(()=>discoverSrdPdf('<a href="https://foreign.invalid/srd.pdf">SRD</a>'));
 const srd=new OnlineSrd({fetcher:async()=>{throw Error('offline')}});const result=await srd.lookup('fear');assert.equal(result.status,'unavailable');assert.deepEqual(result.excerpts,[]);assert.equal(result.checked_at,null);
});
