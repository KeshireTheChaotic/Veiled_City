/** W5 construction fixtures only: real authoritative turns, native SRD preparation and owner choices. */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup as narrativeSetup,candidate} from './narrative-fixtures.mjs';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {setCampaignPvpMode} from '../src/pvp-campaign-policy.js';
import {previewAuthoritativeMutation} from '../src/state.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {createArbitrationOrigin,bindArbitrationTurn,arbitrationPromptBoard} from '../src/scene-intent-board.js';
import {applyUnifiedArbitration} from '../src/gm-unified-arbitration.js';
import {executeUnifiedGmActions} from '../src/gm-native-rolls.js';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';
import {reviewIncomingAttack,confirmIncomingDefense,rollArbitratedIncomingAttack,resolveIncomingDamage} from '../src/pc-incoming.js';
import {publishPreRollFearNotice} from '../src/pre-roll-fear-notice.js';
import {inspectPreRollFear} from '../src/pre-roll-fear.js';
import {preparePvpAttack,prepareCampaignPvpFromBoard,pvpAttackOwnerStatus,reviewPvpAttack,authorizePvpAttack,rollPvpAttack} from '../src/pvp-attacks.js';
import {rollPvpDamage,pvpDamageOwnerStatus,reviewPvpDamage,resolvePvpDamage,validatePvpDamageApplication,refreshCampaignPvpDamage} from '../src/pvp-damage.js';
import {reviewPcDeathMove,choosePcDeathMove} from '../src/pc-death.js';
import {materializeNativeNotices,reserveCampaignAttackNotices} from '../src/native-publications.js';
import {renderNativeNotice,noticeHash} from '../src/native-notice.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {publishRollRequests} from '../src/roll-requests.js';
import {captureWorldInput} from '../src/autonomous-world.js';

const rows=(f,kind)=>f.db.listCityRecords(f.guild,{kind,includeGM:true,limit:100});
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
const rolls=f=>f.db.db.prepare('SELECT COUNT(*) n FROM rolls WHERE guild_id=?').get(f.guild).n;
function dice(faces){let n=0;const rng=sides=>{assert.ok(n<faces.length,'Unexpected native dice');const face=faces[n++];assert.ok(face>=1&&face<=sides);return face;};rng.count=()=>n;return rng;}
function fixture(f,{unified=false,unsupported=false,finalHp=false,followup=false}={}){
  const text=followup?'I punch Choso. Then I examine the counter.':unsupported?'I punch Choso. I say hello.':'I punch Choso.',x=narrativeSetup(f,{text,messageId:'campaign-native-turn'}),scene=currentScene(f.db,f.guild),target=f.pcs[1];
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true,narrative_encounters:true}});
  for(const pc of f.pcs.slice(0,2))f.db.updateCharacterData(pc.id,d=>{d.level=1;d.proficiency=2;d.evasion=12;
    d.thresholds={major:7,severe:14};d.inventory=[];if(finalHp&&pc.id===target.id)d.resources.hp.max=2;});
  const source=indexWorldEvent(f.db,f.guild,{key:'campaign-target-position',kind:'arrival',title:'Owner-established target position',
    source_id:`player:${target.owner_user_id}`,scene:scene.key,session_id:scene.session_id,location_key:'terminal',visibility:'party',
    details:{entity_type:'character',entity_key:target.id,owner_user_id:target.owner_user_id}},target.owner_user_id);
  recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:target.id,source_event:source.event_key,location_key:'terminal',
    zone:'interior',range:'Melee',visibility:'party',accepted_by:target.owner_user_id},'fixture-native');
  setCampaignPvpMode(f.db,f.guild,'fixture-gm',{enabled:true},{gm:true,interactionId:'enable-native-campaign-turn'});
  const result=candidate(text);result.narration='';result.gm_world_parts=[];
  result.player_intents=[{type:'interact',source_span:'I punch Choso.',target_name:'Choso',target_key:target.id,destination:'unspecified',
    operation:'unarmed_attack',utterance:'',excluded_targets:[],framing:'immediate',resolution:unified?'auto':'roll_required',reason:'Exact owner-authored attack attempt.',
    ...(!unified?{native_adjudication:{trait:unsupported?'Knowledge':'Finesse',kind:'attack',difficulty:12,
      risk:'The attack may miss.',stakes:'Only native attack and damage receipts may affect the target.',explanation:'Standard unarmed SRD attack against actual target Evasion.',
      saved_ruling_key:'',override_refs:[],raw_refs:['srd:attack-rolls'],house_refs:[],homebrew_refs:[],modifier_keys:[],attack_source:'unarmed'}}:{})}];
  if(unsupported)result.player_intents.push({type:'speak',source_span:'I say hello.',target_name:'',target_key:'',destination:'unspecified',
    operation:'say',utterance:'hello',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Independent source-owned speech.'});
  if(followup)result.player_intents.push({type:'interact',source_span:'Then I examine the counter.',target_name:'',target_key:'',destination:'unspecified',
    operation:'examine',utterance:'',excluded_targets:[],framing:'immediate',resolution:'auto',depends_on:[0],
    reason:'This declared action depends on the preceding attack; no inferred success.'});
  let origin=null;
  if(unified){
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef);
    result.unified_arbitration={version:1,npc_intents:[],decisions:[{intent_ref:'player:0',disposition:'request_pc_action_roll',
      rule_basis_refs:['srd:attack-rolls'],difficulty:null,trait:'Finesse',stakes_kind:'native_attack',
      stakes:'Attempt only; native receipts own hit and damage.',reason:'Exact declared ordinary unarmed strike.',
      difficulty_reason:'Native actual target Evasion.',feature_ref:'unarmed_attack',experience_ref:'',advantage:false,disadvantage:false}]};
    bindArbitrationTurn(result,origin);
  }
  return {...x,target,result,origin};
}
function preview(f,x){return previewAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,narrative:x.result,scope:x.scope,
  provenance:{actorType:'ai',actorId:x.pc.owner_user_id,messageId:x.messageId}});}
