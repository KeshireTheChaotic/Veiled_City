/** V9-06 production adapters; temporary sources and network-denied Discord doubles only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture,pvpTerms} from './v9-fixtures.mjs';
import {configureCityFlags,cityContext} from '../src/city-core.js';
import {captureDeclaration} from '../src/player-language.js';
import {prepareRollRequest,rollRevision,formatRollRequest} from '../src/roll-requests.js';
import {contributeRoll,adjudicateRollSource} from '../src/roll-collaboration.js';
import {openRollMenu} from '../src/roll-menu.js';
import {handleCommand} from '../src/commands.js';
import * as sharing from '../src/roll-sharing.js';
import {buildActionPlan} from '../src/action-dependency.js';
import {proposePvp} from '../src/narrative-pvp.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {recordScenePresence} from '../src/scene-continuity.js';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {captureAuthoredTurnEnvelope} from '../src/authored-turn-envelope.js';
import {proposeIntents,acceptIntentForAdjudication} from '../src/typed-intents.js';
import {discoverRollOptions} from '../src/roll-options.js';
async function entropy(faces,run){const original=crypto.randomInt;let n=0;
  crypto.randomInt=(min,max)=>{const value=faces[n++];assert(Number.isInteger(value)&&value>=min&&value<max);return value;};syncBuiltinESMExports();
  try{return await run();}finally{crypto.randomInt=original;syncBuiltinESMExports();assert.equal(n,faces.length);}}

function setup(f,{typed=false,long=false}={}){
  configureCityFlags(f.db,f.guild,{roll_requests:true,roll_collaboration:true},'gm');
  const pc=f.pcs[0],span='I try inspecting the terminal.',text=span+' My private unrelated contact is SECRET.';
  const accepted=typed?f.accepted(0,text,null,{type:'search',operation:'inspect',end:span.length,source_span:span,attempted_action:span,
    target:{kind:'object',key:'terminal',phrase:'terminal',grounding:'known'}}):null;
  const source=accepted?{event_key:accepted.source_event}:captureDeclaration(f.db,f.guild,pc.owner_user_id,pc.id,'ux-source',text);
  if(long)f.db.updateCharacterData(pc.id,d=>{d.experiences=Array.from({length:25},(_,i)=>({name:`Experience ${i} ${'extended terms '.repeat(5)}`,modifier:2,applies_to:{operations:['inspect'],roll_kinds:['action']}}));
    d.domain_cards=Array.from({length:18},(_,i)=>({name:`Blocked feature ${i}`,equipped:false,roll_option:{kind:'flat',amount:1,applies_to:{operations:['inspect']}}}));});
  const row=prepareRollRequest(f.db,f.guild,{source_event:source.event_key,character_id:pc.id,accepted_intent:accepted?.record_key,
    trait:'Knowledge',kind:'action',modifier_keys:[],difficulty_source:'',adjudication:'Inspect the terminal.',operation:'inspect'},'gm');
  if(accepted)buildActionPlan(f.db,f.guild,[accepted]);
  if(long){f.db.upsertRulesRuling(f.guild,{key:'ux',createdBy:'gm',ruling:'These synthetic Experiences apply.'});
    for(const [i,x] of f.db.getCharacter(pc.id).data.experiences.entries())adjudicateRollSource(f.db,f.guild,{key:`xp-${i}`,character_id:pc.id,kind:'participation',ruling_key:'ux',
      data:{request:row.record_key,character_id:pc.id,kind:'experience',experience:x.name,description:`Exact applicable experience ${i}.`}},'gm');}
  const sent=[],guild={id:f.guild,members:{fetch:async user=>({send:async content=>{sent.push({user,content});return {id:`notice-${sent.length}`,channelId:`dm-${user}`};}})}};
  return {pc,row,accepted,span,text,sent,guild};
}
function controls(payload){return payload.components.flatMap(row=>row.toJSON().components);}
function button(f,x,id,{fail=false}={}){const updated=[];return {id:`button-${id}`,guildId:f.guild,guild:x.guild,user:{id:x.pc.owner_user_id},customId:id,
  isChatInputCommand:()=>false,isButton:()=>true,isStringSelectMenu:()=>false,
  update:async p=>{if(fail)throw Object.assign(Error('expired acknowledgment'),{code:10062});updated.push(p);},updated};}

test('U01 actual roll button publishes saved native amendment once to its owner',()=>nativeFixture(async f=>{
  const x=setup(f),menu=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.row.record_key),id=controls(menu).find(c=>c.label==='Roll now').custom_id;
  await entropy([6,2],()=>handleCommand(button(f,x,id),{db:f.db,gm:{}}));
  assert(x.sent.length>0,'component must publish the native amendment without another player action');
  assert(x.sent.every(s=>s.user===x.pc.owner_user_id));const resources=f.db.getCharacter(x.pc.id).data.resources;
  await assert.rejects(()=>handleCommand(button(f,x,id),{db:f.db,gm:{}}),/closed|used|current/i);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
}));
test('U02 expired button response cannot orphan the committed native publication',()=>nativeFixture(async f=>{
  const x=setup(f),menu=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.row.record_key),id=controls(menu).find(c=>c.label==='Roll now').custom_id;
  await assert.rejects(()=>entropy([6,2],()=>handleCommand(button(f,x,id,{fail:true}),{db:f.db,gm:{}})));
  const q=f.db.getCityRecord(f.guild,'roll_request',x.row.record_key);assert.equal(q.status,'resolved');
  assert(f.db.listCityRecords(f.guild,{kind:'roll_publication',includeGM:true}).some(r=>r.data.turn_id&&f.db.listTurnPublications(f.guild,r.data.turn_id).length));
}));
test('U03 private paginated text exposes every option cost and blocked reason without truncation',()=>nativeFixture(async f=>{
  const x=setup(f,{long:true}),payload=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.row.record_key);
  assert(payload.content.length<=2000);const all=[payload.content];let current=payload;
  for(let page=0;page<100;page++){
    const next=controls(current).find(c=>c.label==='More details'&&!c.disabled);if(!next)break;
    const i=button(f,x,next.custom_id);i.id+=page;await handleCommand(i,{db:f.db,gm:{}});current=i.updated.at(-1);all.push(current.content);
  }
  const text=all.join('\n');assert.match(text,/Blocked feature 17/);assert.match(text,/not equipped\/active/);
  for(let i=0;i<25;i++)assert(text.includes(`Experience ${i} `),`option ${i} must be accessible in full`);
  assert.match(text,/1 Hope/);assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
}));
test('U04 exact reviewed accepted span, not the composite private post, accompanies affirmative sharing',()=>nativeFixture(async f=>{
  const x=setup(f,{typed:true});let q=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:x.row.record_key,
    expected_revision:rollRevision(x.row),key:'ux-roll'},{rng:()=>6});
  assert.equal(typeof sharing.createRollSharePreview,'function');
  const preview=sharing.createRollSharePreview(f.db,f.guild,x.pc.owner_user_id,q.record_key);
  assert.equal(preview.data.text,x.span);assert(!preview.data.text.includes('SECRET'));
  q=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'share',request:q.record_key,expected_revision:rollRevision(q),key:'ux-share',scope:'party',confirm:true,preview:preview.record_key});
  const sent=[];await sharing.publishRollPartyDisclosure(f.db,f.guild,q,async text=>{sent.push(text);return {messageId:'party',channelId:'table'};});
  assert(sent.join('').includes(x.span));assert(!sent.join('').includes('SECRET'));
  assert.equal(f.db.getWorldEvent(f.guild,x.accepted.source_event).details.raw_text,x.text);
  const source=f.db.getWorldEvent(f.guild,x.accepted.source_event);f.db.saveWorldEvent(f.guild,{...source,key:source.event_key,status:'retracted'});
  assert.throws(()=>sharing.validateRollSharePreview(f.db,f.guild,q,preview.record_key));
}));
test('U05 a generic roll preview cannot certify free prose in a protected PvP scene; native dice still share',()=>nativeFixture(async f=>{
  const x=setup(f,{typed:true});const a=f.accepted();proposePvp(f.db,f.guild,x.pc.owner_user_id,{accepted_intent:a.record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});
  let q=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:x.row.record_key,expected_revision:rollRevision(x.row),key:'protected-roll'},{rng:()=>6});
  assert.throws(()=>sharing.createRollSharePreview(f.db,f.guild,x.pc.owner_user_id,q.record_key),/clause|scope|PvP/i);
  q=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'share',request:q.record_key,expected_revision:rollRevision(q),key:'protected-share',scope:'party',confirm:true});
  const sent=[];await sharing.publishRollPartyDisclosure(f.db,f.guild,q,async text=>{sent.push(text);return {messageId:'native-only',channelId:'table'};});
  assert.match(sent.join(''),/Native total/);assert(!sent.join('').includes(x.span));
}));
test('U06 a private share preview cannot enter general civic retrieval',()=>nativeFixture(f=>{
  const x=setup(f,{typed:true}),p=sharing.createRollSharePreview(f.db,f.guild,x.pc.owner_user_id,x.row.record_key);
  assert(f.db.listCityRecords(f.guild,{query:p.record_key,includeGM:true,limit:4}).some(r=>r.record_key===p.record_key));
  assert(!cityContext(f.db,f.guild,p.record_key).records.some(r=>r.record_key===p.record_key));
}));
test('U12 pending disclosure exposes request scope, not the legacy composite private post',()=>nativeFixture(f=>{
  const x=setup(f);configureCityFlags(f.db,f.guild,{scene_continuity:true},'gm');f.db.setSimulationEntity(f.guild,'location','terminal',{});
  const source=indexWorldEvent(f.db,f.guild,{key:'ux-room',kind:'arrival',title:'Terminal',source_id:'gm',location_key:'terminal',visibility:'party'},'gm');
  for(const pc of f.pcs.slice(0,2))recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,location_key:'terminal',source_event:source.event_key,accepted_by:pc.owner_user_id,visibility:'party'},'gm');
  const q=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'disclose',request:x.row.record_key,expected_revision:rollRevision(x.row),key:'minimal-disclose',character_id:f.pcs[1].id});
  assert(!formatRollRequest(q,{user:f.pcs[1].owner_user_id}).includes('SECRET'));
  assert(!JSON.stringify(f.db.getWorldEvent(f.guild,q.data.disclosures[0].source_event).details).includes('SECRET'));
}));
test('U14 actual owner roll button updates an authorized helper without disclosing unrelated owner context',()=>nativeFixture(async f=>{
  const x=setup(f);configureCityFlags(f.db,f.guild,{scene_continuity:true},'gm');f.db.setSimulationEntity(f.guild,'location','terminal',{});
  const source=indexWorldEvent(f.db,f.guild,{key:'help-room',kind:'arrival',title:'Terminal',source_id:'gm',location_key:'terminal',visibility:'party'},'gm');
  for(const pc of f.pcs.slice(0,2))recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,location_key:'terminal',source_event:source.event_key,accepted_by:pc.owner_user_id,visibility:'party'},'gm');
  f.db.upsertRulesRuling(f.guild,{key:'help',createdBy:'gm',ruling:'Helper can assist from the same room.'});
  const helper=f.pcs[1],proof=adjudicateRollSource(f.db,f.guild,{key:'help-proof',character_id:helper.id,kind:'participation',ruling_key:'help',
    data:{request:x.row.record_key,character_id:helper.id,kind:'help',description:'I assist with the terminal.'}},'gm');
  const q=contributeRoll(f.db,f.guild,helper.owner_user_id,{op:'help',request:x.row.record_key,expected_revision:rollRevision(x.row),key:'help',pay_hope:true,
    proof:proof.event_key,description:'I assist with the terminal.'},{rng:()=>4});
  assert.throws(()=>openRollMenu(f.db,f.guild,helper.owner_user_id,q.record_key),/owner|acting/i);
  assert.throws(()=>discoverRollOptions(f.db,f.guild,helper.owner_user_id,q.record_key),/owner|acting/i);
  f.db.saveCityRecord(f.guild,{kind:'roll_menu_token',key:'legacyhelper',status:'active',source_event:q.source_event,visibility:'character',subject_key:helper.id,
    data:{guild:f.guild,user:helper.owner_user_id,character_id:helper.id,request:q.record_key,expected_revision:rollRevision(q)}});
  const old=button(f,x,'vcr:legacyhelper:b:refresh');old.user={id:helper.owner_user_id};
  await assert.rejects(()=>handleCommand(old,{db:f.db,gm:{}}),/owner|acting/i);
  const before=f.db.getCharacter(helper.id).data.resources,menu=openRollMenu(f.db,f.guild,x.pc.owner_user_id,q.record_key);
  await entropy([6,2],()=>handleCommand(button(f,x,controls(menu).find(c=>c.label==='Roll now').custom_id),{db:f.db,gm:{}}));
  const notices=x.sent.filter(s=>s.user===helper.owner_user_id);assert(notices.length);assert(notices.every(s=>!s.content.includes('SECRET')));
  assert.deepEqual(f.db.getCharacter(helper.id).data.resources,before);
}));
test('U15 a sheet change invalidates private menu choices before selection or cost',()=>nativeFixture(async f=>{
  const x=setup(f,{long:true}),menu=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.row.record_key),select=controls(menu).find(c=>c.type===3);
  f.db.updateCharacterData(x.pc.id,d=>{d.experiences[0].modifier=10;});
  const i=button(f,x,select.custom_id);i.isButton=()=>false;i.isStringSelectMenu=()=>true;i.values=[select.options[0].value];
  await assert.rejects(()=>handleCommand(i,{db:f.db,gm:{}}),/sheet|stale|changed/i);
  openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.row.record_key);
  const old=button(f,x,select.custom_id);old.isButton=()=>false;old.isStringSelectMenu=()=>true;old.values=[select.options[0].value];
  await assert.rejects(()=>handleCommand(old,{db:f.db,gm:{}}),/sheet|stale|changed|registry/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);assert.equal(x.sent.length,0);
}));
test('U07 choices persist across pages; off-page and foreign selection cannot authorize costs',()=>nativeFixture(async f=>{
  const x=setup(f,{long:true});let menu=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.row.record_key);
  const select=async(payload,value,user=x.pc.owner_user_id)=>{const c=controls(payload).find(c=>c.type===3),i=button(f,x,c.custom_id);
    i.id+=value;i.user={id:user};i.isButton=()=>false;i.isStringSelectMenu=()=>true;i.values=[value];await handleCommand(i,{db:f.db,gm:{}});return i.updated.at(-1);};
  await assert.rejects(()=>select(menu,'o20'),/page/);await assert.rejects(()=>select(menu,'o0',f.pcs[1].owner_user_id),/owner|belong/);
  menu=await select(menu,'o0');const nav=button(f,x,controls(menu).find(c=>c.label==='Next').custom_id);await handleCommand(nav,{db:f.db,gm:{}});
  menu=await select(nav.updated.at(-1),'o20');const token=f.db.listCityRecords(f.guild,{kind:'roll_menu_token',includeGM:true})[0];
  assert.equal(token.data.selected_keys.length,2);assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
  f.restart();const fresh=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.row.record_key);assert(fresh.ephemeral);assert.match(fresh.content,/Private roll/);
}));
test('U08 actual Confirm publishes a paid Experience once and leaves acting dice pending',()=>nativeFixture(async f=>{
  const x=setup(f,{long:true}),menu=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.row.record_key),select=controls(menu).find(c=>c.type===3);
  const i=button(f,x,select.custom_id);i.isButton=()=>false;i.isStringSelectMenu=()=>true;i.values=[select.options[0].value];
  await handleCommand(i,{db:f.db,gm:{}});const confirm=button(f,x,controls(i.updated.at(-1)).find(c=>c.label==='Confirm').custom_id);
  await entropy([],()=>handleCommand(confirm,{db:f.db,gm:{}}));
  const q=f.db.getCityRecord(f.guild,'roll_request',x.row.record_key);assert.equal(q.status,'pending');assert(!q.data.roll_id);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,1);assert(x.sent.length);
  await assert.rejects(()=>handleCommand(confirm,{db:f.db,gm:{}}),/closed|used/);assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,1);
}));
test('U09 insufficient Hope rolls back every confirmed choice with no partial charge or notification',()=>nativeFixture(async f=>{
  const x=setup(f,{long:true}),menu=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.row.record_key),select=controls(menu).find(c=>c.type===3);
  const i=button(f,x,select.custom_id);i.isButton=()=>false;i.isStringSelectMenu=()=>true;i.values=select.options.slice(0,3).map(c=>c.value);
  await handleCommand(i,{db:f.db,gm:{}});const confirm=button(f,x,controls(i.updated.at(-1)).find(c=>c.label==='Confirm').custom_id);
  await assert.rejects(()=>handleCommand(confirm,{db:f.db,gm:{}}),/Hope/);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);assert.equal(x.sent.length,0);
  assert.equal(f.db.getCityRecord(f.guild,'roll_request',x.row.record_key).data.revision,x.row.data.revision);
}));
test('U10 foreign and changed-source previews cannot enlarge a party disclosure',()=>nativeFixture(f=>{
  const x=setup(f,{typed:true});assert.throws(()=>sharing.createRollSharePreview(f.db,f.guild,f.pcs[1].owner_user_id,x.row.record_key));
  const p=sharing.createRollSharePreview(f.db,f.guild,x.pc.owner_user_id,x.row.record_key);
  f.db.saveCityRecord(f.guild,{...p,key:p.record_key,data:{...p.data,text:'Choso apologizes for losing.'}});
  assert.throws(()=>sharing.validateRollSharePreview(f.db,f.guild,x.row,p.record_key));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_party_publication',includeGM:true}).length,0);
}));
test('U16 actual slash and component native rolls use the same saved result/private publication pipeline',async()=>{
  const results=[];
  for(const route of ['slash','component'])await nativeFixture(async f=>{
    const x=setup(f);let i;
    if(route==='component')i=button(f,x,controls(openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.row.record_key)).find(c=>c.label==='Roll now').custom_id);
    else i={id:'slash-ux',guildId:f.guild,guild:x.guild,user:{id:x.pc.owner_user_id,username:'Jaxon'},commandName:'vc-roll',isChatInputCommand:()=>true,
      options:{getSubcommand:()=> 'contribute',getString:()=>JSON.stringify({op:'roll',request:x.row.record_key,expected_revision:rollRevision(x.row),key:'slash-roll'})},reply:async()=>{},followUp:async()=>{}};
    await entropy([6,2],()=>handleCommand(i,{db:f.db,gm:{}}));const q=f.db.getCityRecord(f.guild,'roll_request',x.row.record_key);
    assert(x.sent.length);assert(x.sent.every(s=>s.user===x.pc.owner_user_id));
    results.push({total:q.data.result.total,duality:q.data.result.duality,resources:f.db.getCharacter(x.pc.id).data.resources,
      delivered:f.db.listCityRecords(f.guild,{kind:'roll_publication',includeGM:true}).filter(r=>r.data.turn_id).every(r=>r.status==='delivered')});
  });assert.deepEqual(results[0],results[1]);assert(results[0].delivered);
});
test('U13 source-confirmed pending disclosure sends only the selected accepted attempt',()=>nativeFixture(f=>{
  const x=setup(f,{typed:true});configureCityFlags(f.db,f.guild,{scene_continuity:true},'gm');f.db.setSimulationEntity(f.guild,'location','terminal',{});
  const source=indexWorldEvent(f.db,f.guild,{key:'typed-room',kind:'arrival',title:'Terminal',source_id:'gm',location_key:'terminal',visibility:'party'},'gm');
  for(const pc of f.pcs.slice(0,2))recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,location_key:'terminal',source_event:source.event_key,accepted_by:pc.owner_user_id,visibility:'party'},'gm');
  const q=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'disclose',request:x.row.record_key,expected_revision:rollRevision(x.row),key:'typed-disclose',character_id:f.pcs[1].id});
  const output=formatRollRequest(q,{user:f.pcs[1].owner_user_id});assert(output.includes(x.span));assert(!output.includes('SECRET'));
  assert.equal(f.db.getWorldEvent(f.guild,q.data.disclosures[0].source_event).details.attempt,x.span);
}));
for(const privateScene of [false,true])test(`U11/U17 two independent accepted rolls from one ${privateScene?'private':'party'} post disclose only the chosen occurrence`,()=>nativeFixture(async f=>{
  const x=setup(f),spans=['I try inspecting the terminal.','I try decoding the manifest.'],text=spans.join(' ')+' My contact is SECRET.';
  const scope={mode:privateScene?'private':'party',actorUserId:x.pc.owner_user_id,actorCharacterId:x.pc.id},messageId='two-private-actions';
  const envelope=captureAuthoredTurnEnvelope(f.db,f.guild,x.pc.owner_user_id,x.pc.id,messageId,text,{privateScene});
  const proposals=proposeIntents(f.db,f.guild,spans.map((span,index)=>({version:2,proposal_id:'',source_event:envelope.source_event,
    start:text.indexOf(span),end:text.indexOf(span)+span.length,source_span:span,actor_character_id:x.pc.id,sequence_index:index,dependencies:[],
    type:'search',operation:'inspect',target:{kind:'object',key:'terminal',phrase:'terminal',grounding:'known'},framing:'immediate',destination_scope:'none',
    attempted_action:span,desired_outcome:null,authored_outcome_claim:null,temporal_relation:'parallel'})),scope,{messageId});
  const actions=proposals.map(p=>acceptIntentForAdjudication(f.db,f.guild,p,scope));buildActionPlan(f.db,f.guild,actions);
  const requests=actions.map(a=>prepareRollRequest(f.db,f.guild,{...x.row.data.input,source_event:a.source_event,accepted_intent:a.record_key},'gm',{scope}));
  assert.notEqual(requests[0].record_key,requests[1].record_key);
  let q=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:requests[0].record_key,expected_revision:rollRevision(requests[0]),key:'first-only'},{rng:()=>6});
  const p=sharing.createRollSharePreview(f.db,f.guild,x.pc.owner_user_id,q.record_key);
  q=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'share',request:q.record_key,expected_revision:rollRevision(q),key:'share-first',scope:'party',confirm:true,preview:p.record_key});
  const sent=[];await sharing.publishRollPartyDisclosure(f.db,f.guild,q,async text=>{sent.push(text);return {messageId:'first-shared',channelId:'table'};});
  assert(sent.join('').includes(spans[0]));assert(!sent.join('').includes(spans[1]));assert(!sent.join('').includes('SECRET'));
  assert.equal(f.db.getCityRecord(f.guild,'roll_request',requests[1].record_key).status,'pending');
  assert.equal(f.db.getWorldEvent(f.guild,envelope.source_event).details.raw_text,text);
}));
