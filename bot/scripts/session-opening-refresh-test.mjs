/** Native opening refresh button exposure after a stale plan with retained acknowledgements. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {assemblyHookSources} from '../src/assembly-context.js';
import {scheduleSessionOpening} from '../src/session-opening.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {runSessionOpening} from '../src/session-opening-runner.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
let interactionSequence=0;

function transport(f){
  let n=0,partyAvailable=false;const sent={party:[],private:[]};
  f.db.db.prepare('UPDATE campaigns SET play_channel_id=? WHERE guild_id=?').run('refresh-play',f.guild);
  return {sent,setPartyAvailable:value=>{partyAvailable=value;},guild:{id:f.guild,channels:{fetch:async id=>partyAvailable?{id,isTextBased:()=>true,
    send:async body=>{sent.party.push(body.content||body);return {id:`party-${++n}`,channelId:id};}}:null},members:{fetch:async user=>({send:async body=>{
    sent.private.push({user,content:body.content||body});return {id:`dm-${++n}`,channelId:`dm-${user}`};
  }})}}};
}
function plan(db,guild,session){
  return {public_opening:'A camera scene, not a PC arrival.',public_parts:[],convergence_goal:'Independent openings.',bonds:[],gm_notes:'Private notes.',
    character_entries:db.roster(session.id).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence)).map(r=>({
      discord_user_id:r.discord_user_id,character_id:r.character_id,character_name:r.name,private_hook:'An ordinary question is available.',private_parts:[],
      hook_source_refs:assemblyHookSources(db,guild,r.character_id).slice(0,1).map(s=>s.id),public_cue:'',stay_reason:''}))};
}
function assembleInteraction(f,guild){
  const replies=[];
  return {id:`inspect-stale-opening:${++interactionSequence}`,guildId:f.guild,guild,user:{id:'operator',username:'Operator'},commandName:'vc-session',
    memberPermissions:{has:()=>true},member:{roles:{cache:new Map()}},isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommand:()=>'assemble',getSubcommandGroup:()=> 'session',getString:()=>null,getBoolean:()=>null,getInteger:()=>null,getUser:()=>null},
    deferReply:async()=>{},reply:async p=>replies.push(p),editReply:async p=>replies.push(p),followUp:async p=>replies.push(p),replies};
}
function refreshClick(f,guild,customId,{user='operator',allowed=true,id=`refresh-click:${++interactionSequence}`}={}){
  return {id,guildId:f.guild,guild,user:{id:user},commandName:'vc-session',customId,memberPermissions:{has:()=>allowed},
    isChatInputCommand:()=>false,isButton:()=>true,isStringSelectMenu:()=>false,deferReply:async()=>{},
    reply:async()=>{},editReply:async()=>{}};
}
async function prepareStalePartial(f,{changedOwnerHook=false,uncertainUser=null}={}){
  for(const pc of f.pcs)f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=[`Owner-source thread for ${pc.name}.`];});
  const x=transport(f),operator={id:'start-partial-opening',guildId:f.guild,guild:x.guild,user:{id:'operator'}};
  scheduleSessionOpening(f.db,operator,f.session,()=>true);
  let calls=0;const gm={planAssembly:async()=>{calls++;return plan(f.db,f.guild,f.db.getActiveSession(f.guild));}};
  if(uncertainUser)x.guild.members.fetch=async user=>({send:async body=>{
    if(user===uncertainUser)throw Error('lost private acknowledgement');
    x.sent.private.push({user,content:body.content||body});return {id:`dm-${x.sent.private.length}`,channelId:`dm-${user}`};
  }});
  const opened=await runSessionOpening({db:f.db,guild:x.guild,gm});
  assert.equal(opened.status,'needs_delivery_review');
  if(uncertainUser)assert(f.db.listCityRecords(f.guild,{kind:'session_opening_turn',includeGM:true,limit:20}).length>0);
  else assert.equal(x.sent.private.length,4);
  assert.equal(x.sent.party.length,0);
  if(changedOwnerHook)f.db.updateCharacterData(f.pcs[0].id,d=>{d.entry_hooks=[`Replacement owner-source thread for ${f.pcs[0].name}.`];});
  else f.db.upsertCharacterGmHook(f.guild,f.pcs[0].id,{key:'refresh-only-global-source',title:'New private lead proposal',type:'entry_seed',premise:'A changed proposal input, not a resolved event.'});
  return {x,gm,get calls(){return calls;},interaction:assembleInteraction(f,x.guild)};
}

test('native stale opening with acknowledged private output exposes sourced-refresh review',()=>nativeFixture(async f=>{
  const x=transport(f),operator={id:'start-with-partial-transport',guildId:f.guild,guild:x.guild,user:{id:'operator'}};
  scheduleSessionOpening(f.db,operator,f.session,()=>true);
  let calls=0;const gm={planAssembly:async()=>{calls++;return plan(f.db,f.guild,f.db.getActiveSession(f.guild));}};
  const opened=await runSessionOpening({db:f.db,guild:x.guild,gm});
  assert.equal(opened.status,'needs_delivery_review');assert.equal(x.sent.private.length,4);assert.equal(x.sent.party.length,0);
  f.db.updateCharacterData(f.pcs[0].id,d=>{d.entry_hooks=['A newly sourced question, added after the original opening.'];});
  f.restart();
  const interaction=assembleInteraction(f,x.guild);
  await handleCommand(interaction,{db:f.db,gm});
  const payload=interaction.replies.at(-1),buttons=(payload?.components||[]).flatMap(row=>row.components||[]);
  assert(buttons.some(button=>button.label==='Prepare NEW sourced openings (no send)'&&button.custom_id?.startsWith('vcassemblyrefresh:')),
    'stale native opening with acknowledged history should offer exact-state sourced refresh review');
  assert.equal(calls,1,'inspection must not invoke a second planner attempt');
  assert.equal(x.sent.private.length,4);assert.equal(x.sent.party.length,0);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:1000}).filter(e=>e.kind==='assembly_refresh_review').length,1);
}));

test('approved source refresh rebinds one bounded attempt and preserves original private acknowledgements',()=>nativeFixture(async f=>{
  const x=await prepareStalePartial(f),beforePrivate=structuredClone(x.x.sent.private),
    oldTurns=f.db.listCityRecords(f.guild,{kind:'session_opening_turn',includeGM:true,limit:20});
  f.restart();const inspect=assembleInteraction(f,x.x.guild);await handleCommand(inspect,{db:f.db,gm:x.gm});
  const control=inspect.replies.at(-1)?.components?.flatMap(row=>row.components||[]).find(button=>button.custom_id?.startsWith('vcassemblyrefresh:'));
  assert(control,'stale native plan must expose the source-bound refresh review');
  const beforeResources=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),beforeRolls=f.db.db.prepare('SELECT COUNT(*) n FROM rolls WHERE guild_id=?').get(f.guild).n;
  await handleCommand(refreshClick(f,x.x.guild,control.custom_id),{db:f.db,gm:x.gm});
  const job=f.db.getCityRecord(f.guild,'session_opening_job',f.session.id);
  assert.equal(job.data.attempts,2);assert.equal(x.calls,2);assert.deepEqual(x.x.sent.private,beforePrivate);assert.equal(x.x.sent.party.length,0);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),beforeResources);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls WHERE guild_id=?').get(f.guild).n,beforeRolls);
  const turnsAfterRefresh=f.db.listCityRecords(f.guild,{kind:'session_opening_turn',includeGM:true,limit:20});
  assert.deepEqual(turnsAfterRefresh,oldTurns,'refresh preparation must not rebind or mutate original turn proofs');
  f.restart();let obsoleteSends=0;
  for(const old of oldTurns)await deliverTurnOutbox(f.db,f.guild,old.record_key,async()=>{obsoleteSends++;return {messageId:'unsafe-replay'};});
  assert.equal(obsoleteSends,0,'deferred attempt1 output cannot acquire attempt2 authority after restart');
  x.x.setPartyAvailable(true);await handleCommand(assembleInteraction(f,x.x.guild),{db:f.db,gm:x.gm});
  assert.deepEqual(x.x.sent.private,beforePrivate,'unchanged, already acknowledged private scopes are retained');
  assert.equal(x.x.sent.party.length,1,'the known-unsent shared part is sent from the approved current plan once');
  assert.equal(f.db.getCityRecord(f.guild,'session_opening_job',f.session.id).data.attempts,2);
  const after=f.db.listCityRecords(f.guild,{kind:'session_opening_turn',includeGM:true,limit:20});
  assert.deepEqual(after.filter(row=>oldTurns.some(old=>old.record_key===row.record_key)),oldTurns,
    'retained old turns must keep their original attempt binding');
  assert.equal(after.filter(row=>!oldTurns.some(old=>old.record_key===row.record_key)).length,1,'the new party part has its own binding');
  await handleCommand(assembleInteraction(f,x.x.guild),{db:f.db,gm:x.gm});
  assert.equal(x.x.sent.party.length,1);assert.equal(x.calls,2);
}));

test('approved owner-hook replacement is explicit and delivers only the changed private thread',()=>nativeFixture(async f=>{
  const x=await prepareStalePartial(f,{changedOwnerHook:true}),beforePrivate=structuredClone(x.x.sent.private);
  const inspect=assembleInteraction(f,x.x.guild);await handleCommand(inspect,{db:f.db,gm:x.gm});
  const control=inspect.replies.at(-1)?.components?.flatMap(row=>row.components||[]).find(button=>button.custom_id?.startsWith('vcassemblyrefresh:'));
  assert(control);await handleCommand(refreshClick(f,x.x.guild,control.custom_id),{db:f.db,gm:x.gm});
  assert.deepEqual(x.x.sent.private,beforePrivate,'preparation alone sends nothing');
  x.x.setPartyAvailable(true);await handleCommand(assembleInteraction(f,x.x.guild),{db:f.db,gm:x.gm});
  assert.equal(x.x.sent.private.length,5,'the source-changed owner receives the new thread only after explicit review');
  assert.equal(x.x.sent.private.filter(message=>message.user===f.pcs[0].owner_user_id).length,2);
  assert.match(x.x.sent.private.at(-1).content,/Replacement owner-source thread/);
  assert.equal(x.x.sent.party.length,1);
}));

test('native uncertain private acknowledgement blocks sourced replacement',()=>nativeFixture(async f=>{
  const x=await prepareStalePartial(f,{uncertainUser:f.pcs[0].owner_user_id});
  const inspect=assembleInteraction(f,x.x.guild);await handleCommand(inspect,{db:f.db,gm:x.gm});
  const buttons=inspect.replies.at(-1)?.components?.flatMap(row=>row.components||[])||[];
  assert(!buttons.some(button=>button.custom_id?.startsWith('vcassemblyrefresh:')),'uncertain native output must use exact recovery, not replacement');
  assert.equal(x.calls,1);assert.equal(x.x.sent.party.length,0);
}));

test('refresh click is bound to original operator and review state and source',()=>nativeFixture(async f=>{
  const x=await prepareStalePartial(f),inspect=assembleInteraction(f,x.x.guild);await handleCommand(inspect,{db:f.db,gm:x.gm});
  const control=inspect.replies.at(-1)?.components?.flatMap(row=>row.components||[]).find(button=>button.custom_id?.startsWith('vcassemblyrefresh:'));
  assert(control);
  await assert.rejects(()=>handleCommand(refreshClick(f,x.x.guild,control.custom_id,{user:'other-operator'}),{db:f.db,gm:x.gm}));
  await assert.rejects(()=>handleCommand(refreshClick(f,x.x.guild,control.custom_id,{allowed:false}),{db:f.db,gm:x.gm}));
  f.db.upsertCharacterGmHook(f.guild,f.pcs[1].id,{key:'changed-after-review',title:'Changed review input',type:'entry_seed',premise:'Must invalidate the review.'});
  await assert.rejects(()=>handleCommand(refreshClick(f,x.x.guild,control.custom_id),{db:f.db,gm:x.gm}));
  assert.equal(x.calls,1,'stale review must fail before invoking the planner');
  const fresh=assembleInteraction(f,x.x.guild);await handleCommand(fresh,{db:f.db,gm:x.gm});
  const next=fresh.replies.at(-1)?.components?.flatMap(row=>row.components||[]).find(button=>button.custom_id?.startsWith('vcassemblyrefresh:'));
  assert(next);const job=f.db.getCityRecord(f.guild,'session_opening_job',f.session.id);
  indexWorldEvent(f.db,f.guild,{key:job.source_event,status:'retracted'});
  await assert.rejects(()=>handleCommand(refreshClick(f,x.x.guild,next.custom_id),{db:f.db,gm:x.gm}));
  assert.equal(x.calls,1,'revoked original native start source cannot authorize replacement planning');
}));

for(const change of ['source','owner','roster'])test(`${change} change during approved replacement planning fails the compare-and-set`,()=>nativeFixture(async f=>{
  const x=await prepareStalePartial(f),inspect=assembleInteraction(f,x.x.guild);await handleCommand(inspect,{db:f.db,gm:x.gm});
  const control=inspect.replies.at(-1)?.components?.flatMap(row=>row.components||[]).find(button=>button.custom_id?.startsWith('vcassemblyrefresh:'));
  assert(control);const oldPlan=f.db.getAssemblyPlan(f.session.id),beforePrivate=structuredClone(x.x.sent.private);
  x.gm.planAssembly=async()=>{
    if(change==='source')f.db.upsertCharacterGmHook(f.guild,f.pcs[2].id,{key:'changes-mid-refresh',title:'Concurrent review change',type:'entry_seed',premise:'CAS must hold this replacement.'});
    if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run('new-owner',f.pcs[0].id);
    if(change==='roster')f.db.setPresence(f.session.id,f.pcs[0].owner_user_id,'absent');
    return plan(f.db,f.guild,f.db.getActiveSession(f.guild));
  };
  await assert.rejects(()=>handleCommand(refreshClick(f,x.x.guild,control.custom_id),{db:f.db,gm:x.gm}));
  assert.deepEqual(f.db.getAssemblyPlan(f.session.id),oldPlan,'a raced planner cannot replace the saved source plan');
  assert.deepEqual(x.x.sent.private,beforePrivate);assert.equal(x.x.sent.party.length,0);
  assert.equal(f.db.getCityRecord(f.guild,'session_opening_job',f.session.id).data.attempts,1);
}));

test('replacement attempt limit prevents a second fresh-plan retry',()=>nativeFixture(async f=>{
  const x=await prepareStalePartial(f),inspect=assembleInteraction(f,x.x.guild);await handleCommand(inspect,{db:f.db,gm:x.gm});
  const control=inspect.replies.at(-1)?.components?.flatMap(row=>row.components||[]).find(button=>button.custom_id?.startsWith('vcassemblyrefresh:'));
  assert(control);await handleCommand(refreshClick(f,x.x.guild,control.custom_id),{db:f.db,gm:x.gm});
  x.x.setPartyAvailable(true);await handleCommand(assembleInteraction(f,x.x.guild),{db:f.db,gm:x.gm});
  f.db.upsertCharacterGmHook(f.guild,f.pcs[1].id,{key:'second-refresh-input',title:'Another changed input',type:'entry_seed',premise:'No third attempt.'});
  const second=assembleInteraction(f,x.x.guild);await handleCommand(second,{db:f.db,gm:x.gm});
  const buttons=second.replies.at(-1)?.components?.flatMap(row=>row.components||[])||[];
  assert(!buttons.some(button=>button.custom_id?.startsWith('vcassemblyrefresh:')),'attempt 2 is terminal for automatic replacement');
  assert.equal(x.calls,2);
}));

test('a failed planner consumes sibling reviews; only a newly inspected review may retry',()=>nativeFixture(async f=>{
  const x=await prepareStalePartial(f),controls=[];
  for(let i=0;i<2;i++){
    const inspect=assembleInteraction(f,x.x.guild);await handleCommand(inspect,{db:f.db,gm:x.gm});
    controls.push(inspect.replies.at(-1)?.components?.flatMap(row=>row.components||[]).find(button=>button.custom_id?.startsWith('vcassemblyrefresh:')));
  }
  assert(controls.every(Boolean),JSON.stringify(controls));let calls=0;x.gm.planAssembly=async()=>{calls++;throw Error('synthetic planner unavailable');};
  await assert.rejects(()=>handleCommand(refreshClick(f,x.x.guild,controls[0].custom_id),{db:f.db,gm:x.gm}));
  assert.equal(calls,1);
  await assert.rejects(()=>handleCommand(refreshClick(f,x.x.guild,controls[1].custom_id),{db:f.db,gm:x.gm}));
  assert.equal(calls,1,'a stale sibling approval must not perform another provider request after failure');
  const fresh=assembleInteraction(f,x.x.guild);await handleCommand(fresh,{db:f.db,gm:x.gm});
  const control=fresh.replies.at(-1)?.components?.flatMap(row=>row.components||[]).find(button=>button.custom_id?.startsWith('vcassemblyrefresh:'));
  assert(control,'an explicitly new inspection may offer a fresh review after failure, never reuse an old approval');
  assert.equal(x.x.sent.private.length,4);assert.equal(x.x.sent.party.length,0);
}));

for(const change of ['recipient','review-source'])test(`changed ${change} invalidates the exact review before planning`,()=>nativeFixture(async f=>{
  const x=await prepareStalePartial(f),inspect=assembleInteraction(f,x.x.guild);await handleCommand(inspect,{db:f.db,gm:x.gm});
  const control=inspect.replies.at(-1)?.components?.flatMap(row=>row.components||[]).find(button=>button.custom_id?.startsWith('vcassemblyrefresh:'));
  assert(control);
  if(change==='review-source'){
    const review=f.db.getCityRecord(f.guild,'assembly_refresh',control.custom_id.slice(18));
    indexWorldEvent(f.db,f.guild,{key:review.source_event,status:'retracted'});
  }else{
    const delivery=f.db.assemblyDeliveryRecords(f.guild,f.session.id).find(r=>r.data.scope.mode==='private'),
      publication=f.db.listTurnPublications(f.guild,delivery.data.turn_id)[0];
    f.db.db.prepare('UPDATE publication_outbox SET target_user_id=? WHERE id=?').run('different-recipient',publication.id);
  }
  await assert.rejects(()=>handleCommand(refreshClick(f,x.x.guild,control.custom_id),{db:f.db,gm:x.gm}));
  assert.equal(x.calls,1);assert.equal(x.x.sent.private.length,4);assert.equal(x.x.sent.party.length,0);
}));

test('distinct concurrent refresh tokens cannot start two planners',()=>nativeFixture(async f=>{
  const x=await prepareStalePartial(f),controls=[];
  for(let i=0;i<2;i++){
    const inspect=assembleInteraction(f,x.x.guild);await handleCommand(inspect,{db:f.db,gm:x.gm});
    controls.push(inspect.replies.at(-1)?.components?.flatMap(row=>row.components||[]).find(button=>button.custom_id?.startsWith('vcassemblyrefresh:')));
  }
  assert(controls.every(Boolean));let calls=0,release,started;
  const entered=new Promise(r=>{started=r;}),wait=new Promise(r=>{release=r;});
  x.gm.planAssembly=async()=>{calls++;started();await wait;return plan(f.db,f.guild,f.db.getActiveSession(f.guild));};
  const first=handleCommand(refreshClick(f,x.x.guild,controls[0].custom_id),{db:f.db,gm:x.gm});
  await entered;
  try{await assert.rejects(()=>handleCommand(refreshClick(f,x.x.guild,controls[1].custom_id),{db:f.db,gm:x.gm}));}
  finally{release();}
  await first;assert.equal(calls,1);assert.equal(x.x.sent.private.length,4);assert.equal(x.x.sent.party.length,0);
}));

test('revoked prepared replacement cannot publish after restart',()=>nativeFixture(async f=>{
  const x=await prepareStalePartial(f),inspect=assembleInteraction(f,x.x.guild);await handleCommand(inspect,{db:f.db,gm:x.gm});
  const control=inspect.replies.at(-1)?.components?.flatMap(row=>row.components||[]).find(button=>button.custom_id?.startsWith('vcassemblyrefresh:'));
  assert(control);await handleCommand(refreshClick(f,x.x.guild,control.custom_id),{db:f.db,gm:x.gm});
  const review=f.db.getCityRecord(f.guild,'assembly_refresh',control.custom_id.slice(18));
  indexWorldEvent(f.db,f.guild,{key:review.source_event,status:'retracted'});f.restart();x.x.setPartyAvailable(true);
  await handleCommand(assembleInteraction(f,x.x.guild),{db:f.db,gm:x.gm});
  assert.equal(x.x.sent.party.length,0);assert.equal(x.x.sent.private.length,4);assert.equal(x.calls,2);
  assert.equal(f.db.getCityRecord(f.guild,'session_opening_job',f.session.id).status,'needs_review');
}));