function commit(f,x){return commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:x.result,scope:x.scope,
  speaker:x.pc.name,label:'Native campaign turn fixture',meta:{messageId:x.messageId,triggerText:x.text}});}
function request(f){const requests=rows(f,'pvp_attack_request');assert.equal(requests.length,1);return requests[0];}
function authorize(f,x,r){
  reviewPvpAttack(f.db,f.guild,x.pc.owner_user_id,r.record_key);
  return authorizePvpAttack(f.db,f.guild,x.pc.owner_user_id,{attack:r.record_key,expected_revision:r.data.offer_hash},
    {interactionId:'owner-authorizes-native-campaign-turn'});
}
function noBilateral(f){for(const kind of ['pvp_agreement','pvp_consent','pvp_damage_consent'])assert.equal(rows(f,kind).length,0);}

test('actual authoritative turn previews without dice, prepares native v4 attack and exactly two private owner notices',()=>nativeFixture(f=>{
  const x=fixture(f),pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),beforeRolls=rolls(f);
  const projected=preview(f,x);assert.equal(projected.campaignPvpPreparations[0].status,'pending_owner');
  assert.equal(rows(f,'pvp_attack_request').length,0);assert.equal(rows(f,'pvp_attack_publication').length,0);assert.equal(rolls(f),beforeRolls);
  const committed=commit(f,x),r=request(f);assert.equal(committed.campaignPvpPreparations[0].request,r.record_key);
  const staged=rows(f,'pvp_attack_intent')[0],contract=f.db.getCityRecord(f.guild,'pvp_encounter_contract',r.data.offer.contract);
  assert.equal(staged.data.version,4);assert.equal(contract.data.version,4);
  assert.equal(r.data.offer.authority,'native_campaign');assert.equal(r.data.offer.native_rule_basis.kind,'RAW');
  assert.deepEqual(r.data.offer.native_rule_basis.refs,['srd:attack-rolls']);assert.equal(r.data.offer.input.kind,'unarmed');
  assert.equal(r.data.offer.input.weapon,null);assert.equal(r.data.offer.damage,'2d4');assert.equal(r.data.offer.evasion,12);
  noBilateral(f);assert.equal(rolls(f),beforeRolls);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
  const reserved=rows(f,'pvp_attack_publication');assert.equal(reserved.length,2);
  assert.deepEqual(new Set(reserved.map(n=>n.data.user)),new Set([x.pc.owner_user_id,x.target.owner_user_id]));
  assert.ok(reserved.every(n=>n.visibility==='character'&&n.data.reservation_version===2));
  materializeNativeNotices(f.db,f.guild);const jobs=rows(f,'pvp_attack_publication');assert.equal(jobs.length,2);
  for(const job of jobs){
    const notice=f.db.getCityRecord(f.guild,'native_notice',job.data.notice),text=renderNativeNotice(f.db,f.guild,notice.data),
      publications=f.db.listTurnPublications(f.guild,job.data.turn_id);
    assert.equal(publications.length,1);assert.equal(publications[0].visibility,'character');
    assert.equal(publications[0].target_user_id,job.data.user);assert.equal(publications[0].target_character_id,job.data.character);
    if(job.data.user===x.target.owner_user_id){assert.match(text,/base Evasion: 12/);assert.doesNotMatch(text,/Your attack:|2d4/);}
    else assert.match(text,/Your attack: Finesse; 2d4/);
  }
  const readOnly=changes(f);pvpAttackOwnerStatus(f.db,f.guild,x.pc.owner_user_id,r.record_key);
  pvpAttackOwnerStatus(f.db,f.guild,x.target.owner_user_id,r.record_key);assert.equal(changes(f),readOnly);
  assert.equal(rows(f,'pvp_attack_review').length,0);assert.equal(rolls(f),beforeRolls);
}));

