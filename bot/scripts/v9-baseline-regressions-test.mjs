/** Original V9-00 IDs with real immutable sources/native dice; fabricated history remains negative. */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {nativeFixture} from './v9-fixtures.mjs';
import {configureCityFlags} from '../src/city-core.js';
import {captureWorldInput} from '../src/autonomous-world.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {buildActionPlan} from '../src/action-dependency.js';
import {prepareRollRequest,rollRevision,pendingRollRequests,publishRollAmendment} from '../src/roll-requests.js';
import {contributeRoll,adjudicateRollSource} from '../src/roll-collaboration.js';
import {finalizeTypedRollAction} from '../src/typed-roll-outcomes.js';
import {openActionWindow} from '../src/frameworks/session/public.js';
import {windowOperation} from '../src/window-coordinator.js';
import {publishRollPartyDisclosure,formatSharedRoll} from '../src/roll-sharing.js';

function setup(f,{difficulty=10}={}){
  configureCityFlags(f.db,f.guild,{roll_requests:true,roll_collaboration:true},'gm');
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});
  f.db.setSimulationEntity(f.guild,'location','booth',{name:'Booth',parent_location_key:'terminal'});
  f.db.upsertReference(f.guild,{kind:'location',key:'booth',name:'Booth',summary:'Open adjacent booth.',visibility:'party'});
  const pc=f.pcs[2],spans=['I inspect the terminal.','I enter the booth.'],scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,'baseline-native',spans.join(' '));
  const base={target_name:'',target_key:'',destination:'unspecified',utterance:'',excluded_targets:[],framing:'immediate',resolution:'auto',reason:''};
  const actions=persistPlayerIntents(f.db,f.guild,[{...base,type:'interact',source_span:spans[0],operation:'inspect'},
    {...base,type:'move',source_span:spans[1],operation:'enter',target_name:'Booth',target_key:'booth',destination:'interior',depends_on:[0]}],scope,{messageId:'baseline-native'});
  buildActionPlan(f.db,f.guild,actions);let difficulty_source='';
  if(difficulty!==null){
    f.db.upsertRulesRuling(f.guild,{key:'baseline',createdBy:'gm',ruling:'Obscured terminal inspection has Difficulty 10.'});
    difficulty_source=adjudicateRollSource(f.db,f.guild,{key:'baseline-difficulty',character_id:pc.id,kind:'difficulty',ruling_key:'baseline',
      data:{declaration:actions[0].source_event,value:difficulty}},'gm').event_key;
  }
  const q=prepareRollRequest(f.db,f.guild,{source_event:actions[0].source_event,accepted_intent:actions[0].record_key,character_id:pc.id,
    trait:'Knowledge',kind:'action',modifier_keys:[],difficulty_source,adjudication:'Native uncertain inspection.',operation:'inspect'},'gm',{scope});
  const roll=()=>{let n=0;return contributeRoll(f.db,f.guild,pc.owner_user_id,{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:'baseline-roll'},{rng:()=>[9,2][n++]});};
  return {pc,actions,q,roll};
}
test('G04/C05 terminal native outcome persists and executes a durable continuation once',()=>nativeFixture(f=>{
  const x=setup(f),q=x.roll(),resources=f.db.getCharacter(x.pc.id).data.resources;
  assert.equal(f.db.getCharacter(x.pc.id).data.location,'booth');
  const tasks=f.db.listCityRecords(f.guild,{kind:'action_continuation',includeGM:true});assert.equal(tasks.length,1);assert.equal(tasks[0].status,'resolved');
  f.restart();finalizeTypedRollAction(f.db,f.guild,q);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'action_continuation',includeGM:true}).length,1);
}));
test('G05/R01 actual native dice with missing Difficulty are review-only, not success',()=>nativeFixture(f=>{
  const x=setup(f,{difficulty:null}),q=x.roll(),result=finalizeTypedRollAction(f.db,f.guild,q);
  assert.equal(result.outcome,'needs_review');assert.equal(f.db.getCharacter(x.pc.id).data.location,'terminal');
  assert(pendingRollRequests(f.db,f.guild,x.pc.owner_user_id).some(row=>row.record_key===q.record_key));
}));
test('G06/P02 mark private notification and actual chunk delivering before external I/O',()=>nativeFixture(async f=>{
  const x=setup(f);let sends=0;
  await publishRollAmendment(f.db,f.guild,x.q,async(user,text,sid,pc,meta)=>{
    sends++;assert.equal(user,x.pc.owner_user_id);assert(text.length<=2000);
    assert.equal(f.db.getPublication(f.guild,meta.publication.id).status,'delivering');
    assert(f.db.listCityRecords(f.guild,{kind:'roll_publication',includeGM:true}).some(r=>r.status==='delivering'));
    return {messageId:`private-${sends}`,channelId:'private'};
  });assert(sends>0);
}));
test('G07/U02 unverified whole-source preview never exposes a private sibling',()=>{
  const row={status:'resolved',data:{character_name:'Billy',attempt:'I inspect the terminal. SECRET: my contact is X.',
    party_disclosure:{approved_span:'I inspect the terminal.'},result:{total:18,duality:'Hope'}}};
  assert(!formatSharedRoll(row).includes('SECRET'));
});
test('G08/W04 closed native beat permits a genuinely new owner-authored occurrence',()=>nativeFixture(f=>{
  const a=f.accepted(2,'I attempt to collect the parcel.','parcel'),args={key:'parcel',source_event:a.source_event,reason:'contested_resource',
    resources:['item:parcel:custody'],location_key:'terminal'};
  const w=openActionWindow(f.db,f.guild,args);
  windowOperation(f.db,f.guild,'gm',{op:'cancel',window:w.record_key,expected_revision:w.data.revision,interaction_id:'baseline-cancel'},{gm:true});
  const next=f.accepted(2,'I attempt to collect the parcel again.','parcel');
  assert.notEqual(openActionWindow(f.db,f.guild,{...args,source_event:next.source_event}).record_key,w.record_key);
  assert.equal(f.db.getCityRecord(f.guild,'scene_action_window',w.record_key).status,'closed');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pc_effect_receipt',includeGM:true}).length,0);
}));
test('G10/D01 no-session pending query is read-only and empty',()=>nativeFixture(f=>{
  f.db.endSession(f.guild,'Done');const count=f.db.db.prepare('SELECT total_changes() n').get().n;
  assert.deepEqual(pendingRollRequests(f.db,f.guild,f.pcs[2].owner_user_id),[]);assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,count);
}));
test('G14/P03 real affirmative disclosure has a delivering chunk receipt before send',()=>nativeFixture(async f=>{
  const x=setup(f),q=x.roll(),shared=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'share',request:q.record_key,
    expected_revision:rollRevision(q),key:'baseline-share',scope:'party',confirm:true});let sends=0;
  await publishRollPartyDisclosure(f.db,f.guild,shared,async(text,sid,meta)=>{
    sends++;assert.equal(f.db.getPublication(f.guild,meta.publication.id).status,'delivering');assert.match(text,/Native total/);
    assert(f.db.listCityRecords(f.guild,{kind:'roll_party_publication',includeGM:true}).some(r=>r.status==='delivering'));
    return {messageId:`public-${sends}`,channelId:'play'};
  });assert(sends>0);
}));
for(const difficulty of [14,null])test(`Original fabricated native-a result is rejected, Difficulty ${difficulty}`,()=>nativeFixture(f=>{
  const x=setup(f),before=f.db.getCharacter(x.pc.id).data.resources;
  const fake=f.db.saveCityRecord(f.guild,{kind:'roll_request',key:'roll:fake',status:'resolved',source_event:x.actions[0].source_event,
    data:{input:{accepted_intent:x.actions[0].record_key},result:{total:18,duality:'Hope'},breakdown:{difficulty},roll_id:'native-a'}});
  assert.throws(()=>finalizeTypedRollAction(f.db,f.guild,fake));assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
  assert.equal(f.db.getCharacter(x.pc.id).data.location,'terminal');assert.equal(f.db.listCityRecords(f.guild,{kind:'action_outcome_receipt',includeGM:true}).length,0);
}));
for(const party of [false,true])test(`Original unproved ${party?'party disclosure':'private amendment'} cannot authorize delivery`,()=>nativeFixture(async f=>{
  const x=setup(f),fake={...x.q,data:{...x.q.data,revision:999,roll_id:'native-a',result:{total:18,duality:'Hope'},party_disclosure:{source_event:'invented-disclosure'}}};
  const publish=party?publishRollPartyDisclosure:publishRollAmendment;let sends=0;
  await assert.rejects(()=>publish(f.db,f.guild,fake,async()=>{sends++;return {messageId:'fake',channelId:'fake'};}));assert.equal(sends,0);
}));
// Structural guards supplement, never replace the mandatory real Discord/turn adapter suites.
for(const [id,file,unsafe] of [
  ['G03/P01','commands.js',/\(await postPlayMessage\(\{db,guild:interaction.guild,content,sessionId\}\)\)\.ok/],
  ['G09/U01','roll-menu.js',/await interaction\.update\(\{content:formatRollRequest\(row/],
  ['G11/D02','index.js',/await message\.author\.send\(value\)/]
])test(`${id} unsafe adapter remains absent`,()=>assert(!unsafe.test(fs.readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8'))));
