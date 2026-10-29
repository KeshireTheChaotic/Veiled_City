/** Immediate authenticated safety controls bypass narration, attendance and command side effects. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {setup} from './narrative-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/frameworks/content/public.js';
import path from 'node:path';

let sequence=0;
function command(f,input,{actor=1,gm=false,legacy=false,ack=null}={}){
  const responses=[],pc=f.pcs[actor];
  const interaction={id:`safety-command-${++sequence}`,guildId:f.guild,user:{id:pc.owner_user_id,username:pc.name},
    commandName:legacy?'vc':'vc-roll',memberPermissions:{has:()=>gm},member:{roles:{cache:new Map()}},
    isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,isModalSubmit:()=>false,
    options:{getSubcommand:()=> 'pvp',getSubcommandGroup:()=> 'roll',getString:key=>key==='json'?JSON.stringify(input):null},
    deferReply:async payload=>{if(ack)await ack();interaction.deferred=true;assert.equal(payload.ephemeral,true);},
    reply:async payload=>{responses.push(payload);interaction.replied=true;},editReply:async payload=>{responses.push(payload);},
    followUp:async payload=>responses.push(payload),responses};
  return interaction;
}
function context(f){return {db:f.db,gm:{runTurn:()=>assert.fail('safety control must never execute a model turn')}};}

test('owner safety stop is persisted before the first Discord await, even for an absent owner',()=>nativeFixture(async f=>{
  const pc=f.pcs[1];f.db.setPresence(f.session.id,pc.owner_user_id,'absent');
  const data=f.db.getCharacter(pc.id).data,before=f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n;
  let acknowledgedStop=false;
  const i=command(f,{op:'safety-stop',character_id:pc.id},{ack:async()=>{
    acknowledgedStop=f.db.getCityRecord(f.guild,'pvp_safety_stop',pc.id)?.status==='stopped';
  }});
  await handleCommand(i,context(f));
  assert.equal(acknowledgedStop,true,'stop must commit before waiting on Discord delivery or narration');
  assert.equal(f.db.getCityRecord(f.guild,'pvp_safety_stop',pc.id)?.status,'stopped');
  assert.deepEqual(f.db.getCharacter(pc.id).data,data);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,before);
  assert(i.responses.some(body=>body.ephemeral===undefined&&body.content?.includes('Safety stop')));
}));

test('safety command retry and a lost Discord acknowledgement cannot reopen or duplicate the stop',()=>nativeFixture(async f=>{
  const pc=f.pcs[1],i=command(f,{op:'safety-stop',character_id:pc.id},{legacy:true,ack:async()=>{throw new Error('Synthetic ACK unavailable');}});
  await assert.rejects(()=>handleCommand(i,context(f)));
  const stopped=f.db.getCityRecord(f.guild,'pvp_safety_stop',pc.id);assert.equal(stopped?.status,'stopped');
  f.restart();const replay={...i,deferred:false,replied:false,deferReply:async()=>{replay.deferred=true;},responses:[],
    editReply:async body=>replay.responses.push(body)};
  await handleCommand(replay,context(f));
  assert.deepEqual(f.db.getCityRecord(f.guild,'pvp_safety_stop',pc.id),stopped);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_safety_stop',includeGM:true}).length,1);
}));

test('campaign enable requires actual GM permission; model gm fields and other owners cannot stop a PC',()=>nativeFixture(async f=>{
  const pc=f.pcs[1];
  assert.equal(f.db.getCityRecord(f.guild,'pvp_campaign_policy','campaign'),null,
    'campaign policy has no saved opt-in by default');
  for(const input of [{op:'campaign-mode',enabled:true},{op:'campaign-mode',enabled:true,gm:true},
    {op:'safety-stop',character_id:pc.id},{op:'safety-stop',character_id:pc.id,owner:pc.owner_user_id,gm:true}]){
    const i=command(f,input,{actor:0});
    try{await handleCommand(i,context(f));}catch(error){assert(error.expected===true||['PERMISSION_DENIED','NARRATIVE_PVP'].includes(error.code));}
    assert.equal(f.db.getCityRecord(f.guild,'pvp_safety_stop',pc.id),null);
    assert.equal(f.db.getCityRecord(f.guild,'pvp_campaign_policy','campaign'),null);
  }
  const i=command(f,{op:'campaign-mode',enabled:true},{gm:true});await handleCommand(i,context(f));
  assert.equal(f.db.getCityRecord(f.guild,'pvp_campaign_policy','campaign')?.data.enabled,true);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_encounter_contract',includeGM:true}).length,0,'enable is not fabricated consent');
  const status=command(f,{op:'campaign-status'},{gm:true});await handleCommand(status,context(f));
  assert(status.responses.some(body=>body.content?.includes('Qualified source-bound native PC attacks may execute without bilateral approval')),
    'status must describe the enabled attack policy');
  assert(status.responses.some(body=>body.content?.includes('Owner safety stops, Armor and death choices remain enforced')),
    'status must preserve owner protections');
}));

test('actual GM generation awaiting a fake provider cannot delay an owner safety stop',{timeout:5000},()=>nativeFixture(async f=>{
  const x=setup(f,{text:'Set the scene',messageId:'safety-concurrent-generation'}),controller=new AbortController();
  let entered,release,calls=0;
  const started=new Promise(resolve=>{entered=resolve;}),waiting=new Promise(resolve=>{release=resolve;});
  const ai={responses:{create:async()=>{calls++;entered();await waiting;return {output_text:'{}'};}}};
  const gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',maxRecentMessages:2,maxContentChunks:1}});
  const pending=gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,messageId:x.messageId,
    messageText:x.text,scope:'party',signal:controller.signal}).then(result=>({result}),error=>({error}));
  await started;
  try{
    const pc=f.pcs[1],i=command(f,{op:'safety-stop',character_id:pc.id});
    await handleCommand(i,{db:f.db,gm});
    assert.equal(f.db.getCityRecord(f.guild,'pvp_safety_stop',pc.id)?.status,'stopped');
    assert.equal(calls,1,'the urgent command never adds a model request');
  }finally{controller.abort();release();}
  const settled=await pending;
  // The creative writer deliberately converts an unavailable provider into
  // scoped review, not a universal deadline exception or fabricated scene.
  assert.equal(settled.error,undefined);assert.equal(settled.result.world_additions.length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'narrative_unit',includeGM:true}).length,0);
  assert(f.db.listCityRecords(f.guild,{kind:'narrative_unit_review',includeGM:true})
    .some(row=>row.visibility==='gm'&&row.data.reason==='creative_writer_unavailable'));
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,0);
}));