test('native turn attacker-only authorization leads through saved Critical, automatic Armor offer and real target-owned final-HP choice',()=>nativeFixture(f=>{
  const x=fixture(f,{finalHp:true});commit(f,x);const r=request(f);authorize(f,x,r);
  assert.throws(()=>authorizePvpAttack(f.db,f.guild,x.target.owner_user_id,{attack:r.record_key,expected_revision:r.data.offer_hash},
    {interactionId:'no-fabricated-defender-approval'}),/native|defender|Evasion/i);
  const attackInput={attack:r.record_key,expected_revision:r.data.offer_hash},attackRng=dice([1,1]),
    attack=rollPvpAttack(f.db,f.guild,x.pc.owner_user_id,attackInput,{rng:attackRng});
  assert.equal(attackRng.count(),2);assert.equal(attack.data.result.duality,'Critical');assert.equal(attack.data.result.hit,true);
  assert.equal(f.db.getWorldEvent(f.guild,`${r.record_key}:authorize:${x.target.id}`),null);
  const damageRng=dice([4,4]),damage=rollPvpDamage(f.db,f.guild,x.pc.owner_user_id,{attack_receipt:attack.record_key},{rng:damageRng});
  assert.equal(damageRng.count(),2);assert.equal(damage.data.result.total,16);
  const offers=rows(f,'pvp_damage_offer');assert.equal(offers.length,1);const offer=offers[0];
  assert.equal(offer.data.binding.native_authority,'native_campaign');assert.equal(rows(f,'pvp_damage_publication').length,1);
  assert.equal(f.db.getCharacter(x.target.id).data.resources.hp.current,0);assert.equal(f.db.getCharacter(x.target.id).data.resources.armor.current,0);
  assert.equal(pvpDamageOwnerStatus(f.db,f.guild,x.target.owner_user_id,offer.record_key).severity,3);
  assert.throws(()=>reviewPvpDamage(f.db,f.guild,x.pc.owner_user_id,offer.record_key),/owner/i);
  const reviewed=reviewPvpDamage(f.db,f.guild,x.target.owner_user_id,offer.record_key),choice={damage:offer.record_key,expected_revision:reviewed.revision,armor:true};
  assert.throws(()=>resolvePvpDamage(f.db,f.guild,x.pc.owner_user_id,choice,{interactionId:'wrong-armor-owner'}),/owner/i);
  const effect=resolvePvpDamage(f.db,f.guild,x.target.owner_user_id,choice,{interactionId:'target-real-armor-choice'});
  assert.equal(effect.data.hp_marks,2);assert.equal(effect.data.armor,true);
  for(const pc of [x.pc,x.target]){const resources=f.db.getCharacter(pc.id).data.resources;
    assert.equal(resources.hope,2);assert.equal(resources.stress.current,2);}
  assert.equal(f.db.getCharacter(x.target.id).data.resources.armor.current,1);
  const death=rows(f,'pc_death_move_request')[0];assert.equal(death.status,'awaiting_owner');
  assert.equal(rows(f,'pc_death_outcome').length,0);assert.notEqual(f.db.getCharacter(x.target.id).status,'dead');
  assert.throws(()=>reviewPcDeathMove(f.db,f.guild,x.pc.owner_user_id,death.record_key),/owner/i);
  const deathView=reviewPcDeathMove(f.db,f.guild,x.target.owner_user_id,death.record_key),deathInput={request:death.record_key,
    expected_revision:deathView.revision,move:'avoid_death'},deathRng=dice([12]),
    outcome=choosePcDeathMove(f.db,f.guild,x.target.owner_user_id,deathInput,{interactionId:'target-death-choice',rng:deathRng});
  assert.equal(deathRng.count(),1);assert.equal(outcome.data.move,'avoid_death');
  f.restart();const noDice=()=>assert.fail('Committed native receipt must never reroll');
  assert.deepEqual(rollPvpAttack(f.db,f.guild,x.pc.owner_user_id,attackInput,{rng:noDice}),attack);
  assert.deepEqual(rollPvpDamage(f.db,f.guild,x.pc.owner_user_id,{attack_receipt:attack.record_key},{rng:noDice}),damage);
  assert.deepEqual(validatePvpDamageApplication(f.db,f.guild,effect.record_key),effect);
  assert.deepEqual(resolvePvpDamage(f.db,f.guild,x.target.owner_user_id,choice,{interactionId:'armor-replay'}),effect);
  assert.deepEqual(choosePcDeathMove(f.db,f.guild,x.target.owner_user_id,deathInput,{interactionId:'death-replay',rng:noDice}),outcome);
  noBilateral(f);
}));

