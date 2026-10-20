/** Director-owned acceptance: private read-only status never grants or clears effects. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import * as policy from '../src/pvp-campaign-policy.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {handlePvpSafetyCommand} from '../src/pvp-safety-commands.js';
const writes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
const status=(f,user,input,guild=f.guild)=>{
  assert.equal(typeof policy.pvpSafetyStatus,'function','Native owner status API is not implemented');
  return policy.pvpSafetyStatus(f.db,guild,user,input);
};

test('owner status is read-only, available while absent, and restart-stable for a real native stop',()=>nativeFixture(f=>{
  const pc=f.pcs[0],input={character_id:pc.id};
  f.db.setPresence(f.session.id,pc.owner_user_id,'absent');
  const emptyBefore=writes(f);
  assert.deepEqual(status(f,pc.owner_user_id,input),{character_id:pc.id,stopped:false});
  assert.equal(writes(f),emptyBefore);assert.equal(f.db.getCityRecord(f.guild,'pvp_safety_stop',pc.id),null);
  const stopped=policy.setPvpSafetyStop(f.db,f.guild,pc.owner_user_id,input,{interactionId:'native-owner-status-stop'});
  f.restart();const stoppedBefore=writes(f);
  assert.deepEqual(status(f,pc.owner_user_id,input),{character_id:pc.id,stopped:true});
  assert.deepEqual(status(f,pc.owner_user_id,input),{character_id:pc.id,stopped:true});
  assert.equal(writes(f),stoppedBefore);
  assert.deepEqual(f.db.getCityRecord(f.guild,'pvp_safety_stop',pc.id),stopped);
}));

test('status rejects other owners, GM substitution, wrong guild and extra fields without state writes',()=>nativeFixture(f=>{
  const pc=f.pcs[0],input={character_id:pc.id},before=writes(f);
  assert.throws(()=>status(f,f.pcs[1].owner_user_id,input),/owner/i);
  assert.throws(()=>status(f,'gm',input),/owner/i);
  assert.throws(()=>status(f,pc.owner_user_id,input,'another-guild'),/owner/i);
  assert.throws(()=>status(f,pc.owner_user_id,{...input,gm:true}),/closed/i);
  assert.equal(writes(f),before);assert.equal(f.db.getCityRecord(f.guild,'pvp_safety_stop',pc.id),null);
}));

test('revoked native stop remains persisted and fails closed rather than becoming a clear status',()=>nativeFixture(f=>{
  const pc=f.pcs[0],input={character_id:pc.id};
  assert.equal(typeof policy.pvpSafetyStatus,'function','Native owner status API is not implemented');
  const stopped=policy.setPvpSafetyStop(f.db,f.guild,pc.owner_user_id,input,{interactionId:'retracted-status-source'});
  indexWorldEvent(f.db,f.guild,{key:stopped.source_event,status:'retracted'},'gm');
  const before=writes(f);
  assert.throws(()=>status(f,pc.owner_user_id,input),/invalid|stale|source/i);
  assert.equal(writes(f),before);assert.deepEqual(f.db.getCityRecord(f.guild,'pvp_safety_stop',pc.id),stopped);
}));

function command(f,{input={op:'safety-status',character_id:f.pcs[0].id},user=f.pcs[0].owner_user_id,
  legacy=false,guild=f.guild,ack=null}={}){
  const responses=[],interaction={id:'fixture-safety-status-command',guildId:guild,user:{id:user},commandName:legacy?'vc':'vc-roll',
    deferred:false,replied:false,ephemeral:null,isChatInputCommand:()=>true,
    options:{getSubcommand:()=> 'pvp',getSubcommandGroup:()=>legacy?'roll':null,getString:()=>JSON.stringify(input)},
    async deferReply(payload){responses.push({defer:payload});if(ack)await ack();this.deferred=true;this.ephemeral=payload.ephemeral;},
    async editReply(payload){responses.push({edit:payload});this.replied=true;}};
  return {interaction,responses,run:(options={})=>handlePvpSafetyCommand(interaction,{db:f.db,...options})};
}

for(const legacy of [false,true])test(`production ${legacy?'legacy vc roll':'vc-roll'} owner safety-status is native private, mention-safe and read-only`,()=>nativeFixture(async f=>{
  const x=command(f,{legacy}),before=writes(f);
  assert.equal(await x.run(),true);assert.equal(writes(f),before);
  assert.deepEqual(x.responses[0],{defer:{ephemeral:true}});
  const payload=x.responses[1].edit;assert.deepEqual(payload.allowedMentions,{parse:[]});
  assert.match(payload.content,/no saved PvP safety stop/);
  for(const pc of f.pcs){assert.equal(payload.content.includes(pc.id),false);assert.equal(payload.content.includes(pc.owner_user_id),false);
    assert.equal(payload.content.includes(pc.name),false);}
  assert.equal(f.db.getCityRecord(f.guild,'pvp_safety_stop',f.pcs[0].id),null);
}));

test('production status reports the current sticky stop while urgent stop commits before any Discord await',()=>nativeFixture(async f=>{
  let release;const acknowledgement=new Promise(resolve=>{release=resolve;}),
    stop=command(f,{input:{op:'safety-stop',character_id:f.pcs[0].id},ack:()=>acknowledgement});
  const pending=stop.run();
  const saved=f.db.getCityRecord(f.guild,'pvp_safety_stop',f.pcs[0].id);
  assert.equal(saved?.status,'stopped','Urgent native stop must exist before the first acknowledgement resolves.');
  const before=writes(f),read=command(f);assert.equal(await read.run(),true);
  assert.match(read.responses[1].edit.content,/safety stop is active/);assert.equal(writes(f),before);
  assert.deepEqual(f.db.getCityRecord(f.guild,'pvp_safety_stop',f.pcs[0].id),saved);
  release();assert.equal(await pending,true);
  f.restart();const restarted=writes(f),again=command(f);
  assert.equal(await again.run(),true);assert.match(again.responses[1].edit.content,/safety stop is active/);
  assert.equal(writes(f),restarted);
}));

for(const mode of ['other-owner','gm','wrong-guild','proxy'])test(`production ${mode} cannot substitute for the exact status owner`,()=>nativeFixture(async f=>{
  const pc=f.pcs[0];let user=f.pcs[1].owner_user_id,guild=f.guild;
  if(mode==='gm')user='fixture-gm';
  if(mode==='wrong-guild'){user=pc.owner_user_id;guild='foreign-guild';}
  if(mode==='proxy')f.db.assignCharacter(f.session.id,pc.owner_user_id,pc.id,
    {controlPolicy:'proxy',proxyUserId:user});
  const x=command(f,{user,guild}),before=writes(f);
  await assert.rejects(()=>x.run({gm:mode==='gm'}),/owner/i);
  assert.deepEqual(x.responses,[]);assert.equal(writes(f),before);
}));

for(const fields of [{character_id:null},{character_id:1},{character_id:[]},{character_id:''},
  {character_id:'replace',gm:true},{character_id:'replace',owner:'another-owner'},
  {character_id:'replace',clear:true},{character_id:'replace',interactionId:'forged'}])
test(`production safety-status rejects malformed fields ${JSON.stringify(fields)}`,()=>nativeFixture(async f=>{
  const input={op:'safety-status',...fields};if(input.character_id==='replace')input.character_id=f.pcs[0].id;
  const x=command(f,{input}),before=writes(f);
  await assert.rejects(()=>x.run(),/character|status|fields/i);
  assert.deepEqual(x.responses,[]);assert.equal(writes(f),before);
}));

test('production owner status cannot edit an already public acknowledgement',()=>nativeFixture(async f=>{
  const x=command(f);x.interaction.deferred=true;x.interaction.ephemeral=false;
  const before=writes(f);await assert.rejects(()=>x.run(),/private response/i);
  assert.deepEqual(x.responses,[]);assert.equal(writes(f),before);
}));

test('production owner status remains independent of private GM campaign-status privilege',()=>nativeFixture(async f=>{
  const unauthorized=command(f,{input:{op:'campaign-status'}}),before=writes(f);
  await assert.rejects(()=>unauthorized.run(),/GM\/admin/);assert.deepEqual(unauthorized.responses,[]);
  const gm=command(f,{input:{op:'campaign-status'},user:'fixture-gm'});
  assert.equal(await gm.run({gm:true}),true);assert.deepEqual(gm.responses[0],{defer:{ephemeral:true}});
  assert.deepEqual(gm.responses[1].edit.allowedMentions,{parse:[]});assert.match(gm.responses[1].edit.content,/Campaign PvP policy:/);
  assert.equal(writes(f),before);
}));
