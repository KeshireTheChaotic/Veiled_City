/** W3 construction fixtures; actual native actions, disposable data, authored only until phase freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {configureSimulationEntity,submitNpcAction,executeNpcAction} from '../src/simulation.js';
import {actorSource} from '../src/simulation-motivation.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {commitWorldInformationTransfer,inspectWorldInformationTransfer} from '../src/world-information-transfer.js';
const changes=db=>db.db.prepare('SELECT total_changes() n').get().n;
function setup(f){
  const {db,guild}=f;
  db.setCityCalendar(guild,{flags:{...db.getCityCalendar(guild).flags,audience_influence:true}});
  const source=indexWorldEvent(db,guild,{key:'courier-private-source',kind:'observation',title:'Private sourced courier evidence',
    source_id:'fixture',visibility:'gm'},'fixture');
  db.upsertNpcProfile(guild,{npcKey:'courier',displayName:'Courier'});
  configureSimulationEntity(db,guild,'location','terminal',{});
  configureSimulationEntity(db,guild,'npc','courier',{location_key:'terminal'});
  configureSimulationEntity(db,guild,'faction','watch',{location_key:'terminal'});
  db.upsertNpcKnowledge(guild,{npcKey:'courier',knowledgeKey:'delivery',content:'A sealed parcel reportedly awaits collection.',
    beliefState:'known',confidence:90,sourceRef:source.event_key,isSecret:true});
  db.upsertNpcGoal(guild,{npcKey:'courier',goalKey:'inform',objective:'Report the parcel',acceptableMethods:['contact','negotiate','request_favor']});
  return {source};
}
function action(f,{success=true,target_type='faction',target_key='watch',type='contact'}={}){
  let rolls=0;
  return submitNpcAction(f.db,f.guild,{actor_type:'npc',actor_key:'courier',goal_key:'inform',type,target_type,target_key,
    information_key:'delivery'},{roll:()=>++rolls===1?(success?20:1):(success?1:20)});
}
test('actual successful NPC contact produces a private attributable faction source consumable by actorSource',()=>nativeFixture(f=>{
  setup(f);const native=action(f),pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),transfer=commitWorldInformationTransfer(f.db,f.guild,native.id);
  assert.equal(transfer.status,'verified_native_transfer');assert.equal(transfer.report.belief_state,'suspected');
  assert.equal(transfer.report.confidence,75);assert.equal(transfer.report.subjective,true);
  assert.equal(transfer.report.source_actor,'npc:courier');assert.equal(transfer.report.source_ref,transfer.source_ref);
  assert.equal(transfer.execution_authority,false);assert.equal(transfer.publication_authority,false);
  const event=f.db.getWorldEvent(f.guild,transfer.source_ref),proof=f.db.getCityRecord(f.guild,'world_information_transfer',transfer.receipt_ref);
  assert.equal(event.visibility,'gm');assert.equal(proof.visibility,'gm');
  const persisted=f.db.listSimulationRecords(f.guild,{kind:'awareness',entityKey:'faction:watch',limit:1000})
    .find(row=>row.data.information_key==='delivery');
  assert.ok(persisted,'Native resolver automatically persists the recipient report.');
  assert.equal(persisted.data.source_ref,transfer.source_ref);assert.equal(persisted.data.content,transfer.report.content);
  assert.equal(actorSource(f.db,f.guild,{actor_type:'faction',actor_key:'watch',information_key:'delivery',source_event:transfer.source_ref}).event.event_key,
    transfer.source_ref);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
  assert.deepEqual(native.data.result.information_source,{content:'A sealed parcel reportedly awaits collection.',
    source_ref:'courier-private-source',belief_state:'known'});
}));

function relay(f,transfer,{faction='watch',content=transfer.report.content,sourceRef=transfer.source_ref,informationKey='delivery',
  confidence=transfer.report.confidence,beliefState=transfer.report.belief_state,roll=null}={}){
  if(faction!=='watch')configureSimulationEntity(f.db,f.guild,'faction',faction,{location_key:'terminal'});
  f.db.putSimulationRecord(f.guild,{kind:'awareness',entityKey:`faction:${faction}`,
    data:{...transfer.report,content,source_ref:sourceRef,information_key:informationKey,confidence,belief_state:beliefState}});
  f.db.upsertNpcProfile(f.guild,{npcKey:'relay-recipient',displayName:'Relay recipient'});
  configureSimulationEntity(f.db,f.guild,'npc','relay-recipient',{location_key:'terminal'});
  const goal=f.db.putSimulationRecord(f.guild,{kind:'goal',entityKey:`faction:${faction}`,status:'active',
    data:{objective:'Report attributed parcel information',acceptable_methods:['contact'],dependencies:[],priority:50,progress:0}});
  let calls=0;
  return submitNpcAction(f.db,f.guild,{actor_type:'faction',actor_key:faction,goal_key:goal.id,type:'contact',
    target_type:'npc',target_key:'relay-recipient',information_key:informationKey},
    {roll:roll||(()=>++calls===1?20:1)});
}

test('actual captured NPC-to-faction report relays only as the same attributed subjective information',()=>nativeFixture(f=>{
  setup(f);const original=action(f),transfer=commitWorldInformationTransfer(f.db,f.guild,original.id),next=relay(f,transfer);
  assert.deepEqual(next.data.result.information_source,{content:transfer.report.content,source_ref:transfer.source_ref,belief_state:'suspected'});
  const report=commitWorldInformationTransfer(f.db,f.guild,next.id);
  assert.equal(report.status,'verified_native_transfer');assert.equal(report.report.source_actor,'faction:watch');
  assert.equal(report.report.belief_state,'suspected');assert.equal(report.report.subjective,true);
  assert.notEqual(report.source_ref,transfer.source_ref);
  f.restart();assert.deepEqual(inspectWorldInformationTransfer(f.db,f.guild,report.receipt_ref),report);
}));

for(const change of ['recipient','content','information','confidence','belief'])test(`relay rejects ${change} substitution before RNG or resource spend`,()=>nativeFixture(f=>{
  setup(f);const transfer=commitWorldInformationTransfer(f.db,f.guild,action(f).id),before=f.db.getSimulationEntity(f.guild,'faction','watch').state.resources;
  let rolls=0;
  const substitution=change==='recipient'?{faction:'other-watch'}:change==='content'?{content:'Substituted secret'}
    :change==='confidence'?{confidence:100}:change==='belief'?{beliefState:'known'}:{informationKey:'another-secret'};
  assert.throws(()=>relay(f,transfer,{...substitution,roll:()=>{rolls++;return 20;}}));
  assert.equal(rolls,0);assert.deepEqual(f.db.getSimulationEntity(f.guild,'faction','watch').state.resources,before);
  if(change==='recipient')assert.equal(f.db.getSimulationEntity(f.guild,'faction','other-watch').state.resources.influence,4);
}));

test('legacy source substitution can never acquire an attributed native report',()=>nativeFixture(f=>{
  setup(f);const transfer=commitWorldInformationTransfer(f.db,f.guild,action(f).id);
  // Legacy source-less awareness may be actionable under the old resolver, but cannot mint provenance.
  let next;
  try{next=relay(f,transfer,{sourceRef:'npc:courier'});}catch(error){
    assert.match(error.message,/information|source|evidence|report/i);return;
  }
  assert.equal(commitWorldInformationTransfer(f.db,f.guild,next.id).status,'held_source');
}));

test('malformed transfer audit is a local source hold rather than a global JSON parse failure',()=>nativeFixture(f=>{
  setup(f);const transfer=commitWorldInformationTransfer(f.db,f.guild,action(f).id);
  f.db.db.prepare('UPDATE mutation_ledger SET after_json=? WHERE guild_id=? AND entity_key=? AND mutation_type=?')
    .run('{broken',f.guild,transfer.receipt_ref,'world_information_transfer');
  const before=changes(f.db);
  assert.equal(inspectWorldInformationTransfer(f.db,f.guild,transfer.receipt_ref).status,'held_source');
  assert.equal(changes(f.db),before);
}));

test('legacy uncaptured native history cannot certify current future knowledge as a new report',()=>nativeFixture(f=>{
  setup(f);const native=action(f),mutation=f.db.mutationsForEntity(f.guild,native.id,20)
    .find(m=>m.mutation_type==='npc_action:contact'),before=JSON.parse(mutation.before_json),result={...native.data.result};
  delete result.information_source;
  // A sanitized legacy persisted tuple: all dice come from the real native action above.
  const id='fixture-legacy-uncaptured',legacy=f.db.putSimulationRecord(f.guild,{id,kind:'action',entityKey:native.entity_key,status:'completed',
    data:{...native.data,result}});
  f.db.recordMutation(f.guild,{actorType:'ai',actorId:'courier',sourceLayer:'npc_director',mutationType:'npc_action:contact',
    entityKey:id,visibility:'gm',before:{...before,id},after:legacy,payload:result});
  const count=changes(f.db);
  assert.equal(commitWorldInformationTransfer(f.db,f.guild,id).status,'held_source');assert.equal(changes(f.db),count);
}));

test('duplicate/restart reads preserve exact immutable transfer without reexecution or new mutation',()=>nativeFixture(f=>{
  setup(f);const native=action(f),transfer=commitWorldInformationTransfer(f.db,f.guild,native.id),before=changes(f.db);
  assert.equal(transfer.status,'verified_native_transfer');
  assert.deepEqual(commitWorldInformationTransfer(f.db,f.guild,native.id),transfer);
  assert.deepEqual(inspectWorldInformationTransfer(f.db,f.guild,transfer.receipt_ref,
    {recipientType:'faction',recipientKey:'watch',informationKey:'delivery'}),transfer);
  assert.equal(changes(f.db),before);f.restart();const restarted=changes(f.db);
  assert.deepEqual(inspectWorldInformationTransfer(f.db,f.guild,transfer.receipt_ref),transfer);
  assert.deepEqual(commitWorldInformationTransfer(f.db,f.guild,native.id),transfer);
  assert.deepEqual(executeNpcAction(f.db,f.guild,native,{roll:()=>{throw new Error('Transfer rerolled action');}}),native);
  assert.equal(changes(f.db),restarted);
}));

for(const change of ['source','knowledge','action','mutation','sender-control','recipient-control','audit','event'])
test(`current transfer use holds after ${change} changes and never rewrites history`,()=>nativeFixture(f=>{
  const x=setup(f),native=action(f),transfer=commitWorldInformationTransfer(f.db,f.guild,native.id);
  assert.equal(transfer.status,'verified_native_transfer');
  const proof=f.db.getCityRecord(f.guild,'world_information_transfer',transfer.receipt_ref);
  if(change==='source')indexWorldEvent(f.db,f.guild,{key:x.source.event_key,status:'retracted'},'fixture');
  if(change==='knowledge')f.db.upsertNpcKnowledge(f.guild,{npcKey:'courier',knowledgeKey:'delivery',content:'Different contents',sourceRef:x.source.event_key});
  if(change==='action')f.db.putSimulationRecord(f.guild,{id:native.id,kind:'action',entityKey:native.entity_key,status:'completed',data:{...native.data,rationale:'changed'}});
  if(change==='mutation')f.db.db.prepare('UPDATE mutation_ledger SET payload_json=? WHERE id=?').run('{}',proof.data.mutation_id);
  if(change==='sender-control')configureSimulationEntity(f.db,f.guild,'npc','courier',{owner_control_type:'player'});
  if(change==='recipient-control')configureSimulationEntity(f.db,f.guild,'faction','watch',{owner_user_id:f.pcs[0].owner_user_id});
  if(change==='audit')f.db.db.prepare("UPDATE mutation_ledger SET actor_id=? WHERE guild_id=? AND entity_key=? AND mutation_type=?")
    .run('fake-issuer',f.guild,transfer.receipt_ref,'world_information_transfer');
  if(change==='event')indexWorldEvent(f.db,f.guild,{key:transfer.source_ref,status:'retracted'},'fixture');
  f.restart();const before=changes(f.db);
  assert.equal(inspectWorldInformationTransfer(f.db,f.guild,transfer.receipt_ref).status,'held_source');
  assert.equal(commitWorldInformationTransfer(f.db,f.guild,native.id).status,'held_source');
  assert.deepEqual(f.db.getCityRecord(f.guild,'world_information_transfer',transfer.receipt_ref),proof);
  assert.equal(changes(f.db),before);
}));

test('wrong recipient/information/campaign and fabricated completion cannot acquire a report',()=>nativeFixture(f=>{
  setup(f);const native=action(f),transfer=commitWorldInformationTransfer(f.db,f.guild,native.id);
  for(const mismatch of [{recipientType:'npc'},{recipientKey:'another-faction'},{informationKey:'another-secret'}])
    assert.equal(inspectWorldInformationTransfer(f.db,f.guild,transfer.receipt_ref,mismatch).status,'held_source');
  assert.equal(inspectWorldInformationTransfer(f.db,'other',transfer.receipt_ref).status,'held_source');
  const forged=f.db.putSimulationRecord(f.guild,{kind:'action',entityKey:native.entity_key,status:'completed',data:native.data});
  assert.equal(commitWorldInformationTransfer(f.db,f.guild,forged.id).status,'held_source');
}));

test('failed native contact and source-less legacy information never produce provenance',()=>nativeFixture(f=>{
  setup(f);const failed=action(f,{success:false});
  assert.equal(commitWorldInformationTransfer(f.db,f.guild,failed.id).status,'held_source');
  f.db.upsertNpcKnowledge(f.guild,{npcKey:'courier',knowledgeKey:'delivery',content:'Unverified legacy report',sourceRef:'npc:someone'});
  const completed=action(f);assert.equal(completed.data.result.success,true);
  assert.equal(commitWorldInformationTransfer(f.db,f.guild,completed.id).status,'held_source');
}));

test('helper never overwrites stronger recipient knowledge or grants PC knowledge',()=>nativeFixture(f=>{
  setup(f);f.db.upsertNpcProfile(f.guild,{npcKey:'recipient',displayName:'Recipient'});
  configureSimulationEntity(f.db,f.guild,'npc','recipient',{location_key:'terminal'});
  const native=action(f,{target_type:'npc',target_key:'recipient'});
  f.db.upsertNpcKnowledge(f.guild,{npcKey:'recipient',knowledgeKey:'delivery',content:'Recipient independently verified the parcel.',
    beliefState:'known',confidence:100,sourceRef:'independent-source',isSecret:true});
  const stronger=f.db.getNpcKnowledge(f.guild,'recipient','delivery'),pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id));
  assert.equal(commitWorldInformationTransfer(f.db,f.guild,native.id).status,'verified_native_transfer');
  assert.deepEqual(f.db.getNpcKnowledge(f.guild,'recipient','delivery'),stronger);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
}));

test('real native resolver preserves stronger independently sourced recipient knowledge established BEFORE contact',()=>nativeFixture(f=>{
  setup(f);const source=indexWorldEvent(f.db,f.guild,{key:'recipient-independent-source',kind:'observation',
    title:'Recipient independent parcel evidence',source_id:'fixture',visibility:'gm'},'fixture');
  f.db.upsertNpcProfile(f.guild,{npcKey:'recipient',displayName:'Recipient'});
  configureSimulationEntity(f.db,f.guild,'npc','recipient',{location_key:'terminal'});
  f.db.upsertNpcKnowledge(f.guild,{npcKey:'recipient',knowledgeKey:'delivery',content:'Recipient independently verified the parcel.',
    beliefState:'known',confidence:100,sourceRef:source.event_key,isSecret:true});
  const stronger=f.db.getNpcKnowledge(f.guild,'recipient','delivery'),pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),
    native=action(f,{target_type:'npc',target_key:'recipient'}),transfer=commitWorldInformationTransfer(f.db,f.guild,native.id);
  assert.equal(native.data.result.success,true);assert.equal(transfer.status,'verified_native_transfer');
  assert.deepEqual(f.db.getNpcKnowledge(f.guild,'recipient','delivery'),stronger);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
  f.restart();assert.deepEqual(f.db.getNpcKnowledge(f.guild,'recipient','delivery'),stronger);
  assert.deepEqual(inspectWorldInformationTransfer(f.db,f.guild,transfer.receipt_ref),transfer);
}));
