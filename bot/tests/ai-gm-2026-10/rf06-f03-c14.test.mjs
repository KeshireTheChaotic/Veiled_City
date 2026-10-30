import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationDiscordText,publicationDiscordChannels} from '../../src/frameworks/publication/public.js';
import {splitDiscordText,textChannel,assertGmOnlyChannel,assertPlayerPrivateChannel} from '../../src/frameworks/discord/public.js';
import {initializePublicationDiscord} from '../../src/application/composition/publication-discord.js';

test('separate text port fails uncomposed and binds only original splitter without changing channel contract',()=>{
  assert.throws(()=>publicationDiscordText.splitDiscordText('text'),error=>error.code==='PUBLICATION_DISCORD_TEXT_COMPOSITION');
  assert.equal(initializePublicationDiscord(),publicationDiscordChannels);
  assert.doesNotThrow(()=>publicationDiscordChannels.bind({textChannel,assertGmOnlyChannel,assertPlayerPrivateChannel}));
  assert.doesNotThrow(()=>publicationDiscordText.bind({splitDiscordText}));
  assert.throws(()=>publicationDiscordText.bind({splitDiscordText:()=>['replacement']}),/replacement forbidden/);
});
test('original default splitter output retained for scalar, empty, Unicode and mention-bearing publication text',()=>{
  for(const value of [null,undefined,0,'','Mara sees the lamp.','A message for <@123456789> '+'rain ☔ '.repeat(700),'line one\n'.repeat(600)]){
    const expected=splitDiscordText(value),actual=publicationDiscordText.splitDiscordText(value);assert.deepEqual(actual,expected);assert.ok(actual.every(part=>part.length<=1900));assert.equal(actual.join(''),String(value??''));
  }
});
test('original fenced Markdown behavior and explicit nondefault limits are forwarded unchanged',()=>{
  for(const [value,limit]of [['```text\n'+'signal '.repeat(120)+'\n```',160],['note '.repeat(80),101],['short',200]]){
    const expected=splitDiscordText(value,limit);assert.deepEqual(publicationDiscordText.splitDiscordText(value,limit),expected);assert.ok(expected.every(part=>part.length<=limit));
  }
});
test('invalid limits retain original RangeError without changing validation policy',()=>{
  for(const limit of [0,-2,1.5,NaN,Infinity])assert.throws(()=>publicationDiscordText.splitDiscordText('text',limit),error=>error instanceof RangeError&&error.message==='Discord chunk limit must be a positive integer.');
});