test('sealed unified turn prepares actual PC attack while JSON nativeProposal and serialized-origin substitutes cannot mint authority',()=>nativeFixture(f=>{
  const x=fixture(f,{unified:true}),beforeRolls=rolls(f),mutation=commit(f,x),r=request(f);
  assert.equal(mutation.unifiedArbitration[0].data.native.operation,'campaign_pvp_attack');
  assert.equal(mutation.campaignPvpPreparations[0].status,'pending_owner');assert.equal(rolls(f),beforeRolls);
  const board=rows(f,'scene_intent_board')[0],entry=board.data.entries[0],p=x.result.unified_arbitration.decisions[0],before=changes(f);
  assert.throws(()=>prepareCampaignPvpFromBoard(f.db,f.guild,JSON.parse(JSON.stringify(x.origin)),board,entry,p),/origin/i);
  assert.throws(()=>preparePvpAttack(f.db,f.guild,'model',{attack:r.data.offer.input.attack,kind:'unarmed',weapon:null,
    trait:'Finesse',modifier_keys:[],ruling:''},{gm:false,interactionId:'forged-native-proposal',nativeProposal:true,
      nativePreparation:{authority:'native_campaign',mechanics:{kind:'attack'}}}),/Authenticated GM|models/i);
  assert.equal(changes(f),before);assert.equal(rows(f,'pvp_attack_request').length,1);noBilateral(f);
}));

test('unsupported native metadata holds only its attack while preserving independent accepted speech',()=>nativeFixture(f=>{
  const x=fixture(f,{unsupported:true}),before=rolls(f),mutation=commit(f,x);
  assert.equal(mutation.campaignPvpPreparations[0].status,'needs_review');assert.equal(rows(f,'pvp_attack_request').length,0);
  assert.ok(mutation.typedIntents.some(row=>row.data.source_span==='I say hello.'&&row.data.operation==='say'));
  assert.ok(rows(f,'pvp_campaign_review').some(row=>row.status==='needs_review'));assert.equal(rolls(f),before);noBilateral(f);
}));

test('valid owner declarations survive a stale native target position as a scoped campaign hold, never an ordinary attack fallback',()=>nativeFixture(f=>{
  const x=fixture(f,{unsupported:true});x.result.player_intents[0].native_adjudication.trait='Finesse';
  f.db.updateCharacterData(x.target.id,data=>{data.travel={status:'in_transit'};});
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),mutation=commit(f,x),held=rows(f,'pvp_attempt')[0];
  assert.equal(held.status,'held_review');assert.equal(rows(f,'pvp_attack_request').length,0);
  assert.ok(mutation.typedIntents.some(row=>row.data.operation==='say'&&row.data.source_span==='I say hello.'));
  assert.ok(rows(f,'pvp_campaign_review').some(row=>row.status==='needs_review'&&row.visibility==='gm'));
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);assert.equal(rolls(f),0);noBilateral(f);
}));

