import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCommands} from '../../src/frameworks/discord/command-definitions.js';
const commands=buildCommands().map(c=>c.toJSON?c.toJSON():c),byName=name=>commands.find(c=>c.name===name);
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
});
test('GM bootstrap, registration, rebind, reopen and death operations travel in the existing roll effect JSON (no schema additions)',()=>{
  const json=stringOption(sub(byName('vc-roll'),'effect'),'json');assert.ok(json.max_length===undefined||json.max_length>=4096,'json option must allow the 4096-char native bound');
});
