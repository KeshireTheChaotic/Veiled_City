/** Source-grounded assembly integration: real command, proof, outbox and synthetic Discord I/O. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {GMService} from '../src/gm.js';
import {buildGmHooksExport} from '../src/character-export.js';
import {prepareAssemblyOutput} from '../src/pvp-output.js';
import {assemblyHookSources,assemblyInputFingerprint,certifyAssemblyPlan,assemblyPlanFreshness} from '../src/assembly-context.js';
import {assemblyHasHistory,prepareAssemblyRefresh,refreshAssemblyPlan} from '../src/assembly-planning.js';
import {queueTurnPublications,deliverTurnOutbox} from '../src/publication-outbox.js';
import {deliverVerifiedAssembly} from '../src/assembly-publications.js';
import {revalidateOutputPublication} from '../src/pvp-output.js';
import {assemblyDeliverySummary} from '../src/assembly-state.js';
import {assemblyNarrativeCandidate} from '../src/pvp-output.js';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {withOpeningWriter} from './opening-writer-fixture.mjs';

function setup(f){
  const pcs=f.pcs.slice(2);
  for(const pc of f.pcs.slice(0,2))f.db.setPresence(f.session.id,pc.owner_user_id,'absent');
  f.db.updateCharacterData(pcs[0].id,d=>{d.entry_hooks=['An unpaid telemetry invoice offers a lead into the failing station network.'];});
  f.db.updateCharacterData(pcs[1].id,d=>{d.entry_hooks=['An impossible-route bus card points toward a station entrance that changes overnight.'];});
  for(const [i,pc] of pcs.entries()){
    f.db.importCharacterGmHooks(f.guild,pc,{hooks:[{key:`private-${i}`,premise:`GM-SECRET-${i}`,suggested_entry:'A possible lead.',permission:'open_question'}]});
    f.db.upsertCharacterNarrative(f.guild,pc.id,'gm_private',`# Hidden answers\nGM-NARRATIVE-SECRET-${i}`);
  }
  f.db.db.prepare('UPDATE campaigns SET play_channel_id=? WHERE guild_id=?').run('table',f.guild);
  const sent={party:[],private:[],gm:[]};let sequence=0;
  const guild={id:f.guild,channels:{fetch:async id=>id==='table'?{id,isTextBased:()=>true,send:async body=>{
    sent.party.push(body.content||body);return {id:`public-${++sequence}`,channelId:id};}}:null},
    members:{fetch:async user=>({send:async body=>{sent.private.push({user,text:body.content||body});return {id:`private-${++sequence}`,channelId:`dm-${user}`};}})}};
  const interaction=(customId=null)=>({id:`command-${++sequence}`,guildId:f.guild,guild,user:{id:'gm',username:'gm'},memberPermissions:{has:()=>true},
    commandName:'vc-session',customId,isChatInputCommand:()=>!customId,isButton:()=>!!customId,isStringSelectMenu:()=>false,
    options:{getSubcommand:()=> 'assemble',getSubcommandGroup:()=>null,getString:()=>null,getBoolean:()=>null,getInteger:()=>null},
    deferReply:async p=>sent.gm.push(p),reply:async p=>sent.gm.push(p),editReply:async p=>sent.gm.push(p),followUp:async p=>sent.gm.push(p)});
  const plan={public_opening:'The two characters surrender their secrets and move to the station.',public_parts:[],convergence_goal:'Independent cases may overlap.',
    bonds:[],gm_notes:'GM-ONLY-CONVERGENCE',character_entries:pcs.map(pc=>({discord_user_id:pc.owner_user_id,character_name:pc.name,
      private_hook:'You accept the job and disclose the other character secret.',private_parts:[],public_cue:'',stay_reason:''}))};
  const gm=withOpeningWriter(f,{planAssembly:async()=>structuredClone(plan)});
  return {pcs,sent,guild,interaction,plan,gm};
}

test('exported GM hook package round-trips structured imported hooks and resolved status',()=>nativeFixture(f=>{
  const x=setup(f),pc=x.pcs[0],before=f.db.listCharacterGmHooks(f.guild,pc.id,{includeResolved:true});
  const packet=buildGmHooksExport(f.db.getCharacter(pc.id),f.db,f.guild);
  const result=f.db.importCharacterGmHooks(f.guild,pc,packet);
  assert(result.hooks>=before.length,'Export package silently imported zero hooks');
  const after=f.db.listCharacterGmHooks(f.guild,pc.id,{includeResolved:true});
  assert(after.some(h=>h.hook_key===before[0].hook_key&&h.premise===before[0].premise));
}));

test('two unrelated PCs receive their own source-bound opening through the real publication path',()=>nativeFixture(async f=>{
  const x=setup(f),before=x.pcs.map(p=>f.db.getCharacter(p.id).data);
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  const billy=x.sent.private.find(p=>p.user===x.pcs[0].owner_user_id)?.text||'';
  const tyrell=x.sent.private.find(p=>p.user===x.pcs[1].owner_user_id)?.text||'';
  assert.match(billy,/maintenance listing/);assert.match(tyrell,/route-change notice/i);
  assert(!billy.includes('An unpaid telemetry invoice'));assert(!tyrell.includes('An impossible-route bus card'));
  assert(!billy.includes('impossible-route'));assert(!tyrell.includes('telemetry'));
  assert(!JSON.stringify([...x.sent.private,...x.sent.party]).includes('GM-SECRET'));
  assert(!JSON.stringify([...x.sent.private,...x.sent.party]).includes('accept the job'));
  assert.deepEqual(x.pcs.map(p=>f.db.getCharacter(p.id).data),before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true}).length,3);
  f.restart();await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,2);assert.equal(x.sent.party.length,1);
}));

test('fallback is not reported as delivered original narrative hook',()=>nativeFixture(async f=>{
  const x=setup(f);
  delete x.gm.authorAssemblyScene;
  for(const pc of x.pcs)f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=[];});
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert(x.sent.gm.some(p=>/FALLBACK_DELIVERED/.test(p.content||'')),JSON.stringify(x.sent.gm));
  assert(x.sent.gm.some(p=>/missing_entitled_source/.test(p.content||'')));
}));

test('source selection alone cannot become substantive narrative through the common output boundary',()=>nativeFixture(f=>{
  const x=setup(f);f.db.setAssemblyPlan(f.session.id,x.plan);
  const scope={mode:'private',actorUserId:x.pcs[0].owner_user_id,actorCharacterId:x.pcs[0].id};
  const result=prepareAssemblyOutput(f.db,f.guild,f.session.id,scope);
  assert(!result.narration.includes('telemetry invoice'));assert.equal(result.assembly_evidence.narrative_verified,false);
}));

test('planner rejects missing or duplicate checked-in character entries',()=>nativeFixture(async f=>{
  setup(f);const gm=Object.create(GMService.prototype);gm.db=f.db;gm.config={maxContentChunks:1,assemblyModel:'offline',assemblyMaxOutputTokens:2000};
  gm.searchContent=()=>[];gm.requestStructured=async()=>({public_opening:'Rain falls.',public_parts:[],character_entries:[],bonds:[],gm_notes:'',convergence_goal:''});
  await assert.rejects(()=>gm.planAssembly({guildId:f.guild}),/roster|opening|entry/i);
}));

function livePlanner(f,x,generate){
  const gm=Object.create(GMService.prototype);gm.db=f.db;
  gm.config={maxContentChunks:1,assemblyModel:'offline',assemblyMaxOutputTokens:2000,gmTurnDeadlineMs:5000};gm.searchContent=()=>[];
  gm.requestStructured=async()=>({...x.plan,character_entries:x.plan.character_entries.map((e,i)=>({...e,character_id:x.pcs[i].id,
    hook_source_refs:assemblyHookSources(f.db,f.guild,x.pcs[i].id).slice(0,1).map(s=>s.id)}))});
  gm.generateNarrative=(_guild,packet)=>generate(packet);return gm;
}
function answer(packet,text){return {version:9,acts:[{id:'opening',task_id:packet.audience_v9.task_ids[0],kind:'scene_description',
  speaker_key:'',location_key:packet.place.key,text,source_refs:[]}],fiction_delta:[]};}

test('GM planner source catalog and isolated expressive writer preserve private hooks and playable public scene',()=>nativeFixture(async f=>{
  const x=setup(f),packets=[];
  const gm=livePlanner(f,x,async packet=>{
    packets.push(structuredClone(packet));const scope=packet.audience.subject_key;
    if(!scope)return answer(packet,'A rain-streaked concourse noticeboard carries night maintenance listings beside route-change notices. A service window is open for questions.');
    const source=packet.assembly_brief.sources[0]?.text||'';
    return answer(packet,source.includes('telemetry')?'A late-night network maintenance listing has a contact number beside an invoice-query notice.'
      :'A route-change notice has a public inquiry number beside a sketch of an unusual station entrance.');
  });
  await handleCommand(x.interaction(),{db:f.db,gm});
  assert.equal(packets.length,3,JSON.stringify({jobs:f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true}),
    reviews:f.db.listCityRecords(f.guild,{kind:'narrative_unit_review',includeGM:true}),gm:x.sent.gm}));
  assert.equal(packets[0].audience.mode,'party');assert.equal(packets[0].assembly_brief.sources.length,0);
  assert(!JSON.stringify(packets[0]).includes('telemetry invoice'));
  assert(!JSON.stringify(packets).includes('GM-NARRATIVE-SECRET'));
  for(const pc of x.pcs){
    const packet=packets.find(p=>p.audience.subject_key===pc.id),other=x.pcs.find(p=>p.id!==pc.id);
    assert(packet.assembly_brief.sources.every(s=>s.character_id===pc.id));
    assert(!JSON.stringify(packet).includes(assemblyHookSources(f.db,f.guild,other.id)[0].text));
  }
  assert.match(x.sent.party.join('\n'),/maintenance listings.*route-change/);
  assert(!JSON.stringify(x.sent.party).includes('GM-SECRET'));
  assert(x.sent.private.every(p=>/contact number|inquiry number/.test(p.text)));
  assert(assemblyDeliverySummary(f.db,f.guild,f.session).filter(s=>s.scope.mode==='private').every(s=>s.evidence.narrative_verified));
  f.restart();await handleCommand(x.interaction(),{db:f.db,gm});assert.equal(packets.length,3);assert.equal(x.sent.private.length,2);
}));

for(const forced of ['Billy accepts the job and moves inside.','Tyrell reveals the hidden card to Billy.','You surrender and agree to cooperate.'])
  test(`unverified assembly writer consequence is quarantined: ${forced}`,()=>nativeFixture(async f=>{
    const x=setup(f),gm=livePlanner(f,x,async packet=>answer(packet,forced)),before=x.pcs.map(p=>f.db.getCharacter(p.id).data);
    await handleCommand(x.interaction(),{db:f.db,gm});
    assert(![...x.sent.party,...x.sent.private.map(p=>p.text)].some(t=>t.includes(forced)));
    assert.deepEqual(x.pcs.map(p=>f.db.getCharacter(p.id).data),before);
    assert(f.db.listCityRecords(f.guild,{kind:'narrative_unit_review',includeGM:true}).length>0);
    assert(x.sent.private.every(p=>!p.text.includes('Your character material')),'Rejected fiction never falls back to source recitation.');
    assert(assemblyDeliverySummary(f.db,f.guild,f.session).every(s=>!s.evidence.narrative_verified));
  }));

test('player Markdown supplies owner-private opening without sheet hooks or separate GM import',()=>nativeFixture(async f=>{
  const x=setup(f),pc=x.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=[];});
  f.db.db.prepare('DELETE FROM character_gm_hooks WHERE character_id=?').run(pc.id);
  f.db.db.prepare('DELETE FROM character_narratives WHERE character_id=?').run(pc.id);
  f.db.upsertCharacterNarrative(f.guild,pc.id,'player','# Billy\n\nAn overdue lease and a missing circuit diagram are the current personal thread.');
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  const own=x.sent.private.find(p=>p.user===pc.owner_user_id),other=x.sent.private.find(p=>p.user!==pc.owner_user_id);
  assert.match(own.text,/service window/);assert(!own.text.includes('An overdue lease'));assert(!other.text.includes('missing circuit diagram'));
}));

test('GM-only Markdown is retained for planning but does not become player knowledge without an entitled source',()=>nativeFixture(async f=>{
  const x=setup(f),pc=x.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=[];});
  const gm=livePlanner(f,x,async packet=>answer(packet,'Rain taps against an empty noticeboard.'));
  let plannerInput='';const request=gm.requestStructured;gm.requestStructured=async q=>{plannerInput=q.input;return request(q);};
  await handleCommand(x.interaction(),{db:f.db,gm});
  assert(plannerInput.includes('GM-NARRATIVE-SECRET-0'));
  assert(!JSON.stringify([...x.sent.private,...x.sent.party]).includes('GM-NARRATIVE-SECRET'));
  assert(!assemblyDeliverySummary(f.db,f.guild,f.session).find(s=>s.scope.actorCharacterId===pc.id).evidence.hook_verified);
}));

for(const mismatch of ['hook','narrative','owner','recipient','scene','payload','source','plan'])
  test(`deferred source-bound hook rejects ${mismatch} mismatch after restart`,()=>nativeFixture(async f=>{
    const x=setup(f),pc=x.pcs[0];
    f.db.setAssemblyPlan(f.session.id,certifyAssemblyPlan(f.db,f.guild,f.session,x.plan));
    const scope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
    const result=prepareAssemblyOutput(f.db,f.guild,f.session.id,scope);
    const turn=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:'deferred',actorPrincipal:pc.owner_user_id,audience:'private'});
    const rows=queueTurnPublications(f.db,{guild:x.guild,session:f.session,result,scope,turnId:turn.turn_id});assert(rows.length);
    if(mismatch==='hook')f.db.updateCharacterData(pc.id,d=>{d.entry_hooks=['A changed lead.'];});
    if(mismatch==='narrative')f.db.upsertCharacterNarrative(f.guild,pc.id,'gm_private','# Changed hidden planning revision');
    if(mismatch==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run('new-owner',pc.id);
    if(mismatch==='recipient')f.db.db.prepare('UPDATE publication_outbox SET target_user_id=? WHERE id=?').run(x.pcs[1].owner_user_id,rows[0].id);
    if(mismatch==='scene')f.db.db.prepare("UPDATE sessions SET director_state_json=json_set(director_state_json,'$.scene_number',2) WHERE id=?").run(f.session.id);
    if(mismatch==='payload')f.db.db.prepare('UPDATE publication_outbox SET payload=? WHERE id=?').run('Billy surrenders.',rows[0].id);
    if(mismatch==='source'){
      const part=f.db.listCityRecords(f.guild,{kind:'pvp_output_part',includeGM:true}).find(p=>p.data.kind==='assembly_orientation');
      f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE event_key=?").run(part.source_event);
    }
    if(mismatch==='plan')f.db.setAssemblyPlan(f.session.id,{...f.db.getAssemblyPlan(f.session.id),public_opening:'Changed proposal'});
    f.restart();let sends=0;
    await deliverTurnOutbox(f.db,f.guild,turn.turn_id,async()=>{sends++;return {messageId:'unsafe'};});
    assert.equal(sends,0);assert(f.db.listTurnPublications(f.guild,turn.turn_id).every(r=>r.status!=='delivered'));
  }));

test('hook revision invalidates an undelivered plan without resetting transport history',()=>nativeFixture(f=>{
  const x=setup(f),plan=certifyAssemblyPlan(f.db,f.guild,f.session,x.plan);f.db.setAssemblyPlan(f.session.id,plan);
  assert.equal(assemblyPlanFreshness(f.db,f.guild,f.session,plan),'current');
  f.db.updateCharacterData(x.pcs[0].id,d=>{d.entry_hooks.push('Another independent source.');});
  assert.equal(assemblyPlanFreshness(f.db,f.guild,f.session,plan),'stale');assert(!assemblyHasHistory(f.db,f.guild,f.session,plan));
}));

test('delivered stale plan needs explicit GM replacement; preparation sends nothing and retains acknowledged parts',()=>nativeFixture(async f=>{
  const x=setup(f);await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  const ids=f.db.listCityRecords(f.guild,{kind:'assembly_delivery',includeGM:true}).flatMap(j=>f.db.listTurnPublications(f.guild,j.data.turn_id).map(r=>r.id));
  f.db.updateCharacterData(x.pcs[0].id,d=>{d.entry_hooks=['A revised telemetry source.'];});
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});assert.equal(x.sent.private.length,2);
  assert(x.sent.gm.some(p=>p.content?.includes('STALE PLAN')));
  const key=prepareAssemblyRefresh(f.db,f.guild,f.session,'gm');assert(key);
  await assert.rejects(()=>refreshAssemblyPlan(f.db,f.guild,'forwarded-gm',key,x.gm,{authorized:true}),/authenticated GM/);
  await refreshAssemblyPlan(f.db,f.guild,'gm',key,x.gm,{authorized:true});assert.equal(x.sent.private.length,2);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'assembly_plan_history',includeGM:true}).length,1);
  for(const id of ids)assert.equal(f.db.db.prepare('SELECT status FROM publication_outbox WHERE id=?').get(id).status,'delivered');
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});assert.equal(x.sent.private.length,3,'Unchanged personal thread is not resent.');
  assert.equal(x.sent.party.length,1,'An unchanged fallback is not resent.');
  f.restart();await handleCommand(x.interaction(),{db:f.db,gm:x.gm});assert.equal(x.sent.private.length,3);
}));

test('changed attendance cannot retain the original private recipient',()=>nativeFixture(async f=>{
  const x=setup(f);await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  f.db.setPresence(f.session.id,x.pcs[1].owner_user_id,'absent');
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});assert.equal(x.sent.private.length,2);
  assert(x.sent.gm.some(p=>p.content?.includes('STALE PLAN')));
}));

test('export/import preserves resolved hook payload and targets; empty/malformed packets fail atomically',()=>nativeFixture(f=>{
  const x=setup(f),pc=x.pcs[0];f.db.importCharacterGmHooks(f.guild,pc,{hooks:[{key:'historical',premise:'An old proposal.',status:'resolved',
    targets:[{type:'entity',label:'Archive'}],custom:{a:1}}]});
  const packet=buildGmHooksExport(f.db.getCharacter(pc.id),f.db,f.guild);
  f.db.importCharacterGmHooks(f.guild,pc,packet);
  const h=f.db.listCharacterGmHooks(f.guild,pc.id,{includeResolved:true}).find(r=>r.hook_key==='historical');
  assert.equal(h.status,'resolved');assert.deepEqual(h.payload.custom,{a:1});assert.equal(h.payload.targets[0].label,'Archive');
  const count=f.db.listCharacterGmHooks(f.guild,pc.id,{includeResolved:true}).length;
  assert.throws(()=>f.db.importCharacterGmHooks(f.guild,pc,{hooks:[]}),/nothing imported/);
  assert.throws(()=>f.db.importCharacterGmHooks(f.guild,pc,{hooks:[{key:'good',premise:'Good.'},{key:'bad'}]}),/premise/);
  assert.equal(f.db.listCharacterGmHooks(f.guild,pc.id,{includeResolved:true}).length,count);
}));

test('certified plan refuses cross-character source selection and source changes during generation',()=>nativeFixture(f=>{
  const x=setup(f),fingerprint=assemblyInputFingerprint(f.db,f.guild,f.session);
  x.plan.character_entries[0].hook_source_refs=[assemblyHookSources(f.db,f.guild,x.pcs[1].id)[0].id];
  assert.throws(()=>certifyAssemblyPlan(f.db,f.guild,f.session,x.plan),/applicable/);
  delete x.plan.character_entries[0].hook_source_refs;
  f.db.updateCharacterData(x.pcs[0].id,d=>{d.entry_hooks=['New revision'];});
  assert.throws(()=>certifyAssemblyPlan(f.db,f.guild,f.session,x.plan,{fingerprint}),/changed during generation/);
}));

test('sheet-only character gets a meaningful opening without a GM hook import',()=>nativeFixture(async f=>{
  const x=setup(f),pc=x.pcs[0];f.db.db.prepare('DELETE FROM character_gm_hooks WHERE character_id=?').run(pc.id);
  f.db.db.prepare('DELETE FROM character_narratives WHERE character_id=?').run(pc.id);
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert.match(x.sent.private.find(p=>p.user===pc.owner_user_id).text,/maintenance listing/);
}));

test('undelivered stale plan is regenerated by the actual assemble adapter using current hook sources',()=>nativeFixture(async f=>{
  const x=setup(f);f.db.setAssemblyPlan(f.session.id,certifyAssemblyPlan(f.db,f.guild,f.session,x.plan));
  f.db.updateCharacterData(x.pcs[0].id,d=>{d.entry_hooks=['A newly imported circuit-diagram enquiry is the personal lead.'];});
  let plans=0;x.gm.planAssembly=async()=>{plans++;return structuredClone(x.plan);};
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert.equal(plans,1);assert.match(x.sent.private.find(p=>p.user===x.pcs[0].owner_user_id).text,/service window/);
  assert.equal(assemblyPlanFreshness(f.db,f.guild,f.session,f.db.getAssemblyPlan(f.session.id)),'current');
}));

test('GM refresh component prepares replacement without sending; repeated click has no duplicate effect',()=>nativeFixture(async f=>{
  const x=setup(f);f.db.setAssemblyPlan(f.session.id,x.plan);
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  const control=x.sent.gm.flatMap(p=>p.components||[]).flatMap(r=>r.components||[]).find(c=>c.custom_id?.startsWith('vcassemblyrefresh:'));
  assert(control);const before=x.sent.private.length;
  await handleCommand(x.interaction(control.custom_id),{db:f.db,gm:x.gm});
  await handleCommand(x.interaction(control.custom_id),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,before);
  await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  assert.equal(x.sent.private.length,before+2,'Explicit refresh delivers substantive v9 fiction after historical orientation; the old orientation is not a completed opening.');
  f.restart();await handleCommand(x.interaction(),{db:f.db,gm:x.gm});assert.equal(x.sent.private.length,before+2,'Acknowledged narrative is never resent.');
}));

test('model-shaped assembly source cannot mint the command-owned creative capability',()=>nativeFixture(f=>{
  const x=setup(f);f.db.setAssemblyPlan(f.session.id,certifyAssemblyPlan(f.db,f.guild,f.session,x.plan));
  const scope={mode:'private',actorUserId:x.pcs[0].owner_user_id,actorCharacterId:x.pcs[0].id};
  const real=assemblyNarrativeCandidate(f.db,f.guild,f.session.id,scope).source;
  const forged=indexWorldEvent(f.db,f.guild,{key:'forged-assembly',title:'Untrusted assembly-shaped request',kind:real.kind,source_id:'native:assembly',session_id:f.session.id,
    scene:real.scene,visibility:'character',subject_key:scope.actorCharacterId,details:real.details},scope.actorUserId);
  assert.throws(()=>buildNarrativeContext(f.db,f.guild,scope,forged.event_key),/authority_disabled|authenticated/);
  assert(buildNarrativeContext(f.db,f.guild,scope,real.event_key).packet.assembly_brief.sources.length);
}));

test('direct publication preparation rejects a stale plan even before normal command freshness handling',()=>nativeFixture(f=>{
  const x=setup(f);f.db.setAssemblyPlan(f.session.id,certifyAssemblyPlan(f.db,f.guild,f.session,x.plan));
  f.db.upsertCharacterNarrative(f.guild,x.pcs[1].id,'gm_private','# New private planning revision');
  assert.throws(()=>prepareAssemblyOutput(f.db,f.guild,f.session.id,{mode:'private',actorUserId:x.pcs[0].owner_user_id,
    actorCharacterId:x.pcs[0].id}),/stale/);
}));

test('new authoritative canon invalidates an undelivered assembly plan',()=>nativeFixture(f=>{
  const x=setup(f),plan=certifyAssemblyPlan(f.db,f.guild,f.session,x.plan);f.db.setAssemblyPlan(f.session.id,plan);
  f.db.proposeCanon(f.guild,{key:'station-status',value:'The terminal is closed for a declared inspection.',sourceType:'human_gm',sourceId:'gm'});
  assert.equal(assemblyPlanFreshness(f.db,f.guild,f.session,plan),'stale');
}));

test('concurrent refresh clicks reserve one planner request and never duplicate publication',()=>nativeFixture(async f=>{
  const x=setup(f);await handleCommand(x.interaction(),{db:f.db,gm:x.gm});
  f.db.updateCharacterData(x.pcs[0].id,d=>{d.entry_hooks=['A revised enquiry.'];});
  const key=prepareAssemblyRefresh(f.db,f.guild,f.session,'gm');let calls=0,release;
  const gate=new Promise(resolve=>{release=resolve;});
  const gm={planAssembly:async()=>{calls++;await gate;return structuredClone(x.plan);}};
  const first=refreshAssemblyPlan(f.db,f.guild,'gm',key,gm,{authorized:true});
  const second=refreshAssemblyPlan(f.db,f.guild,'gm',key,gm,{authorized:true});
  const results=Promise.allSettled([first,second]);release();await results;
  assert.equal(calls,1,'Duplicate GM clicks must not duplicate paid planning work.');
  assert.equal(x.sent.private.length,2,'Preparation never sends.');
}));
