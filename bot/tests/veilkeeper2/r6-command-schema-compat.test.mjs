import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNativeCommands} from '../../src/v2/command-definitions.js';
const commands=buildNativeCommands(),byName=name=>commands.find(c=>c.name===name);
const sub=(cmd,name)=>(cmd?.options??[]).find(o=>o.name===name&&o.type===1);
const stringOption=(s,name)=>(s?.options??[]).find(o=>o.name===name&&o.type===3);
test('the native router only claims session and roll commands that the registered schema defines',()=>{
  const session=byName('vc-session'),roll=byName('vc-roll');assert.ok(session&&roll);
  for(const name of ['start','end','present','absent','arrive','leave'])assert.ok(sub(session,name),`vc-session ${name}`);
  for(const name of ['title','assembly'])assert.ok(stringOption(sub(session,'start'),name),`start ${name}`);
  for(const name of ['present','arrive'])assert.ok(stringOption(sub(session,name),'character'),`${name} character`);
  // absent and leave accept an optional character so an owner with several PCs can choose which one.
  for(const name of ['absent','leave']){assert.ok(stringOption(sub(session,name),'mode'),`${name} mode`);assert.ok(stringOption(sub(session,name),'character'),`${name} character`);}
  assert.ok(stringOption(sub(roll,'effect'),'json'),'vc-roll effect json');
  assert.ok(sub(byName('vc-player'),'private-channel'),'vc-player private-channel (the legacy owner command, now native)');
});
test('every native GM operation is a typed /vc-gm subcommand and /vc-roll stays dice-only',()=>{
  const gm=byName('vc-gm'),roll=byName('vc-roll'),spec={'session-reopen':['session'],'register-character':['character'],'rebind-character':['character'],'bootstrap-preview':['character'],'bootstrap-review':['character','snapshot'],'drafts':[],'publish-draft':['source','fingerprint']};
  for(const [name,opts] of Object.entries(spec)){const s=sub(gm,name);assert.ok(s,`vc-gm ${name}`);assert.deepEqual((s.options??[]).map(o=>o.name).sort(),[...opts].sort());for(const o of s.options??[]){assert.equal(o.type,3);assert.equal(o.required,true);}assert.equal(sub(roll,name),undefined,`vc-roll must not carry ${name}`);}
  for(const name of ['snapshot','fingerprint']){const o=stringOption(sub(gm,name==='snapshot'?'bootstrap-review':'publish-draft'),name);assert.equal(o.min_length,64);assert.equal(o.max_length,64);}
  assert.ok((gm.options??[]).length<=25);
});test('owner death-prompt operations are typed /vc-player subcommands',()=>{
  const player=byName('vc-player'),spec={'death-review':['request'],'death-refresh':['prompt','request'],'death-reconcile':['interaction']};
  for(const [name,opts] of Object.entries(spec)){const s=sub(player,name);assert.ok(s,`vc-player ${name}`);assert.deepEqual((s.options??[]).map(o=>o.name).sort(),opts);for(const o of s.options)assert.equal(o.required,true);assert.equal(sub(byName('vc-roll'),name),undefined);}
});
