/** One compact semantic regression table. Existing provider doubles, native services, disposable SQLite only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate,unit} from './narrative-fixtures.mjs';
import {FakeResponses} from './contract-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence,scenePresence} from '../src/scene-continuity.js';
import {persistPlayerIntents,persistTypedDialogue} from '../src/typed-intents.js';
import {persistAuthoredCandidates} from '../src/authored-candidates.js';
import {captureContextSource,contextSourceKey} from '../src/narrative-context.js';
import {semanticResponseObligation} from '../src/gameplay-intake.js';
import {pacingAdvice} from '../src/story-continuity.js';
const content=new ContentIndex(path.resolve('../content'));
const creative='Amber dryer windows glow over the folding counter; warm cotton scents the narrow laundromat.';
const answer=(location='terminal',text=creative,kind='scene',fields={})=>({narrative_units:[unit('scene-response',kind,text,{location_key:location,...fields})],fiction_delta:[]});
const intent=(text,fields={})=>({...candidate(text).player_intents[0],...fields});
function base(f,text,{privateScene=false}={}){
  const x=setup(f,{text,privateScene});f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,natural_language:true,dialogue_history:true}});
  captureContextSource(f.db,f.guild,x.pc.owner_user_id,x.pc.id,x.messageId,text,{privateScene});return x;
}
function npc(f,x,key='attendant',{hidden=false,location='terminal'}={}){
  if(location!=='terminal')f.db.setSimulationEntity(f.guild,'location',location,{name:'Separate remote room',visibility:'party'});
  f.db.upsertNpcProfile(f.guild,{npcKey:key,displayName:key==='attendant'?'Inez Vale':'Mara Vale',role:'woman behind the counter',activityTier:'background'});
  f.db.setSimulationEntity(f.guild,'npc',key,{name:key,location_key:location,visibility:hidden?'character':'party',subject_character_id:hidden?f.pcs[1].id:null,hidden});
  const source=indexWorldEvent(f.db,f.guild,{key:'npc-present:'+key,kind:'observation',title:'Native fixture NPC presence',source_id:'native:fixture',scene:currentScene(f.db,f.guild).key,
    session_id:f.session.id,location_key:location,visibility:'party',truth_status:'observed',details:{}},'native:fixture');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:key,location_key:location,zone:'interior',source_event:source.event_key,visibility:'party',accepted_by:'native:fixture'},'native:fixture');
}
async function play(f,text,{route=false,moving=false,samePlace=false,mixed=false,held=false,speech=null,observe=false,otherQuery=false,restart=false,omitted=false}={}){
  const x=base(f,text),r=candidate(text);r.player_intents=[];
  if(moving){
    f.db.setSimulationEntity(f.guild,'location','twenty-four-spin',{name:'Twenty-Four Spin',place_type:'laundromat',parent_location_key:'terminal',visibility:'party',access:'public'});
    f.db.upsertReference(f.guild,{kind:'location',key:'twenty-four-spin',name:'Twenty-Four Spin',summary:'An established public laundromat.',visibility:'party'});
    if(samePlace){
      f.db.updateCharacterData(x.pc.id,d=>{d.location='twenty-four-spin';});
      const exterior=indexWorldEvent(f.db,f.guild,{key:'fixture-exterior',kind:'arrival',title:'Verified exterior placement',source_id:'native:fixture',session_id:f.session.id,
        scene:currentScene(f.db,f.guild).key,location_key:'twenty-four-spin',visibility:'party',details:{entity_type:'character',entity_key:x.pc.id,owner_user_id:x.pc.owner_user_id}},'native:fixture');
      recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:x.pc.id,location_key:'twenty-four-spin',zone:'exterior',source_event:exterior.event_key,visibility:'party',accepted_by:x.pc.owner_user_id},'native:fixture');
    }
    r.player_intents=[intent(text,{type:'move',operation:'move',resolution:'auto',destination:'interior',target_name:'Twenty-Four Spin',target_key:'twenty-four-spin'})];
    r.scene_actions=[{kind:'move',entity_ref:'twenty-four-spin',source_span:text,zone:'interior'}];
  }else r.player_intents=[intent(text,{type:observe?'observe':'other',operation:observe?'appearance':'describe_scene',target_key:observe?'terminal':''})];
  if(otherQuery){r.player_intents[0].source_span='Describe the scene';
    r.player_intents.push(intent('what does Choso look like?',{type:'observe',operation:'appearance',target_name:'Choso',target_key:f.pcs[1].id}));}
  if(speech){npc(f,x);r.gm_world_parts[0].operation='conversation';}
  if(omitted)r.gm_world_parts=[]; // Keep mandatory typed interpretation; omission concerns creative delegation only.
  const writer=answer(moving?'twenty-four-spin':'terminal',held?'Choso surrenders.':speech||creative,speech?'npc_speech':'scene',speech?{subject_key:'attendant',epistemic:'testimony'}:{});
  const classification={respond:true,reason:'Synthetic contextual classification',engagement_kind:mixed?'action':'scene_description',observation_only:!mixed,target_scope:'current_location'};
  const ai=new FakeResponses(route?[classification,...(mixed?[r,writer]:[writer])]:[r,writer]);
  const gm=new GMService({db:f.db,content,ai,config:{gmModel:'offline',routerModel:'offline-router',routineGmModel:'offline',maxRecentMessages:2,maxContentChunks:1,playableObservationFastPath:route}});
  let engagement=null;
  if(route){const should=await gm.shouldRespond({guildId:f.guild,message:{id:x.messageId,content:text,author:{id:x.pc.owner_user_id,username:'fixture'}},mode:'active',onInterpretation:value=>{engagement=value;}});
    assert(should);assert(engagement,'Existing semantic router must hand off current classification without another call.');}
  let result;
  try{result=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,messageId:x.messageId,messageText:text,scope:x.scope.mode,engagement});}
  catch(error){const diagnostics=f.db.listCityRecords(f.guild,{includeGM:true,limit:30}).filter(row=>/authoring|draft|review|fates/.test(row.kind)).map(row=>({kind:row.kind,status:row.status,reason:row.data.reason,binding:row.data.binding}));
    error.stack+=`\nFixture native diagnostics: ${JSON.stringify(diagnostics)}\nFixture correction: ${String(ai.requests.at(-1)?.input).match(/STRUCTURED TURN CORRECTION:[\s\S]{0,1000}/)?.[0]||'none'}`;throw error;}
  const turn=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:x.scope.mode});
  commitGmTurn({db:f.db,content,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:x.pc.name,label:'Semantic regression',meta:{turnId:turn.turn_id,messageId:x.messageId}});
  const sent=[],start=performance.now(),send=async row=>{sent.push(row.payload);return {id:'fake-'+row.id};};
  await deliverTurnOutbox(f.db,f.guild,turn.turn_id,send);const first_payload_ms=performance.now()-start;
  if(restart){f.restart();await deliverTurnOutbox(f.db,f.guild,turn.turn_id,send);}
  return {x,result,text:sent.join('\n'),sent,calls:ai.requests.length,requests:ai.requests,first_payload_ms,turn:turn.turn_id};
}
async function clause(f,text,span,{framing='immediate',start=text.indexOf(span),quote='',target=''}={}){
  const x=base(f,text),i=intent(span,{type:quote?'speak':'search',operation:quote?'conversation':'inspect',framing,utterance:quote,target_key:target});
  const typed=persistPlayerIntents(f.db,f.guild,[i],x.scope,{messageId:x.messageId});
  const c={version:2,kind:quote?'speech':'action',source_ref:contextSourceKey(x.messageId,x.pc.id),source_span:span,target,quote,start,end:start+span.length,framing};
  const rows=persistAuthoredCandidates(f.db,f.guild,[c],x.scope,{messageId:x.messageId,typedIntents:typed});return {x,rows,typed};
}
async function dialogue(f,text,{ambiguous=false,hidden=false,remote=false,proxy=false,privateScene=false,accepted=true,repeat=false}={}){
  const x=base(f,text,{privateScene});npc(f,x,'attendant',{hidden,location:remote?'remote':'terminal'});if(ambiguous)npc(f,x,'second-attendant');
  if(proxy)f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'attendant',userId:f.pcs[1].owner_user_id,status:'active'});
  const i=intent(text,{type:'speak',operation:'conversation',target_name:'the woman behind the counter',target_key:'attendant',utterance:'why the noise'});
  if(accepted)persistPlayerIntents(f.db,f.guild,[i],x.scope,{messageId:x.messageId});
  const rows=persistTypedDialogue(f.db,f.guild,[i],x.scope,{messageId:x.messageId});
  if(repeat){f.restart();persistTypedDialogue(f.db,f.guild,[i],x.scope,{messageId:x.messageId});}
  return {x,rows,memories:f.db.listNpcMemories(f.guild,'attendant',{status:'active',limit:30})};
}
const cases=[
  ['S1','A01','Describe the scene to me',async f=>{const o=await play(f,'Describe the scene to me',{observe:true});assert(o.text.includes(creative));assert(!o.text.includes('not established in enough detail'));assert.equal(o.calls,2);}],
  ['S1','A02','I head inside the Twenty-Four Spin',async()=>{for(const samePlace of [false,true])await nativeFixture(async f=>{const o=await play(f,'I head inside the Twenty-Four Spin',{moving:true,samePlace,restart:true});assert(o.text.includes('has arrived at twenty-four-spin'));assert(o.text.includes(creative));assert.equal(o.calls,2);assert.equal(scenePresence(f.db,f.guild,'character',o.x.pc.id).data.zone,'interior');assert.equal(JSON.parse(o.requests[1].input).viewpoint.zone,'interior');assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:500}).filter(e=>e.kind==='arrival'&&e.details.input_source===o.x.sourceRef).length,1);});}],
  ['S1','A03','What is the inside like?',async f=>{const o=await play(f,'What is the inside like?',{route:true});assert(o.text.includes(creative));assert.equal(o.calls,2);}],
  ['S1','A04','equivalent scene paraphrases',async()=>{for(const text of ['Set the scene please','What is going on in the scene?','Describe Twenty-Four Spin',"What's it like in here?",'What am I looking at?'])await nativeFixture(async f=>{const o=await play(f,text,{route:true});assert(o.text.includes(creative));assert.equal(o.calls,2);});}],
  ['S1','A05','mixed movement never read-only',async f=>{const o=await play(f,'I enter Twenty-Four Spin and look around',{route:true,moving:true,mixed:true});assert.equal(o.calls,3);assert(o.text.includes('has arrived'));assert(o.text.includes(creative));}],
  ['S1','A06','independent PC inquiry survives scene arbitration',async f=>{const o=await play(f,'Describe the scene and what does Choso look like?',{observe:true,otherQuery:true});assert(o.text.includes(creative));assert(o.text.includes('Choso'));assert(!o.text.includes('This location is nearby'));}],
  ['S1','A07','held destination writer cannot erase arrival or report fiction complete',async f=>{const o=await play(f,'I head inside the Twenty-Four Spin',{moving:true,held:true});assert(o.text.includes('has arrived'));assert(!o.text.includes('surrenders'));assert.equal(o.result.narrative_completion.status,'destination_fiction_missing');assert.equal(o.result.narrative_completion.coverage.destination,false);assert(f.db.listCityRecords(f.guild,{kind:'narrative_coverage_review',includeGM:true}).some(r=>r.visibility==='gm'&&r.source_event===o.x.sourceRef));assert.equal(o.calls,2);}],
  ['S1','A08','same-message outbox restart',async f=>{const o=await play(f,'Describe the scene to me',{observe:true,restart:true});assert.equal(o.sent.length,1);assert(o.sent[0].includes(creative));assert.equal(o.calls,2);}],
  ['S2','C09','earlier hypothetical cannot poison immediate clause',async f=>{const o=await clause(f,"If I went upstairs I'd be spotted. Instead, I inspect the envelope",'I inspect the envelope');assert.equal(o.rows[0].data.start,o.x.text.indexOf('I inspect'));assert(o.typed.length);}],
  ['S2','C10','reported attack quote cannot poison later inquiry',async f=>{const o=await clause(f,"She says 'I attack.' I ask the attendant about the noise",'I ask the attendant about the noise');assert(o.rows.length);assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,0);}],
  ['S2','C11','hypothetical owns no immediate attempt',async f=>{const o=await clause(f,'Could we leave if the door opens?','Could we leave if the door opens?',{framing:'hypothetical'});assert(o.rows.every(r=>r.status!=='pending'));assert.equal(o.typed.length,0);}],
  ['S2','C12','repeated source span requires matching offsets',async f=>{const o=await clause(f,'I inspect the envelope. I inspect the envelope','I inspect the envelope',{start:24});assert.equal(o.rows[0].status,'needs_scope_review');assert.equal(o.rows[0].data.typed_intent_key,null);
    await assert.rejects(clause(f,'I inspect the envelope. I inspect the envelope','I inspect the envelope',{start:25}),/offset|span|bound/i);}],
  ['S3','D13','local role-target speech is remembered verbatim once',async()=>{for(const privateScene of [false,true])await nativeFixture(async f=>{const o=await dialogue(f,'I ask the woman behind the counter why the noise',{repeat:true,privateScene});assert.equal(o.rows.length,1);assert.equal(o.memories.length,1);assert(o.memories[0].content.includes('why the noise'));assert.equal(o.rows[0].details.private_scene,privateScene);});}],
  ['S3','D14','two plausible listeners are not guessed',async()=>{for(const text of ['I ask her why the noise','I ask the attendant why the noise'])await nativeFixture(async f=>{const o=await dialogue(f,text,{ambiguous:true});assert.equal(o.rows.length,0);assert.equal(o.memories.length,0);});}],
  ['S3','D15','private/absent/proxy listener never receives party utterance',async()=>{for(const options of [{hidden:true},{remote:true},{proxy:true}])await nativeFixture(async f=>{const o=await dialogue(f,'I ask the woman behind the counter why the noise',options);assert.equal(o.rows.length,0);assert.equal(o.memories.length,0);});}],
  ['S3','D16','unaccepted or reported model speech label cannot mint heard speech',async()=>{for(const accepted of [false,true])await nativeFixture(async f=>{const o=await dialogue(f,"She says 'why the noise'",{accepted});assert.equal(o.rows.length,0);assert.equal(o.memories.length,0);});}],
  ['S4','E17','contextual reflective engagement without verbs',async()=>{for(const text of ["Another empty shift. That's the third this week",'Three evenings, and not a single customer'])await nativeFixture(async f=>{assert(semanticResponseObligation(text,[],{authenticated:true,engagement:{engagement_kind:'conversation',respond:true}}).needed);const o=await play(f,text,{omitted:true});assert(o.text.includes(creative));assert.equal(o.calls,2);assert.equal(f.db.getCharacter(o.x.pc.id).data.resources.hp.current,0);});}],
  ['S4','E18','OOC and player banter do not force world response',async()=>{assert(!semanticResponseObligation('OOC: My headset is broken',[],{authenticated:true,engagement:{engagement_kind:'conversation',respond:true}}).needed);assert(!semanticResponseObligation('Funny game last week',[],{authenticated:true,engagement:{engagement_kind:'no_response',respond:false}}).needed);}],
  ['S4','E19','unknown pacing does not silence scene by English phrase',async f=>{assert.notEqual(pacingAdvice(f.db,f.guild,'to the other player: is the attendant waiting?',{engagement_kind:'uncertain'}).suggested_mode,'silence');}],
  ['S5','P20','NPC alleges agreement without creating PC obligation',async f=>{const o=await play(f,'What does the attendant say?',{speech:'You agreed to the debt, or so the courier claimed.'});assert(o.text.includes('You agreed to the debt'));assert.equal(f.db.listCityRecords(f.guild,{kind:'commitment',includeGM:true}).length,0);}],
  ['S5','P21','server menu is not forced player selection',async f=>{const o=await play(f,'What does the attendant offer?',{speech:"Choose one of today's specials, if you like."});assert(o.text.includes("Choose one of today's specials"));assert.equal(f.db.getCharacter(o.x.pc.id).data.resources.hp.current,0);}],
  ['S5','P22','unverified PC reaction and forced choice stay held',async()=>{for(const speech of ['Choso apologizes for losing.','You agree to the debt.'])await nativeFixture(async f=>{const o=await play(f,'What does the attendant say?',{speech});assert(!o.text.includes(speech));assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);});}],
];
for(const [phase,id,label,run] of cases)test(`${phase} ${id} ${label}`,()=>nativeFixture(run));
