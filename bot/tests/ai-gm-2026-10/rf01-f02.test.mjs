import test from 'node:test';
import assert from 'node:assert/strict';
import {connectOpeningNarrative} from '../../src/framework-to-framework/narrative--session/public.js';
import {connectPublicationTransport} from '../../src/framework-to-framework/discord--publication/public.js';
import {createOpeningAuthoringPort} from '../../src/frameworks/session/public.js';
import {createPublicationTransportPort} from '../../src/frameworks/publication/public.js';

test('opening interface preserves the existing author receiver, exact audience/source options and result',()=>{
  let calls=0,checks=0;const scope={mode:'private',actorUserId:'owner-a',actorCharacterId:'pc-a'},
    options={assertCurrent:()=>checks++,source:'native-source',revision:'revision-a'},answer={provisional:true};
  const author={marker:'specific-author',authorAssemblyScene(...args){calls++;assert.equal(this.marker,'specific-author');
    assert.deepEqual(args,['guild','session',scope,options]);assert.equal(args[2],scope);assert.equal(args[3],options);args[3].assertCurrent();return answer;}};
  const port=connectOpeningNarrative(author);assert.equal(calls,0);
  assert.equal(port.authorAssemblyScene('guild','session',scope,options),answer);assert.equal(calls,1);assert.equal(checks,1);
});
test('transport interface passes exact private envelope and acknowledged receipt without making delivery decisions',async()=>{
  const row={id:'part-a',guild_id:'guild',turn_id:'turn-a',visibility:'character',target_user_id:'owner-a',target_character_id:'pc-a',
    payload:'owner-private placeholder',payload_hash:'exact-hash',channel_id:'private-channel',source:'native-source'},receipt={messageId:'ack-a',channelId:'private-channel'};
  let calls=0;const promise=Promise.resolve(receipt),port=connectPublicationTransport(actual=>{calls++;assert.equal(actual,row);return promise;});
  assert.equal(calls,0);assert.equal(port(row),promise);assert.equal(await promise,receipt);assert.equal(calls,1);
});
test('transport uncertainty and provider/native errors keep identity and never trigger retries',async()=>{
  let calls=0;const uncertain=Object.assign(new Error('unknown send'),{deliveryCertainty:'uncertain'}),port=connectPublicationTransport(()=>{calls++;throw uncertain;});
  assert.throws(()=>port({}),error=>error===uncertain);assert.equal(calls,1);
  const stale=Object.assign(new Error('source stale'),{code:'OPENING_INPUT_CHANGED'}),author=connectOpeningNarrative({authorAssemblyScene:()=>Promise.reject(stale)});
  await assert.rejects(author.authorAssemblyScene(),error=>error===stale);
});
test('missing capabilities fail on composition before an operation can execute',()=>{
  assert.throws(()=>createOpeningAuthoringPort({}),TypeError);assert.throws(()=>createPublicationTransportPort(null),TypeError);
  assert.throws(()=>connectOpeningNarrative(null),TypeError);assert.throws(()=>connectPublicationTransport({send(){}}),TypeError);
});
test('independently composed transports have no shared process state',()=>{
  const counts={a:0,b:0},a=connectPublicationTransport(()=>++counts.a),b=connectPublicationTransport(()=>++counts.b);
  assert.equal(a({}),1);assert.equal(a({}),2);assert.equal(b({}),1);assert.deepEqual(counts,{a:2,b:1});
});
