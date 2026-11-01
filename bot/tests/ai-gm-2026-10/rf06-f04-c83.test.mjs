import assert from 'node:assert/strict';
import test from 'node:test';
import {VeiledDB} from '../../src/db.js';
import '../../src/ai-intents.js';
import {initializeRuntimeFrameworks} from '../../src/application/composition/runtime-initializers.js';
import {handleCommand} from '../../src/commands.js';
import {handleSessionRecapCommand} from '../../src/framework-to-framework/discord--publication/public.js';

initializeRuntimeFrameworks();

function interaction({deferred=false}={}){
  const replies=[],edits=[];
  const value={guildId:'r83-contract',deferred,replied:false,
    async reply(payload){replies.push(payload);this.replied=true;},
    async editReply(payload){edits.push(payload);this.replied=true;},
    async followUp(){assert.fail('empty certified text must have no follow-up');}};
  return {value,replies,edits};
}

test('recap pair retains lazy missing-session fallback and original deferred/private delivery',async()=>{
  const unreadable=new Proxy({},{get(){assert.fail('missing session must not query source data');}}),fresh=interaction();
  assert.equal(await handleSessionRecapCommand(fresh.value,{db:unreadable,session:null}),true);
  assert.deepEqual(fresh.replies,[{content:'No completed-session recap yet.',ephemeral:true,allowedMentions:{parse:[]}}]);
  const calls=[],db={listCityRecords(guild,options){assert.equal(this,db);calls.push([guild,options]);return [];}};
  const deferred=interaction({deferred:true});
  assert.equal(await handleSessionRecapCommand(deferred.value,{db,session:{id:'ended'}}),true);
  assert.deepEqual(calls,[['r83-contract',{kind:'pvp_delivered_archive',includeGM:true,limit:100,offset:0}]]);
  assert.deepEqual(deferred.edits,[{content:'No completed-session recap yet.',allowedMentions:{parse:[]}}]);
  assert.equal(deferred.replies.length,0);
});

test('recap pair preserves exact source and Discord rejection identities without additional responses',async()=>{
  const sourceError=new Error('source failure'),db={listCityRecords(){throw sourceError;}},source=interaction();
  await assert.rejects(handleSessionRecapCommand(source.value,{db,session:{id:'ended'}}),error=>error===sourceError);
  assert.equal(source.replies.length,0);assert.equal(source.edits.length,0);
  const deliveryError=new Error('delivery failure'),delivery=interaction();
  delivery.value.reply=async()=>{throw deliveryError;};
  await assert.rejects(handleSessionRecapCommand(delivery.value,{db:{},session:null}),error=>error===deliveryError);
});

test('ordinary recap command awaits delivery rejection inside its existing private error response',async()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r83-command';
  try{
    db.ensureCampaign(guild);db.upsertPlayer(guild,'owner','Owner');db.setCityCalendar(guild,{flags:{session_briefs:false}});
    const replies=[],request={guildId:guild,commandName:'vc',id:'r83-reply-error',user:{id:'owner',username:'Owner'},member:{displayName:'Owner'},
      replied:false,deferred:false,isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
      options:{getSubcommandGroup:()=> 'intel',getSubcommand:()=> 'recap',getString:()=>null},
      async reply(payload){replies.push(payload);if(replies.length===1)throw new Error('R83 reply failed');this.replied=true;},
      async followUp(){assert.fail('missing recap must not send follow-up');}};
    assert.equal(await handleCommand(request,{db,gm:null}),true);
    assert.equal(replies.length,2);assert.equal(replies[1].content,'⚠️ R83 reply failed');assert.equal(replies[1].flags,64);
  }finally{db.close();}
});
