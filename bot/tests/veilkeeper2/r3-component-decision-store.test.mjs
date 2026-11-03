import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {openComponentDecisionStore} from '../../src/v2/component-decision-store.js';
import {createDiscordCostDecisions} from '../../src/v2/discord-cost-decisions.js';
test('new native reader restores an observed decision only while its exact prompt remains valid',()=>{
  const store=openComponentDecisionStore(),client=new EventEmitter(),prompt={id:'p',customId:'token',status:'active',decision:'accept',campaignId:'c',sceneId:'s',channelId:'ch',messageId:'notice',ownerUserId:'u',actorId:'pc',actionRef:'a',termsRevision:'1',amount:2,costSlot:'base'},terms={id:'a',revision:'1',ownerUserId:'u',actorId:'pc',campaignId:'c',sceneId:'s',cost:{amount:2,slot:'base'}};
  const make=()=>createDiscordCostDecisions({client,readPrompt:()=>prompt,readActionTerms:()=>terms,decisionStore:store});let reader=make();try{const i={id:'i',client,isButton:()=>true,user:{id:'u',bot:false},guildId:'c',channelId:'ch',message:{id:'notice'},customId:'token'};client.emit('interactionCreate',i);const first=reader.accept(i);reader.close();reader=make();assert.deepEqual(reader.readNative('i'),first);prompt.status='revoked';assert.throws(()=>reader.readNative('i'),/reconciliation/);}finally{reader.close();store.close();}
});
test('observed envelope identity cannot be overwritten by changed evidence',()=>{const s=openComponentDecisionStore();try{s.put({record:{interactionId:'i',principal:'u'},customId:'token'});assert.throws(()=>s.put({record:{interactionId:'i',principal:'other'},customId:'token'}),/Immutable/);}finally{s.close();}});