test('native missed campaign attack terminates its own compound action and blocks dependent success without damage or repeat dice',()=>nativeFixture(f=>{
  const x=fixture(f,{followup:true});commit(f,x);const r=request(f);authorize(f,x,r);
  const input={attack:r.record_key,expected_revision:r.data.offer_hash},rng=dice([2,1]),
    result=rollPvpAttack(f.db,f.guild,x.pc.owner_user_id,input,{rng});
  assert.equal(result.data.result.hit,false);assert.equal(result.data.result.duality,'Hope');assert.equal(rng.count(),2);
  const terminal=rows(f,'pvp_action_terminal_receipt')[0];assert.equal(terminal.data.outcome,'failure');
  assert.equal(terminal.data.effect,null);assert.equal(terminal.data.damage,null);
  const nodes=rows(f,'compound_action'),attack=nodes.find(n=>n.data.action_id===terminal.data.action),
    child=nodes.find(n=>n.data.dependencies.includes(terminal.data.action));
  assert.equal(attack.data.status,'failed');assert.equal(child.data.status,'blocked');
  assert.equal(rows(f,'pvp_damage_roll_receipt').length,0);assert.equal(rows(f,'pc_effect_receipt').length,0);
  f.restart();assert.deepEqual(rollPvpAttack(f.db,f.guild,x.pc.owner_user_id,input,{rng:dice([])}),result);
  assert.equal(rows(f,'pvp_action_terminal_receipt').length,1);noBilateral(f);
}));

test('owner explicitly reinspects stale pending Armor with a new immutable offer; old choices and source cannot authorize the new state',()=>nativeFixture(f=>{
  const x=fixture(f);commit(f,x);const r=request(f);authorize(f,x,r);
  const attack=rollPvpAttack(f.db,f.guild,x.pc.owner_user_id,{attack:r.record_key,expected_revision:r.data.offer_hash},{rng:dice([12,12])}),
    damage=rollPvpDamage(f.db,f.guild,x.pc.owner_user_id,{attack_receipt:attack.record_key},{rng:dice([1,1])}),
    original=rows(f,'pvp_damage_offer')[0],source=f.db.getWorldEvent(f.guild,original.source_event);
  reviewPvpDamage(f.db,f.guild,x.target.owner_user_id,original.record_key);
  // Fixture represents an independently changed current sheet, not authority minted by prose or the refresh route.
  f.db.updateCharacterData(x.target.id,data=>{data.resources.armor.current=1;});
  const resources=f.db.getCharacter(x.target.id).data.resources,beforeRolls=rolls(f),oldChoice={damage:original.record_key,
    expected_revision:original.data.digest,armor:false};
  assert.throws(()=>resolvePvpDamage(f.db,f.guild,x.target.owner_user_id,oldChoice,{interactionId:'stale-armor-choice'}),/stale|compare/i);
  assert.throws(()=>refreshCampaignPvpDamage(f.db,f.guild,x.pc.owner_user_id,{damage:original.record_key},
    {interactionId:'opponent-refresh'}),/owner/i);
  const fresh=refreshCampaignPvpDamage(f.db,f.guild,x.target.owner_user_id,{damage:original.record_key},{interactionId:'owner-refresh'});
  assert.notEqual(fresh.record_key,original.record_key);assert.equal(fresh.data.binding.recovery.previous,original.record_key);
  assert.deepEqual(f.db.getCityRecord(f.guild,'pvp_damage_offer',original.record_key).data.binding,original.data.binding);
  assert.deepEqual(f.db.getWorldEvent(f.guild,source.event_key),source);assert.equal(rolls(f),beforeRolls);
  assert.deepEqual(f.db.getCharacter(x.target.id).data.resources,resources);
  assert.equal(f.db.getCityRecord(f.guild,'pvp_damage_group_member',damage.record_key).data.group,fresh.record_key);
  const choice={damage:fresh.record_key,expected_revision:fresh.data.digest,armor:false};
  assert.throws(()=>resolvePvpDamage(f.db,f.guild,x.target.owner_user_id,choice,{interactionId:'without-new-review'}),/review/i);
  reviewPvpDamage(f.db,f.guild,x.target.owner_user_id,fresh.record_key);
  const effect=resolvePvpDamage(f.db,f.guild,x.target.owner_user_id,choice,{interactionId:'fresh-owner-choice'});
  f.restart();assert.deepEqual(validatePvpDamageApplication(f.db,f.guild,effect.record_key),effect);
  assert.deepEqual(refreshCampaignPvpDamage(f.db,f.guild,x.target.owner_user_id,{damage:original.record_key},
    {interactionId:'owner-refresh-replay'}),f.db.getCityRecord(f.guild,'pvp_damage_offer',fresh.record_key));
  assert.equal(rolls(f),beforeRolls);assert.equal(rows(f,'pc_effect_receipt').length,1);noBilateral(f);
}));

