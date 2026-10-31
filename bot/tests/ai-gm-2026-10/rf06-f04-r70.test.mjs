import assert from 'node:assert/strict';
import test from 'node:test';
import {handleCityCommand} from '../../src/city-commands.js';

function cityInteraction(deferred){
  const interaction={
    guildId:'guild-1',deferred,memberPermissions:{has:()=>true},
    options:{getSubcommand:()=> 'events',getString:name=>name==='query'?'market district':null},
    reply:async payload=>{interaction.replied=payload;},
    editReply:async payload=>{interaction.edited=payload;}
  };
  return interaction;
}

function assertCityAttachment(payload,result){
  assert.equal(payload.content,'City events complete. Civic records are GM-private; no PC actions or mechanics were applied.');
  assert.equal(payload.files.length,1);
  assert.equal(payload.files[0].name,'city-state.json');
  assert.ok(Buffer.isBuffer(payload.files[0].attachment));
  assert.deepEqual(JSON.parse(payload.files[0].attachment.toString('utf8')),result);
}

test('city command uses the Discord attachment interface and preserves immediate ephemeral reply',async()=>{
  const result=[{id:'event-1',name:'Lantern market'}],interaction=cityInteraction(false);
  const db={listWorldEvents:(...args)=>{interaction.queryArgs=args;return result;}};

  assert.equal(await handleCityCommand(interaction,{db}),true);
  assert.deepEqual(interaction.queryArgs,['guild-1',{includeGM:true,query:'market district'}]);
  assert.equal(interaction.edited,undefined);
  assert.equal(interaction.replied.ephemeral,true);
  assertCityAttachment(interaction.replied,result);
});

test('city command preserves the original deferred edit reply payload',async()=>{
  const result=[{id:'event-2',name:'Canal inspection'}],interaction=cityInteraction(true);
  const db={listWorldEvents:(...args)=>{interaction.queryArgs=args;return result;}};

  assert.equal(await handleCityCommand(interaction,{db}),true);
  assert.deepEqual(interaction.queryArgs,['guild-1',{includeGM:true,query:'market district'}]);
  assert.equal(interaction.replied,undefined);
  assert.equal(Object.hasOwn(interaction.edited,'ephemeral'),false);
  assertCityAttachment(interaction.edited,result);
});
