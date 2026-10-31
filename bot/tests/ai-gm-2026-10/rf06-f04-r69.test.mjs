import assert from 'node:assert/strict';
import test from 'node:test';
import {handleSeedCommand} from '../../src/seed-commands.js';
import {seedCommandReply} from '../../src/frameworks/discord/public.js';

function readAttachment(reply){
  assert.equal(reply.ephemeral,true);
  assert.deepEqual(reply.allowedMentions,{parse:[]});
  assert.equal(reply.files.length,1);
  assert.equal(reply.files[0].name,'seed-drafts.json');
  assert.ok(Buffer.isBuffer(reply.files[0].attachment));
  return JSON.parse(reply.files[0].attachment.toString('utf8'));
}

test('seed command reply preserves the original draft summary and JSON attachment',async()=>{
  const result={page:1,has_more:false,drafts:[{record_key:'draft-1',data:{proposal:{kind:'place',key:'aster-vale'}}}]};
  const interaction={
    guildId:'guild-1',user:{id:'gm-1'},
    options:{getSubcommand:()=> 'seed-drafts',getString:name=>name==='draft_id'?null:name==='status'?'draft':'',getInteger:()=>1},
    reply:async payload=>{interaction.payload=payload;}
  };
  const db={listCityRecords:(...args)=>{interaction.listArgs=args;return result.drafts;}};

  assert.equal(await handleSeedCommand(interaction,{db}),true);
  assert.deepEqual(interaction.listArgs,['guild-1',{kind:'seed_draft',status:'draft',query:'',includeGM:true,limit:21,offset:0}]);
  assert.equal(interaction.payload.content,'seed-drafts complete (GM-only).\ndraft-1 | place | aster-vale');
  assert.deepEqual(readAttachment(interaction.payload),result);
});

test('empty draft list and record results retain the existing fallback text',()=>{
  const empty=seedCommandReply('seed-drafts',{drafts:[]});
  assert.equal(empty.content,'seed-drafts complete (GM-only).\nNo matching drafts.');
  assert.deepEqual(readAttachment(empty),{drafts:[]});

  const record=seedCommandReply('seed-approve',{record_key:'draft-2',status:'approved'});
  assert.equal(record.content,'seed-approve complete (GM-only).\ndraft-2 | approved');
  assert.deepEqual(readAttachment(record),{record_key:'draft-2',status:'approved'});
});

test('reply truncates visible content at 1950 characters while retaining the full attachment',()=>{
  const result={drafts:[{record_key:'draft-1',data:{proposal:{kind:'place',key:'x'.repeat(2100)}}}]};
  const reply=seedCommandReply('seed-package-preview',result);
  assert.equal(reply.content.length,1950);
  assert.match(reply.content,/^seed-package-preview complete \(GM-only\)\./);
  assert.deepEqual(readAttachment(reply),result);
});