test('owner-private outbox uncertainty survives restart without repeat send, dice or consent',()=>nativeFixture(async f=>{
  const x=fixture(f);commit(f,x);const r=request(f);materializeNativeNotices(f.db,f.guild);
  const notices=rows(f,'pvp_attack_publication'),attacker=notices.find(n=>n.data.user===x.pc.owner_user_id),
    defender=notices.find(n=>n.data.user===x.target.owner_user_id);let sends=0;
  await deliverTurnOutbox(f.db,f.guild,attacker.data.turn_id,async()=>{sends++;throw new Error('Synthetic acknowledgement loss after possible send');});
  assert.equal(f.db.listTurnPublications(f.guild,attacker.data.turn_id)[0].status,'uncertain');
  await deliverTurnOutbox(f.db,f.guild,defender.data.turn_id,async()=>{sends++;return {messageId:'defender-private-notice',channelId:'private'};});
  assert.equal(sends,2);f.restart();const beforeRolls=rolls(f);
  materializeNativeNotices(f.db,f.guild);
  for(const notice of notices)await deliverTurnOutbox(f.db,f.guild,notice.data.turn_id,async()=>{sends++;return {messageId:'must-not-repeat'};});
  assert.equal(sends,2);assert.equal(rows(f,'pvp_attack_publication').length,2);assert.equal(rolls(f),beforeRolls);
  assert.equal(f.db.getCityRecord(f.guild,'pvp_attack_request',r.record_key).status,'awaiting_players');
  assert.equal(rows(f,'pvp_attack_review').length,0);noBilateral(f);
}));

test('real post-turn native publisher sends both distinct owner notices and preserves acknowledged delivery across restart',()=>nativeFixture(async f=>{
  const x=fixture(f),mutation=commit(f,x),sent=[];
  const send=async(user,text,session,character,{publication})=>{
    assert.equal(session,f.session.id);assert.equal(publication.visibility,'character');
    assert.equal(publication.target_user_id,user);assert.equal(publication.target_character_id,character);
    if(character===x.target.id)assert.doesNotMatch(text,/Your attack:|2d4/);
    sent.push({user,character,text});return {ok:true,messageId:`private-${sent.length}`,channelId:`owner-${user}`};
  };
  await publishRollRequests(f.db,f.guild,mutation,send);
  assert.equal(sent.length,2);assert.deepEqual(new Set(sent.map(s=>s.user)),new Set([x.pc.owner_user_id,x.target.owner_user_id]));
  assert.ok(rows(f,'pvp_attack_publication').every(row=>row.status==='delivered'));
  f.restart();await publishRollRequests(f.db,f.guild,mutation,send);assert.equal(sent.length,2);
  assert.equal(rolls(f),0);assert.equal(rows(f,'pvp_attack_review').length,0);noBilateral(f);
}));

