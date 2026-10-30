import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveCommandRoute} from '../../src/frameworks/discord/command-route.js';
import {resolveCommandRoute as publicResolve} from '../../src/frameworks/discord/public.js';

test('all split roots preserve subcommand and only existing level/combat aliases change family',()=>{
  for(const [root,group] of [['session','session'],['roll','roll'],['level','character'],['combat','encounter'],['character','character'],['encounter','encounter'],['future','future']]){
    const calls=[];
    const result=resolveCommandRoute(`vc-${root}`,{getSubcommand(){calls.push('sub');return 'inspect';},getSubcommandGroup(){throw Error('split roots must not read grouped option');}});
    assert.deepEqual(result,{group,sub:'inspect'});assert.deepEqual(calls,['sub']);
  }
});
test('legacy vc reads group before subcommand and preserves literal group',()=>{
  const calls=[];
  assert.deepEqual(resolveCommandRoute('vc',{getSubcommandGroup(){calls.push('group');return 'combat';},getSubcommand(){calls.push('sub');return 'status';}}),{group:'combat',sub:'status'});
  assert.deepEqual(calls,['group','sub']);
});
test('option errors propagate unchanged without later reads or fallback',()=>{
  const error=new Error('synthetic absent required group');let subCalls=0;
  assert.throws(()=>resolveCommandRoute('vc',{getSubcommandGroup(){throw error;},getSubcommand(){subCalls++;}}),actual=>actual===error);
  assert.equal(subCalls,0);
  assert.throws(()=>resolveCommandRoute('vc-roll',{getSubcommand(){throw error;}}),actual=>actual===error);
});
test('public decoder identity and caller keep guild/name guards before route and receipt replay after it',()=>{
  assert.equal(publicResolve,resolveCommandRoute);
  const source=readFileSync(new URL('../../src/commands.js',import.meta.url),'utf8');
  const body=source.slice(source.indexOf('async function executeCommand('));
  const route=body.indexOf('const {group,sub}=resolveCommandRoute(commandName,interaction.options);');
  assert.ok(route>body.indexOf('if(!interaction.isChatInputCommand()) return false;'));
  assert.ok(route>body.indexOf('if(commandName!=="vc"&&!commandName.startsWith("vc-")) return false;'));
  assert.ok(route>body.indexOf('if(!interaction.guildId)'));
  assert.ok(body.indexOf('await ensurePlayer(db,interaction)')>route);
  assert.ok(body.indexOf('await replayReceiptIfPresent(')>route);
});
