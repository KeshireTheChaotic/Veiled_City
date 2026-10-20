/** Pre-roll Fear is funded before the action, acknowledged before NPC dice and separate from post-action Fear. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate} from './narrative-fixtures.mjs';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {adjudicateAcceptedIntent} from '../src/rules-arbitration.js';
import {createArbitrationOrigin,arbitrationPromptBoard,bindArbitrationTurn} from '../src/scene-intent-board.js';
import {applyUnifiedArbitration} from '../src/gm-unified-arbitration.js';
import {executeUnifiedGmActions} from '../src/gm-native-rolls.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision,publishRollAmendment,publishRollRequests} from '../src/roll-requests.js';
import {reviewIncomingAttack,confirmIncomingDefense,rollArbitratedIncomingAttack,resolveIncomingDamage} from '../src/pc-incoming.js';
import {inspectPreRollFear,cancelPreRollFear} from '../src/pre-roll-fear.js';
import {publishPreRollFearNotice} from '../src/pre-roll-fear-notice.js';
import {assertPreRollFearRollAllowed} from '../src/pre-roll-fear.js';
import {reviewPcDeathMove,choosePcDeathMove} from '../src/pc-death.js';
import {recoverPreRollFear} from '../src/pre-roll-fear-recovery.js';
import {handleCommand} from '../src/commands.js';
import {fakeInteraction} from './contract-fixtures.mjs';
import {nativeGmNotice} from '../src/gm-arbitration-output.js';

function fixture(f,{fear=2,hp=0}={}){
  const x=setup(f,{text:'I inspect the counter.',privateScene:true}),scene=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,
    roll_collaboration:true,narrative_encounters:true}});
  f.db.changeFear(f.guild,fear);
  f.db.updateCharacterData(x.pc.id,d=>{d.evasion=12;d.thresholds={major:7,severe:14};d.resources.hp.current=hp;d.level=1;});
  f.db.upsertNpcProfile(f.guild,{npcKey:'guard',displayName:'Guard'});
  f.db.setSimulationEntity(f.guild,'npc','guard',{name:'Guard',location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:'pre-fear-guard',kind:'observation',source_id:'gm',title:'Guard is present',
    session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:source.event_key,location_key:'terminal',
    zone:'interior',range:'Close',visibility:'party'},'gm');
  const library=new EncounterLibrary('../content'),encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,
    pc_count:4,base_bp:14,budget_bp:14,composition:[{name:'Aster Vale Contractor',quantity:1}]}),
    combatant=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library))[0];
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,
    data:{combatants:[{actor:'guard',id:combatant.id}]}});
  const [accepted]=persistPlayerIntents(f.db,f.guild,[{...candidate(x.text).player_intents[0],type:'search',operation:'inspect'}],
    x.scope,{messageId:x.messageId});
  const native=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:accepted.record_key,mode:'roll_required',trait:'Instinct',
    kind:'action',difficulty:12,risk:'The search may be incomplete.',stakes:'Find visible clues, not automatic success.',
    rawRefs:['srd:action-rolls'],explanation:'A consequential uncertain inspection.'},'native:unified-gm',{scope:x.scope});
  const request=f.db.getCityRecord(f.guild,'roll_request',native.roll_request_ref),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
    ref=arbitrationPromptBoard(f.db,f.guild,origin).npc_candidates.find(n=>n.actor_key==='guard').intent_refs.attack,
    result={unified_arbitration:{version:2,npc_intents:[{actor_key:'guard',operation:'attack',target_refs:[x.pc.id],
      objective_ref:'',source_refs:[],dependencies:[]}],decisions:[{intent_ref:ref,disposition:'gm_attack_roll',
      rule_basis_refs:['srd:adversary-attacks'],difficulty:null,trait:null,stakes_kind:'native_attack',
      stakes:'The guard attempts its native standard attack.',reason:'A local native intervention before the pending action.',
      difficulty_reason:'Use actual Evasion.',feature_ref:'standard_attack',experience_ref:'',advantage:false,disadvantage:false}],
      pre_roll_fear:[{request_ref:request.record_key,npc_intent_ref:ref}]}};
  bindArbitrationTurn(result,origin);
  return {...x,accepted,request,origin,result,library};
}
function prepare(f,x){
  const decisions=applyUnifiedArbitration(f.db,f.guild,x.result,[x.accepted]);
  assert.equal(decisions[0].status,'gm_action_ready',decisions[0].data.reason);
  const [attack]=executeUnifiedGmActions(f.db,f.guild,decisions,{library:x.library});
  assert.equal(attack.kind,'pc_incoming_attack');
  const held=f.db.getCityRecord(f.guild,'pre_roll_fear_interrupt',`pre-roll-fear:${x.request.record_key}`);
  assert(held);return {decisions,attack,held};
}
function rollPc(f,x,key='original-action'){
  const row=f.db.getCityRecord(f.guild,'roll_request',x.request.record_key);let draws=0;
  const run=()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key,request:row.record_key,
    expected_revision:rollRevision(row)},{rng:()=>{draws++;return 7;}});
  return {run,get draws(){return draws;}};
}

test('pre-roll Fear reserves existing pool, holds only its action, acknowledges exact spend before one native NPC spotlight',()=>nativeFixture(async f=>{
  const x=fixture(f),{attack,held}=prepare(f,x),tryPc=rollPc(f,x),hp=f.db.getCharacter(x.pc.id).data.resources.hp.current;
  assert.equal(f.db.getCampaign(f.guild).fear,2,'reservation is not a premature debit');
  assert.throws(tryPc.run,/pre.roll|interrupt|Fear/i);assert.equal(tryPc.draws,0);
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});
  confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  let draws=0;assert.throws(()=>rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:()=>{draws++;return 1;}}),/acknowledge|announcement/i);
  assert.equal(draws,0);let sends=0;
  await publishPreRollFearNotice(f.db,f.guild,held.record_key,async row=>{
    sends++;assert.match(row.payload,/1.*Fear/i);assert.match(row.payload,/Guard|guard/);
    assert(row.payload.includes(attack.record_key),'announcement gives the actual owner defense-review route');
    assert.equal(f.db.getCampaign(f.guild).fear,2);return {ok:true,messageId:'ack-exact-fear',channelId:'owner-dm'};
  });
  const rolled=rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:()=>1});
  assert.equal(rolled.data.hit,false);assert.equal(f.db.getCampaign(f.guild).fear,1);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,hp);
  assert.equal(rollPc(f,x).run().status,'resolved');
  assert.equal(rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:()=>{throw new Error('saved attack cannot reroll');}}).record_key,rolled.record_key);
  await publishPreRollFearNotice(f.db,f.guild,held.record_key,async()=>{throw new Error('must not resend');});
  assert.equal(sends,1);f.restart();
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key,{current:false}).row.status,'completed');
  assert.equal(f.db.getCampaign(f.guild).fear,1,'critical PC result grants Hope, not retroactive pre-roll funding');
}));

test('pre-roll Fear cannot use future Fear, forged origin or a model role and cancellation releases cap-safe held funds once',()=>nativeFixture(f=>{
  const x=fixture(f,{fear:0});assert.throws(()=>prepare(f,x),/Fear|fund|pool/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pre_roll_fear_interrupt',includeGM:true,limit:100}).length,0);
  f.db.changeFear(f.guild,12);const {held}=prepare(f,x);
  assert.throws(()=>f.db.changeFear(f.guild,-12),/reserved|reservation|Fear/i);
  assert.equal(f.db.getCampaign(f.guild).fear,12);
  assert.throws(()=>cancelPreRollFear(f.db,f.guild,{gm:true},held.record_key),/origin|native/i);
  cancelPreRollFear(f.db,f.guild,x.origin,held.record_key);
  cancelPreRollFear(f.db,f.guild,x.origin,held.record_key);
  assert.equal(f.db.getCampaign(f.guild).fear,12);f.db.changeFear(f.guild,-12);assert.equal(f.db.getCampaign(f.guild).fear,0);
}));

test('uncertain announcement and restart never permit dice or blindly resend',()=>nativeFixture(async f=>{
  const x=fixture(f),{held}=prepare(f,x);let sends=0;
  await assert.rejects(publishPreRollFearNotice(f.db,f.guild,held.record_key,async()=>{sends++;throw new Error('uncertain transport');}));
  f.restart();assert.throws(rollPc(f,x).run,/pre.roll|interrupt|Fear/i);
  await assert.rejects(publishPreRollFearNotice(f.db,f.guild,held.record_key,async()=>{sends++;return {ok:true,messageId:'no',channelId:'no'};}));
  assert.equal(sends,1);assert.equal(f.db.getCampaign(f.guild).fear,2);
  assert.throws(()=>cancelPreRollFear(f.db,f.guild,x.origin,held.record_key),/uncertain|delivery|origin/i);
}));

test('an acknowledged unrelated owner notice cannot pay for a different pre-roll announcement',()=>nativeFixture(async f=>{
  const x=fixture(f),{held,attack}=prepare(f,x);
  await publishRollAmendment(f.db,f.guild,x.request,async()=>({ok:true,messageId:'other-ack',channelId:'owner-dm'}));
  const other=f.db.listCityRecords(f.guild,{kind:'roll_publication',includeGM:true,limit:100}).find(r=>r.data.turn_id),
    job=f.db.listCityRecords(f.guild,{kind:'pre_roll_fear_publication',includeGM:true,limit:100})[0];
  assert(other?.data.turn_id);assert(job);
  f.db.saveCityRecord(f.guild,{...job,key:job.record_key,data:{...job.data,turn_id:other.data.turn_id}});
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});
  confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  let draws=0;assert.throws(()=>rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:()=>{draws++;return 1;}}),/announce|acknowledge|proof|notice/i);
  assert.equal(draws,0);assert.equal(f.db.getCampaign(f.guild).fear,2);
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key).row.status,'awaiting_announcement');
}));

test('a hit is not terminal until the actual owner Armor and native damage receipt are committed',()=>nativeFixture(async f=>{
  const x=fixture(f),{held,attack,decisions}=prepare(f,x);
  let announced=0;
  await publishRollRequests(f.db,f.guild,{unifiedArbitration:decisions},async(user,text,sid,char,{publication})=>{
    announced++;assert.equal(user,x.pc.owner_user_id);assert.equal(char,x.pc.id);assert.equal(sid,f.session.id);
    assert.match(text,/1.*Fear/i);assert(publication);return {ok:true,messageId:'attack-ack',channelId:'owner-dm'};
  });
  assert.equal(announced,1);
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});
  confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:sides=>Math.min(12,sides)});
  const pending=f.db.getCityRecord(f.guild,'pc_incoming_attack',attack.record_key);
  assert.equal(pending.status,'awaiting_armor');assert.throws(rollPc(f,x).run,/interrupt|Fear/i);
  f.db.saveCityRecord(f.guild,{...pending,key:pending.record_key,status:'resolved'});
  const original=rollPc(f,x);assert.throws(original.run,/Armor|damage|receipt|effect/i);assert.equal(original.draws,0);
  f.db.saveCityRecord(f.guild,{...pending,key:pending.record_key});
  resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{armor:false,library:x.library});
  assert.equal(rollPc(f,x).run().status,'resolved');
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key,{current:false}).row.status,'completed');
}));

test('a projection status edit cannot release native held campaign Fear',()=>nativeFixture(f=>{
  const x=fixture(f),{held}=prepare(f,x);
  f.db.saveCityRecord(f.guild,{...held,key:held.record_key,status:'cancelled'});
  assert.throws(()=>f.db.changeFear(f.guild,-2),/reservation|ancestry|transition|Fear/i);
  assert.equal(f.db.getCampaign(f.guild).fear,2);
}));

test('executing interrupt cannot resume an altered original action snapshot',()=>nativeFixture(async f=>{
  const x=fixture(f),{held,attack}=prepare(f,x);
  await publishPreRollFearNotice(f.db,f.guild,held.record_key,async()=>({ok:true,messageId:'snapshot-ack',channelId:'owner-dm'}));
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});
  confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:s=>Math.min(12,s)});
  const request=f.db.getCityRecord(f.guild,'roll_request',x.request.record_key);
  f.db.saveCityRecord(f.guild,{...request,key:request.record_key,data:{...request.data,breakdown:{...request.data.breakdown,difficulty:1}}});
  assert.throws(()=>inspectPreRollFear(f.db,f.guild,held.record_key),/snapshot|changed|unrolled|Fear/i);
  const changed=rollPc(f,x);
  assert.throws(changed.run,/snapshot|changed|unrolled|Fear/i);assert.equal(changed.draws,0);
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key,{current:false}).row.status,'executing');
  assert.equal(f.db.getCampaign(f.guild).fear,1,'committed NPC cost is never refunded by stale original action');
}));

test('terminal native unconsciousness completes the spotlight but records scoped unfinished-action recovery, never an invented roll or refund',()=>nativeFixture(async f=>{
  const x=fixture(f,{hp:5}),{held,attack}=prepare(f,x);
  await publishPreRollFearNotice(f.db,f.guild,held.record_key,async()=>({ok:true,messageId:'unconscious-ack',channelId:'owner-dm'}));
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});
  confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:s=>Math.min(12,s)});
  resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{armor:false,library:x.library});
  const death=`${attack.record_key}:death`,review=reviewPcDeathMove(f.db,f.guild,x.pc.owner_user_id,death),
    outcome=choosePcDeathMove(f.db,f.guild,x.pc.owner_user_id,{request:death,expected_revision:review.revision,move:'avoid_death'},
      {interactionId:'fear-owner-avoid-death',rng:()=>12});
  assertPreRollFearRollAllowed(f.db,f.guild,x.request);
  const recovery=f.db.getCityRecord(f.guild,'pre_roll_fear_action_review',`${held.record_key}:action-review`);
  assert.equal(recovery.status,'needs_review');assert.equal(recovery.visibility,'gm');
  assert.equal(recovery.data.death_outcome,outcome.record_key);assert.equal(recovery.source_event,outcome.source_event);
  const resources=f.db.getCharacter(x.pc.id).data.resources,original=rollPc(f,x);
  assert.throws(original.run,/unconscious|cannot act|death/i);assert.equal(original.draws,0);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);assert.equal(f.db.getCampaign(f.guild).fear,1);
  f.restart();assertPreRollFearRollAllowed(f.db,f.guild,x.request);
  assert.deepEqual(f.db.getCityRecord(f.guild,'pre_roll_fear_action_review',recovery.record_key),recovery);
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key,{current:false}).row.status,'completed');
}));

test('last-HP interrupt holds until an actual owner death move, then preserves native recovery without replay',()=>nativeFixture(async f=>{
  const x=fixture(f,{hp:5}),{held,attack}=prepare(f,x);
  await publishPreRollFearNotice(f.db,f.guild,held.record_key,async()=>({ok:true,messageId:'death-ack',channelId:'owner-dm'}));
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});
  confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:s=>Math.min(12,s)});
  resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{armor:false,library:x.library});
  assert.throws(()=>assertPreRollFearRollAllowed(f.db,f.guild,x.request),/owner.*death|death.*pending/i);
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key,{current:false}).row.status,'executing');
  const death=`${attack.record_key}:death`,review=reviewPcDeathMove(f.db,f.guild,x.pc.owner_user_id,death);
  choosePcDeathMove(f.db,f.guild,x.pc.owner_user_id,{request:death,expected_revision:review.revision,move:'risk_it_all'},
    {interactionId:'fear-owner-death-choice',rng:()=>2});
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
  assertPreRollFearRollAllowed(f.db,f.guild,x.request);
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key,{current:false}).row.status,'completed');
  assert.equal(f.db.getCampaign(f.guild).fear,1);
  assert.equal(rollPc(f,x).run().status,'resolved');
}));

for(const announced of [false,true])test(`current NPC control remains required ${announced?'after ACK before RNG':'before announcement'}`,()=>nativeFixture(async f=>{
  const x=fixture(f),{held,attack}=prepare(f,x);let sends=0,draws=0;
  if(announced){
    await publishPreRollFearNotice(f.db,f.guild,held.record_key,async()=>({ok:true,messageId:'control-ack',channelId:'owner-dm'}));
    reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});
    confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  }
  f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'guard',userId:f.pcs[1].owner_user_id,status:'active'});
  if(!announced)await assert.rejects(async()=>publishPreRollFearNotice(f.db,f.guild,held.record_key,async()=>{sends++;}),/control|source|owner|snapshot|decision/i);
  assert.throws(()=>rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:()=>{draws++;return 1;}}),/control|source|owner|proxy|snapshot/i);
  assert.equal(sends,0);assert.equal(draws,0);assert.equal(f.db.getCampaign(f.guild).fear,2);
}));

test('actual GM command cancels acknowledged unused interruption; a player cannot cancel or execute its old hostile offer',()=>nativeFixture(async f=>{
  const x=fixture(f),{held,attack}=prepare(f,x);
  await publishPreRollFearNotice(f.db,f.guild,held.record_key,async()=>({ok:true,messageId:'cancel-ack',channelId:'owner-dm'}));
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});
  confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  const call=async(json,gm)=>{
    const i=fakeInteraction({sub:'effect',json});
    Object.assign(i,{id:`fear-command-${json.op}-${gm}`,guildId:f.guild,commandName:'vc-roll',isChatInputCommand:()=>true,
      user:{id:gm?'gm':x.pc.owner_user_id,username:'operator'},memberPermissions:{has:()=>gm}});
    await handleCommand(i,{db:f.db,gm:{content:{root:'../content'}}});return i;
  };
  const review=await call({op:'pre-roll-fear-review',key:held.record_key},true),text=review.deliveries.map(d=>d.content).join('');
  assert(review.deliveries.every(d=>d.ephemeral));const revision=JSON.parse(text).revision;assert(revision);
  await call({op:'pre-roll-fear-cancel',key:held.record_key,expected_revision:revision,reason:'Cancel unused intervention.'},false);
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key,{current:false}).row.status,'awaiting_announcement');
  await call({op:'pre-roll-fear-cancel',key:held.record_key,expected_revision:revision,reason:'Cancel unused intervention.'},true);
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key,{current:false}).row.status,'cancelled');
  assert.equal(nativeGmNotice(f.db,f.guild,held.data.binding.decision,x.scope,{library:x.library}),null,'cancelled attack no longer projects an actionable defense invitation');
  assert.throws(()=>rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:()=>assert.fail('cancelled attack cannot roll')}),/closed|cancel|Fear/i);
  assert.equal(f.db.getCampaign(f.guild).fear,2);assert.equal(rollPc(f,x).run().status,'resolved');
}));

test('reviewed recovery resumes a saved owner defense only after exact ACK, without choosing or replaying dice',()=>nativeFixture(async f=>{
  const x=fixture(f),{held,attack}=prepare(f,x),interaction={id:'native-fear-resume',guildId:f.guild,user:{id:'gm'}},
    authorize=(_db,i)=>i.user.id==='gm',review=()=>recoverPreRollFear(f.db,interaction,{op:'pre-roll-fear-review',key:held.record_key},authorize);
  let draws=0;
  const resume=()=>recoverPreRollFear(f.db,interaction,{op:'pre-roll-fear-resume',key:held.record_key,
    expected_revision:review().revision},authorize,{library:x.library,rng:()=>{draws++;return 1;}});
  assert.equal(resume().attack_status,'awaiting_defense');assert.equal(draws,0);
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});
  confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  assert.throws(resume,/announcement|acknowledged/i);assert.equal(draws,0);
  assert.equal(f.db.getCityRecord(f.guild,'pc_incoming_attack',attack.record_key).status,'ready','lawful owner choice stays saved');
  await publishPreRollFearNotice(f.db,f.guild,held.record_key,async()=>({ok:true,messageId:'resume-ack',channelId:'owner-dm'}));
  assert.equal(resume().attack_status,'missed');assert.equal(draws,1);assert.equal(f.db.getCampaign(f.guild).fear,1);
  f.restart();assert.equal(resume().attack_status,'missed');assert.equal(draws,1);
  assert.equal(rollPc(f,x).run().status,'resolved');assert.equal(resume().attack_status,'missed');assert.equal(draws,1);
}));

test('distinct native reservations cannot overbook the same existing campaign Fear and cancellation never refunds at cap',()=>nativeFixture(f=>{
  const x=fixture(f,{fear:1}),{held}=prepare(f,x),otherFixture={...f,pcs:[f.pcs[1],f.pcs[0],...f.pcs.slice(2)]},
    other=fixture(otherFixture,{fear:0});
  assert.throws(()=>prepare(f,other),/available|existing|Fear/i);
  assert.equal(f.db.getCampaign(f.guild).fear,1);
  assert.equal(f.db.pendingFearReservationKeys(f.guild).length,1);
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key,{current:false}).row.status,'awaiting_announcement');
}));

test('source retraction after ACK holds effects and exact GM cancellation releases only unused permission',()=>nativeFixture(async f=>{
  const x=fixture(f),{held,attack}=prepare(f,x);
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});
  confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  await publishPreRollFearNotice(f.db,f.guild,held.record_key,async()=>({ok:true,messageId:'retract-ack',channelId:'owner-dm'}));
  indexWorldEvent(f.db,f.guild,{key:x.sourceRef,status:'retracted'},'gm');
  let draws=0;assert.throws(()=>rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:()=>{draws++;return 1;}}),/source|retract|current|binding/i);
  assert.equal(draws,0);assert.equal(f.db.getCampaign(f.guild).fear,2);
  const i={id:'retract-cancel',guildId:f.guild,user:{id:'gm'}},authorize=()=>true,
    review=recoverPreRollFear(f.db,i,{op:'pre-roll-fear-review',key:held.record_key},authorize);
  assert.equal(recoverPreRollFear(f.db,i,{op:'pre-roll-fear-cancel',key:held.record_key,expected_revision:review.revision,
    reason:'Original player source was retracted; no NPC effects committed.'},authorize).status,'cancelled');
  assert.equal(f.db.getCampaign(f.guild).fear,2);
  assert(f.db.listCityRecords(f.guild,{kind:'pre_roll_fear_publication',includeGM:true,limit:100}).every(r=>r.status==='delivered'),'acknowledged history is retained');
}));

test('a lawful terminal owner death closes the interruption without requiring an impossible next PC action',()=>nativeFixture(async f=>{
  const x=fixture(f,{hp:5}),{held,attack}=prepare(f,x);
  await publishPreRollFearNotice(f.db,f.guild,held.record_key,async()=>({ok:true,messageId:'terminal-death-ack',channelId:'owner-dm'}));
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});
  confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:s=>Math.min(12,s)});
  resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{armor:false,library:x.library});
  const death=`${attack.record_key}:death`,review=reviewPcDeathMove(f.db,f.guild,x.pc.owner_user_id,death);let n=0;
  choosePcDeathMove(f.db,f.guild,x.pc.owner_user_id,{request:death,expected_revision:review.revision,move:'risk_it_all'},
    {interactionId:'terminal-fear-death',rng:()=>[1,2][n++]});
  assert.equal(f.db.getCharacter(x.pc.id).status,'dead');
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key,{current:false}).row.status,'completed');
  assert.equal(f.db.getCampaign(f.guild).fear,1);f.restart();
  assert.equal(inspectPreRollFear(f.db,f.guild,held.record_key,{current:false}).row.status,'completed');
  assert(rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:()=>assert.fail('dead-owner history never rerolls')}).data.roll);
  assert.throws(rollPc(f,x).run,/active|dead|death|owned|character/i);
}));