test('exact owner-authored typed PvP roll previews without RNG and commits saved native dice once, not on behalf of a target',()=>nativeFixture(f=>{
  const x=fixture(f);commit(f,x);const r=request(f);authorize(f,x,r);
  const text=`I roll ${r.record_key}.`,messageId='campaign-owner-typed-roll';
  captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,messageId,text);
  const result=candidate(text);result.narration='';result.gm_world_parts=[];
  result.player_intents=[{type:'roll',source_span:text,target_name:'',target_key:r.record_key,destination:'unspecified',
    operation:'roll',utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Exact owned native request token.'}];
  const before=rolls(f),savedRandom=crypto.randomInt;let draws=0;
  crypto.randomInt=(min,max)=>{assert.equal(min,1);assert.equal(max,13);draws++;assert.ok(draws<=2);return 12;};syncBuiltinESMExports();
  try{
    previewAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,narrative:result,scope:x.scope,
      provenance:{actorType:'ai',actorId:x.pc.owner_user_id,messageId}});
    assert.equal(draws,0);assert.equal(rolls(f),before);
    const mutation=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,
      speaker:x.pc.name,label:'Exact owner native dice',meta:{messageId,triggerText:text}});
    const operation=rows(f,'pvp_typed_roll_operation')[0],receipt=f.db.getCityRecord(f.guild,'pvp_attack_roll_receipt',operation.data.receipt);
    assert.equal(draws,2);assert.equal(receipt.data.result.duality,'Critical');assert.equal(operation.data.owner,x.pc.owner_user_id);
    assert.ok(mutation.intents.some(row=>row.data.intent?.feature==='pvp'));assert.equal(rolls(f),before+1);
    f.restart();commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,
      speaker:x.pc.name,label:'Exact saved owner dice',meta:{messageId,triggerText:text}});
    assert.equal(draws,2);assert.equal(rolls(f),before+1);assert.equal(rows(f,'pvp_typed_roll_operation').length,1);
  }finally{crypto.randomInt=savedRandom;syncBuiltinESMExports();}
  const targetScope={mode:'party',actorUserId:x.target.owner_user_id,actorCharacterId:x.target.id},targetId='target-cannot-roll-attacker';
  captureWorldInput(f.db,f.guild,x.target.owner_user_id,x.target.id,targetId,text);
  const unauthorized=candidate(text);unauthorized.narration='';unauthorized.gm_world_parts=[];
  unauthorized.player_intents=[{...result.player_intents[0]}];
  const beforeTarget=rolls(f);
  const denied=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:unauthorized,scope:targetScope,
    speaker:x.target.name,label:'Target may not roll attacker dice',meta:{messageId:targetId,triggerText:text}});
  assert.ok(denied.intents.some(row=>row.status==='needs_clarification'));assert.equal(rolls(f),beforeTarget);
  assert.equal(rows(f,'pvp_typed_roll_operation').length,1);
  noBilateral(f);
}));

for(const change of ['source','owner'])test(`turn-prepared ${change} revocation blocks notices and fresh dice without disclosing private mechanics`,()=>nativeFixture(async f=>{
  const x=fixture(f);commit(f,x);const r=request(f);authorize(f,x,r);
  reserveCampaignAttackNotices(f.db,f.guild,r.record_key);materializeNativeNotices(f.db,f.guild);
  const revision=noticeHash(pvpAttackOwnerStatus(f.db,f.guild,x.pc.owner_user_id,r.record_key)),
    notice=rows(f,'pvp_attack_publication').find(n=>n.data.user===x.pc.owner_user_id&&n.data.revision===revision);
  if(change==='source')indexWorldEvent(f.db,f.guild,{key:x.sourceRef,status:'retracted'},'fixture');
  else f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run('replacement-owner',x.pc.id);
  let sends=0;await deliverTurnOutbox(f.db,f.guild,notice.data.turn_id,async()=>{sends++;return {messageId:'forbidden'};});assert.equal(sends,0);
  const noDice=dice([]);assert.throws(()=>rollPvpAttack(f.db,f.guild,x.pc.owner_user_id,
    {attack:r.record_key,expected_revision:r.data.offer_hash},{rng:noDice}));assert.equal(noDice.count(),0);
  assert.equal(rows(f,'pvp_damage_offer').length,0);noBilateral(f);
}));

