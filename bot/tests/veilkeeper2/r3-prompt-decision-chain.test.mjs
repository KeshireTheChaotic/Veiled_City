import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {openCostPromptStore} from '../../src/v2/cost-prompt-store.js';
import {createDiscordCostDecisions} from '../../src/v2/discord-cost-decisions.js';
function fixture(t){let now=1000;const prompts=openCostPromptStore(':memory:',{clock:()=>now}),client=new EventEmitter(),terms={id:'a',revision:'1',campaignId:'c',sceneId:'s',ownerUserId:'u',actorId:'pc',cost:{amount:2,slot:'base'}};
  const prompt=prompts.issue({campaignId:'c',sceneId:'s',channelId:'ch',ownerUserId:'u',actorId:'pc',actionRef:'a',termsRevision:'1',costSlot:'base',amount:2,expiresAt:2000},{check:()=>{}});
  const reader=createDiscordCostDecisions({client,readPrompt:prompts.readPrompt,readActionTerms:()=>terms});t.after(()=>{reader.close();prompts.close();});
  const interaction={id:'i',client,isButton:()=>true,user:{id:'u',bot:false},guildId:'c',channelId:'ch',message:{id:'message'},customId:prompt.acceptToken};client.emit('interactionCreate',interaction);
  return {prompts,prompt,reader,interaction,terms,expire:()=>now=2001};}
test('durable prompt requires acknowledged delivery before observed owner decision',t=>{const f=fixture(t);assert.throws(()=>f.reader.accept(f.interaction));f.prompts.acknowledge(f.prompt.id,'message',{check:()=>{}});const decision=f.reader.accept(f.interaction);assert.equal(decision.decision,'accept');assert.deepEqual(f.reader.readNative('i'),decision);});
test('revoked, expired or changed terms invalidate already observed decision at consumption',t=>{for(const change of [f=>f.prompts.revoke(f.prompt.id,{check:()=>{}}),f=>f.expire(),f=>f.terms.revision='2']){const f=fixture(t);f.prompts.acknowledge(f.prompt.id,'message',{check:()=>{}});f.reader.accept(f.interaction);change(f);assert.throws(()=>f.reader.readNative('i'));}});
