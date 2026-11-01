import assert from 'node:assert/strict';
import test from 'node:test';
import {VeiledDB} from '../../src/db.js';
import '../../src/ai-intents.js';
import {initializeRuntimeFrameworks} from '../../src/application/composition/runtime-initializers.js';
import {handleCommand} from '../../src/commands.js';
import {sessionBrief,formatSessionBrief} from '../../src/frameworks/session/public.js';

initializeRuntimeFrameworks();

function interactionFor({guild,user,sub,id,failFirstReply=false}){
  const replies=[];
  const interaction={guildId:guild,commandName:'vc',id,user:{id:user,username:user},member:{displayName:user},
    replied:false,deferred:false,isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommandGroup:()=> 'intel',getSubcommand:()=>sub,getString:()=>null},
    async reply(payload){replies.push(payload);if(failFirstReply&&replies.length===1)throw new Error('R82 reply failed');this.replied=true;},
    async followUp(){assert.fail('brief remains one text reply with one packet attachment');}};
  return {interaction,replies};
}
function fixture(guild){
  const db=new VeiledDB(':memory:','sql/schema.sql');db.ensureCampaign(guild);
  db.upsertPlayer(guild,'owner-a','Owner A');db.upsertPlayer(guild,'owner-b','Owner B');
  db.setCityCalendar(guild,{flags:{session_briefs:true}});
  const session=db.startSession(guild,'R82 briefing fixture','already_together');
  const a=db.createCharacter(guild,'owner-a','PC A',{traits:{Presence:1}}),b=db.createCharacter(guild,'owner-b','PC B',{traits:{Presence:1}});
  for(const [user,pc] of [['owner-a',a],['owner-b',b]]){db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,'present');}
  for(const row of [
    {key:'public',content:'Public fact',visibility:'public'},
    {key:'party',content:`Party fact ${'visible detail. '.repeat(160)}`,visibility:'party'},
    {key:'a-player',content:'Owner A player secret',visibility:'player',subjectUserId:'owner-a'},
    {key:'a-character',content:'Owner A character secret',visibility:'character',subjectCharacterId:a.id},
    {key:'b-player',content:'Owner B player secret',visibility:'player',subjectUserId:'owner-b'},
    {key:'b-character',content:'Owner B character secret',visibility:'character',subjectCharacterId:b.id},
    {key:'gm',content:'GM FACT SECRET',visibility:'gm'}
  ])db.addFact(guild,row);
  for(const [key,title,visibility,subject_key] of [
    ['public','Public event','public',null],['party','Party event','party',null],
    ['a','Owner A event secret','player','owner-a'],['b','Owner B event secret','character',b.id],['gm','GM EVENT SECRET','gm',null]
  ])db.saveWorldEvent(guild,{key:`r82-${key}`,kind:'fixture',title,status:'active',truth_status:'asserted',visibility,subject_key,
    source_kind:'fixture',source_id:'r82',session_id:session.id,tick:0,minute:0,details:{private_detail:'RAW EVENT DETAIL SECRET'}});
  return {db,a,b};
}

test('brief pair preserves original two-owner and shared packets, private text and attachment bytes',async()=>{
  const guild='r82-scopes',{db,a,b}=fixture(guild);
  try{
    for(const [user,pc,other] of [['owner-a',a,'Owner B'],['owner-b',b,'Owner A']]){
      const expected=sessionBrief(db,guild,{mode:'character',user}),delivery=interactionFor({guild,user,sub:'brief',id:`r82-${user}`});
      assert.equal(await handleCommand(delivery.interaction,{db,gm:null}),true);
      const reply=delivery.replies[0];assert.equal(delivery.replies.length,1);assert.equal(reply.flags,64);
      assert.equal(reply.content,formatSessionBrief(expected));assert.ok(reply.content.length<=1900);assert.deepEqual(reply.allowedMentions,{parse:[]});
      assert.equal(reply.files.length,1);assert.equal(reply.files[0].name,'scoped-session-brief.json');
      assert.ok(Buffer.isBuffer(reply.files[0].attachment));assert.equal(reply.files[0].attachment.toString(),JSON.stringify(expected,null,2));
      const packet=JSON.parse(reply.files[0].attachment.toString());
      assert.equal(packet.mode,'character');assert.equal(packet.visibility,'character');assert.equal(packet.character_id,pc.id);
      assert.ok(packet.facts.some(f=>f.text===`${user==='owner-a'?'Owner A':'Owner B'} character secret`));
      assert.doesNotMatch(reply.content+'\n'+JSON.stringify(packet),new RegExp(`${other}.*secret|GM FACT SECRET|GM EVENT SECRET|RAW EVENT DETAIL SECRET`));
    }
    const expected=sessionBrief(db,guild,{mode:'shared',user:'owner-a'}),delivery=interactionFor({guild,user:'owner-a',sub:'recap',id:'r82-shared'});
    assert.equal(await handleCommand(delivery.interaction,{db,gm:null}),true);
    const reply=delivery.replies[0],packet=JSON.parse(reply.files[0].attachment.toString());
    assert.equal(reply.flags,64);assert.deepEqual(packet,expected);assert.equal(packet.mode,'shared');assert.equal(packet.visibility,'party');
    assert.equal(packet.character_id,null);assert.deepEqual(packet.personal,[]);
    assert.doesNotMatch(reply.content+'\n'+JSON.stringify(packet),/Owner A.*secret|Owner B.*secret|GM FACT SECRET|GM EVENT SECRET|RAW EVENT DETAIL SECRET/);
  }finally{db.close();}
});

test('opt-in guard and current owned-character prerequisite remain ahead of private brief delivery',async()=>{
  const guild='r82-guards',{db}=fixture(guild);
  try{
    db.setCityCalendar(guild,{flags:{session_briefs:false}});
    const off=interactionFor({guild,user:'owner-a',sub:'brief',id:'r82-off'});
    assert.equal(await handleCommand(off.interaction,{db,gm:null}),true);
    assert.equal(off.replies[0].content,'⚠️ Session briefs are opt-in.');assert.equal(off.replies[0].flags,64);assert.equal(off.replies[0].files,undefined);
    const ordinary=interactionFor({guild,user:'owner-a',sub:'recap',id:'r82-ordinary'});
    assert.equal(await handleCommand(ordinary.interaction,{db,gm:null}),true);
    assert.equal(ordinary.replies[0].content,'No completed-session recap yet.');assert.equal(ordinary.replies[0].files,undefined);
    db.setCityCalendar(guild,{flags:{session_briefs:true}});
    const unowned=interactionFor({guild,user:'no-assignment',sub:'brief',id:'r82-unowned'});
    assert.equal(await handleCommand(unowned.interaction,{db,gm:null}),true);
    assert.match(unowned.replies[0].content,/active owned character assignment/);assert.equal(unowned.replies[0].flags,64);assert.equal(unowned.replies[0].files,undefined);
  }finally{db.close();}
});

test('extracted brief reply remains awaited by the original command error response',async()=>{
  const guild='r82-error',{db}=fixture(guild);
  try{
    const delivery=interactionFor({guild,user:'owner-a',sub:'brief',id:'r82-error',failFirstReply:true});
    assert.equal(await handleCommand(delivery.interaction,{db,gm:null}),true);
    assert.equal(delivery.replies.length,2);assert.equal(delivery.replies[1].content,'⚠️ R82 reply failed');assert.equal(delivery.replies[1].flags,64);
  }finally{db.close();}
});
