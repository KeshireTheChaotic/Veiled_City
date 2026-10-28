/** Source/audience scene repair, actual GM/outbox adapters and owner-only initial setup. Temporary fixtures only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {FakeResponses} from './contract-fixtures.mjs';
import {ContentIndex} from '../src/content.js';
import {GMService} from '../src/gm.js';
import {captureWorldInput} from '../src/autonomous-world.js';
import {recordCharacterArrival} from '../src/scene-continuity.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {handleCommand} from '../src/commands.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {prepareStoredOutput} from '../src/pvp-output.js';
import {CITY_FEATURE_FLAGS,configureCityFlags} from '../src/city-core.js';
import {ContextPlanner} from '../src/context-planner.js';
import {spawnSync} from 'node:child_process';
import {prepareRollRequest} from '../src/roll-requests.js';
import {currentScene} from '../src/scene-continuity.js';
function response(f,text){
  const review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(k=>[k,{decision:'no_change',reason:'No mutation.',confidence:100}]));
  review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  return {respond:true,narration:'Unverified scene prose.',narrative_claims:[],gm_world_parts:[],
    player_intents:[{type:'other',source_span:text,target_name:'',target_key:'',destination:'unspecified',operation:'describe_scene',
      utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Owner scene query.'}],
    narrative_interpretation:null,world_additions:[],scene_actions:[],world_conflicts:[],context_memories:[],authored_candidates:null,
    private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],npc_knowledge:[],npc_goals:[],
    canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,state_review:review};
}

function setup(f,{mode='party',placed=true}={}){
  const pc=f.pcs[0],text='Describe the scene',messageId=`scene-repair-${mode}`,scope={mode,actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scene_descriptions:true,post_projection_answers:true,scene_continuity:true}});
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Parcel Terminal',visibility:'party'});
  if(placed)recordCharacterArrival(f.db,f.guild,pc,pc.owner_user_id,'scene-repair-arrival');
  else f.db.updateCharacterData(pc.id,d=>{delete d.location;});
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,text,{privateScene:mode==='private'});
  return {pc,text,messageId,scope};
}
async function turn(f,x,candidate=response(f,x.text),extra=[]){
  const ai=new FakeResponses([candidate,...extra]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',maxRecentMessages:10,maxContentChunks:2}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,
    messageText:x.text,messageId:x.messageId,scope:x.scope.mode});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:x.scope.mode});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:x.pc.name,label:'scene repair',
    meta:{messageId:x.messageId,turnId:attempt.turn_id}});
  return {ai,result,attempt,rows:f.db.listTurnPublications(f.guild,attempt.turn_id)};
}

test('SCENE01 split/unplaced siblings do not block an established public actor viewpoint',()=>nativeFixture(async f=>{
  const x=setup(f);f.db.updateCharacterData(f.pcs[1].id,d=>{delete d.location;});
  const fact=f.db.addFact(f.guild,{category:'scene',content:'A rain-streaked window overlooks the alley.',visibility:'party',
    provenance:{scene_location:'terminal',scene_observation:{version:1,subject:'window',quality:'rain-streaked',relation:'overlooks',target:'the alley'}}});
  const out=await turn(f,x);assert(out.rows.some(row=>row.payload.includes('rain-streaked')));
  assert(!out.rows.some(row=>row.payload.includes('shared presence has not been confirmed')));
  assert(f.db.getFact(f.guild,fact));assert.equal(f.db.getCharacter(f.pcs[1].id).data.location,undefined);
}));

test('SCENE02 no saved position gives specific owner-private setup guidance, not generic neutral text or invented arrival',()=>nativeFixture(async f=>{
  const x=setup(f,{placed:false}),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),out=await turn(f,x);
  const text=out.rows.map(row=>row.payload).join('\n');assert.match(text,/initial.*(?:position|location)|location.*not.*(?:set|established)/i);
  assert.match(text,/\/vc session present/);assert(!text.includes('No additional character response'));
  assert.equal(f.db.getCharacter(x.pc.id).data.location,undefined);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));

test('SCENE03 public question cannot reveal private saved position; private owner can use it',()=>nativeFixture(async f=>{
  const x=setup(f,{placed:false});f.db.updateCharacterData(x.pc.id,d=>{d.location='private-hideout';});
  f.db.setSimulationEntity(f.guild,'location','private-hideout',{name:'SECRET-HIDEOUT',visibility:'gm'});
  const out=await turn(f,x);assert(out.rows.every(row=>!row.payload.includes('private-hideout')&&!row.payload.includes('SECRET-HIDEOUT')));
}));

test('SETUP01 initial position requires exact owner selection and native receipts, never resolves earlier actions',()=>nativeFixture(async f=>{
  const api=await import('../src/frameworks/session/public.js'),x=setup(f,{placed:false}),before=f.db.getCharacter(x.pc.id).data.resources;
  const offer=api.prepareSceneSetup(f.db,f.guild,x.pc.owner_user_id,x.pc.id),choice=offer.options.find(o=>o.location==='terminal'&&o.visibility==='party');
  assert(choice);assert.equal(f.db.getCharacter(x.pc.id).data.location,undefined);
  const receipt=api.confirmSceneSetup(f.db,f.guild,x.pc.owner_user_id,offer.key,choice.value,{interactionId:'setup-choice'});
  assert.equal(receipt.status,'confirmed');assert.equal(f.db.getCharacter(x.pc.id).data.location,'terminal');
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'typed_intent',includeGM:true}).length,0);
  f.restart();const replay=api.confirmSceneSetup(f.db,f.guild,x.pc.owner_user_id,offer.key,choice.value,{interactionId:'setup-choice-again'});
  assert.equal(replay.record_key,receipt.record_key);assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,1);
}));

test('SETUP02 forwarded GM choice, stale source, locked location and existing placement history cannot authorize setup',()=>nativeFixture(async f=>{
  const api=await import('../src/frameworks/session/public.js'),x=setup(f,{placed:false});
  const offer=api.prepareSceneSetup(f.db,f.guild,x.pc.owner_user_id,x.pc.id),choice=offer.options.find(o=>o.location==='terminal'&&o.visibility==='party');
  assert.throws(()=>api.confirmSceneSetup(f.db,f.guild,f.pcs[1].owner_user_id,offer.key,choice.value),/owner|source|setup/i);
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal',visibility:'party',locked:true});
  assert.throws(()=>api.confirmSceneSetup(f.db,f.guild,x.pc.owner_user_id,offer.key,choice.value),/changed|setup|location|source/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.location,undefined);
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal',visibility:'party'});
  f.db.updateCharacterData(x.pc.id,d=>{d.location='terminal';});recordCharacterArrival(f.db,f.guild,f.db.getCharacter(x.pc.id),x.pc.owner_user_id,'history');
  f.db.updateCharacterData(x.pc.id,d=>{delete d.location;});
  assert.equal(api.prepareSceneSetup(f.db,f.guild,x.pc.owner_user_id,x.pc.id),null,'Missing stored position is not permission to bypass past movement.');
}));

test('SETUP03 withholding initial setup is neutral and does not create arrival or public presence',()=>nativeFixture(async f=>{
  const api=await import('../src/frameworks/session/public.js'),x=setup(f,{placed:false}),offer=api.prepareSceneSetup(f.db,f.guild,x.pc.owner_user_id,x.pc.id);
  const receipt=api.confirmSceneSetup(f.db,f.guild,x.pc.owner_user_id,offer.key,'decline',{interactionId:'declined'});
  assert.equal(receipt.status,'declined');assert.equal(f.db.getCharacter(x.pc.id).data.location,undefined);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true}).length,0);
}));

test('FRESHSCENE01 isolated scenery writer publishes expressive GM-owned framing without PC effects or secret input',()=>nativeFixture(async f=>{
  const x=setup(f),candidate=response(f,x.text),words='An uneven glow catches the counter edge while the building hums around the quiet parcel desk.';
  f.db.addFact(f.guild,{content:'GM-ONLY-SCENE-SECRET',visibility:'gm'});
  candidate.narration='Choso apologizes for losing. RAW-GM-CANDIDATE';
  candidate.gm_world_parts=[{version:6,kind:'scene_fresh_request',fact_refs:[]}];
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),out=await turn(f,x,candidate,[{description:words}]);
  assert.equal(out.ai.requests.length,2,'One conditional writer, never unconditional per clause.');
  const packet=JSON.parse(out.ai.requests[1].input);assert(!JSON.stringify(packet).includes('GM-ONLY-SCENE-SECRET'));
  assert(!JSON.stringify(packet).includes('RAW-GM-CANDIDATE'));assert(!JSON.stringify(packet).includes(x.pc.owner_user_id));
  const text=out.rows.map(row=>row.payload).join('\n');assert(text.includes(words));
  assert(!text.includes('Choso apologizes for losing.'));assert(!text.includes('GM-ONLY-SCENE-SECRET'));
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
  f.restart();let sends=0;await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>({messageId:`scene-${++sends}`,channelId:'offline'}));
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{throw Error('Must not resend acknowledged framing');});assert.equal(sends,out.rows.length);
}));

test('FRESHSCENE02 missing placement never triggers a writer',()=>nativeFixture(async f=>{
  const x=setup(f,{placed:false}),candidate=response(f,x.text);candidate.gm_world_parts=[{version:6,kind:'scene_fresh_request',fact_refs:[]}];
  const out=await turn(f,x,candidate);assert.equal(out.ai.requests.length,1);assert(out.rows.every(r=>!r.payload.includes('No additional character response')));
}));

for(const words of ['Choso apologizes for losing.','You are bleeding.','You accept the job.'])test(`FRESHSCENE03 writer PC material is held: ${words}`,()=>nativeFixture(async f=>{
  const x=setup(f),candidate=response(f,x.text);candidate.gm_world_parts=[{version:6,kind:'scene_fresh_request',fact_refs:[]}];
  const out=await turn(f,x,candidate,[{description:words}]);assert.equal(out.ai.requests.length,2);
  assert(out.rows.every(row=>!row.payload.includes(words)));assert(f.db.listCityRecords(f.guild,{kind:'scene_authoring_hold',includeGM:true}).length);
}));

test('FRESHSCENE04 revoked owner source holds queued framing after restart, without reauthoring or changing mechanics',()=>nativeFixture(async f=>{
  const x=setup(f),candidate=response(f,x.text);candidate.gm_world_parts=[{version:6,kind:'scene_fresh_request',fact_refs:[]}];
  const out=await turn(f,x,candidate,[{description:'A soft glow rests across the parcel counter.'}]);
  const row=f.db.listCityRecords(f.guild,{kind:'scene_fresh_authoring',includeGM:true})[0],before=f.db.getCharacter(x.pc.id).data.resources;
  indexWorldEvent(f.db,f.guild,{key:row.data.origin,status:'retracted'},'offline-gm');f.restart();let sent=0;
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{sent++;return {messageId:'unsafe',channelId:'offline'};});
  assert.equal(sent,0);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.equal(out.ai.requests.length,2);
}));

function interaction(f,sent,{customId=null,value=null,user=f.pcs[0].owner_user_id}={}){
  return {id:`setup-adapter-${sent.length}`,guildId:f.guild,guild:{id:f.guild},user:{id:user,username:user},commandName:'vc',customId,
    values:value===null?[]:[value],memberPermissions:{has:()=>false},isChatInputCommand:()=>!customId,isButton:()=>false,isStringSelectMenu:()=>!!customId,
    options:{getSubcommandGroup:()=> 'session',getSubcommand:()=> 'present',getString:()=>null,getBoolean:()=>null,getInteger:()=>null},
    reply:async p=>sent.push(p),deferReply:async p=>sent.push(p),editReply:async p=>sent.push(p),followUp:async p=>sent.push(p)};
}
test('SETUP04 real private command/selection adapter preserves private placement on repeated check-in',()=>nativeFixture(async f=>{
  const x=setup(f,{placed:false}),sent=[];
  await handleCommand(interaction(f,sent),{db:f.db,gm:{}});
  const control=sent.flatMap(p=>p?.components||[]).flatMap(row=>row.components||[]).find(c=>c.custom_id?.startsWith('vcsetup:'));
  assert(control);assert(sent.some(p=>p.ephemeral===true));
  const row=f.db.getCityRecord(f.guild,'scene_setup',control.custom_id.slice(8)),choice=row.data.options.find(o=>o.location==='terminal'&&o.visibility==='character');
  await assert.rejects(()=>handleCommand(interaction(f,sent,{customId:control.custom_id,value:choice.value,user:f.pcs[1].owner_user_id}),{db:f.db,gm:{}}));
  await handleCommand(interaction(f,sent,{customId:control.custom_id,value:choice.value}),{db:f.db,gm:{}});
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true})[0].visibility,'character');
  await handleCommand(interaction(f,sent),{db:f.db,gm:{}});
  assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_presence',includeGM:true})[0].visibility,'character');
}));

test('FRESHSCENE05 private framing stays owner-only and cannot be reused at a public/voice boundary',()=>nativeFixture(async f=>{
  const x=setup(f,{mode:'private'}),candidate=response(f,x.text);candidate.gm_world_parts=[{version:6,kind:'scene_fresh_request',fact_refs:[]}];
  candidate.narration='';const out=await turn(f,x,candidate,[{description:'Soft light rests across the parcel counter.'}]);
  assert.equal(out.ai.requests.length,2);assert(out.rows.every(r=>r.visibility==='character'&&r.target_character_id===x.pc.id&&r.target_user_id===x.pc.owner_user_id));
  assert.throws(()=>prepareStoredOutput(f.db,f.guild,out.result.narration,{...x.scope,mode:'party'}),/output|proof|audience/i);
}));

test('FRESHSCENE06 durable scene/NPC writer budget survives restart and never regenerates saved framing',()=>nativeFixture(async f=>{
  const x=setup(f),candidate=response(f,x.text),request={version:6,kind:'scene_fresh_request',fact_refs:[]};candidate.gm_world_parts=[request];
  await turn(f,x,candidate,[{description:'A soft glow rests on the parcel counter.'}]);
  const saved=f.db.listCityRecords(f.guild,{kind:'scene_fresh_authoring',includeGM:true})[0];f.restart();let calls=0;
  const {authorFreshSceneRequests}=await import('../src/fresh-scene-authoring.js');
  await authorFreshSceneRequests({db:f.db,guild:f.guild,result:candidate,scope:x.scope,sourceRef:saved.data.origin,budget:{used:false},
    generate:async()=>{calls++;throw Error('Never regenerate saved words');}});
  f.db.upsertNpcProfile(f.guild,{npcKey:'counter-attendant',displayName:'Attendant',role:'attendant'});
  f.db.setSimulationEntity(f.guild,'npc','counter-attendant',{location_key:'terminal',visibility:'party'});
  const {authorFreshNpcRequests}=await import('../src/fresh-npc-authoring.js');
  await authorFreshNpcRequests({db:f.db,guild:f.guild,result:{respond:true,gm_world_parts:[{version:3,kind:'npc_fresh_request',entity_key:'counter-attendant',focus:'conversation',source_refs:[]}]},
    scope:x.scope,sourceRef:saved.data.origin,budget:{used:false},generate:async()=>{calls++;return {utterance:'Hello.'};}});
  assert.equal(calls,0);assert(f.db.listCityRecords(f.guild,{kind:'npc_authoring_hold',includeGM:true}).length);
}));

test('SETUP05 source retraction, changed ownership and revised immutable options reject confirmation',()=>nativeFixture(async f=>{
  const {prepareSceneSetup,confirmSceneSetup}=await import('../src/frameworks/session/public.js'),x=setup(f,{placed:false});
  const offer=prepareSceneSetup(f.db,f.guild,x.pc.owner_user_id,x.pc.id),row=f.db.getCityRecord(f.guild,'scene_setup',offer.key);
  f.db.saveCityRecord(f.guild,{...row,key:offer.key,data:{...row.data,options:[{value:'0',location:'forged-vault',visibility:'party'}]}});
  assert.throws(()=>confirmSceneSetup(f.db,f.guild,x.pc.owner_user_id,offer.key,'0'),/setup|owner/i);
  const fresh=prepareSceneSetup(f.db,f.guild,x.pc.owner_user_id,x.pc.id),native=f.db.getCityRecord(f.guild,'scene_setup',fresh.key);
  indexWorldEvent(f.db,f.guild,{key:native.source_event,status:'retracted'},'offline-gm');
  assert.throws(()=>confirmSceneSetup(f.db,f.guild,x.pc.owner_user_id,fresh.key,fresh.options[0].value),/setup|owner/i);
  const last=prepareSceneSetup(f.db,f.guild,x.pc.owner_user_id,x.pc.id);
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,x.pc.id);
  assert.throws(()=>confirmSceneSetup(f.db,f.guild,x.pc.owner_user_id,last.key,last.options[0].value),/setup|owner/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.location,undefined);
}));

test('SCENE04 all supported flags enabled: owner setup then actual scene GM/outbox, without replay or extra provider calls',()=>nativeFixture(async f=>{
  const x=setup(f,{placed:false});configureCityFlags(f.db,f.guild,Object.fromEntries(CITY_FEATURE_FLAGS.map(flag=>[flag,true])),'offline-gm');
  const {prepareSceneSetup,confirmSceneSetup}=await import('../src/frameworks/session/public.js'),offer=prepareSceneSetup(f.db,f.guild,x.pc.owner_user_id,x.pc.id);
  confirmSceneSetup(f.db,f.guild,x.pc.owner_user_id,offer.key,offer.options.find(o=>o.visibility==='party').value,{interactionId:'all-flags-owner-choice'});
  const candidate=response(f,x.text);candidate.decision_advisory={mode:'narrate',check:'',reason:'Owner asks for surroundings, not a check.',
    uncertainty:'',consequence:'',referent_uncertainty:'',fictional_uncertainty:''};
  const before=f.db.getCharacter(x.pc.id).data.resources,out=await turn(f,x,candidate);
  assert.equal(out.ai.requests.length,1);assert(out.rows.every(row=>row.payload.includes('saved location')&&!row.payload.includes('No additional character response')));
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert(CITY_FEATURE_FLAGS.every(flag=>f.db.getCityCalendar(f.guild).flags[flag]===true));
}));

test('FRESHSCENE07 actual full character names do not let the short Choso apology evade the scene tripwire',()=>nativeFixture(async f=>{
  const x=setup(f),candidate=response(f,x.text);f.db.db.prepare('UPDATE characters SET name=? WHERE id=?').run('Choso Calesh',f.pcs[1].id);
  candidate.gm_world_parts=[{version:6,kind:'scene_fresh_request',fact_refs:[]}];
  const out=await turn(f,x,candidate,[{description:'Choso apologizes for losing.'}]);
  assert(out.rows.every(row=>!row.payload.includes('Choso apologizes for losing.')));
}));

test('FRESHSCENE08 framing authorship cannot become objective facts or general sourced setting memory',()=>nativeFixture(async f=>{
  const x=setup(f),candidate=response(f,x.text);candidate.gm_world_parts=[{version:6,kind:'scene_fresh_request',fact_refs:[]}];
  const before=f.db.listFactsForGM(f.guild,{}).length;
  await turn(f,x,candidate,[{description:'A soft amber glow rests across the parcel counter.'}]);
  const authored=f.db.listCityRecords(f.guild,{kind:'scene_fresh_authoring',includeGM:true})[0];
  assert.equal(authored.data.semantic_verification,false);assert.equal(f.db.listFactsForGM(f.guild,{}).length,before);
  const plan=new ContextPlanner(f.db).plan(f.guild,{actorType:'gm',scope:'gm',query:'soft amber glow'});
  assert(!plan.segments.some(row=>row.source===`event:${authored.source_event}`));
}));

test('SCENE05 independent scene service entrypoints initialize without circular schema dependencies',()=>{
  for(const file of ['fresh-scene-authoring.js','scene-description.js','frameworks/session/scene-setup-service.js']){
    const url=new URL(`../src/${file}`,import.meta.url).href;
    const child=spawnSync(process.execPath,['--import','./scripts/offline-guard.mjs','--input-type=module','-e',`await import(${JSON.stringify(url)});`],
      {encoding:'utf8',timeout:10000,env:{...process.env,OPENAI_API_KEY:'offline-dummy',DISCORD_TOKEN:'offline-dummy'}});
    assert.equal(child.status,0,`${file}: ${child.stderr}`);
  }
});

for(const deathStatus of [null,'pending_choice','unconscious'])test(`SCENE06 fully marked HP allows descriptive setup/narration but not ordinary actions: ${deathStatus}`,()=>nativeFixture(async f=>{
  const {prepareSceneSetup,confirmSceneSetup}=await import('../src/frameworks/session/public.js'),x=setup(f,{placed:false});
  f.db.updateCharacterData(x.pc.id,data=>{
    data.resources.hp.current=data.resources.hp.max;
    if(deathStatus)data.death_state={status:deathStatus,request:'unresolved-death'};
  });
  const before=structuredClone(f.db.getCharacter(x.pc.id).data),offer=prepareSceneSetup(f.db,f.guild,x.pc.owner_user_id,x.pc.id);
  assert(offer,'Initial-position confirmation is not travel or a character action.');
  const choice=offer.options.find(o=>o.location==='terminal'&&o.visibility==='party');
  confirmSceneSetup(f.db,f.guild,x.pc.owner_user_id,offer.key,choice.value,{interactionId:'marked-hp-setup'});
  const out=await turn(f,x),payload=out.rows.map(row=>row.payload).join('\n');
  assert(payload.includes('saved location'));assert(!payload.includes('No additional character response'));
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before.resources);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.death_state,before.death_state);
  const source=indexWorldEvent(f.db,f.guild,{key:'marked-hp-action',kind:'player_declaration',title:'I lift the crate.',source_id:`player:${x.pc.owner_user_id}`,
    session_id:f.session.id,scene:currentScene(f.db,f.guild).key,visibility:'character',subject_key:x.pc.id,
    details:{author:x.pc.owner_user_id,character_id:x.pc.id,content:'I lift the crate.'}},x.pc.owner_user_id);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,roll_requests:true}});
  assert.throws(()=>prepareRollRequest(f.db,f.guild,{source_event:source.event_key,character_id:x.pc.id},'offline-gm'),
    error=>error.code==='PC_NATIVE_ELIGIBILITY','Descriptive access never grants native action eligibility or an ability exception.');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0);
}));

test('FRESHSCENE09 fully marked HP does not silence owner-scoped scenery or grant character knowledge/actions',()=>nativeFixture(async f=>{
  const x=setup(f),candidate=response(f,x.text);
  f.db.updateCharacterData(x.pc.id,data=>{data.resources.hp.current=data.resources.hp.max;});
  const before=structuredClone(f.db.getCharacter(x.pc.id).data);
  candidate.gm_world_parts=[{version:6,kind:'scene_fresh_request',fact_refs:[]}];
  const text='A soft amber glow rests across the parcel counter.',out=await turn(f,x,candidate,[{description:text}]);
  assert(out.rows.some(row=>row.payload.includes(text)));assert.equal(out.ai.requests.length,2);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data,before,'Scenery does not heal, resolve death, assign knowledge or enact a PC action.');
}));
