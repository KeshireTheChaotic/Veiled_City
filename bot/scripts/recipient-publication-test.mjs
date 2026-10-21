import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {deliverHandout} from '../src/publishing.js';
import {handleCommand} from '../src/commands.js';
import {indexWorldEvent} from '../src/city-calendar.js';
function guildFor(f,onFetch=()=>{}){
  const sent=[];return {sent,guild:{id:f.guild,channels:{fetch:async()=>null},members:{fetch:async user=>{
    onFetch(user);return {send:async body=>{sent.push({user,body});return {id:'ack',channelId:'dm'};}};
  }}}};
}
for(const change of ['owner','visibility','source'])test(`handout checks ${change} after member lookup`,()=>nativeFixture(async f=>{
  const pc=f.pcs[0],source=indexWorldEvent(f.db,f.guild,{key:'handout-source',kind:'observation',title:'Private evidence',source_id:'gm',visibility:'character',subject_key:pc.id});
  const handout=f.db.createHandout(f.guild,{title:'Receipt',visibility:'character',subjectCharacterId:pc.id,content:'OWNER-ONLY',metadata:{epistemic:{source_refs:[source.event_key]}}});
  const x=guildFor(f,()=>{
    if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run('other',pc.id);
    if(change==='visibility')f.db.db.prepare("UPDATE handouts SET visibility='party' WHERE id=?").run(handout.id);
    if(change==='source')indexWorldEvent(f.db,f.guild,{key:source.event_key,status:'retracted'});
  });
  await assert.rejects(()=>deliverHandout({db:f.db,guild:x.guild,handout}),error=>error.code==='HANDOUT_AUTHORITY');assert.equal(x.sent.length,0);
}));
test('handout rejects forged attachments/recipient metadata and delivers the exact current native row',()=>nativeFixture(async f=>{
  const pc=f.pcs[0],handout=f.db.createHandout(f.guild,{title:'Receipt',visibility:'character',subjectCharacterId:pc.id,content:'OWNER-ONLY'}),x=guildFor(f);
  await assert.rejects(()=>deliverHandout({db:f.db,guild:x.guild,handout:{...handout,subject_user_id:f.pcs[1].owner_user_id}}));
  const result=await deliverHandout({db:f.db,guild:x.guild,handout});assert(result.ok);assert.equal(x.sent[0].user,pc.owner_user_id);
  f.restart();await deliverHandout({db:f.db,guild:x.guild,handout});assert.equal(x.sent.length,1);
}));
test('uncertain handout transport stays held after restart rather than falling through to relay or resend',()=>nativeFixture(async f=>{
  const pc=f.pcs[0],handout=f.db.createHandout(f.guild,{title:'Receipt',visibility:'character',subjectCharacterId:pc.id,content:'OWNER-ONLY'});
  let attempts=0;const guild={id:f.guild,members:{fetch:async()=>({send:async()=>{attempts++;throw Error('lost ack');}})}};
  const result=await deliverHandout({db:f.db,guild,handout});assert.equal(result.certainty,'uncertain');
  f.restart();await deliverHandout({db:f.db,guild,handout});assert.equal(attempts,1);
}));
for(const revoke of [false,true])test(`actual proxy packet command ${revoke?'holds revoked assignment':'retains native recipient and restart acknowledgement'}`,()=>nativeFixture(async f=>{
  const pc=f.pcs[0],proxy=f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'Attendant',userId:pc.owner_user_id,status:'active',
    playerPacket:{public_identity:'Approved counter attendant.',known_information:['Approved parcel hours.']},gmNote:'GM-SECRET'});
  const x=guildFor(f,()=>{if(revoke)f.db.releaseNpcProxy(proxy.id);});
  const replies=[];const command=()=>({id:'proxy-packet',guildId:f.guild,guild:x.guild,user:{id:pc.owner_user_id,username:'Owner'},commandName:'vc-npc',
    memberPermissions:{has:()=>false},member:{roles:{cache:new Map()}},isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommand:()=> 'packet',getSubcommandGroup:()=>null,getString:()=> 'Attendant'},reply:async p=>replies.push(p),deferReply:async()=>{},editReply:async p=>replies.push(p)});
  if(revoke){await handleCommand(command(),{db:f.db,gm:{}});assert.equal(x.sent.length,0);assert(replies.some(p=>/changed|assignment/i.test(p.content||'')),JSON.stringify(replies));}
  else{
    await handleCommand(command(),{db:f.db,gm:{}});assert(x.sent.length>0,JSON.stringify(replies));assert(!JSON.stringify(x.sent).includes('GM-SECRET'));
    const count=x.sent.length;f.restart();await handleCommand(command(),{db:f.db,gm:{}});assert.equal(x.sent.length,count);
  }
}));