for(const hit of [false,true])test(`native campaign request resumes once after acknowledged owner-reviewed NPC ${hit?'hit and Armor decision':'miss'}, never before`,()=>nativeFixture(async f=>{
  const x=fixture(f);commit(f,x);const r=request(f);authorize(f,x,r);
  f.db.changeFear(f.guild,2);
  const scene=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_encounters:true}});
  f.db.upsertNpcProfile(f.guild,{npcKey:'guard',displayName:'Guard'});
  f.db.setSimulationEntity(f.guild,'npc','guard',{name:'Guard',location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:'campaign-interrupt-guard',kind:'observation',source_id:'gm',
    title:'Guard present',session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:source.event_key,
    location_key:'terminal',zone:'interior',range:'Close',visibility:'party'},'gm');
  const library=new EncounterLibrary('../content'),encounter=f.db.createEncounter(f.guild,f.session.id,
    {status:'active',tier:1,pc_count:4,base_bp:14,budget_bp:14,composition:[{name:'Aster Vale Contractor',quantity:1}]}),
    combatant=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library))[0];
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,
    data:{combatants:[{actor:'guard',id:combatant.id}]}});
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
    ref=arbitrationPromptBoard(f.db,f.guild,origin).npc_candidates.find(n=>n.actor_key==='guard').intent_refs.attack,
    turn={unified_arbitration:{version:2,npc_intents:[{actor_key:'guard',operation:'attack',target_refs:[x.pc.id],
      objective_ref:'',source_refs:[],dependencies:[]}],decisions:[{intent_ref:ref,disposition:'gm_attack_roll',
      rule_basis_refs:['srd:adversary-attacks'],difficulty:null,trait:null,stakes_kind:'native_attack',
      stakes:'The guard attempts one standard attack.',reason:'One legal interruption before the unrolled PC attack.',
      difficulty_reason:'Use actual Evasion.',feature_ref:'standard_attack',experience_ref:'',advantage:false,disadvantage:false}],
      pre_roll_fear:[{request_ref:r.record_key,npc_intent_ref:ref}]}};
  bindArbitrationTurn(turn,origin);
  const accepted=rows(f,'typed_intent').find(a=>a.data.operation==='unarmed_attack'),
    decisions=applyUnifiedArbitration(f.db,f.guild,turn,[accepted]);
  assert.equal(decisions[0].status,'gm_action_ready',decisions[0].data.reason);
  const [incoming]=executeUnifiedGmActions(f.db,f.guild,decisions,{library}),key=`pre-roll-fear:${r.record_key}`,
    attackInput={attack:r.record_key,expected_revision:r.data.offer_hash},noDice=dice([]);
  assert.equal(incoming.kind,'pc_incoming_attack');
  assert.equal(inspectPreRollFear(f.db,f.guild,key).binding.request_kind,'pvp_attack_request');
  assert.throws(()=>rollPvpAttack(f.db,f.guild,x.pc.owner_user_id,attackInput,{rng:noDice}),/Fear|interrupt/i);
  assert.equal(noDice.count(),0);assert.equal(f.db.getCampaign(f.guild).fear,2);
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,incoming.record_key,{library});
  confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,incoming.record_key);
  assert.throws(()=>rollArbitratedIncomingAttack(f.db,f.guild,incoming.record_key,{library,rng:noDice}),/announcement|acknowledge/i);
  let sends=0;
  await publishPreRollFearNotice(f.db,f.guild,key,async part=>{
    sends++;assert.match(part.payload,/1.*Fear/i);assert.ok(part.payload.includes(incoming.record_key));
    return {ok:true,messageId:'native-campaign-fear-ack',channelId:'owner-private'};
  });
  const npcRoll=rollArbitratedIncomingAttack(f.db,f.guild,incoming.record_key,{library,rng:sides=>hit?(sides===20?20:1):1});
  assert.equal(npcRoll.data.hit,hit);assert.equal(f.db.getCampaign(f.guild).fear,1);
  if(hit){
    assert.throws(()=>rollPvpAttack(f.db,f.guild,x.pc.owner_user_id,attackInput,{rng:noDice}),/Fear|interrupt/i);
    assert.throws(()=>resolveIncomingDamage(f.db,f.guild,x.target.owner_user_id,incoming.record_key,{armor:false,library}),/owner|owned/i);
    resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,incoming.record_key,{armor:false,library});
    assert.ok(f.db.getCharacter(x.pc.id).data.resources.hp.current>0);
  }
  f.restart();assert.equal(inspectPreRollFear(f.db,f.guild,key,{current:false}).row.status,'completed');
  const result=rollPvpAttack(f.db,f.guild,x.pc.owner_user_id,attackInput,{rng:dice([12,12])});
  assert.equal(result.data.result.duality,'Critical');
  assert.deepEqual(rollPvpAttack(f.db,f.guild,x.pc.owner_user_id,attackInput,{rng:noDice}),result);
  await publishPreRollFearNotice(f.db,f.guild,key,async()=>{sends++;throw new Error('Must not repeat acknowledged notice');});
  assert.equal(sends,1);assert.equal(f.db.getCampaign(f.guild).fear,1);noBilateral(f);
}));
