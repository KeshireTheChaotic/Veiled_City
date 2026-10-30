import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateEphemeralReplies} from '../../src/frameworks/discord/reply-options.js';
import {translateEphemeralReplies as publicTranslate} from '../../src/frameworks/discord/public.js';

test('public function identity and historical command export preserved',()=>{
  assert.equal(publicTranslate,translateEphemeralReplies);
  const root=readFileSync(new URL('../../src/commands.js',import.meta.url),'utf8');
  assert.match(root,/export \{translateEphemeralReplies\} from '\.\/frameworks\/discord\/public\.js'/);
  assert.doesNotMatch(root,/export function translateEphemeralReplies|\bMessageFlags\s*[,\n]/);
});
test('all reply methods convert ephemeral flag once and preserve original this/result identity',async()=>{
  const calls=[],result=Promise.resolve({id:'message'}),interaction={};
  for(const name of ['reply','deferReply','followUp'])interaction[name]=function(payload){assert.equal(this,interaction);calls.push([name,payload]);return result;};
  assert.equal(translateEphemeralReplies(interaction),interaction);const wrapped=interaction.reply;
  translateEphemeralReplies(interaction);assert.equal(interaction.reply,wrapped);
  for(const name of ['reply','deferReply','followUp'])assert.equal(interaction[name]({content:'secret',ephemeral:true,flags:4}),result);
  assert.deepEqual(calls.map(([name,payload])=>[name,payload]),['reply','deferReply','followUp'].map(name=>[name,{content:'secret',flags:68}]));
  await result;
});
test('false removes legacy option but keeps existing flags without implicit mutation',()=>{
  let actual;const interaction={reply:payload=>{actual=payload;}};translateEphemeralReplies(interaction);
  const payload={content:'reply',ephemeral:false,flags:16};interaction.reply(payload);
  assert.deepEqual(actual,{content:'reply',flags:16});assert.deepEqual(payload,{content:'reply',ephemeral:false,flags:16});
});
test('unmarked objects, strings and null pass through with exact identity',()=>{
  const calls=[],interaction={reply:payload=>calls.push(payload)};translateEphemeralReplies(interaction);
  const object={content:'plain'};for(const value of [object,'plain',null])interaction.reply(value);
  assert.equal(calls[0],object);assert.equal(calls[1],'plain');assert.equal(calls[2],null);
});
test('synchronous throws and rejected promises preserve exact error identity',async()=>{
  const error=new Error('synthetic reply failure'),interaction={reply(){throw error;},followUp(){return Promise.reject(error);}};
  translateEphemeralReplies(interaction);
  assert.throws(()=>interaction.reply({ephemeral:true}),actual=>actual===error);
  await assert.rejects(interaction.followUp({ephemeral:true}),actual=>actual===error);
});
test('partial/missing interaction methods retain existing no-op behavior',()=>{
  assert.equal(translateEphemeralReplies(null),null);assert.equal(translateEphemeralReplies(undefined),undefined);
  const interaction={reply:'unavailable'};assert.equal(translateEphemeralReplies(interaction),interaction);assert.equal(interaction.reply,'unavailable');
});
