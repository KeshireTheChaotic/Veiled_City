import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicationDiscordChannels} from '../../src/frameworks/publication/contracts/discord-channels.js';
import {initializePublicationDiscord} from '../../src/application/composition/publication-discord.js';
import {textChannel,assertGmOnlyChannel,assertPlayerPrivateChannel} from '../../src/frameworks/discord/public.js';
import {sendPlayerPrivate} from '../../src/publishing.js';
const VIEW=1024n,SEND=2048n;
const permissions=(...bits)=>({has:flag=>bits.includes(flag)});
function fixture({unsafe=false,sendError=false,revoke=false}={}){
  const everyone={id:'everyone'},owner={id:'owner'},bot={id:'bot'},sent=[],records=[];let dms=0;
  const grants=new Map([['owner',permissions(VIEW)],['bot',permissions(VIEW,SEND)]]);
  if(unsafe)grants.set('everyone',permissions(VIEW));
  const channel={id:'private',isTextBased:()=>true,permissionsFor:subject=>grants.get(subject.id)||permissions(),permissionOverwrites:{cache:new Map()},
    async send(payload){sent.push(payload);if(sendError)throw Error('synthetic uncertain send');if(revoke)grants.set('everyone',permissions(VIEW));return {id:`message-${sent.length}`,channelId:'private'};}};
  const guild={id:'guild',roles:{everyone,cache:new Map([['everyone',everyone]])},channels:{fetch:async()=>channel},members:{me:bot,cache:new Map([['owner',owner],['bot',bot]]),fetch:async userId=>{assert.equal(userId,'owner');dms++;return {send:async()=>({id:'dm-message',channelId:'dm'})};}}};
  const db={getPlayer:(guildId,userId)=>{assert.equal(guildId,'guild');assert.equal(userId,'owner');return {private_channel_id:'private'};},getCampaign:()=>({}),addMessage:row=>records.push(row)};
  return {guild,db,channel,sent,records,grants,dms:()=>dms};
}

test('fixed Publication channel port fails before composition and rejects replacement after original binding',()=>{
  assert.throws(()=>publicationDiscordChannels.assertGmOnlyChannel({}),e=>e.code==='PUBLICATION_DISCORD_CHANNELS_COMPOSITION');
  initializePublicationDiscord();
  assert.doesNotThrow(()=>publicationDiscordChannels.bind({textChannel,assertGmOnlyChannel,assertPlayerPrivateChannel}));
  assert.throws(()=>publicationDiscordChannels.bind({textChannel:()=>null,assertGmOnlyChannel,assertPlayerPrivateChannel}),/replacement forbidden/);
});
test('original lookup preserves missing, nontext and failed fetch unavailability',async()=>{
  assert.equal(await textChannel({channels:{fetch:()=>{throw Error('must not fetch');}}},null),null);
  assert.equal(await publicationDiscordChannels.textChannel({channels:{fetch:async()=>({isTextBased:()=>false})}},'x'),null);
  assert.equal(await textChannel({channels:{fetch:async()=>{throw Error('synthetic lookup failure');}}},'x'),null);
});
test('private delivery keeps exact receipts, message audience and pre-send validation after composition',async()=>{
  const f=fixture();let checks=0;
  const result=await sendPlayerPrivate({...f,userId:'owner',content:'Owner-only notice',sessionId:'session',characterId:'pc',beforeSend:()=>checks++});
  assert.equal(result.ok,true);assert.equal(result.certainty,'acknowledged');assert.equal(result.via,'private_channel');
  assert.deepEqual(result.messages,[{messageId:'message-1',channelId:'private'}]);assert.deepEqual(f.sent,['Owner-only notice']);assert.equal(f.dms(),0);
  assert.equal(checks,2);assert.equal(f.records.length,1);assert.equal(f.records[0].visibility,'character');assert.equal(f.records[0].subjectCharacterId,'pc');assert.equal(f.records[0].subjectUserId,null);
});
test('unsafe channel before send permits existing private DM fallback without channel exposure',async()=>{
  const f=fixture({unsafe:true});const result=await sendPlayerPrivate({...f,userId:'owner',content:'private',recordMessage:false});
  assert.equal(result.ok,true);assert.equal(result.via,'dm');assert.deepEqual(f.sent,[]);assert.equal(f.dms(),1);
});
test('ambiguous send remains uncertain and never falls through to DM',async()=>{
  const f=fixture({sendError:true});const result=await sendPlayerPrivate({...f,userId:'owner',content:'private'});
  assert.equal(result.ok,false);assert.equal(result.certainty,'uncertain');assert.equal(result.via,'private_channel');assert.equal(f.sent.length,1);assert.equal(f.dms(),0);assert.deepEqual(f.records,[]);
});
test('permission change after first chunk stops remaining chunks without fallback',async()=>{
  const f=fixture({revoke:true});const result=await sendPlayerPrivate({...f,userId:'owner',content:'word '.repeat(900)});
  assert.equal(result.ok,false);assert.equal(result.certainty,'uncertain');assert.equal(result.messages.length,1);assert.equal(f.sent.length,1);assert.equal(f.dms(),0);
});
test('source guard runs before lookup and production startup composes before database/client construction',async()=>{
  let lookups=0;const error=Object.assign(new Error('synthetic source rejection'),{code:'NARRATIVE_PVP'});
  await assert.rejects(sendPlayerPrivate({db:{},guild:{channels:{fetch:async()=>lookups++}},userId:'owner',content:'private',beforeSend:()=>{throw error;}}),actual=>actual===error);
  assert.equal(lookups,0);
  const index=readFileSync(new URL('../../src/index.js',import.meta.url),'utf8'),at=index.indexOf('initializePublicationDiscord();');
  assert.ok(at>=0&&at<index.indexOf('const db=new VeiledDB(')&&at<index.indexOf('const client=new Client('));
  const root=readFileSync(new URL('../../src/publishing.js',import.meta.url),'utf8');assert.doesNotMatch(root,/from ["']\.\/discord\/privacy\.js/);
});
