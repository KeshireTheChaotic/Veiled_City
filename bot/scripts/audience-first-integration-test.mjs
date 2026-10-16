/** Compact v9 production-adapter table; disposable SQLite and fake providers only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,run,unit,candidate} from './narrative-fixtures.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {mintNarrativeAudience,revalidateNarrativeAudience} from '../src/audience-native-v9.js';
import {nativeMechanicalInput,nativeMechanicalOutput} from '../src/mechanical-native-v9.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {prepareRollRequest,rollRevision} from '../src/roll-requests.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';
import {renderNarrativeUnit} from '../src/narrative-authority.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {narrativeTasks} from '../src/narrative-tasks.js';
import {captureWorldInput,worldInputKey} from '../src/autonomous-world.js';
const taskFor=x=>`narrative-task:${hash([x.sourceRef,hash(x.sourceDetails),x.scope,'describe_scene'])}`;
function v9Answer(f,x,acts){
  x.sourceDetails=f.db.getWorldEvent(f.guild,x.sourceRef).details;
  return {version:9,acts:acts.map(a=>({id:'scene',task_id:taskFor(x),kind:'scene_description',speaker_key:'',location_key:'terminal',source_refs:[],...a})),fiction_delta:[]};
}
function npc(f,key='attendant',location='terminal'){f.db.upsertNpcProfile(f.guild,{npcKey:key,displayName:'Inez',role:'attendant',publicIdentity:'A local attendant.'});f.db.setSimulationEntity(f.guild,'npc',key,{name:'Inez',location_key:location,visibility:'party'});}
function move(f){const x=setup(f,{text:'I head inside the Twenty-Four Spin'}),r=candidate(x.text);
  f.db.setSimulationEntity(f.guild,'location','twenty-four-spin',{name:'Twenty-Four Spin',parent_location_key:'terminal',visibility:'party',access:'public'});
  f.db.upsertReference(f.guild,{kind:'location',key:'twenty-four-spin',name:'Twenty-Four Spin',summary:'A public laundromat.',visibility:'party'});
  r.player_intents=[{...r.player_intents[0],type:'move',operation:'move',resolution:'auto',destination:'interior',target_key:'twenty-four-spin',target_name:'Twenty-Four Spin'}];
  r.scene_actions=[{kind:'move',entity_ref:'twenty-four-spin',source_span:x.text,zone:'interior'}];return {x,r};}
const taskId=(f,x,r,index=0)=>narrativeTasks(f.db,f.guild,r,x.scope,x.sourceRef)[index].id;
const fateEvidence=f=>JSON.stringify(f.db.listCityRecords(f.guild,{kind:'narrative_unit_fates',includeGM:true,limit:10}).flatMap(r=>r.data.fates));
function rollInput(f,operation='request_roll',text='Can I roll to inspect the terminal?'){
  const x=setup(f,{text,privateScene:true});f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,roll_requests:true,roll_collaboration:true}});
  const i={type:'roll',source_span:text,target_name:'',target_key:'',destination:'unspecified',operation,utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Exact owner request, not a result.'};
  const [a]=persistPlayerIntents(f.db,f.guild,[i],x.scope,{messageId:x.messageId});
  const ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),audience=mintNarrativeAudience(ctx);
  return {...x,i,a,audience};
}
const cases=[
 ['F5','27','ordinary Rain weather survives but a Rain PC reaction is held',async f=>{const x=setup(f);f.db.updateCharacterData(x.pc.id,d=>{d.aliases=['Rain'];});
   const o=await run(f,x,v9Answer(f,x,[{id:'weather',text:'',construction:{kind:'weather',phenomenon:'rain',motion:'bead',surface:'window'}},{id:'forced',text:'Rain apologizes for losing.'}]));const text=o.rows.map(r=>r.payload).join('\n');assert(!text.includes('apologizes'));assert(text.includes('Rain beads on the window.'),fateEvidence(f));}],
 ['F5','28','native character sensory viewpoint permits physical touch but no emotion or decision',async f=>{const x=setup(f),o=await run(f,x,v9Answer(f,x,[{id:'physical',kind:'player_perception',text:'',construction:{kind:'physical_sense',sense:'touch',stimulus:'warm_air',origin:'dryers'}},{id:'choice',kind:'player_perception',text:'You feel afraid and decide to run.'}]));
   const text=o.rows.map(r=>r.payload).join('\n');assert(!text.includes('decide to run'));assert(text.includes('You feel warm air'),fateEvidence(f));}],
 ['F5','29','known local NPC may refer to a PC without forcing that PC to surrender',async f=>{const x=setup(f,{text:'I tell the attendant to call me Raven.'});npc(f);f.db.updateCharacterData(x.pc.id,d=>{d.aliases=['Raven'];});
   f.db.upsertNpcKnowledge(f.guild,{npcKey:'attendant',knowledgeKey:'name',content:'Raven',beliefState:'known',sourceType:'observed',sourceRef:x.sourceRef,isSecret:false});
   const o=await run(f,x,v9Answer(f,x,[{id:'question',kind:'npc_speech',speaker_key:'attendant',text:'',construction:{kind:'known_pc_query',character_ref:x.pc.id,name:'Raven',question:'seen'}},{id:'forced',kind:'npc_speech',speaker_key:'attendant',text:'Mr. Raven, you agreed to surrender.'}]));
   const text=o.rows.map(r=>r.payload).join('\n');assert(!text.includes('agreed to surrender'));assert(text.includes('Have you seen Raven?'),fateEvidence(f));}],
 ['F5','30','construction cannot launder raw PC prose or create camera witnesses and stale publications',async()=>{for(const placed of [true,false])await nativeFixture(async f=>{
   const x=setup(f,{placed,text:'Describe terminal'}),construction={kind:'physical_sense',sense:'touch',stimulus:'warm_air',origin:'dryers'};
   const o=await run(f,x,v9Answer(f,x,[{id:'injected',kind:'player_perception',text:'You decide to surrender.',construction},
     {id:'physical',kind:'player_perception',text:'',construction},{id:'unknown',text:'',construction:{kind:'weather',phenomenon:'rain',motion:'apologizes',surface:'window'}}]));
   const text=o.rows.map(r=>r.payload).join('\n');assert(!text.includes('surrender'));assert.equal(text.includes('You feel warm air'),placed);
   f.restart();f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);
   let sends=0;await deliverTurnOutbox(f.db,f.guild,o.attempt.turn_id,async()=>{sends++;return{messageId:'fake',channelId:'offline'};});assert.equal(sends,0);
 });}],
 ['F4','14','Twenty-Four Spin arrival has one native result and interior fiction then contextual inside answer',async f=>{const {x,r}=move(f),a=v9Answer(f,x,[{task_id:taskId(f,x,r),location_key:'twenty-four-spin',text:'Inside, amber dryer doors flank a narrow folding counter; the coin tray hums beneath a buzzing strip light.'}]);
   const o=await run(f,x,a,r);const text=o.rows.map(r=>r.payload).join('\n');assert(text.includes('has arrived'));assert(text.includes('Inside, amber'));assert.equal(o.result.narrative_completion.coverage.destination,true);
   assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:500}).filter(e=>e.kind==='arrival'&&e.details.input_source===x.sourceRef).length,1);
   const y={...x,text:'What is the inside like?',messageId:'af-inside'};captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,y.messageId,y.text);y.sourceRef=worldInputKey(y.messageId,x.pc.id);
   const next=await run(f,y,v9Answer(f,y,[{location_key:'twenty-four-spin',text:'The folding aisle runs between hot dryer windows and a scuffed change machine.'}]),candidate(y.text));
   assert(next.rows.some(r=>r.payload.includes('folding aisle')));assert(!next.rows.some(r=>r.payload.includes('not established in enough detail')));assert.equal(next.ai.requests.length,2);}],
 ['F4','15','held writer preserves native arrival and reports missing fiction honestly',async f=>{const {x,r}=move(f),o=await run(f,x,v9Answer(f,x,[{location_key:'twenty-four-spin',text:'Choso apologizes for losing.'}]),r);
   assert.equal(f.db.getCharacter(x.pc.id).data.location,'twenty-four-spin');assert(o.rows.some(r=>r.payload.includes('has arrived')));assert.equal(o.result.narrative_completion.status,'destination_fiction_missing');}],
 ['F4','16','repeated same NPC tasks require individually matching native task IDs',async f=>{const x=setup(f,{text:'I ask Inez about the noise. I ask Inez about the parcel.'});npc(f);const r=candidate(x.text);
   r.player_intents=['I ask Inez about the noise.','I ask Inez about the parcel.'].map(source_span=>({...r.player_intents[0],type:'speak',operation:'conversation',target_key:'attendant',target_name:'Inez',source_span,utterance:source_span.slice(source_span.indexOf('about'),-1)}));
   const o=await run(f,x,v9Answer(f,x,[{id:'first',task_id:taskId(f,x,r,0),kind:'npc_speech',speaker_key:'attendant',text:'The dryer rattled a moment ago.'}]),r);
   const tasks=o.result.narrative_completion.tasks;assert.equal(tasks.length,2);assert.equal(tasks[0].disposition,'answered');assert.notEqual(tasks[1].disposition,'answered');assert.notEqual(o.result.narrative_completion.status,'complete');}],
 ['F4','17','nonbinding v9 artifact and arrival survive a forced-surrender sibling',async f=>{const {x,r}=move(f),o=await run(f,x,v9Answer(f,x,[{id:'menu',task_id:taskId(f,x,r),kind:'artifact_text',location_key:'twenty-four-spin',text:"Choose one of today's specials."},{id:'unsafe',location_key:'twenty-four-spin',text:'You choose the first option and surrender.'}]),r);
   const text=o.rows.map(r=>r.payload).join('\n');assert(text.includes('has arrived'));assert(text.includes('nonbinding text'));assert(!text.includes('You choose'));}],
 ['F3','10','v9 scoped writer publishes useful empty-facts scene and no model audience fields',async f=>{const x=setup(f),o=await run(f,x,v9Answer(f,x,[{text:'Amber dryer windows glow over a scarred folding counter; a coin tray rattles in the steady hum.'}]));
   assert(o.rows.some(r=>r.payload.includes('coin tray')));assert.equal(o.ai.requests.length,2);const writer=o.ai.requests.at(-1);assert.equal(writer.text.format.schema.properties.version.enum[0],9);
   assert(!JSON.stringify(writer.text.format.schema).includes('"visibility"'));const saved=f.db.listCityRecords(f.guild,{kind:'narrative_unit',includeGM:true})[0];assert.equal(saved.data.act_v9.task_id,taskFor(x));}],
 ['F3','11','held PC apology and remote speech preserve independent scene act',async f=>{const x=setup(f);npc(f,'remote','other-place');f.db.setSimulationEntity(f.guild,'location','other-place',{name:'Other place',visibility:'party'});
   const o=await run(f,x,v9Answer(f,x,[{id:'safe',text:'Steam curls above the folding table.'},{id:'forged',text:'Choso apologizes for losing.'},{id:'remote',kind:'npc_speech',speaker_key:'remote',location_key:'other-place',text:'Come over here.'}]));
   const text=o.rows.map(r=>r.payload).join('\n');assert(text.includes('Steam curls'));assert(!text.includes('apologizes'));assert(!text.includes('Come over here'));}],
 ['F3','12','v9 private audience survives restart but source revocation blocks delivery',async f=>{const x=setup(f,{privateScene:true}),o=await run(f,x,v9Answer(f,x,[{text:'A narrow band of light falls across the private alcove.'}]));assert(o.rows.length);assert(o.rows.every(r=>r.target_user_id===x.pc.owner_user_id&&r.visibility==='character'));
   const saved=f.db.listCityRecords(f.guild,{kind:'narrative_unit',includeGM:true})[0];f.restart();assert(renderNarrativeUnit(f.db,f.guild,saved.record_key,x.scope).includes('alcove'));
   f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);let sends=0;await deliverTurnOutbox(f.db,f.guild,o.attempt.turn_id,async()=>{sends++;return{messageId:'fake',channelId:'offline'};});assert.equal(sends,0);}],
 ['F3','13','v9 local NPC speech is attributed and cannot copy a request as actor knowledge',async f=>{const x=setup(f);npc(f);const o=await run(f,x,v9Answer(f,x,[{id:'offer',kind:'npc_offer',speaker_key:'attendant',text:'Would you like a cup of tea?'},{id:'forged-knowledge',kind:'npc_speech',speaker_key:'attendant',text:'I know the hidden truth.',source_refs:[x.sourceRef]}]));
   const text=o.rows.map(r=>r.payload).join('\n');assert(text.includes('Inez:'));assert(text.includes('Would you like'));assert(!text.includes('hidden truth'));}],
 ['F2','06','roll question never executes dice or chooses a pending request',f=>{const x=rollInput(f);const before=structuredClone(f.db.getCharacter(x.pc.id).data.resources);
   const p=nativeMechanicalInput(f.db,f.guild,x.audience,x.a.record_key);assert.equal(p.operation,'request_roll');assert.equal(p.disposition,'needs_adjudication');assert.equal(p.executed,false);
   assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_operation',includeGM:true}).length,0);}],
 ['F2','07','unspecified submit stays selection-only even with one native request',f=>{const x=rollInput(f,'roll','I roll my request.'),a=f.accepted(0,'I inspect the counter.',null,{type:'search',operation:'inspect',target:{kind:'object',key:'terminal',phrase:'terminal',grounding:'known'}});
   const q=prepareRollRequest(f.db,f.guild,{source_event:a.source_event,accepted_intent:a.record_key,character_id:x.pc.id,trait:'Knowledge',kind:'action',modifier_keys:[],difficulty_source:'',adjudication:'Inspect the terminal.'},'offline-gm');
   const p=nativeMechanicalInput(f.db,f.guild,x.audience,x.a.record_key);assert.equal(p.disposition,'needs_selection');assert.equal(f.db.getCityRecord(f.guild,'roll_request',q.record_key).status,'pending');}],
 ['F2','08','exact bound pending request is nonexecuting native input',f=>{const x=rollInput(f,'roll','I roll this inspection.');
   const q=prepareRollRequest(f.db,f.guild,{source_event:x.a.source_event,accepted_intent:x.a.record_key,character_id:x.pc.id,trait:'Knowledge',kind:'action',modifier_keys:[],difficulty_source:'',adjudication:'Inspect the terminal.'},'offline-gm');
   const p=nativeMechanicalInput(f.db,f.guild,x.audience,x.a.record_key);assert.equal(p.disposition,'native_pending');assert.equal(p.request_ref,q.record_key);assert.equal(p.executed,false);
   assert.throws(()=>nativeMechanicalInput(f.db,f.guild,{...x.audience,grant:{}},x.a.record_key));}],
 ['F2','09','saved roll output uses ancestry and never grants another owner or party access',f=>{const x=rollInput(f,'roll','I roll this inspection.');
   const q=prepareRollRequest(f.db,f.guild,{source_event:x.a.source_event,accepted_intent:x.a.record_key,character_id:x.pc.id,trait:'Knowledge',kind:'action',modifier_keys:[],difficulty_source:'',adjudication:'Inspect the terminal.'},'offline-gm');
   let n=0;const saved=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:'af-native-roll'},{rng:()=>[9,9][n++]});
   const output=nativeMechanicalOutput(f.db,f.guild,x.audience,{version:4,kind:'native_outcome',receipt_kind:'roll_request',ref:saved.record_key});assert.equal(output.kind,'mechanical_output');assert(output.text.includes('Critical'));
   assert.throws(()=>nativeMechanicalOutput(f.db,f.guild,x.audience,{version:4,kind:'native_outcome',receipt_kind:'roll_request',ref:'model-spoof'}));
   const next=setup(f,{privateScene:true,text:'What was that result?'}),g=mintNarrativeAudience(buildNarrativeContext(f.db,f.guild,next.scope,next.sourceRef));
   assert(nativeMechanicalOutput(f.db,f.guild,g,{version:4,kind:'native_outcome',receipt_kind:'roll_request',ref:saved.record_key}).text.includes('Critical'));
   const publicQuery=setup(f,{text:'Tell the party the result.'}),publicGrant=mintNarrativeAudience(buildNarrativeContext(f.db,f.guild,publicQuery.scope,publicQuery.sourceRef));
   assert.throws(()=>nativeMechanicalOutput(f.db,f.guild,publicGrant,{version:4,kind:'native_outcome',receipt_kind:'roll_request',ref:saved.record_key}));}],
 ['F1','01','native placed owner gets public direct-address grant',f=>{const x=setup(f);const ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
   const g=mintNarrativeAudience(ctx);assert.equal(g.proof.audience,'player');assert.equal(g.proof.recipient_user_id,x.pc.owner_user_id);
   assert.equal(g.proof.viewpoint,'character');assert.throws(()=>g.authority.inspect({...g.proof}),/unissued/);}],
 ['F1','02','private owner cannot mint channel or other-recipient grant',f=>{const x=setup(f,{privateScene:true});const ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
   const g=mintNarrativeAudience(ctx);assert.equal(g.proof.audience,'player_private');assert.throws(()=>mintNarrativeAudience(ctx,{audience:'channel'}));
   assert.throws(()=>revalidateNarrativeAudience(f.db,f.guild,g.proof,{...x.scope,actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}));}],
 ['F1','03','unplaced named camera cannot mint PC witnessing',f=>{const x=setup(f,{placed:false,text:'Describe terminal'});
   const ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),g=mintNarrativeAudience(ctx);assert.equal(g.proof.audience,'channel');
   assert.equal(g.proof.viewpoint,'camera');assert.throws(()=>mintNarrativeAudience(ctx,{audience:'player'}));assert.equal(f.db.getCharacter(x.pc.id).data.location,undefined);}],
 ['F1','04','source hash revocation and owner changes invalidate grant',async()=>{for(const change of ['hash','revoked','owner'])await nativeFixture(f=>{const x=setup(f),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),g=mintNarrativeAudience(ctx);
   if(change==='hash')f.db.db.prepare("UPDATE world_events SET details_json='{}' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);
   if(change==='revoked')f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);
   if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,x.pc.id);
   assert.throws(()=>revalidateNarrativeAudience(f.db,f.guild,g.proof,x.scope));});}],
 ['F1','05','writer receives native audience constraints not private party context',async f=>{const x=setup(f);const o=await run(f,x,{narrative_units:[unit('scene','scene','Dryer windows glow beside a folding counter.')],fiction_delta:[]});
   const packet=JSON.parse(o.ai.requests.at(-1).input);assert.equal(packet.audience_v9.audience,'player');assert.equal(packet.audience_v9.recipient_character_id,x.pc.id);
   assert.equal(packet.audience_v9.viewpoint,'character');assert(o.rows.some(r=>r.payload.includes('Dryer windows')));}],
];
for(const [phase,id,name,body] of cases)test(`${phase} AF${id} ${name}`,()=>nativeFixture(body));
