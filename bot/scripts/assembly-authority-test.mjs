/** Real command and transport boundary: assembly candidates are not publication authority. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {GMService} from '../src/gm.js';
import {currentScene} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {prepareAssemblyOutput} from '../src/pvp-output.js';
import {queueTurnPublications,deliverTurnOutbox} from '../src/publication-outbox.js';

function fixture(f,{legacy=false}={}){
  for(const pc of f.pcs.slice(2))f.db.setPresence(f.session.id,pc.owner_user_id,'absent');
  f.db.db.prepare('UPDATE campaigns SET play_channel_id=? WHERE guild_id=?').run('play',f.guild);
  const sent={party:[],private:[],gm:[]};let sequence=0;
  const channel={id:'play',isTextBased:()=>true,send:async body=>{sent.party.push(typeof body==='string'?body:body.content);return {id:`party-${++sequence}`,channelId:'play'};}};
  const guild={id:f.guild,channels:{fetch:async id=>id==='play'?channel:null},members:{fetch:async user=>({send:async body=>{
    sent.private.push({user,content:typeof body==='string'?body:body.content});return {id:`dm-${++sequence}`,channelId:`dm-${user}`};}})}};
  const plan={public_opening:'Choso apologizes for losing. PRIVATE-GM-SECRET.',convergence_goal:'An optional shared scene.',gm_notes:'GM-ONLY-NOTES',bonds:[],
    character_entries:f.pcs.slice(0,2).map(pc=>({discord_user_id:pc.owner_user_id,character_name:pc.name,private_hook:'UNVERIFIED-HOOK other owner secret.',public_cue:'',stay_reason:''}))};
  if(legacy){const entry=plan.character_entries[0],text=`**Veilkeeper — private opening hook for ${entry.character_name}:**\n${entry.private_hook}`;
    const digest=createHash('sha256').update(text).digest('hex').slice(0,24);
    plan.delivery_state={[`private:${entry.discord_user_id}:0:${digest}`]:{status:'uncertain',surface:'private',attempts:1,
      error:'PvP output needs current independently verified clauses and audience proof.'}};
  }
  f.db.setAssemblyPlan(f.session.id,plan);
  const gm={planAssembly:async()=>{throw Error('Saved plan must not regenerate.');}};
  const interaction=(customId=null,{user='gm',authorized=true}={})=>({id:`assembly-${++sequence}`,guildId:f.guild,guild,user:{id:user,username:user},
    memberPermissions:{has:()=>authorized},commandName:'vc-session',customId,
    isChatInputCommand:()=>!customId,isButton:()=>!!customId,isStringSelectMenu:()=>false,
    options:{getSubcommand:()=> 'assemble',getSubcommandGroup:()=>null,getString:()=>null,getBoolean:()=>null,getInteger:()=>null},
    deferReply:async p=>sent.gm.push(p),editReply:async p=>sent.gm.push(p),reply:async p=>sent.gm.push(p),followUp:async p=>sent.gm.push(p)});
  return {guild,plan,sent,gm,interaction};
}
function buttons(sent){return sent.gm.flatMap(p=>p?.components||[]).flatMap(r=>r.components||[]);}

test('saved assembly sends verified private and public orientations through real command without raw hook/cross-PC prose',()=>nativeFixture(async f=>{
  const x=fixture(f),before=f.pcs.map(p=>f.db.getCharacter(p.id).data.resources);
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,2,JSON.stringify({gm:x.sent.gm,jobs:f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true})}));assert.equal(x.sent.party.length,1);
  for(const text of [...x.sent.private.map(p=>p.content),...x.sent.party]){
    assert(!/UNVERIFIED-HOOK|other owner secret|PRIVATE-GM-SECRET|Choso apologizes/.test(text));
    assert.match(text,/assembly/i);assert(text.length<=2000);
  }
  assert.equal(f.db.getAssemblyPlan(f.session.id).public_opening,x.plan.public_opening,'Saved candidate is retained, not regenerated.');
  assert.deepEqual(f.pcs.map(p=>f.db.getCharacter(p.id).data.resources),before);
  f.restart();await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,2);assert.equal(x.sent.party.length,1,'Delivered opening never duplicates after restart.');
  assert(x.sent.gm.some(p=>String(p?.content||p).includes('GM-ONLY-NOTES')));
}));

test('enabled scene recovery cannot reject native assembly scope lacking a player-authored scene question',()=>nativeFixture(async f=>{
  const x=fixture(f);f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scene_descriptions:true,post_projection_answers:true}});
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});assert.equal(x.sent.private.length,2,JSON.stringify(x.sent.gm));
  assert.equal(x.sent.party.length,1);assert(!x.sent.party[0].includes('No additional character response'));
}));

test('legacy uncertain hook holds only its recipient; GM confirms non-delivery then resumes saved plan once',()=>nativeFixture(async f=>{
  const x=fixture(f,{legacy:true});await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.filter(p=>p.user===f.pcs[0].owner_user_id).length,0);
  assert.equal(x.sent.private.filter(p=>p.user===f.pcs[1].owner_user_id).length,1,'Independent recipient is not falsely FAILED.');
  assert.equal(x.sent.party.length,1,JSON.stringify(x.sent.gm));const control=buttons(x.sent).find(b=>b.custom_id?.startsWith('vcassembly:'));
  assert(control,'GM-private explicit reconciliation, not a blind resend.');
  await assert.rejects(()=>handleCommand(x.interaction(control.custom_id,{user:f.pcs[0].owner_user_id,authorized:false}),{db:f.db,gm:x.gm}),/GM|permission/i);
  assert.equal(x.sent.private.length,1);
  await handleCommand(x.interaction(control.custom_id),{db:f.db,gm:x.gm});
  await handleCommand(x.interaction(control.custom_id),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,1,'Reconciliation itself does not send.');
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,2);assert.equal(x.sent.party.length,1);
}));

test('legacy reconciliation is bound to original plan and GM, never stale terms or forwarded control',()=>nativeFixture(async f=>{
  const x=fixture(f,{legacy:true});await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  const control=buttons(x.sent).find(b=>b.custom_id?.startsWith('vcassembly:'));assert(control,JSON.stringify(x.sent.gm));
  await assert.rejects(()=>handleCommand(x.interaction(control.custom_id,{user:'other-gm'}),{db:f.db,gm:x.gm}),/owner|GM|review|revision/i);
  f.db.setAssemblyPlan(f.session.id,{...f.db.getAssemblyPlan(f.session.id),convergence_goal:'Changed plan'});
  await assert.rejects(()=>handleCommand(x.interaction(control.custom_id),{db:f.db,gm:x.gm}),/changed|revision|stale/i);
}));

test('assembly preserves source-backed NPC dialogue but never promotes another owner private quote',()=>nativeFixture(async f=>{
  const x=fixture(f),scene=currentScene(f.db,f.guild),quote='The parcel counter closes at midnight.';
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});
  f.db.upsertNpcProfile(f.guild,{npcKey:'attendant',displayName:'Attendant',role:'attendant',publicIdentity:'PRIVATE-DOSSIER'});
  f.db.setSimulationEntity(f.guild,'npc','attendant',{location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:'assembly-npc-quote',kind:'observation',title:'Owner-private NPC statement',
    source_id:'human_gm',truth_status:'observed',visibility:'character',subject_key:f.pcs[0].id,session_id:scene.session_id,scene:scene.key,
    location_key:'terminal',details:{npc_key:'attendant',quote}},'offline-gm');
  f.db.upsertNpcKnowledge(f.guild,{npcKey:'attendant',knowledgeKey:'counter-hours',content:quote,sourceType:'observed',
    sourceRef:source.event_key,beliefState:'known',isSecret:false});
  const part={version:2,kind:'npc_composition',entity_key:'attendant',tone:'plain',beats:[
    {op:'quote',source_ref:source.event_key,knowledge_key:'counter-hours',source_span:quote}]};
  x.plan.character_entries[0].private_parts=[part];x.plan.character_entries[1].private_parts=[part];x.plan.public_parts=[part];
  f.db.setAssemblyPlan(f.session.id,x.plan);await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert(x.sent.private.find(p=>p.user===f.pcs[0].owner_user_id).content.includes(quote),JSON.stringify(x.sent));
  assert(!x.sent.private.find(p=>p.user===f.pcs[1].owner_user_id).content.includes(quote));
  assert(!x.sent.party.join('').includes(quote));assert(!JSON.stringify(x.sent.private).includes('PRIVATE-DOSSIER'));
}));

test('acknowledgement loss stays uncertain across restart without freezing other assembly recipients',()=>nativeFixture(async f=>{
  const x=fixture(f);let attempts=0;
  x.guild.members.fetch=async user=>({send:async body=>{
    if(user===f.pcs[0].owner_user_id){attempts++;throw Error('simulated acknowledgement loss');}
    x.sent.private.push({user,content:body});return {id:'other-ack',channelId:`dm-${user}`};}});
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert.equal(attempts,1);assert.equal(x.sent.private.length,1);assert.equal(x.sent.party.length,1);
  const job=f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true}).find(j=>j.data.scope.actorUserId===f.pcs[0].owner_user_id);
  assert.equal(f.db.listTurnPublications(f.guild,job.data.turn_id)[0].status,'uncertain');
  f.restart();await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert.equal(attempts,1);assert.equal(x.sent.party.length,1);assert.equal(x.sent.private.length,1);
  assert.equal(buttons(x.sent).length,0,'Native outbox uncertainty uses exact-part admin reconciliation, not legacy reset.');
}));

function queuedOrientation(f,x,scope){
  const result=prepareAssemblyOutput(f.db,f.guild,f.session.id,scope);
  const turn=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:'queued-assembly',
    actorPrincipal:scope.actorUserId||'__assembly__',audience:scope.mode});
  return {turn,rows:queueTurnPublications(f.db,{guild:x.guild,session:f.session,result,scope,turnId:turn.turn_id})};
}
for(const mismatch of ['owner','plan','source'])test(`deferred assembly revalidates ${mismatch} after restart before any transport`,()=>nativeFixture(async f=>{
  const x=fixture(f),pc=f.pcs[0],scope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const q=queuedOrientation(f,x,scope),before=f.db.getCharacter(pc.id).data.resources;
  if(mismatch==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,pc.id);
  if(mismatch==='plan')f.db.setAssemblyPlan(f.session.id,{...x.plan,convergence_goal:'Changed goal'});
  if(mismatch==='source'){
    const part=f.db.listCityRecords(f.guild,{kind:'pvp_output_part',includeGM:true}).find(p=>p.data.kind==='assembly_orientation');
    indexWorldEvent(f.db,f.guild,{key:part.source_event,status:'retracted'},'offline-gm');
  }
  f.restart();let sends=0;await deliverTurnOutbox(f.db,f.guild,q.turn.turn_id,async()=>{sends++;return {messageId:'unsafe',channelId:'unsafe'};});
  assert.equal(sends,0);assert(f.db.listTurnPublications(f.guild,q.turn.turn_id).every(r=>r.status!=='delivered'));
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources,before);
}));

test('concurrent assembly commands use one durable job and acknowledged send per scope',()=>nativeFixture(async f=>{
  const x=fixture(f);await Promise.all([handleCommand(x.interaction(),{db:f.db,gm:x.gm}),handleCommand(x.interaction(),{db:f.db,gm:x.gm})]);
  assert.equal(x.sent.private.length,2);assert.equal(x.sent.party.length,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true}).length,3);
}));

test('long GM assembly notes remain ephemeral bounded followups, never player payloads',()=>nativeFixture(async f=>{
  const x=fixture(f,{legacy:true});x.plan.gm_notes='GM-SECRET '.repeat(600);f.db.setAssemblyPlan(f.session.id,x.plan);
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert(x.sent.gm.filter(p=>p?.content).length>1);
  assert(x.sent.gm.every(p=>p.ephemeral===true));
  assert(x.sent.gm.every(p=>!p.content||p.content.length<=2000));
  assert(!JSON.stringify([...x.sent.private,...x.sent.party]).includes('GM-SECRET'));
  assert.equal(buttons(x.sent).length,1);
}));

test('assembly planning adds proof-bearing parts within its existing single structured request',()=>nativeFixture(async f=>{
  fixture(f);const gm=Object.create(GMService.prototype);gm.db=f.db;gm.config={maxContentChunks:1,assemblyModel:'offline',assemblyMaxOutputTokens:2000};
  gm.searchContent=()=>[];let requests=0;
  gm.requestStructured=async request=>{requests++;const schema=request.text.format.schema;
    assert(schema.required.includes('public_parts'));
    assert(schema.properties.character_entries.items.required.includes('private_parts'));
    function inspect(node){if(!node||typeof node!=='object')return;
      if(node.enum||node.const!==undefined)assert(node.type,'Every enum/const schema must declare its type.');
      for(const value of Object.values(node))if(Array.isArray(value))value.forEach(inspect);else inspect(value);
    }inspect(schema);return {public_opening:'GM proposal',character_entries:f.pcs.slice(0,2).map(pc=>({
      discord_user_id:pc.owner_user_id,character_id:pc.id,character_name:pc.name,hook_source_refs:[],private_hook:'GM proposal',private_parts:[]})),public_parts:[]};};
  await gm.planAssembly({guildId:f.guild});assert.equal(requests,1);
}));

test('acknowledged legacy hook is neither resent nor relabeled as newly certified delivery',()=>nativeFixture(async f=>{
  const x=fixture(f,{legacy:true}),key=Object.keys(x.plan.delivery_state)[0];
  x.plan.delivery_state[key]={...x.plan.delivery_state[key],status:'delivered',discord_message_id:'historical-ack',channel_id:'historical-dm'};
  f.db.setAssemblyPlan(f.session.id,x.plan);await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.filter(p=>p.user===f.pcs[0].owner_user_id).length,0);
  assert.equal(buttons(x.sent).length,0);
  assert.equal(f.db.getAssemblyPlan(f.session.id).delivery_state[key].discord_message_id,'historical-ack');
  assert(x.sent.gm.some(p=>p.content?.includes('LEGACY_DELIVERED')));
}));

test('demonstrably unsent native assembly retries only saved authorized output without plan regeneration',()=>nativeFixture(async f=>{
  const x=fixture(f),fetch=x.guild.members.fetch;x.guild.members.fetch=async user=>{
    if(user===f.pcs[0].owner_user_id)throw Error('Member lookup failed before send');return fetch(user);};
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  const job=f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true}).find(j=>j.data.scope.actorUserId===f.pcs[0].owner_user_id);
  const row=f.db.listTurnPublications(f.guild,job.data.turn_id)[0];assert.equal(row.status,'failed');assert.match(row.last_failure,/NOT_SENT:/);
  x.guild.members.fetch=fetch;f.restart();await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,2);assert.equal(x.sent.party.length,1);
  assert.equal(f.db.listTurnPublications(f.guild,job.data.turn_id)[0].status,'delivered');
}));
