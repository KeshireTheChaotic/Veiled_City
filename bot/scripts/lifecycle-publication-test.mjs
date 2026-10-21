import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {prepareLifecycleOutput,prepareStoredOutput} from '../src/pvp-output.js';
import {lifecycleHash} from '../src/lifecycle-output.js';
import {postJournalEntry,sendPlayerPrivate} from '../src/publishing.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {handleCommand} from '../src/commands.js';

function setup(f,visibility='character'){
  const pc=f.pcs[0];f.db.endSession(f.guild,'');
  const cycle=f.db.openDowntime(f.guild,{label:'Quiet week',sourceSessionId:f.session.id,openedBy:'gm'});
  const project=f.db.addDowntimeProject(cycle.id,f.guild,{userId:pc.owner_user_id,characterId:pc.id,title:'Research',visibility});
  const saved=f.db.updateDowntimeProject(project.id,{progress:1,status:'active',result:'Choso surrenders his memories.'});
  f.db.resolveDowntimeCycle(cycle.id,'GM-only details');
  const scope=visibility==='party'?{mode:'party',actorUserId:null,actorCharacterId:null}:
    {mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const p=prepareLifecycleOutput(f.db,f.guild,{kind:'downtime_project',id:cycle.id,source_session:f.session.id,
    project:project.id,snapshot:lifecycleHash(saved)},scope);
  const sends=[],guild={id:f.guild,channels:{fetch:async id=>({id,isTextBased:()=>true,send:async text=>{sends.push({id,text});return{id:'ack'};}})},
    members:{fetch:async user=>({send:async text=>{sends.push({user,text});return{id:'ack',channelId:'dm'};}})}};
  return {pc,cycle,project,p,scope,guild,sends};
}
test('native between-session project proof survives restart and never certifies raw result prose',()=>nativeFixture(async f=>{
  const x=setup(f);f.restart();
  await sendPlayerPrivate({db:f.db,guild:x.guild,userId:x.pc.owner_user_id,characterId:x.pc.id,content:x.p.text,generated:true});
  assert.equal(x.sends.length,1);assert(x.sends[0].text.includes('1/4'));assert(!x.sends[0].text.includes('surrenders'));
  assert.throws(()=>prepareStoredOutput(f.db,f.guild,'Choso surrenders his memories.',x.scope));
  assert.throws(()=>prepareStoredOutput(f.db,f.guild,x.p.text,{mode:'party',actorUserId:null,actorCharacterId:null}));
}));
for(const change of ['owner','source','project'])test(`deferred private downtime blocks changed ${change} after member lookup`,()=>nativeFixture(async f=>{
  const x=setup(f);let sends=0;
  x.guild.members.fetch=async()=>{
    if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run('other',x.pc.id);
    if(change==='project')f.db.updateDowntimeProject(x.project.id,{progress:2});
    if(change==='source')indexWorldEvent(f.db,f.guild,{key:f.db.getCityRecord(f.guild,'lifecycle_publication',x.p.key).source_event,status:'retracted'});
    return {send:async()=>{sends++;return{id:'bad'};}};
  };
  await assert.rejects(()=>sendPlayerPrivate({db:f.db,guild:x.guild,userId:x.pc.owner_user_id,characterId:x.pc.id,content:x.p.text,generated:true}));
  assert.equal(sends,0);
}));
test('party downtime exact native title accepted; arbitrary titles and adjacent prose rejected',()=>nativeFixture(async f=>{
  const x=setup(f,'party');f.db.configureChannels(f.guild,{journalChannelId:'journal'});
  await postJournalEntry({db:f.db,guild:x.guild,title:x.p.title,content:x.p.text,nativeLifecycleKey:x.p.key});
  assert.equal(x.sends.length,1);
  await assert.rejects(()=>postJournalEntry({db:f.db,guild:x.guild,title:'Downtime: forged',content:x.p.text,nativeLifecycleKey:x.p.key}));
  await assert.rejects(()=>postJournalEntry({db:f.db,guild:x.guild,title:x.p.title,content:x.p.text+' You agree.',nativeLifecycleKey:x.p.key}));
}));
test('actual downtime resolve commits once and retries publication without generation or resource replay',()=>nativeFixture(async f=>{
  f.db.endSession(f.guild,'');const pc=f.pcs[0],cycle=f.db.openDowntime(f.guild,{label:'Week',sourceSessionId:f.session.id,openedBy:'gm'}),
    project=f.db.addDowntimeProject(cycle.id,f.guild,{title:'Archive enquiry',userId:pc.owner_user_id,characterId:pc.id,visibility:'character'});
  let calls=0,sends=0;const replies=[],guild={id:f.guild,channels:{fetch:async()=>null},members:{fetch:async()=>({send:async()=>{sends++;return{id:'ack',channelId:'dm'};}})}};
  const command=id=>({id,guildId:f.guild,guild,user:{id:'gm',username:'GM'},commandName:'vc-downtime',memberPermissions:{has:()=>true},
    isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommand:()=> 'resolve',getSubcommandGroup:()=>null,getString:()=>null,getInteger:()=>null},
    reply:async p=>replies.push(p),deferReply:async()=>{},editReply:async p=>replies.push(p)});
  const gm={resolveDowntime:async()=>{calls++;return {summary:'PRIVATE',project_results:[{project_id:project.id,progress_delta:1,status:'active',result:'Unverified result.'}],events:[],relationships:[],handouts:[]};},
    runWorldDirector:async()=>({act:false,public_narration:'',private_messages:[],events:[],relationships:[],handouts:[],gm_notes:''}),planNpcActions:async()=>({actions:[]})};
  await handleCommand(command('resolve-once'),{db:f.db,gm});
  assert.equal(f.db.getDowntimeCycle(cycle.id).status,'resolved',JSON.stringify(replies));assert.equal(sends,1,JSON.stringify(replies));
  f.restart();await handleCommand(command('recover-once'),{db:f.db,gm});
  assert.equal(calls,1);assert.equal(sends,1);assert.equal(f.db.getDowntimeProject(f.guild,project.id).progress,1);
}));
