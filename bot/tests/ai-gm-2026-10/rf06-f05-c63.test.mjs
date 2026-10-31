import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import * as composition from '../../src/application/composition/public.js';
import {initializeRuntimeFrameworks as ownedCoordinator} from '../../src/application/composition/runtime-initializers.js';
const {initializeRuntimeFrameworks}=composition;
const map=JSON.parse(readFileSync(new URL('../../../docs/Implementation_Plans/Framework_Refactor/features/RF06-F05/R63-INITIALIZERS.json',import.meta.url),'utf8'));
const names=map.entries.map(e=>e.name);
const withInitializers=functions=>new Function(...names,'return ('+initializeRuntimeFrameworks.toString()+');')(...functions);
const require=createRequire(import.meta.url),acorn=require('acorn');
test('public coordinator invokes all original53 functions exactly once in original order and ignores returns',()=>{
  assert.equal(initializeRuntimeFrameworks,ownedCoordinator);assert.equal(initializeRuntimeFrameworks.length,0);assert.equal(map.count,53);assert.equal(new Set(names).size,53);const events=[],error=new Error('must not await return');const run=withInitializers(names.map(name=>function(){assert.equal(this,undefined);events.push(name);return {get then(){throw error;}};}));assert.equal(run(),undefined);assert.deepEqual(events,names);
});
test('original synchronous initializer failure aborts without retries, skips or later binding',()=>{
  for(const stop of [0,26,52]){const events=[],error=new Error('initializer '+stop),run=withInitializers(names.map((name,n)=>()=>{events.push(name);if(n===stop)throw error;}));assert.throws(()=>run(),e=>e===error);assert.deepEqual(events,names.slice(0,stop+1));}
});
test('all canonical original provider identities and individual public startup APIs remain available',async()=>{
  for(const entry of map.entries){const module=await import(new URL('../../src/application/composition/'+entry.source.replace(/^\.\//,''),import.meta.url));assert.equal(typeof module[entry.local],'function');assert.equal(composition[entry.name],module[entry.local],entry.name);assert.equal(entry.arguments,0);}
});
test('entrypoint has exactly one public startup coordinator and retains constructors, listeners and login',()=>{
  const s=readFileSync(new URL('../../src/index.js',import.meta.url),'utf8'),root=acorn.parse(s,{ecmaVersion:'latest',sourceType:'module'}),calls=root.body.filter(n=>n.type==='ExpressionStatement'&&n.expression.type==='CallExpression'&&n.expression.callee.type==='Identifier'&&/^initialize/.test(n.expression.callee.name)).map(n=>n.expression.callee.name);assert.deepEqual(calls,['initializeRuntimeFrameworks']);assert.ok(s.includes("import {initializeRuntimeFrameworks} from './application/composition/public.js'"));assert.ok(s.includes('const client=createDiscordClient();'));assert.ok(s.includes('registerClientReadyHandler('));assert.ok(s.includes('registerInteractionHandler('));assert.ok(s.includes('registerShutdownHandlers('));assert.ok(s.includes('await client.login(config.discordToken);'));
});
